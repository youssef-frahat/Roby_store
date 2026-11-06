/**
 * Roby Store - Milestone P2-M2 Adversarial Auth & Session Stress Suite
 * Location: tests/unit/adversarial_p2_m2_auth_stress.test.ts
 *
 * Empirical challenger harness for:
 * 1. Constant-time equality & timing side-channel attack simulations
 * 2. Password verification under unicode, whitespace, injection, and boundary attacks
 * 3. Token cryptography under payload tampering, signature mutations, base64url corruption, and timestamp attacks
 * 4. API endpoints (/api/admin/login, /api/admin/logout, /api/admin/session) under malformed payloads, injection strings, and high-frequency bursts
 * 5. Edge middleware path manipulation and cookie clearing resilience
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
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
import { POST as loginHandler } from '@/app/api/admin/login/route';
import { POST as logoutHandler } from '@/app/api/admin/logout/route';
import { GET as sessionHandler } from '@/app/api/admin/session/route';
import { middleware } from '@/middleware';

describe('Milestone P2-M2 Adversarial Auth & Session Challenger Suite', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  // =========================================================================
  // SUITE 1: Constant-Time Comparison & Side-Channel Attack Simulation
  // =========================================================================
  describe('Suite 1: Constant-Time String Comparison Adversarial Hardening', () => {
    it('STRESS-CTC-01: handles extreme-length strings (50,000 characters) without stack overflow or crash', () => {
      const longA = 'A'.repeat(50000);
      const longB = 'A'.repeat(49999) + 'B';
      const longMatch = 'A'.repeat(50000);

      expect(constantTimeEqual(longA, longMatch)).toBe(true);
      expect(constantTimeEqual(longA, longB)).toBe(false);
      expect(constantTimeEqual(longA, 'A'.repeat(49999))).toBe(false);
    });

    it('STRESS-CTC-02: handles multi-byte UTF-8, Arabic text, and Emoji sequences', () => {
      const arabicStr1 = 'متجر روبي الفاخر ٢٠٢٦ 👑';
      const arabicStr2 = 'متجر روبي الفاخر ٢٠٢٦ 👑';
      const arabicMismatch = 'متجر روبي الفاخر ٢٠٢٦ 💍';

      expect(constantTimeEqual(arabicStr1, arabicStr2)).toBe(true);
      expect(constantTimeEqual(arabicStr1, arabicMismatch)).toBe(false);
    });

    it('STRESS-CTC-03: rejects all non-string and falsy types safely without throwing', () => {
      const invalidInputs = [
        null,
        undefined,
        0,
        1,
        NaN,
        true,
        false,
        {},
        [],
        [1, 2],
        { a: 'b' },
        () => {},
        Symbol('token'),
      ];

      for (const input of invalidInputs) {
        expect(constantTimeEqual(input as any, 'secret')).toBe(false);
        expect(constantTimeEqual('secret', input as any)).toBe(false);
        expect(constantTimeEqual(input as any, input as any)).toBe(false);
      }
    });

    it('STRESS-CTC-04: side-channel timing attack simulation does not reveal byte mismatch position', () => {
      // Simulate comparing a target string against guesses mismatching at index 0 vs last index
      const target = 'x'.repeat(256);
      const mismatchFirst = 'y' + 'x'.repeat(255);
      const mismatchLast = 'x'.repeat(255) + 'y';

      // Warmup JIT
      for (let i = 0; i < 1000; i++) {
        constantTimeEqual(target, mismatchFirst);
        constantTimeEqual(target, mismatchLast);
      }

      const iterations = 5000;

      const startFirst = performance.now();
      for (let i = 0; i < iterations; i++) {
        constantTimeEqual(target, mismatchFirst);
      }
      const durFirst = performance.now() - startFirst;

      const startLast = performance.now();
      for (let i = 0; i < iterations; i++) {
        constantTimeEqual(target, mismatchLast);
      }
      const durLast = performance.now() - startLast;

      // Both should complete within reasonable bounds and not exhibit order-of-magnitude early-exit differences
      expect(Math.abs(durFirst - durLast)).toBeLessThan(100); // within 100ms tolerance for 5k runs
    });
  });

  // =========================================================================
  // SUITE 2: Password Verification Adversarial Stress
  // =========================================================================
  describe('Suite 2: Password Verification Adversarial Hardening', () => {
    it('STRESS-PWD-01: rejects whitespace-padded variations of the valid password', () => {
      const valid = getAdminPassword();

      expect(verifyAdminPassword(' ' + valid)).toBe(false);
      expect(verifyAdminPassword(valid + ' ')).toBe(false);
      expect(verifyAdminPassword('  ' + valid + '  ')).toBe(false);
      expect(verifyAdminPassword('\t' + valid)).toBe(false);
      expect(verifyAdminPassword(valid + '\n')).toBe(false);
      expect(verifyAdminPassword(valid + '\r\n')).toBe(false);
    });

    it('STRESS-PWD-02: rejects zero-width unicode characters and invisible spaces', () => {
      const valid = getAdminPassword();

      // Zero-width space U+200B
      expect(verifyAdminPassword('\u200B' + valid)).toBe(false);
      expect(verifyAdminPassword(valid + '\u200B')).toBe(false);
      // Zero-width non-joiner U+200C
      expect(verifyAdminPassword('\u200C' + valid)).toBe(false);
      // Byte order mark U+FEFF
      expect(verifyAdminPassword('\uFEFF' + valid)).toBe(false);
      // Right-to-left override U+202E
      expect(verifyAdminPassword('\u202E' + valid)).toBe(false);
    });

    it('STRESS-PWD-03: enforces strict case sensitivity', () => {
      const valid = getAdminPassword();
      expect(verifyAdminPassword(valid.toUpperCase())).toBe(false);
      expect(verifyAdminPassword(valid.toLowerCase())).toBe(valid === valid.toLowerCase());
      expect(verifyAdminPassword('ROBY_ADMIN_DEV_2026')).toBe(valid === 'ROBY_ADMIN_DEV_2026');
    });

    it('STRESS-PWD-04: rejects prefixes, suffixes, and partial matches', () => {
      const valid = getAdminPassword();
      expect(verifyAdminPassword(valid.slice(0, -1))).toBe(false);
      expect(verifyAdminPassword(valid.slice(1))).toBe(false);
      expect(verifyAdminPassword(valid + '_suffix')).toBe(false);
      expect(verifyAdminPassword('prefix_' + valid)).toBe(false);
    });

    it('STRESS-PWD-05: rejects dangerous injection strings as passwords', () => {
      const injections = [
        "' OR '1'='1",
        "admin'--",
        "'; DROP TABLE orders; --",
        "\" or \"\"=\"",
        "<script>alert(1)</script>",
        "{{7*7}}",
        "${process.env.ADMIN_PASSWORD}",
        "`rm -rf /`",
        "admin\0password",
        "\\x00",
      ];

      for (const injection of injections) {
        expect(verifyAdminPassword(injection)).toBe(false);
      }
    });

    it('STRESS-PWD-06: rejects non-string and boundary types safely', () => {
      expect(verifyAdminPassword('')).toBe(false);
      expect(verifyAdminPassword('   ')).toBe(false);
      expect(verifyAdminPassword(null as any)).toBe(false);
      expect(verifyAdminPassword(undefined as any)).toBe(false);
      expect(verifyAdminPassword(123456 as any)).toBe(false);
      expect(verifyAdminPassword({ password: 'roby_admin_dev_2026' } as any)).toBe(false);
      expect(verifyAdminPassword(['roby_admin_dev_2026'] as any)).toBe(false);
    });

    it('STRESS-PWD-07: accurately switches expected password when ADMIN_PASSWORD is set or changed', () => {
      process.env.ADMIN_PASSWORD = 'ultra_secret_custom_production_pass_2026';
      expect(verifyAdminPassword('ultra_secret_custom_production_pass_2026')).toBe(true);
      expect(verifyAdminPassword('roby_admin_dev_2026')).toBe(false);

      // Empty string in env should fall back to default
      process.env.ADMIN_PASSWORD = '';
      expect(verifyAdminPassword('roby_admin_dev_2026')).toBe(true);
    });
  });

  // =========================================================================
  // SUITE 3: Session Token Cryptography Adversarial Stress
  // =========================================================================
  describe('Suite 3: Session Token Generation & Verification Cryptographic Attacks', () => {
    it('STRESS-TOK-01: rejects tokens with altered payload characters (bit-flip attack)', async () => {
      const token = await createSessionToken();
      const [payloadB64, sig] = token.split('.');

      // Mutate the middle character of payload
      const mid = Math.floor(payloadB64.length / 2);
      const replacementChar = payloadB64[mid] === 'A' ? 'B' : 'A';
      const tamperedPayload =
        payloadB64.slice(0, mid) + replacementChar + payloadB64.slice(mid + 1);

      const tamperedToken = `${tamperedPayload}.${sig}`;
      const result = await verifySessionToken(tamperedToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('invalid_signature');
    });

    it('STRESS-TOK-02: rejects tokens with altered signature characters at start, middle, and end', async () => {
      const token = await createSessionToken();
      const [payloadB64, sig] = token.split('.');

      // 1. Flip first char
      const flippedFirst = (sig[0] === '0' ? '1' : '0') + sig.slice(1);
      expect((await verifySessionToken(`${payloadB64}.${flippedFirst}`)).valid).toBe(false);

      // 2. Flip middle char
      const mid = Math.floor(sig.length / 2);
      const flippedMid =
        sig.slice(0, mid) + (sig[mid] === '0' ? '1' : '0') + sig.slice(mid + 1);
      expect((await verifySessionToken(`${payloadB64}.${flippedMid}`)).valid).toBe(false);

      // 3. Flip last char
      const flippedLast = sig.slice(0, -1) + (sig[sig.length - 1] === '0' ? '1' : '0');
      expect((await verifySessionToken(`${payloadB64}.${flippedLast}`)).valid).toBe(false);
    });

    it('STRESS-TOK-03: rejects truncated signatures and extended signatures', async () => {
      const token = await createSessionToken();
      const [payloadB64, sig] = token.split('.');

      // Truncated (63 chars)
      expect((await verifySessionToken(`${payloadB64}.${sig.slice(0, -1)}`)).valid).toBe(false);
      // Truncated (half length)
      expect((await verifySessionToken(`${payloadB64}.${sig.slice(0, 32)}`)).valid).toBe(false);
      // Extended (65 chars)
      expect((await verifySessionToken(`${payloadB64}.${sig}0`)).valid).toBe(false);
    });

    it('STRESS-TOK-04: rejects tokens with invalid delimiter structures', async () => {
      const token = await createSessionToken();
      const [payloadB64, sig] = token.split('.');

      const malformedTokens = [
        '',
        '.',
        '..',
        '...',
        `${payloadB64}`,
        `${payloadB64}.`,
        `.${sig}`,
        `${payloadB64}.${sig}.`,
        `${payloadB64}.${sig}.extra`,
        `${payloadB64}..${sig}`,
        `Bearer ${payloadB64}.${sig}`,
      ];

      for (const mToken of malformedTokens) {
        const result = await verifySessionToken(mToken);
        expect(result.valid).toBe(false);
      }
    });

    it('STRESS-TOK-05: rejects tokens with non-base64url characters in payload', async () => {
      const token = await createSessionToken();
      const [, sig] = token.split('.');

      const invalidPayloads = [
        'not valid b64?!@#',
        'bad/slash+plus==',
        ' spaces in b64 ',
        'الفاخر_عربي',
      ];

      for (const badPayload of invalidPayloads) {
        const result = await verifySessionToken(`${badPayload}.${sig}`);
        expect(result.valid).toBe(false);
      }
    });

    it('STRESS-TOK-06: rejects expired tokens and boundary timestamps', async () => {
      const now = Date.now();

      // Expired 1 millisecond ago
      const tokenJustExpired = await createSessionToken({ exp: now - 1 });
      const res1 = await verifySessionToken(tokenJustExpired);
      expect(res1.valid).toBe(false);
      expect(res1.error).toBe('expired');

      // Negative timestamp
      const tokenNegative = await createSessionToken({ exp: -1000 });
      const res2 = await verifySessionToken(tokenNegative);
      expect(res2.valid).toBe(false);
      expect(res2.error).toBe('expired');

      // Zero timestamp (1970-01-01)
      const tokenZero = await createSessionToken({ exp: 0 });
      const res3 = await verifySessionToken(tokenZero);
      expect(res3.valid).toBe(false);
      expect(res3.error).toBe('expired');

      // Valid future token
      const tokenValidFuture = await createSessionToken({ exp: now + 60000 });
      const res4 = await verifySessionToken(tokenValidFuture);
      expect(res4.valid).toBe(true);
      expect(res4.payload?.role).toBe('admin');
    });

    it('STRESS-TOK-07: rejects unauthorized roles and role escalation attempts', async () => {
      const unauthorizedRoles = [
        'customer',
        'user',
        'guest',
        'operator',
        'ADMIN', // uppercase
        'admin ', // whitespace
        ' superadmin',
        null,
        undefined,
        1,
      ];

      for (const role of unauthorizedRoles) {
        const token = await createSessionToken({ role: role as any });
        const result = await verifySessionToken(token);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('unauthorized_role');
      }
    });

    it('STRESS-TOK-08: rejects tokens when server secret changes (key rotation test)', async () => {
      process.env.ADMIN_SESSION_SECRET = 'secret_key_generation_A_12345';
      const tokenA = await createSessionToken();

      // Verify token A is valid under Secret A
      expect((await verifySessionToken(tokenA)).valid).toBe(true);

      // Rotate secret to Secret B
      process.env.ADMIN_SESSION_SECRET = 'secret_key_generation_B_67890';

      // Token A must now be rejected
      const result = await verifySessionToken(tokenA);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('invalid_signature');
    });
  });

  // =========================================================================
  // SUITE 4: Admin API Endpoints Adversarial Stress
  // =========================================================================
  describe('Suite 4: Admin API Endpoints Adversarial Attack Simulation', () => {
    describe('POST /api/admin/login', () => {
      it('STRESS-API-01: handles unparseable and malformed JSON body without 500 crash', async () => {
        const malformedBodies = [
          '{"password":',
          'not a json string',
          '{"password": "test",,}',
          '<xml><password>test</password></xml>',
        ];

        for (const badBody of malformedBodies) {
          const req = new Request('http://localhost:3000/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: badBody,
          });

          const res = await loginHandler(req);
          expect(res.status).toBe(400);
          const data = await res.json();
          expect(data.success).toBe(false);
          expect(data.error).toBe('يرجى إدخال كلمة المرور');
        }
      });

      it('STRESS-API-02: handles completely empty request body', async () => {
        const req = new Request('http://localhost:3000/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '',
        });

        const res = await loginHandler(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.success).toBe(false);
      });

      it('STRESS-API-03: rejects SQL injection, XSS, and shell payloads with 401 (not 500)', async () => {
        const attackPayloads = [
          "' OR '1'='1",
          "' UNION SELECT null, null, null--",
          "admin' AND 1=1--",
          "'; DROP TABLE orders; --",
          "<script>alert('xss')</script>",
          "& whoami",
          "$(cat /etc/passwd)",
        ];

        for (const attack of attackPayloads) {
          const req = new Request('http://localhost:3000/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: attack }),
          });

          const res = await loginHandler(req);
          expect(res.status).toBe(401);
          const data = await res.json();
          expect(data.success).toBe(false);
          expect(data.error).toContain('كلمة المرور غير صحيحة');
        }
      });

      it('STRESS-API-04: handles oversized password payload (100,000 chars) gracefully without OOM', async () => {
        const giantPassword = 'A'.repeat(100000);
        const req = new Request('http://localhost:3000/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: giantPassword }),
        });

        const res = await loginHandler(req);
        expect(res.status).toBe(401);
        const data = await res.json();
        expect(data.success).toBe(false);
      });

      it('STRESS-API-05: survives high-frequency sequential login attempts (50 rapid requests)', async () => {
        const validPassword = getAdminPassword();

        for (let i = 0; i < 50; i++) {
          const isCorrect = i % 2 === 0;
          const req = new Request('http://localhost:3000/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              password: isCorrect ? validPassword : `wrong_password_${i}`,
            }),
          });

          const res = await loginHandler(req);
          if (isCorrect) {
            expect(res.status).toBe(200);
            expect(res.headers.get('set-cookie')).toContain(ADMIN_COOKIE_NAME);
          } else {
            expect(res.status).toBe(401);
          }
        }
      });
    });

    describe('POST /api/admin/logout', () => {
      it('STRESS-API-06: consistently terminates session and sets cookie max-age to 0', async () => {
        const res = await logoutHandler();
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);

        const cookieHeader = res.headers.get('set-cookie');
        expect(cookieHeader).toBeTruthy();
        expect(cookieHeader).toContain(ADMIN_COOKIE_NAME);
        expect(cookieHeader).toContain('Max-Age=0');
      });
    });

    describe('GET /api/admin/session', () => {
      it('STRESS-API-07: handles injection strings and corrupted cookies safely', async () => {
        const maliciousCookies = [
          `${ADMIN_COOKIE_NAME}=' OR '1'='1`,
          `${ADMIN_COOKIE_NAME}=<script>alert(1)</script>`,
          `${ADMIN_COOKIE_NAME}=../../../etc/passwd`,
          `${ADMIN_COOKIE_NAME}=null`,
          `${ADMIN_COOKIE_NAME}=undefined`,
          `${ADMIN_COOKIE_NAME}=`,
        ];

        for (const cookie of maliciousCookies) {
          const req = new NextRequest('http://localhost:3000/api/admin/session', {
            headers: { cookie },
          });

          const res = await sessionHandler(req);
          expect(res.status).toBe(401);
          const data = await res.json();
          expect(data.authenticated).toBe(false);
        }
      });

      it('STRESS-API-08: returns verified session details for valid active token', async () => {
        const token = await createSessionToken();
        const req = new NextRequest('http://localhost:3000/api/admin/session', {
          headers: {
            cookie: `${ADMIN_COOKIE_NAME}=${token}`,
          },
        });

        const res = await sessionHandler(req);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.authenticated).toBe(true);
        expect(data.role).toBe('admin');
        expect(data.expiresAt).toBeGreaterThan(Date.now());
      });
    });
  });

  // =========================================================================
  // SUITE 5: Edge Middleware Adversarial & Boundary Stress
  // =========================================================================
  describe('Suite 5: Edge Middleware Route Protection Adversarial Stress', () => {
    it('STRESS-MID-01: prevents path traversal and bypass attempts', async () => {
      const suspiciousPaths = [
        'http://localhost:3000/admin/../admin',
        'http://localhost:3000/admin/products/../../admin/settings',
        'http://localhost:3000/admin/login/../../admin',
      ];

      for (const url of suspiciousPaths) {
        const req = new NextRequest(url);
        const res = await middleware(req);
        // Any request to /admin (without valid auth cookie) must redirect to /admin/login
        if (req.nextUrl.pathname.startsWith('/admin') && req.nextUrl.pathname !== '/admin/login') {
          expect(res.status).toBe(307);
          expect(res.headers.get('location')).toContain('/admin/login');
        }
      }
    });

    it('STRESS-MID-02: automatically strips and purges corrupted session cookie on unauthenticated redirect', async () => {
      const req = new NextRequest('http://localhost:3000/admin/settings', {
        headers: {
          cookie: `${ADMIN_COOKIE_NAME}=attacker_tampered_cookie_value.123456`,
        },
      });

      const res = await middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toContain('/admin/login');

      // Verify that Set-Cookie instructs the client to delete the invalid cookie
      const setCookie = res.headers.get('set-cookie');
      expect(setCookie).toBeTruthy();
      expect(setCookie).toContain(ADMIN_COOKIE_NAME);
      expect(setCookie).toMatch(/(Expires=Thu, 01 Jan 1970|Max-Age=0)/);
    });

    it('STRESS-MID-03: preserves complex redirect parameters across subpath redirects', async () => {
      const req = new NextRequest('http://localhost:3000/admin/products/new');
      const res = await middleware(req);
      expect(res.status).toBe(307);
      const location = res.headers.get('location');
      expect(location).toContain('/admin/login?redirect=%2Fadmin%2Fproducts%2Fnew');
    });

    it('STRESS-MID-04: prevents authenticated users from re-entering /admin/login', async () => {
      const token = await createSessionToken();
      const req = new NextRequest('http://localhost:3000/admin/login', {
        headers: {
          cookie: `${ADMIN_COOKIE_NAME}=${token}`,
        },
      });

      const res = await middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe('http://localhost:3000/admin');
    });
  });
});
