import { NextResponse } from 'next/server';
import { tenantLogin } from '@/lib/tenant-auth';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ success: false, error: 'اسم المستخدم وكلمة المرور مطلوبان' }, { status: 400 });
    }

    const result = await tenantLogin(username, password);

    if (!result.success) {
      return NextResponse.json(result, { status: 401 });
    }

    const response = NextResponse.json({ success: true, user: result.user });
    response.cookies.set('tenant_token', result.token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}