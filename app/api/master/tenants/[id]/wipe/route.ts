import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentMaster } from '@/lib/master-auth';
import { logAction, getRequestIp } from '@/lib/audit';

function getSupabaseAdmin() {
  return createAdminClient();
}

const TABLES = [
  'archives', 'sales_items', 'yield_processing', 'ready_purchases',
  'inventory_adjustments', 'inventory_lots', 'financial_vouchers',
  'sales_invoices', 'batches', 'pathway_products', 'slaughter_pathways',
  'market_prices', 'customers', 'suppliers', 'treasury_accounts',
  'inventory', 'system_settings'
];

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ip = getRequestIp(request);
  const master = await getCurrentMaster();
  if (!master) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const { id } = await params;
  const tenantId = Number(id);
  if (!tenantId || isNaN(tenantId)) return NextResponse.json({ error: 'رقم غير صحيح' }, { status: 400 });
  // فحص الحماية الديناميكية
  const { data: tenant } = await getSupabaseAdmin()
    .from('tenants')
    .select('is_protected, name')
    .eq('id', tenantId)
    .maybeSingle();

  if (!tenant) {
    return NextResponse.json({ error: 'النشاط غير موجود' }, { status: 404 });
  }

  if (tenant.is_protected) {
    return NextResponse.json({
      error: 'النشاط محمي — أزل الحماية أولاً',
      isProtected: true,
    }, { status: 403 });
  }

  const errors: any[] = [];
  for (const table of TABLES) {
    const { error } = await getSupabaseAdmin().from(table).delete().eq('tenant_id', tenantId);
    if (error) errors.push({ table, error: error.message });
  }

  await getSupabaseAdmin()
    .from('system_users')
    .delete()
    .eq('tenant_id', tenantId)
    .neq('role', 'admin');

  await getSupabaseAdmin().from('tenant_sessions').delete().eq('tenant_id', tenantId);

  await logAction({
    tenantId: tenantId,
    userId: master.id,
    userName: master.full_name,
    action: 'wipe',
    entityType: 'tenant',
    entityId: tenantId,
    details: { tables_wiped: TABLES.length, errors_count: errors.length },
    ipAddress: ip,
  });

  if (errors.length > 0) {
    return NextResponse.json({ success: false, errors: errors.slice(0, 3) }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
