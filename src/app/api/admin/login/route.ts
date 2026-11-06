import { NextResponse } from 'next/server';
import {
  verifyAdminPassword,
  createSessionToken,
  ADMIN_COOKIE_NAME,
  ADMIN_COOKIE_OPTIONS,
} from '@/utils/adminAuth';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body.password !== 'string') {
      return NextResponse.json(
        { success: false, error: 'يرجى إدخال كلمة المرور' },
        { status: 400 }
      );
    }

    const isValid = verifyAdminPassword(body.password);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'كلمة المرور غير صحيحة، يرجى المحاولة مرة أخرى' },
        { status: 401 }
      );
    }

    const token = await createSessionToken();
    const response = NextResponse.json(
      { success: true, message: 'تم تسجيل الدخول بنجاح' },
      { status: 200 }
    );

    response.cookies.set(ADMIN_COOKIE_NAME, token, ADMIN_COOKIE_OPTIONS);
    return response;
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'حدث خطأ داخلي في الخادم أثناء التحقق' },
      { status: 500 }
    );
  }
}
