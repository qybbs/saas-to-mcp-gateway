import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validateEnv } from '../src/config/gateway.config';
import { McpDriverType } from '../src/core/mcp/driver';
import { DcrPersistenceMode } from '../src/core/auth/types';

describe('validateEnv', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Set a valid baseline for all required variables
    process.env.MASTER_SECRET_KEY = 'a3N2ZHNkZnNkZmRzZnNkZnNkZmRzZnNkZnNkZnNkZmQ='; // 32 bytes base64
    process.env.AUTH_PROVIDER = 'MOCK';
    process.env.MOCK_USER_EMAIL = 'test@example.com';
    process.env.MOCK_USER_PASSWORD = 'password123';
    process.env.DCR_PERSISTENCE_MODE = DcrPersistenceMode.STATELESS;
    
    // Clear optional/OIDC and legacy GCP ones
    delete process.env.GCP_PROJECT_ID;
    delete process.env.GCP_KEY_FILE_PATH;
    delete process.env.ALLOWLIST_TABLES;
    delete process.env.OIDC_CLIENT_ID;
    delete process.env.OIDC_CLIENT_SECRET;
    delete process.env.OIDC_AUTHORIZATION_ENDPOINT;
    delete process.env.OIDC_TOKEN_ENDPOINT;
    delete process.env.OIDC_REDIRECT_URI;
    delete process.env.TOKEN_EXPIRATION_SECONDS;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('should pass with a valid baseline configuration without any GCP or BigQuery variables', () => {
    expect(() => validateEnv()).not.toThrow();
  });

  describe('MASTER_SECRET_KEY validation', () => {
    it('should throw if missing', () => {
      delete process.env.MASTER_SECRET_KEY;
      expect(() => validateEnv()).toThrow(/MASTER_SECRET_KEY environment variable is not set/);
    });

    it('should throw if not 32 bytes', () => {
      process.env.MASTER_SECRET_KEY = Buffer.from('short-key').toString('base64');
      expect(() => validateEnv()).toThrow(/must be exactly 32 bytes/);
    });
  });

  describe('GCP Configuration validation (conditional on Firestore)', () => {
    it('should not throw if GCP_PROJECT_ID is missing in STATELESS mode', () => {
      delete process.env.GCP_PROJECT_ID;
      expect(() => validateEnv()).not.toThrow();
    });

    it('should throw if GCP_PROJECT_ID is missing when DCR_PERSISTENCE_MODE is FIRESTORE', () => {
      process.env.DCR_PERSISTENCE_MODE = DcrPersistenceMode.FIRESTORE;
      delete process.env.GCP_PROJECT_ID;
      expect(() => validateEnv()).toThrow(/GCP_PROJECT_ID is required when DCR_PERSISTENCE_MODE is FIRESTORE/);
    });

    it('should throw if GCP_KEY_FILE_PATH points to a non-existent file when DCR_PERSISTENCE_MODE is FIRESTORE', () => {
      process.env.DCR_PERSISTENCE_MODE = DcrPersistenceMode.FIRESTORE;
      process.env.GCP_PROJECT_ID = 'test-project';
      process.env.GCP_KEY_FILE_PATH = './does-not-exist.json';
      expect(() => validateEnv()).toThrow(/GCP_KEY_FILE_PATH file does not exist/);
    });
  });

  describe('AUTH_PROVIDER validation', () => {
    it('should throw if missing', () => {
      delete process.env.AUTH_PROVIDER;
      expect(() => validateEnv()).toThrow(/AUTH_PROVIDER is not set/);
    });

    it('should throw if invalid value', () => {
      process.env.AUTH_PROVIDER = 'INVALID_AUTH';
      expect(() => validateEnv()).toThrow(/AUTH_PROVIDER must be "MOCK" or "OIDC"/);
    });

    describe('when MOCK', () => {
      it('should throw if email is invalid', () => {
        process.env.MOCK_USER_EMAIL = 'not-an-email';
        expect(() => validateEnv()).toThrow(/Invalid email format in MOCK_USER_EMAIL/);
      });

      it('should throw if password is missing', () => {
        delete process.env.MOCK_USER_PASSWORD;
        expect(() => validateEnv()).toThrow(/MOCK_USER_PASSWORD is required/);
      });
    });

    describe('when OIDC', () => {
      beforeEach(() => {
        process.env.AUTH_PROVIDER = 'OIDC';
        process.env.OIDC_CLIENT_ID = 'client-id';
        process.env.OIDC_CLIENT_SECRET = 'client-secret';
        process.env.OIDC_AUTHORIZATION_ENDPOINT = 'https://auth.com/oauth';
        process.env.OIDC_TOKEN_ENDPOINT = 'https://auth.com/token';
        process.env.OIDC_REDIRECT_URI = 'https://app.com/callback';
      });

      it('should pass with valid OIDC config', () => {
        expect(() => validateEnv()).not.toThrow();
      });

      it('should throw if required field is missing', () => {
        delete process.env.OIDC_CLIENT_ID;
        expect(() => validateEnv()).toThrow(/OIDC_CLIENT_ID is required/);
      });

      it('should throw if URL is invalid', () => {
        process.env.OIDC_REDIRECT_URI = 'ftp://app.com/callback';
        expect(() => validateEnv()).toThrow(/Invalid URL format in OIDC_REDIRECT_URI/);
      });
    });
  });

  describe('Optional Limits validation', () => {
    it('should pass with valid limits', () => {
      process.env.TOKEN_EXPIRATION_SECONDS = '3600';
      process.env.RATE_LIMIT_MAX_REQUESTS = '100';
      process.env.RATE_LIMIT_WINDOW_MS = '60000';
      process.env.USER_DAILY_BUDGET_BYTES = '104857600';
      expect(() => validateEnv()).not.toThrow();
    });

    it('should throw if limit is not an integer', () => {
      process.env.TOKEN_EXPIRATION_SECONDS = '50.5';
      expect(() => validateEnv()).toThrow(/TOKEN_EXPIRATION_SECONDS must be a positive integer/);
    });

    it('should throw if limit is negative', () => {
      process.env.TOKEN_EXPIRATION_SECONDS = '-1000';
      expect(() => validateEnv()).toThrow(/TOKEN_EXPIRATION_SECONDS must be a positive integer/);
    });
    
    it('should throw if limit is zero for positive integer', () => {
      process.env.TOKEN_EXPIRATION_SECONDS = '0';
      expect(() => validateEnv()).toThrow(/TOKEN_EXPIRATION_SECONDS must be a positive integer/);
    });
  });
});
