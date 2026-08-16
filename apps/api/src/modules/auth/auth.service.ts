import type {
  GoogleCallbackSchema,
  RefreshTokenSchema,
  RegisterSchema,
  LoginSchema,
} from '@leonorevault/shared';
import { createUserClient, supabaseAdmin, supabaseAuth } from '../../config/supabase.js';
import { env } from '../../config/env.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logger } from '../../middleware/logger.js';

/**
 * Session data returned to the client after successful auth.
 */
interface SessionData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

/**
 * User profile data in API response format.
 */
interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

function mapSession(session: {
  access_token: string;
  refresh_token: string;
  expires_at?: number | null;
}): SessionData {
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
  };
}

async function getUserProfile(userId: string): Promise<UserProfile> {
  const { data: userProfile, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !userProfile) {
    logger.error({ error: error?.message, userId }, 'Failed to fetch user profile');
    throw new AppError(500, 'Failed to retrieve user profile', 'INTERNAL_ERROR');
  }

  return {
    id: userProfile.id,
    email: userProfile.email,
    displayName: userProfile.display_name,
    avatarUrl: userProfile.avatar_url,
    createdAt: userProfile.created_at,
    updatedAt: userProfile.updated_at,
  };
}

function mapRegistrationError(message: string): AppError {
  if (/already registered|already exists|duplicate/i.test(message)) {
    return new AppError(409, 'Email is already registered', 'EMAIL_ALREADY_REGISTERED');
  }
  if (/password/i.test(message)) {
    return new AppError(400, 'Password does not meet the requirements', 'VALIDATION_ERROR');
  }
  return new AppError(400, 'Unable to register with these credentials', 'REGISTRATION_FAILED');
}

/** Register an email/password account through Supabase Auth. */
export async function handleRegister(payload: RegisterSchema): Promise<{
  user: UserProfile;
  session: SessionData | null;
  requiresEmailVerification: boolean;
}> {
  const { data, error } = await supabaseAuth.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: payload.name ? { data: { full_name: payload.name } } : undefined,
  });

  if (error) {
    logger.debug({ error: error.message }, 'Email registration failed');
    throw mapRegistrationError(error.message);
  }

  if (!data.user) {
    throw new AppError(500, 'Registration did not return a user', 'INTERNAL_ERROR');
  }

  return {
    user: await getUserProfile(data.user.id),
    session: data.session ? mapSession(data.session) : null,
    requiresEmailVerification: !data.session,
  };
}

/** Sign in with email/password and return the active session. */
export async function handleLogin(
  payload: LoginSchema,
): Promise<{ user: UserProfile; session: SessionData }> {
  const { data, error } = await supabaseAuth.auth.signInWithPassword({
    email: payload.email,
    password: payload.password,
  });

  if (error) {
    logger.debug({ error: error.message }, 'Email login failed');
    if (/email not confirmed/i.test(error.message)) {
      throw new AppError(403, 'Please verify your email before signing in', 'EMAIL_NOT_CONFIRMED');
    }
    throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  }

  if (!data.user || !data.session) {
    throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  }

  return {
    user: await getUserProfile(data.user.id),
    session: mapSession(data.session),
  };
}

/** Revoke the current Supabase session. */
export async function handleLogout(accessToken: string): Promise<{ signedOut: true }> {
  const { error } = await createUserClient(accessToken).auth.signOut();

  if (error) {
    logger.error({ error: error.message }, 'Logout failed');
    throw new AppError(500, 'Failed to sign out', 'INTERNAL_ERROR');
  }

  return { signedOut: true };
}

/**
 * Exchange a Google OAuth authorization code for a Supabase session.
 *
 * Flow:
 * 1. Frontend redirects user to Google OAuth consent
 * 2. Google redirects back with an authorization code
 * 3. Frontend sends code + redirectUri to this endpoint
 * 4. We exchange it via Supabase Auth's `exchangeCodeForSession`
 * 5. Return user profile + session tokens
 */
export async function handleGoogleCallback(
  payload: GoogleCallbackSchema,
): Promise<{ user: UserProfile; session: SessionData }> {
  const { data, error } = await supabaseAdmin.auth.exchangeCodeForSession(payload.code);

  if (error) {
    logger.error({ error: error.message }, 'Google OAuth code exchange failed');

    if (error.message.includes('expired') || error.message.includes('already used')) {
      throw new AppError(400, 'Authorization code expired or already used', 'INVALID_GRANT');
    }

    throw new AppError(500, 'Failed to authenticate with Google', 'INTERNAL_ERROR');
  }

  const { user: authUser, session } = data;

  if (!session || !authUser) {
    throw new AppError(500, 'No session returned from auth exchange', 'INTERNAL_ERROR');
  }

  const userProfile = await getUserProfile(authUser.id);

  return {
    user: {
      ...userProfile,
    },
    session: {
      ...mapSession(session),
    },
  };
}

/**
 * Refresh an expired access token using a valid refresh token.
 */
export async function handleRefreshToken(
  payload: RefreshTokenSchema,
): Promise<{ session: SessionData }> {
  const { data, error } = await supabaseAdmin.auth.refreshSession({
    refresh_token: payload.refreshToken,
  });

  if (error) {
    logger.debug({ error: error.message }, 'Token refresh failed');

    if (error.message.includes('expired')) {
      throw new AppError(401, 'Refresh token has expired', 'TOKEN_EXPIRED');
    }

    throw new AppError(400, 'Invalid refresh token', 'INVALID_TOKEN');
  }

  const { session } = data;

  if (!session) {
    throw new AppError(500, 'No session returned from refresh', 'INTERNAL_ERROR');
  }

  return {
    session: {
      ...mapSession(session),
    },
  };
}

/**
 * Get the current authenticated user's profile and household membership.
 */
export async function getCurrentUser(
  userId: string,
): Promise<{ user: UserProfile; membership: Record<string, unknown> | null }> {
  const { data: userProfile, error: userError } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (userError || !userProfile) {
    throw new AppError(404, 'User not found', 'NOT_FOUND');
  }

  const { data: membership } = await supabaseAdmin
    .from('memberships')
    .select('id, user_id, household_id, role, joined_at')
    .eq('user_id', userId)
    .limit(1)
    .single();

  return {
    user: {
      id: userProfile.id,
      email: userProfile.email,
      displayName: userProfile.display_name,
      avatarUrl: userProfile.avatar_url,
      createdAt: userProfile.created_at,
      updatedAt: userProfile.updated_at,
    },
    membership: membership
      ? {
          id: membership.id,
          userId: membership.user_id,
          householdId: membership.household_id,
          role: membership.role,
          joinedAt: membership.joined_at,
        }
      : null,
  };
}
