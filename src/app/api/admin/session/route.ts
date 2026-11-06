import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken, ADMIN_COOKIE_NAME } from '@/utils/adminAuth';

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const { valid, payload } = await verifySessionToken(sessionCookie);

  if (!valid || !payload) {
    return NextResponse.json(
      { authenticated: false },
      { status: 401 }
    );
  }

  return NextResponse.json(
    {
      authenticated: true,
      role: payload.role,
      expiresAt: payload.exp,
    },
    { status: 200 }
  );
}
