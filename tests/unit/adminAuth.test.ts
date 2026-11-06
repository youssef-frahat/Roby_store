/**
 * Roby Store - Admin Authentication & Cryptography Test Suite
 * Location: tests/unit/adminAuth.test.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  constantTimeEqual,
  verifyAdminPassword,
  getAdminPassword,
  getSessionSecret,
  createSessionToken,
  verifySessionToken,
  ADMIN_COOKIE_NAME,
  ADMIN_COOKIE_OPTIONS,
} from '@/utils/adminAuth';

describe('Admin Authentication & Session Cryptography Utility', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('1. Constant-Time String Comparison', () => {
    it('returns true for identical strings', () => {
      expect(constantTimeEqual('roby_admin_secret_2026', 'roby_admin_secret_2026')).toBe(true);
      expect(constantTimeEqual('', '')).toBe(true);
      expect(constantTimeEqual('abc', 'abc')).toBe(true);
    });

    it('returns false for strings of different lengths', () => {
      expect(constantTimeEqual('short', 'longer_string')).toBe(false);
      expect(constantTimeEqual('admin', 'admin1')).toBe(false);
      expect(constantTimeEqual('', 'non-empty')).toBe(false);
    });

    it('returns false for same-length strings with different content', () => {
      expect(constantTimeEqual('password123', 'password124')).toBe(false);
      expect(constantTimeEqual('aaaa', 'bbbb')).toBe(false);
      expect(constantTimeEqual('roby_admin_dev_2026', 'roby_admin_dev_2027')).toBe(false);
    });

    it('safely handles non-string inputs', () => {
      expect(constantTimeEqual(null as any, 'test')).toBe(false);
      expect(constantTimeEqual('test', undefined as any)).toBe(false);
      expect(constantTimeEqual(123 as any, 123 as any)).toBe(false);
    });
  });

  describe('2. Password Verification', () => {
    it('falls back to default password when ADMIN_PASSWORD is unset', () => {
      delete process.env.ADMIN_PASSWORD;
      expect(getAdminPassword()).toBe('roby_admin_dev_2026');
      expect(verifyAdminPassword('roby_admin_dev_2026')).toBe(true);
      expect(verifyAdminPassword('wrong_password')).toBe(false);
    });

    it('honors ADMIN_PASSWORD environment variable when configured', () => {
      process.env.ADMIN_PASSWORD = 'super_secure_custom_password_2026';
      expect(getAdminPassword()).toBe('super_secure_custom_password_2026');
      expect(verifyAdminPassword('super_secure_custom_password_2026')).toBe(true);
      expect(verifyAdminPassword('roby_admin_dev_2026')).toBe(false);
    });

    it('rejects empty, null, or undefined password inputs', () => {
      expect(verifyAdminPassword('')).toBe(false);
      expect(verifyAdminPassword(null as any)).toBe(false);
      expect(verifyAdminPassword(undefined as any)).toBe(false);
    });

    it('verifies session secret hierarchy', () => {
      delete process.env.ADMIN_SESSION_SECRET;
      delete process.env.ADMIN_PASSWORD;
      expect(getSessionSecret()).toBe('roby_store_admin_secret_key_session_2026');

      process.env.ADMIN_PASSWORD = 'pwd_secret';
      expect(getSessionSecret()).toBe('pwd_secret');

      process.env.ADMIN_SESSION_SECRET = 'dedicated_session_secret';
      expect(getSessionSecret()).toBe('dedicated_session_secret');
    });
  });

  describe('3. Session Token Generation (Web Crypto HMAC-SHA256)', () => {
    it('generates a two-part dot-separated session token', async () => {
      const token = await createSessionToken();
      expect(typeof token).toBe('string');
      const parts = token.split('.');
      expect(parts.length).toBe(2);

      const [payloadB64, signature] = parts;
      expect(payloadB64.length).toBeGreaterThan(10);
      expect(signature).toMatch(/^[0-9a-f]{64}$/); // 64 hex chars for SHA-256
    });

    it('encodes correct payload attributes (role, iat, exp)', async () => {
      const before = Date.now();
      const token = await createSessionToken();
      const after = Date.now();

      const [payloadB64] = token.split('.');
      const jsonStr = Buffer.from(payloadB64, 'base64url').toString('utf-8');
      const payload = JSON.parse(jsonStr);

      expect(payload.role).toBe('admin');
      expect(payload.iat).toBeGreaterThanOrEqual(before);
      expect(payload.iat).toBeLessThanOrEqual(after);
      // TTL is 7 days (604,800,000 ms)
      const expectedExp = payload.iat + 7 * 24 * 60 * 60 * 1000;
      expect(payload.exp).toBe(expectedExp);
    });

    it('allows overriding payload properties', async () => {
      const token = await createSessionToken({ exp: Date.now() + 10000 });
      const [payloadB64] = token.split('.');
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));
      expect(payload.exp).toBeLessThan(Date.now() + 20000);
    });
  });

  describe('4. Session Token Verification', () => {
    it('verifies a genuine token successfully', async () => {
      const token = await createSessionToken();
      const result = await verifySessionToken(token);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.payload).toBeDefined();
      expect(result.payload?.role).toBe('admin');
      expect(result.payload?.exp).toBeGreaterThan(Date.now());
    });

    it('rejects missing or empty token', async () => {
      expect((await verifySessionToken(null)).valid).toBe(false);
      expect((await verifySessionToken(null)).error).toBe('missing_token');
      expect((await verifySessionToken(undefined)).valid).toBe(false);
      expect((await verifySessionToken('')).valid).toBe(false);
    });

    it('rejects malformed token structure', async () => {
      expect((await verifySessionToken('no_dots_here')).valid).toBe(false);
      expect((await verifySessionToken('no_dots_here')).error).toBe('malformed_token');
      expect((await verifySessionToken('one.two.three')).valid).toBe(false);
      expect((await verifySessionToken('one.two.three')).error).toBe('malformed_token');
      expect((await verifySessionToken('.')).valid).toBe(false);
    });

    it('rejects signature tampering (modified payload)', async () => {
      const token = await createSessionToken();
      const [payloadB64, signature] = token.split('.');

      // Tamper with payload (e.g. extending expiry)
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));
      payload.exp += 100000;
      const tamperedPayloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');

      const tamperedToken = `${tamperedPayloadB64}.${signature}`;
      const result = await verifySessionToken(tamperedToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('invalid_signature');
    });

    it('rejects signature tampering (modified signature)', async () => {
      const token = await createSessionToken();
      const [payloadB64, signature] = token.split('.');

      const alteredSig = signature.startsWith('a') ? 'b' + signature.slice(1) : 'a' + signature.slice(1);
      const tamperedToken = `${payloadB64}.${alteredSig}`;
      const result = await verifySessionToken(tamperedToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('invalid_signature');
    });

    it('rejects expired tokens', async () => {
      // Create token expired 1 hour ago
      const expiredTime = Date.now() - 60 * 60 * 1000;
      const token = await createSessionToken({ exp: expiredTime });

      const result = await verifySessionToken(token);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('expired');
    });

    it('rejects tokens with non-admin role', async () => {
      const token = await createSessionToken({ role: 'customer' as any });
      const result = await verifySessionToken(token);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('unauthorized_role');
    });

    it('rejects corrupted payload JSON', async () => {
      const corruptedB64 = Buffer.from('not valid json {[[', 'utf-8').toString('base64url');
      // Even if signed correctly, JSON parsing should fail safely
      const secret = getSessionSecret();
      const enc = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        enc.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const sig = await crypto.subtle.sign('HMAC', key, enc.encode(corruptedB64));
      const sigHex = Array.from(new Uint8Array(sig))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      const token = `${corruptedB64}.${sigHex}`;
      const result = await verifySessionToken(token);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('parse_error');
    });
  });

  describe('5. Cookie Constants & Security Parameters', () => {
    it('defines standard cookie name and options', () => {
      expect(ADMIN_COOKIE_NAME).toBe('roby_admin_session');
      expect(ADMIN_COOKIE_OPTIONS.httpOnly).toBe(true);
      expect(ADMIN_COOKIE_OPTIONS.sameSite).toBe('lax');
      expect(ADMIN_COOKIE_OPTIONS.path).toBe('/');
      expect(ADMIN_COOKIE_OPTIONS.maxAge).toBe(60 * 60 * 24 * 7); // 7 days in seconds
    });
  });
});
