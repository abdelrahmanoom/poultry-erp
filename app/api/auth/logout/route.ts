import { NextResponse } from 'next/server';
import { tenantLogout, getCurrentTenantUser } from '@/lib/tenant-auth';
import { logAction, getRequestIp } from '@/lib/audit';

export async function POST(request: Request) {
  const ip = getRequestIp(request);
  const user = await getCurrentTenantUser();
  if (user) {
    await logAction({
      tenantId: user.tenant_id,
      userId: user.id,
      userName: user.username,
      action: 'logout',
      entityType: 'auth',
      ipAddress: ip,
    });
  }
  await tenantLogout();
  const response = NextResponse.json({ success: true });
  response.cookies.delete('tenant_token');
  return response;
}