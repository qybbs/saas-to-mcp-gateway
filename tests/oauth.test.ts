import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import * as jose from 'jose';
import crypto from 'crypto';
import app from '../src/server';

import { DcrPersistenceMode } from '../src/core/auth/types';
import { McpDriverType } from '../src/core/mcp/driver';

describe('OAuth Endpoints', () => {
  beforeAll(() => {
    process.env.MASTER_SECRET_KEY = 'a3N2ZHNkZnNkZmRzZnNkZnNkZmRzZnNkZnNkZnNkZmQ='; // valid base64 32 bytes (mock)
    process.env.AUTH_PROVIDER = 'MOCK';
    process.env.MOCK_USER_EMAIL = 'test@example.com';
    process.env.MOCK_USER_PASSWORD = 'password123';
    process.env.GCP_PROJECT_ID = 'mock-project';
    process.env.ALLOWLIST_TABLES = 'dataset.mock_table';
    process.env.DCR_PERSISTENCE_MODE = DcrPersistenceMode.MEMORY;
    process.env.ACTIVE_DRIVERS = McpDriverType.BIGQUERY;
  });

  let clientId: string;
  let clientSecret: string;
  let redirectUri = 'http://localhost/callback';

  describe('POST /register', () => {
    it('should register client and return encrypted client_id', async () => {
      const response = await request(app)
        .post('/atlassian/register')
        .send({
          client_name: 'Test Client',
          redirect_uris: [redirectUri]
        });
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('client_id');
      expect(response.body).toHaveProperty('client_secret');
      expect(response.body.redirect_uris).toContain(redirectUri);

      clientId = response.body.client_id;
      clientSecret = response.body.client_secret;
    });

    it('should reject registration without redirect_uris', async () => {
      const response = await request(app)
        .post('/atlassian/register')
        .send({
          client_name: 'Test Client'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('redirect_uris is required');
    });
  });

  describe('GET /oauth/authorize', () => {
    it('should display authorization page and set oauth_flow cookie', async () => {
      const response = await request(app)
        .get('/atlassian/oauth/authorize')
        .query({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: 'code',
          state: 'xyz123',
          code_challenge: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ123',
          code_challenge_method: 'S256'
        });
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('<form action="/atlassian/oauth/login"');
      
      // Verify cookie is set
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain('oauth_flow=');
    });

    it('should reject request if client_id is invalid', async () => {
      const response = await request(app)
        .get('/atlassian/oauth/authorize')
        .query({
          client_id: 'invalid-client-id-format',
          redirect_uri: redirectUri,
          response_type: 'code',
          code_challenge: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ123'
        });
      
      expect(response.status).toBe(400);
      expect(response.text).toContain('Invalid client_id');
    });
  });

  describe('POST /oauth/login', () => {
    it('should reject login if oauth_flow cookie is missing', async () => {
      const response = await request(app)
        .post('/atlassian/oauth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });
      
      expect(response.status).toBe(400);
      expect(response.text).toContain('Session expired or invalid flow');
    });

    it('should successfully log in with valid credentials', async () => {
      const authResponse = await request(app)
        .get('/atlassian/oauth/authorize')
        .query({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: 'code',
          state: 'xyz123',
          code_challenge: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ123',
          code_challenge_method: 'S256'
        });
      
      const cookie = authResponse.headers['set-cookie'][0].split(';')[0];

      const loginResponse = await request(app)
        .post('/atlassian/oauth/login')
        .set('Cookie', cookie)
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(loginResponse.status).toBe(302);
      expect(loginResponse.headers.location).toContain('code=');
      expect(loginResponse.headers.location).toContain('state=xyz123');
    });

    it('should reject login if email or password is incorrect', async () => {
      const authResponse = await request(app)
        .get('/atlassian/oauth/authorize')
        .query({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: 'code',
          state: 'xyz123',
          code_challenge: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ123',
          code_challenge_method: 'plain'
        });
      
      const cookie = authResponse.headers['set-cookie'][0].split(';')[0];

      const response = await request(app)
        .post('/atlassian/oauth/login')
        .set('Cookie', cookie)
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });
      
      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('error=login_failed');
    });

    it('should reject login if flow token is invalid', async () => {
      const response = await request(app)
        .post('/atlassian/oauth/login')
        .set('Cookie', 'oauth_flow=invalid.token.here')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });
      
      expect(response.status).toBe(400);
      expect(response.text).toBe('Invalid session state');
    });
  });

  describe('POST /oauth/token', () => {
    it('should reject if grant_type is not authorization_code', async () => {
      const response = await request(app)
        .post('/atlassian/oauth/token')
        .send({
          grant_type: 'client_credentials'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('unsupported_grant_type');
    });

    it('should reject if code is missing', async () => {
      const response = await request(app)
        .post('/atlassian/oauth/token')
        .send({
          grant_type: 'authorization_code'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('invalid_request');
    });

    it('should successfully exchange authorization code for access token', async () => {
      const authResponse = await request(app)
        .get('/atlassian/oauth/authorize')
        .query({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: 'code',
          state: 'xyz123',
          code_challenge: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ123',
          code_challenge_method: 'plain'
        });
      
      const cookie = authResponse.headers['set-cookie'][0].split(';')[0];

      const loginResponse = await request(app)
        .post('/atlassian/oauth/login')
        .set('Cookie', cookie)
        .send({
          email: 'test@example.com',
          password: 'password123'
        });
      
      const redirectUrl = new URL(loginResponse.headers.location);
      const code = redirectUrl.searchParams.get('code') || '';

      const tokenResponse = await request(app)
        .post('/atlassian/oauth/token')
        .send({
          grant_type: 'authorization_code',
          code,
          client_id: clientId,
          code_verifier: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ123',
          redirect_uri: redirectUri
        });

      expect(tokenResponse.status).toBe(200);
      expect(tokenResponse.body).toHaveProperty('access_token');
      expect(tokenResponse.body.token_type).toBe('Bearer');
    });

    it('should support Basic Auth header for client_id', async () => {
      const authResponse = await request(app)
        .get('/atlassian/oauth/authorize')
        .query({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: 'code',
          state: 'xyz123',
          code_challenge: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ123',
          code_challenge_method: 'plain'
        });
      
      const cookie = authResponse.headers['set-cookie'][0].split(';')[0];

      const loginResponse = await request(app)
        .post('/atlassian/oauth/login')
        .set('Cookie', cookie)
        .send({
          email: 'test@example.com',
          password: 'password123'
        });
      
      const redirectUrl = new URL(loginResponse.headers.location);
      const code = redirectUrl.searchParams.get('code') || '';

      const credentials = Buffer.from(`${clientId}:`).toString('base64');
      const tokenResponse = await request(app)
        .post('/atlassian/oauth/token')
        .set('Authorization', `Basic ${credentials}`)
        .send({
          grant_type: 'authorization_code',
          code,
          code_verifier: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ123',
          redirect_uri: redirectUri
        });

      expect(tokenResponse.status).toBe(200);
      expect(tokenResponse.body).toHaveProperty('access_token');
    });

    it('should reject if code token is invalid or expired', async () => {
      const response = await request(app)
        .post('/atlassian/oauth/token')
        .send({
          grant_type: 'authorization_code',
          code: 'invalid.jwe.code',
          client_id: clientId,
          code_verifier: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ123'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('invalid_grant');
      expect(response.body.error_description).toContain('invalid or expired');
    });

    it('should reject if client_id does not match code issuer', async () => {
      const authResponse = await request(app)
        .get('/atlassian/oauth/authorize')
        .query({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: 'code',
          state: 'xyz123',
          code_challenge: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ123',
          code_challenge_method: 'plain'
        });
      
      const cookie = authResponse.headers['set-cookie'][0].split(';')[0];

      const loginResponse = await request(app)
        .post('/atlassian/oauth/login')
        .set('Cookie', cookie)
        .send({
          email: 'test@example.com',
          password: 'password123'
        });
      
      const redirectUrl = new URL(loginResponse.headers.location);
      const code = redirectUrl.searchParams.get('code') || '';

      const tokenResponse = await request(app)
        .post('/atlassian/oauth/token')
        .send({
          grant_type: 'authorization_code',
          code,
          client_id: 'different-client-id.part2.part3.part4.part5',
          code_verifier: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ123',
          redirect_uri: redirectUri
        });

      expect(tokenResponse.status).toBe(400);
      expect(tokenResponse.body.error).toBe('invalid_grant');
      expect(tokenResponse.body.error_description).toContain('Client ID mismatch');
    });

    it('should successfully perform token exchange with S256 PKCE challenge method', async () => {
      const verifier = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ123_verifier';
      const challenge = crypto
        .createHash('sha256')
        .update(verifier)
        .digest('base64url');

      const authResponse = await request(app)
        .get('/atlassian/oauth/authorize')
        .query({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: 'code',
          state: 'xyz123',
          code_challenge: challenge,
          code_challenge_method: 'S256'
        });
      
      const cookie = authResponse.headers['set-cookie'][0].split(';')[0];

      const loginResponse = await request(app)
        .post('/atlassian/oauth/login')
        .set('Cookie', cookie)
        .send({
          email: 'test@example.com',
          password: 'password123'
        });
      
      const redirectUrl = new URL(loginResponse.headers.location);
      const code = redirectUrl.searchParams.get('code') || '';

      const tokenResponse = await request(app)
        .post('/atlassian/oauth/token')
        .send({
          grant_type: 'authorization_code',
          code,
          client_id: clientId,
          code_verifier: verifier,
          redirect_uri: redirectUri
        });

      expect(tokenResponse.status).toBe(200);
      expect(tokenResponse.body).toHaveProperty('access_token');
    });

    it('should reject token exchange if PKCE challenge does not match', async () => {
      const authResponse = await request(app)
        .get('/atlassian/oauth/authorize')
        .query({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: 'code',
          state: 'xyz123',
          code_challenge: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ123',
          code_challenge_method: 'plain'
        });
      
      const cookie = authResponse.headers['set-cookie'][0].split(';')[0];

      const loginResponse = await request(app)
        .post('/atlassian/oauth/login')
        .set('Cookie', cookie)
        .send({
          email: 'test@example.com',
          password: 'password123'
        });
      
      const redirectUrl = new URL(loginResponse.headers.location);
      const code = redirectUrl.searchParams.get('code') || '';

      const tokenResponse = await request(app)
        .post('/atlassian/oauth/token')
        .send({
          grant_type: 'authorization_code',
          code,
          client_id: clientId,
          code_verifier: 'wrong-code-verifier-here-12345',
          redirect_uri: redirectUri
        });

      expect(tokenResponse.status).toBe(400);
      expect(tokenResponse.body.error).toBe('invalid_grant');
      expect(tokenResponse.body.error_description).toContain('PKCE code verifier does not match challenge');
    });
  });

  describe('GET /oauth/callback (OIDC Callback)', () => {
    it('should process OIDC callback successfully', async () => {
      const masterSecret = 'a3N2ZHNkZnNkZmRzZnNkZnNkZmRzZnNkZnNkZnNkZmQ=';
      const secretKey = Buffer.from(masterSecret, 'base64');
      const stateToken = await new jose.EncryptJWT({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        state: 'xyz123',
        code_challenge: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ123',
        code_challenge_method: 'S256',
      })
        .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
        .setIssuedAt()
        .setExpirationTime('10m')
        .encrypt(secretKey);

      const idToken = await new jose.SignJWT({
        email: 'test@example.com',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .sign(secretKey);

      const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(() => {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id_token: idToken }),
        } as any);
      });

      process.env.OIDC_TOKEN_ENDPOINT = 'http://mock-provider.com/token';
      process.env.OIDC_CLIENT_ID = 'oidc-client-id';
      process.env.OIDC_CLIENT_SECRET = 'oidc-client-secret';
      process.env.OIDC_REDIRECT_URI = 'http://localhost/callback';

      const response = await request(app)
        .get('/atlassian/oauth/callback')
        .query({
          code: 'oidc-auth-code',
          state: stateToken
        });

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('code=');
      expect(response.headers.location).toContain('state=xyz123');

      fetchSpy.mockRestore();
    });

    it('should reject callback if code or state is missing', async () => {
      const response = await request(app)
        .get('/atlassian/oauth/callback')
        .query({
          code: 'oidc-auth-code'
        });
      expect(response.status).toBe(400);
      expect(response.text).toContain('Missing code or state');
    });

    it('should reject callback if state is invalid', async () => {
      const response = await request(app)
        .get('/atlassian/oauth/callback')
        .query({
          code: 'oidc-auth-code',
          state: 'invalid-state-token'
        });
      expect(response.status).toBe(400);
      expect(response.text).toContain('Invalid state token');
    });
  });
});
