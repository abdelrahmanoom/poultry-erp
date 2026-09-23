import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentMaster } from '@/lib/master-auth';
import { logAction, getRequestIp } from '@/lib/audit';

const supabaseAdmin = createAdminClient();

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ip = getRequestIp(request);
  const master = await getCurrentMaster();
  if (!master) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const { id } = await params;
  const tenantId = Number(id);
  if (!tenantId || isNaN(tenantId)) {
    return NextResponse.json({ error: 'رقم غير صحيح' }, { status: 400 });
  }

  const body = await request.json();
  const { is_protected } = body;

  if (typeof is_protected !== 'boolean') {
    return NextResponse.json({ error: 'قيمة is_protected مطلوبة' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('tenants')
    .update({ is_protected })
    .eq('id', tenantId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAction({
    tenantId,
    userId: master.id,
    userName: master.full_name,
    action: 'update',
    entityType: 'tenant_protection',
    entityId: tenantId,
    details: { is_protected },
    ipAddress: ip,
  });

  return NextResponse.json({ success: true, is_protected });
}
