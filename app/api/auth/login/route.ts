import { NextResponse } from 'next/server';
import { tenantLogin } from '@/lib/tenant-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAction } from '@/lib/audit';
import { signTenantJWT } from '@/lib/jwt';

const supabaseAdmin = createAdminClient();

const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;

async function logAttempt(identifier: string, ip: string, success: boolean, ua: string) {
  await supabaseAdmin.from('login_attempts').insert([{
    identifier,
    ip_address: ip,
    success,
    user_agent: ua,
  }]);
}

async function isRateLimited(identifier: string, ip: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();
  const { count: userFails } = await supabaseAdmin
    .from('login_attempts').select('*', { count: 'exact', head: true })
    .eq('identifier', identifier).eq('success', false).gte('created_at', since);
  const { count: ipFails } = await supabaseAdmin
    .from('login_attempts').select('*', { count: 'exact', head: true })
    .eq('ip_address', ip).eq('success', false).gte('created_at', since);
  return (userFails || 0) >= MAX_ATTEMPTS || (ipFails || 0) >= MAX_ATTEMPTS * 2;
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const ua = request.headers.get('user-agent') || 'unknown';

  try {
    const body = await request.json();
    const { username, password, slug } = body;

    if (!username || !password) {
      return NextResponse.json({ success: false, error: 'اسم المستخدم وكلمة المرور مطلوبان' }, { status: 400 });
    }

    if (await isRateLimited(username, ip)) {
      await logAttempt(username, ip, false, ua);
      return NextResponse.json({
        success: false,
        error: 'محاولات دخول كثيرة — حاول بعد 15 دقيقة'
      }, { status: 429 });
    }

    const result = await tenantLogin(username, password, slug);

    if (!result.success) {
      await logAttempt(username, ip, false, ua);
      await logAction({
        action: 'login_failed',
        userName: username,
        entityType: 'auth',
        details: { reason: result.error, slug: slug || null },
        ipAddress: ip,
      });
      return NextResponse.json(result, { status: 401 });
    }

    await logAttempt(username, ip, true, ua);
    await logAction({
      tenantId: result.user?.tenant_id,
      userId: result.user?.id,
      userName: result.user?.username || username,
      action: 'login',
      entityType: 'auth',
      details: { slug: slug || null },
      ipAddress: ip,
    });

    const jwtToken = signTenantJWT({
      tenant_id: result.user!.tenant_id,
      user_id: result.user!.id,
      username: result.user!.username,
    });

    const response = NextResponse.json({ success: true, user: result.user });

    response.cookies.set('tenant_token', result.token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    response.cookies.set('tenant_jwt', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    if (result.user?.tenant_slug) {
      response.cookies.set('tenant_slug', result.user.tenant_slug, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      });
    }

    return response;
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
