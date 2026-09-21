import { NextResponse } from 'next/server';
import { getCurrentMaster, changeMasterPassword } from '@/lib/master-auth';

export async function POST(request: Request) {
  const master = await getCurrentMaster();
  if (!master) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  }

  const { newPassword } = await request.json();
  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json({ error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' }, { status: 400 });
  }

  const result = await changeMasterPassword(master.id, newPassword);
  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}