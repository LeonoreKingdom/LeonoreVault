import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const mocks = vi.hoisted(() => {
  const profileChain = {
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
  };
  profileChain.select.mockReturnValue(profileChain);
  profileChain.eq.mockReturnValue(profileChain);

  return {
    profileChain,
    supabaseAuth: {
      auth: {
        signUp: vi.fn(),
        signInWithPassword: vi.fn(),
      },
    },
    supabaseAdmin: {
      auth: { getUser: vi.fn() },
      from: vi.fn(() => profileChain),
    },
    userClient: {
      auth: { signOut: vi.fn() },
    },
    createUserClient: vi.fn(),
  };
});

vi.mock('../../../config/supabase.js', () => ({
  supabaseAuth: mocks.supabaseAuth,
  supabaseAdmin: mocks.supabaseAdmin,
  createUserClient: mocks.createUserClient,
}));

vi.mock('../../../config/env.js', () => ({
  env: {
    PORT: 3000,
    NODE_ENV: 'test',
    CORS_ORIGIN: '*',
    NEXT_PUBLIC_SUPABASE_URL: 'https://mock.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'mock-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'mock-service-role-key',
  },
}));

vi.mock('../../../middleware/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

import app from '../../../index.js';

const USER_ID = '770e8400-e29b-41d4-a716-446655440002';
const TS = '2025-01-01T00:00:00+00:00';
const profile = {
  id: USER_ID,
  email: 'leonore@example.com',
  display_name: 'Leonore',
  avatar_url: null,
  created_at: TS,
  updated_at: TS,
};

describe('Auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.profileChain.single.mockResolvedValue({ data: profile, error: null });
    mocks.createUserClient.mockReturnValue(mocks.userClient);
  });

  it('registers an account and reports when email verification is required', async () => {
    mocks.supabaseAuth.auth.signUp.mockResolvedValue({
      data: { user: { id: USER_ID }, session: null },
      error: null,
    });

    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'leonore@example.com', password: 'Strong!1', name: 'Leonore' })
      .expect(201);

    expect(response.body.data).toEqual({
      user: {
        id: USER_ID,
        email: 'leonore@example.com',
        displayName: 'Leonore',
        avatarUrl: null,
        createdAt: TS,
        updatedAt: TS,
      },
      session: null,
      requiresEmailVerification: true,
    });
    expect(mocks.supabaseAuth.auth.signUp).toHaveBeenCalledWith({
      email: 'leonore@example.com',
      password: 'Strong!1',
      options: { data: { full_name: 'Leonore' } },
    });
  });

  it('returns a conflict for a registered email', async () => {
    mocks.supabaseAuth.auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'User already registered' },
    });

    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'leonore@example.com', password: 'Strong!1' })
      .expect(409);

    expect(response.body.error.code).toBe('EMAIL_ALREADY_REGISTERED');
  });

  it('logs in with valid credentials and returns a session', async () => {
    mocks.supabaseAuth.auth.signInWithPassword.mockResolvedValue({
      data: {
        user: { id: USER_ID },
        session: {
          access_token: 'access-token',
          refresh_token: 'refresh-token',
          expires_at: 1735689600,
        },
      },
      error: null,
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'leonore@example.com', password: 'Strong!1' })
      .expect(200);

    expect(response.body.data.session).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresAt: 1735689600,
    });
    expect(response.body.data.user.id).toBe(USER_ID);
  });

  it('rejects invalid login credentials', async () => {
    mocks.supabaseAuth.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'leonore@example.com', password: 'wrong' })
      .expect(401);

    expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('revokes the current session on logout', async () => {
    mocks.supabaseAdmin.auth.getUser.mockResolvedValue({
      data: { user: { id: USER_ID, email: profile.email } },
      error: null,
    });
    mocks.userClient.auth.signOut.mockResolvedValue({ error: null });

    const response = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', 'Bearer access-token')
      .expect(200);

    expect(response.body.data).toEqual({ signedOut: true });
    expect(mocks.createUserClient).toHaveBeenCalledWith('access-token');
    expect(mocks.userClient.auth.signOut).toHaveBeenCalledOnce();
  });
});
