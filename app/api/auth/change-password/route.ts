import { NextResponse } from 'next/server';
import { getCurrentTenantUser, changeUserPassword } from '@/lib/tenant-auth';
import { createAdminClient } from '@/lib/supabase/admin';

function getSupabase() {
  return createAdminClient();
}

export async function POST(request: Request) {
  const user = await getCurrentTenantUser();
  if (!user) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  }

  const { currentPassword, newPassword } = await request.json();
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'كلمتا المرور مطلوبتان' }, { status: 400 });
  }

  // القاعدة: 8 أحرف على الأقل — بدون شروط أخرى
  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل' }, { status: 400 });
  }

  if (currentPassword === newPassword) {
    return NextResponse.json({ error: 'كلمة المرور الجديدة يجب أن تختلف عن الحالية' }, { status: 400 });
  }

  const result = await changeUserPassword(user.id, currentPassword, newPassword);
  if (!result.success) {
    return NextResponse.json(result, { status: 400 });
  }

  // إلغاء flag الإلزامي
  await getSupabase().from('system_users')
    .update({ must_change_password: false })
    .eq('id', user.id);

  return NextResponse.json({ success: true });
}
