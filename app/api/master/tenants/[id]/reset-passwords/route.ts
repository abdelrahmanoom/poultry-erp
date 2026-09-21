import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { getCurrentMaster } from '@/lib/master-auth';
import { logAction, getRequestIp } from '@/lib/audit';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const master = await getCurrentMaster();
  if (!master) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const { id } = await params;
  const tenantId = Number(id);
  if (!tenantId || isNaN(tenantId)) return NextResponse.json({ error: 'رقم غير صحيح' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('system_users')
    .select('id, username, full_name, role, is_active')
    .eq('tenant_id', tenantId)
    .order('id');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ users: data || [] });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const master = await getCurrentMaster();
  if (!master) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const { id } = await params;
  const tenantId = Number(id);
  if (!tenantId || isNaN(tenantId)) return NextResponse.json({ error: 'رقم غير صحيح' }, { status: 400 });

  const { userIds } = await request.json();
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return NextResponse.json({ error: 'لم يتم اختيار أي مستخدم' }, { status: 400 });
  }

  const { data: validUsers } = await supabaseAdmin
    .from('system_users')
    .select('id')
    .eq('tenant_id', tenantId)
    .in('id', userIds);

  if (!validUsers || validUsers.length !== userIds.length) {
    return NextResponse.json({ error: 'بعض المستخدمين لا يتبعون هذا النشاط' }, { status: 400 });
  }

  const hash = await bcrypt.hash('123456', 10);
  const { error } = await supabaseAdmin
    .from('system_users')
    .update({ password_hash: hash })
    .in('id', userIds)
    .eq('tenant_id', tenantId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabaseAdmin.from('tenant_sessions').delete().in('user_id', userIds);

  await logAction({
    tenantId: tenantId,
    userId: master.id,
    userName: master.full_name,
    action: 'reset_password',
    entityType: 'users',
    entityId: tenantId,
    details: { count: userIds.length },
    ipAddress: getRequestIp(request),
  });

  return NextResponse.json({ success: true, count: userIds.length });
}
