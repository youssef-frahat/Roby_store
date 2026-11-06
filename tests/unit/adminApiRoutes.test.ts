/**
 * Roby Store - Admin API Handlers Test Suite
 * Location: tests/unit/adminApiRoutes.test.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { POST as loginHandler } from '@/app/api/admin/login/route';
import { POST as logoutHandler } from '@/app/api/admin/logout/route';
import { GET as sessionHandler } from '@/app/api/admin/session/route';
import {
  ADMIN_COOKIE_NAME,
  createSessionToken,
  getAdminPassword,
} from '@/utils/adminAuth';
import { NextRequest } from 'next/server';

describe('Admin Authentication API Route Handlers', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('POST /api/admin/login', () => {
    it('returns 400 when body is empty or password is missing', async () => {
      const req = new Request('http://localhost:3000/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const res = await loginHandler(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('يرجى إدخال كلمة المرور');
    });

    it('returns 401 when password is wrong', async () => {
      const req = new Request('http://localhost:3000/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'completely_wrong_password' }),
      });

      const res = await loginHandler(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('كلمة المرور غير صحيحة');
    });

    it('returns 200 and sets httpOnly session cookie when password matches', async () => {
      const expectedPassword = getAdminPassword();
      const req = new Request('http://localhost:3000/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: expectedPassword }),
      });

      const res = await loginHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);

      const cookieHeader = res.headers.get('set-cookie');
      expect(cookieHeader).toBeTruthy();
      expect(cookieHeader).toContain(ADMIN_COOKIE_NAME);
      expect(cookieHeader).toContain('Path=/');
      expect(cookieHeader).toContain('HttpOnly');
    });
  });

  describe('POST /api/admin/logout', () => {
    it('clears session cookie and returns 200', async () => {
      const res = await logoutHandler();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe('تم تسجيل الخروج بنجاح');

      const cookieHeader = res.headers.get('set-cookie');
      expect(cookieHeader).toBeTruthy();
      expect(cookieHeader).toContain(ADMIN_COOKIE_NAME);
      expect(cookieHeader).toContain('Max-Age=0');
    });
  });

  describe('GET /api/admin/session', () => {
    it('returns 401 authenticated: false when session cookie is absent', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/session');
      const res = await sessionHandler(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.authenticated).toBe(false);
    });

    it('returns 200 and authenticated: true when valid session cookie is present', async () => {
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
      expect(typeof data.expiresAt).toBe('number');
    });

    it('returns 401 when session cookie is invalid or tampered', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/session', {
        headers: {
          cookie: `${ADMIN_COOKIE_NAME}=invalid.token.here`,
        },
      });

      const res = await sessionHandler(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.authenticated).toBe(false);
    });
  });
});
