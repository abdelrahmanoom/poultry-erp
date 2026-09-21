import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ============================================================
// TENANT AUTH (Business Users)
// ============================================================

export interface TenantUser {
  id: number;
  username: string;
  full_name: string;
  role: string;
  permissions: any;
  tenant_id: number;
  tenant_name?: string;
  tenant_slug?: string;
  is_read_only?: boolean;
}

/**
 * تسجيل دخول Business
 * - يبحث عن المستخدم في كل الـ tenants
 * - يدعم bcrypt وكلمات المرور القديمة (نص واضح) مؤقتاً
 */
export async function tenantLogin(username: string, password: string, slug?: string) {
  let tenantFilterId: number | null = null;

  // إذا أُرسل slug → حدد النشاط أولاً
  if (slug && slug.trim()) {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, name, is_active')
      .eq('slug', slug.trim().toLowerCase())
      .eq('is_active', true)
      .maybeSingle();

    if (!tenant) {
      return { success: false, error: 'النشاط غير موجود أو غير مفعّل' };
    }
    tenantFilterId = tenant.id;
  }

  let query = supabase
    .from('system_users')
    .select('*')
    .eq('username', username.trim())
    .eq('is_active', true);

  if (tenantFilterId !== null) {
    query = query.eq('tenant_id', tenantFilterId);
  }

  const { data: users, error } = await query;

  if (error || !users || users.length === 0) {
    return { success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
  }

  // جرّب كل مستخدم بنفس الاسم (قد يكون في tenants مختلفة)
  let matchedUser: any = null;
  for (const u of users) {
    let valid = false;
    // bcrypt hash?
    if (u.password_hash.startsWith('$2a$') || u.password_hash.startsWith('$2b$')) {
      valid = await bcrypt.compare(password, u.password_hash);
    } else {
      // كلمة مرور قديمة (نص واضح) — تُرقّى تلقائياً
      valid = u.password_hash === password;
      if (valid) {
        // ترقية تلقائية إلى bcrypt
        const newHash = await bcrypt.hash(password, 10);
        await supabase.from('system_users').update({ password_hash: newHash }).eq('id', u.id);
      }
    }
    if (valid) {
      matchedUser = u;
      break;
    }
  }

  if (!matchedUser) {
    return { success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
  }

  // جلب اسم الـ tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, slug, is_read_only')
    .eq('id', matchedUser.tenant_id)
    .eq('is_active', true)
    .maybeSingle();

  if (!tenant) {
    return { success: false, error: 'النشاط التجاري غير مفعّل' };
  }

  // إنشاء session token
  const token = crypto.randomUUID() + '-' + Date.now();

  const { error: sessErr } = await supabase.from('tenant_sessions').insert([{
    tenant_id: matchedUser.tenant_id,
    user_id: matchedUser.id,
    token,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  }]);

  if (sessErr) {
    return { success: false, error: 'خطأ في إنشاء الجلسة: ' + sessErr.message };
  }

  return {
    success: true,
    token,
    user: {
      id: matchedUser.id,
      username: matchedUser.username,
      full_name: matchedUser.full_name,
      role: matchedUser.role,
      permissions: matchedUser.permissions,
      tenant_id: matchedUser.tenant_id,
      tenant_name: tenant.name,
      tenant_slug: tenant.slug,
      is_read_only: tenant.is_read_only || false,
    } as TenantUser,
  };
}

/**
 * الحصول على المستخدم الحالي من الكوكي
 */
export async function getCurrentTenantUser(): Promise<TenantUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('tenant_token')?.value;
  if (!token) return null;

  const { data: session } = await supabase
    .from('tenant_sessions')
    .select('user_id, tenant_id, expires_at, last_activity')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (!session) return null;

  // فحص الخمول — 30 دقيقة
  const IDLE_LIMIT_MS = 30 * 60 * 1000;
  const lastActivity = session.last_activity ? new Date(session.last_activity).getTime() : Date.now();
  if (Date.now() - lastActivity > IDLE_LIMIT_MS) {
    await supabase.from('tenant_sessions').delete().eq('token', token);
    return null;
  }

  const { data: user } = await supabase
    .from('system_users')
    .select('id, username, full_name, role, permissions, tenant_id, is_active')
    .eq('id', session.user_id)
    .eq('is_active', true)
    .maybeSingle();

  if (!user) return null;

  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, slug, is_read_only')
    .eq('id', user.tenant_id)
    .maybeSingle();

  // تحديث last_activity
  await supabase.from('tenant_sessions').update({ last_activity: new Date().toISOString() }).eq('token', token);

  return {
    ...user,
    tenant_name: tenant?.name,
    tenant_slug: tenant?.slug,
    is_read_only: tenant?.is_read_only || false,
  } as TenantUser;
}

/**
 * تسجيل الخروج
 */
export async function tenantLogout() {
  const cookieStore = await cookies();
  const token = cookieStore.get('tenant_token')?.value;
  if (token) {
    await supabase.from('tenant_sessions').delete().eq('token', token);
  }
}

/**
 * تغيير كلمة مرور المستخدم
 */
export async function changeUserPassword(userId: number, currentPassword: string, newPassword: string) {
  const { data: user } = await supabase.from('system_users').select('password_hash').eq('id', userId).maybeSingle();
  if (!user) return { success: false, error: 'المستخدم غير موجود' };

  // التحقق من كلمة المرور الحالية
  let valid = false;
  if (user.password_hash.startsWith('$2a$') || user.password_hash.startsWith('$2b$')) {
    valid = await bcrypt.compare(currentPassword, user.password_hash);
  } else {
    valid = user.password_hash === currentPassword;
  }
  if (!valid) return { success: false, error: 'كلمة المرور الحالية غير صحيحة' };

  // تحديث
  const hash = await bcrypt.hash(newPassword, 10);
  const { error } = await supabase.from('system_users').update({ password_hash: hash }).eq('id', userId);
  return { success: !error, error: error?.message };
}