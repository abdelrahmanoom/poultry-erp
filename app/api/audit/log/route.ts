import { NextResponse } from 'next/server';
import { getCurrentMaster } from '@/lib/master-auth';
import { getCurrentTenantUser } from '@/lib/tenant-auth';
import { logAction, getRequestIp } from '@/lib/audit';

export async function POST(request: Request) {
  const ip = getRequestIp(request);
  const master = await getCurrentMaster();
  const tenantUser = await getCurrentTenantUser();

  if (!master && !tenantUser) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  }

  const body = await request.json();
  const { action, tenantId, entityType, entityId, details } = body;

  if (!action) {
    return NextResponse.json({ error: 'action مطلوب' }, { status: 400 });
  }

  await logAction({
    tenantId: master ? tenantId : tenantUser?.tenant_id,
    userId: master ? master.id : tenantUser?.id,
    userName: master ? master.full_name : tenantUser?.username,
    action,
    entityType,
    entityId,
    details,
    ipAddress: ip,
  });

  return NextResponse.json({ success: true });
}
