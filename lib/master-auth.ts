import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ============================================================
// MASTER AUTH
// ============================================================

export interface MasterUser {
  id: number;
  email: string;
  full_name: string;
  phone: string | null;
}

/**
 * التحقق من بيانات Master وتسجيل الدخول
 */
export async function masterLogin(email: string, password: string) {
  const { data: user, error } = await supabase
    .from('master_users')
    .select('*')
    .eq('email', email.trim().toLowerCase())
    .eq('is_active', true)
    .maybeSingle();

  if (error || !user) {
    return { success: false, error: 'بيانات الدخول غير صحيحة' };
  }

  // التحقق من كلمة المرور
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return { success: false, error: 'بيانات الدخول غير صحيحة' };
  }

  // إنشاء session token
  const token = crypto.randomUUID() + '-' + Date.now();

  const { error: sessErr } = await supabase.from('master_sessions').insert([{
    master_id: user.id,
    token,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  }]);

  if (sessErr) {
    return { success: false, error: 'خطأ في إنشاء الجلسة' };
  }

  // تحديث last_login
  await supabase.from('master_users').update({ last_login: new Date().toISOString() }).eq('id', user.id);

  return {
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      phone: user.phone,
    } as MasterUser,
  };
}

/**
 * الحصول على Master الحالي من الكوكي
 */
export async function getCurrentMaster(): Promise<MasterUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('master_token')?.value;
  if (!token) return null;

  const { data: session } = await supabase
    .from('master_sessions')
    .select('master_id, expires_at, last_activity')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (!session) return null;

  // فحص الخمول — 30 دقيقة
  const IDLE_LIMIT_MS = 30 * 60 * 1000;
  const lastActivity = session.last_activity ? new Date(session.last_activity).getTime() : Date.now();
  if (Date.now() - lastActivity > IDLE_LIMIT_MS) {
    await supabase.from('master_sessions').delete().eq('token', token);
    return null;
  }

  const { data: user } = await supabase
    .from('master_users')
    .select('id, email, full_name, phone, is_active')
    .eq('id', session.master_id)
    .eq('is_active', true)
    .maybeSingle();

  if (!user) return null;

  // تحديث last_activity
  await supabase.from('master_sessions').update({ last_activity: new Date().toISOString() }).eq('token', token);

  return user as MasterUser;
}

/**
 * تسجيل الخروج
 */
export async function masterLogout() {
  const cookieStore = await cookies();
  const token = cookieStore.get('master_token')?.value;
  if (token) {
    await supabase.from('master_sessions').delete().eq('token', token);
  }
}

/**
 * تغيير كلمة مرور Master
 */
export async function changeMasterPassword(masterId: number, newPassword: string) {
  const hash = await bcrypt.hash(newPassword, 10);
  const { error } = await supabase.from('master_users').update({ password_hash: hash }).eq('id', masterId);
  return { success: !error, error: error?.message };
}