import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export type AuditAction =
  | 'login'
  | 'logout'
  | 'login_failed'
  | 'create'
  | 'update'
  | 'delete'
  | 'cancel'
  | 'wipe'
  | 'reset_password'
  | 'readonly_toggle'
  | 'payment_received'
  | 'payment_sent'
  | 'batch_created'
  | 'invoice_created'
  | 'invoice_cancelled';

interface LogParams {
  tenantId?: number | null;
  userId?: number | null;
  userName?: string | null;
  action: AuditAction;
  entityType?: string;
  entityId?: string | number;
  details?: Record<string, any>;
  ipAddress?: string;
}

export async function logAction(params: LogParams) {
  try {
    await supabase.from('audit_log').insert([{
      tenant_id: params.tenantId ?? null,
      user_id: params.userId ?? null,
      user_name: params.userName ?? null,
      action: params.action,
      entity_type: params.entityType ?? null,
      entity_id: params.entityId ? String(params.entityId) : null,
      details: params.details ?? null,
      ip_address: params.ipAddress ?? null,
    }]);
  } catch (err) {
    // لا نفشل العملية الأساسية بسبب فشل التسجيل
    console.error('[audit]', err);
  }
}

/**
 * Helper من الطلب — يستخرج IP
 */
export function getRequestIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}
