import { NextResponse } from 'next/server';
import { masterLogin } from '@/lib/master-auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'البريد وكلمة المرور مطلوبان' }, { status: 400 });
    }

    const result = await masterLogin(email, password);

    if (!result.success) {
      return NextResponse.json(result, { status: 401 });
    }

    const response = NextResponse.json({ success: true, user: result.user });
    response.cookies.set('master_token', result.token!, {
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