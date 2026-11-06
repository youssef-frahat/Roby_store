/**
 * Roby Store - Admin Edge Middleware Test Suite
 * Location: tests/unit/adminMiddleware.test.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { middleware } from '@/middleware';
import { NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, createSessionToken } from '@/utils/adminAuth';

describe('Admin Route Guard Middleware (src/middleware.ts)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('allows unauthenticated requests to public storefront routes', async () => {
    const req = new NextRequest('http://localhost:3000/catalog');
    const res = await middleware(req);
    // NextResponse.next() returns a response without redirect location
    expect(res.headers.get('location')).toBeNull();
  });

  it('allows unauthenticated access to /admin/login', async () => {
    const req = new NextRequest('http://localhost:3000/admin/login');
    const res = await middleware(req);
    expect(res.headers.get('location')).toBeNull();
  });

  it('redirects unauthenticated access to /admin to /admin/login', async () => {
    const req = new NextRequest('http://localhost:3000/admin');
    const res = await middleware(req);
    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toContain('/admin/login');
  });

  it('redirects unauthenticated access to sub-route with redirect parameter', async () => {
    const req = new NextRequest('http://localhost:3000/admin/settings');
    const res = await middleware(req);
    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toContain('/admin/login');
    expect(location).toContain('redirect=%2Fadmin%2Fsettings');
  });

  it('clears invalid or expired cookie on unauthenticated redirect', async () => {
    const req = new NextRequest('http://localhost:3000/admin', {
      headers: {
        cookie: `${ADMIN_COOKIE_NAME}=tampered.cookie.value`,
      },
    });

    const res = await middleware(req);
    expect(res.status).toBe(307);
    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain(ADMIN_COOKIE_NAME);
    expect(setCookie).toMatch(/(Expires=Thu, 01 Jan 1970|Max-Age=0)/);
  });


  it('redirects authenticated visits to /admin/login back to /admin', async () => {
    const validToken = await createSessionToken();
    const req = new NextRequest('http://localhost:3000/admin/login', {
      headers: {
        cookie: `${ADMIN_COOKIE_NAME}=${validToken}`,
      },
    });

    const res = await middleware(req);
    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toBe('http://localhost:3000/admin');
  });

  it('allows authenticated visits to protected admin routes', async () => {
    const validToken = await createSessionToken();
    const req = new NextRequest('http://localhost:3000/admin/settings', {
      headers: {
        cookie: `${ADMIN_COOKIE_NAME}=${validToken}`,
      },
    });

    const res = await middleware(req);
    expect(res.headers.get('location')).toBeNull();
  });
});
