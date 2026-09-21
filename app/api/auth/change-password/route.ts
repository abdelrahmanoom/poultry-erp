import { NextResponse } from 'next/server';
import { getCurrentTenantUser, changeUserPassword } from '@/lib/tenant-auth';

export async function POST(request: Request) {
  const user = await getCurrentTenantUser();
  if (!user) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  }

  const { currentPassword, newPassword } = await request.json();
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'كلمتا المرور مطلوبتان' }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل' }, { status: 400 });
  }

  const result = await changeUserPassword(user.id, currentPassword, newPassword);
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}