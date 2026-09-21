import { NextResponse } from 'next/server';
import { getCurrentTenantUser } from '@/lib/tenant-auth';

export async function GET() {
  const user = await getCurrentTenantUser();
  if (!user) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  }
  return NextResponse.json({ user });
}