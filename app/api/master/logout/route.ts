import { NextResponse } from 'next/server';
import { masterLogout } from '@/lib/master-auth';

export async function POST() {
  await masterLogout();
  const response = NextResponse.json({ success: true });
  response.cookies.delete('master_token');
  return response;
}