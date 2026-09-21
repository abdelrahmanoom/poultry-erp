import { NextResponse } from 'next/server';
import { tenantLogout } from '@/lib/tenant-auth';

export async function POST() {
  await tenantLogout();
  const response = NextResponse.json({ success: true });
  response.cookies.delete('tenant_token');
  return response;
}