import { createClient } from '@supabase/supabase-js';

/**
 * عميل Admin — يستخدم SUPABASE_SECRET_KEY
 * يتجاوز RLS — للاستخدام في API routes (server-side فقط)
 * ⚠️ لا تستخدمه في client components
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('SUPABASE_SECRET_KEY أو URL غير معرّف');
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
