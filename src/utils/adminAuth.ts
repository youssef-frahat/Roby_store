/**
 * Roby Store - Admin Authentication & Session Cryptography Utility
 * Location: src/utils/adminAuth.ts
 *
 * Implements zero-dependency Web Crypto HMAC-SHA256 session token generation,
 * constant-time password comparison, and session verification.
 * Fully compatible with Next.js Edge Runtime, Node.js server routes, and browser.
 */

export const ADMIN_COOKIE_NAME = 'roby_admin_session';

export const ADMIN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
};

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || 'roby_admin_dev_2026';
}

export function getSessionSecret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_PASSWORD ||
    'roby_store_admin_secret_key_session_2026'
  );
}

/**
 * Constant-time string comparison preventing timing side-channel attacks.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Validates provided administrator password against configured environment variable.
 */
export function verifyAdminPassword(password: string): boolean {
  if (!password || typeof password !== 'string') return false;
  const expected = getAdminPassword();
  return constantTimeEqual(password, expected);
}

/**
 * Base64url encoding safe for Edge runtime, Node.js, and browser.
 */
function toBase64Url(str: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'utf-8').toString('base64url');
  }
  const b64 = btoa(unescape(encodeURIComponent(str)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Base64url decoding safe for Edge runtime, Node.js, and browser.
 */
function fromBase64Url(b64url: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(b64url, 'base64url').toString('utf-8');
  }
  let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) {
    b64 += '=';
  }
  return decodeURIComponent(escape(atob(b64)));
}

/**
 * Computes HMAC-SHA256 digest using zero-dependency Web Crypto API.
 */
async function computeHmac(data: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoSubtle = globalThis.crypto?.subtle;
  if (!cryptoSubtle) {
    throw new Error('Web Crypto API is not available in this runtime environment');
  }
  const key = await cryptoSubtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await cryptoSubtle.sign('HMAC', key, enc.encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export interface AdminSessionPayload {
  role: 'admin';
  iat: number;
  exp: number;
}

/**
 * Generates an HMAC-SHA256 signed session token for administrative access.
 */
export async function createSessionToken(
  customPayload?: Partial<AdminSessionPayload>
): Promise<string> {
  const now = Date.now();
  const payload: AdminSessionPayload = {
    role: 'admin',
    iat: now,
    exp: now + 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    ...customPayload,
  };

  const payloadB64 = toBase64Url(JSON.stringify(payload));
  const secret = getSessionSecret();
  const signature = await computeHmac(payloadB64, secret);

  return `${payloadB64}.${signature}`;
}

/**
 * Verifies authenticity, integrity, and expiration of an administrative session token.
 */
export async function verifySessionToken(
  token: string | null | undefined
): Promise<{ valid: boolean; payload?: AdminSessionPayload; error?: string }> {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'missing_token' };
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false, error: 'malformed_token' };
  }

  const [payloadB64, signature] = parts;
  if (!payloadB64 || !signature) {
    return { valid: false, error: 'malformed_token' };
  }

  const secret = getSessionSecret();
  const expectedSignature = await computeHmac(payloadB64, secret);

  if (!constantTimeEqual(signature, expectedSignature)) {
    return { valid: false, error: 'invalid_signature' };
  }

  try {
    const jsonStr = fromBase64Url(payloadB64);
    const payload = JSON.parse(jsonStr) as AdminSessionPayload;

    if (!payload || typeof payload !== 'object') {
      return { valid: false, error: 'malformed_payload' };
    }

    if (!payload.exp || typeof payload.exp !== 'number' || Date.now() > payload.exp) {
      return { valid: false, error: 'expired' };
    }

    if (payload.role !== 'admin') {
      return { valid: false, error: 'unauthorized_role' };
    }

    return { valid: true, payload };
  } catch (err) {
    return { valid: false, error: 'parse_error' };
  }
}
