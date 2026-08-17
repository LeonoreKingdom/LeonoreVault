import type {
  LoginSchema,
  RegisterSchema,
} from '@leonorevault/shared';
import { getInventoryRepositories } from '../../db/repositories/runtime.js';
import { AppError } from '../../middleware/errorHandler.js';

interface SessionData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

type AuthHeaders = Headers;

async function getAuth() {
  return (await import('../../config/better-auth.js')).auth;
}

function mapUser(user: Record<string, unknown>): UserProfile {
  return {
    id: String(user.id),
    email: String(user.email),
    displayName: (user.name as string | null | undefined) ?? null,
    avatarUrl: (user.image as string | null | undefined) ?? null,
    createdAt: user.createdAt as Date,
    updatedAt: user.updatedAt as Date,
  };
}

function mapSession(token: string | null | undefined): SessionData | null {
  if (!token) return null;
  return {
    accessToken: token,
    // Better Auth uses its session cookie/token rather than a separate refresh token.
    refreshToken: '',
    expiresAt: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
  };
}

function authError(err: unknown, fallback: string): AppError {
  const message = err instanceof Error ? err.message : String(err);
  if (/already|exists|duplicate/i.test(message)) return new AppError(409, 'Email is already registered', 'EMAIL_ALREADY_REGISTERED');
  if (/invalid|password|credential/i.test(message)) return new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  return new AppError(500, fallback, 'INTERNAL_ERROR');
}

export async function handleRegister(payload: RegisterSchema, headers: AuthHeaders = new Headers()) {
  try {
    const auth = await getAuth();
    const result = await auth.api.signUpEmail({
      body: { email: payload.email, password: payload.password, name: payload.name ?? '' },
      headers,
    });
    return {
      user: mapUser(result.user as unknown as Record<string, unknown>),
      session: mapSession(result.token),
      requiresEmailVerification: !result.token,
    };
  } catch (err) {
    throw authError(err, 'Unable to register with these credentials');
  }
}

export async function handleLogin(payload: LoginSchema, headers: AuthHeaders = new Headers()) {
  try {
    const auth = await getAuth();
    const result = await auth.api.signInEmail({
      body: { email: payload.email, password: payload.password },
      headers,
    });
    return {
      user: mapUser(result.user as unknown as Record<string, unknown>),
      session: mapSession(result.token)!,
    };
  } catch (err) {
    throw authError(err, 'Unable to sign in');
  }
}

export async function handleLogout(headers: AuthHeaders) {
  try {
    const auth = await getAuth();
    await auth.api.signOut({ headers });
    return { signedOut: true as const };
  } catch (err) {
    throw authError(err, 'Failed to sign out');
  }
}

export async function getCurrentUser(userId: string) {
  const repositories = await getInventoryRepositories();
  const user = await repositories.users.findById(userId);
  if (!user) throw new AppError(404, 'User not found', 'NOT_FOUND');
  const membership = (await repositories.memberships.listByUser(userId))[0] ?? null;
  return {
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    membership: membership
      ? {
          id: membership.id,
          userId: membership.userId,
          householdId: membership.householdId,
          role: membership.role,
          joinedAt: membership.joinedAt,
        }
      : null,
  };
}
