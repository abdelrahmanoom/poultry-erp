'use client';

/**
 * جلب tenant_id للنشاط الحالي من جلسة localStorage
 * يُستخدم لفلترة كل الاستعلامات من Supabase
 */
export function getCurrentTenantId(): number | null {
  if (typeof window === 'undefined') return null;

  const sessionStr = 
    localStorage.getItem('erp_user_display') ||
    sessionStorage.getItem('erp_user_display') ||
    localStorage.getItem('erp_user_session') ||
    sessionStorage.getItem('erp_user_session');

  if (!sessionStr) return null;

  try {
    const parsed = JSON.parse(sessionStr);
    return parsed.tenant_id ?? null;
  } catch {
    return null;
  }
}

/**
 * جلب بيانات المستخدم الحالي
 */
export function getCurrentUser(): any | null {
  if (typeof window === 'undefined') return null;

  const sessionStr = 
    localStorage.getItem('erp_user_display') ||
    sessionStorage.getItem('erp_user_display') ||
    localStorage.getItem('erp_user_session') ||
    sessionStorage.getItem('erp_user_session');

  if (!sessionStr) return null;

  try {
    return JSON.parse(sessionStr);
  } catch {
    return null;
  }
}
