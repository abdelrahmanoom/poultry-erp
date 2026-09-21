'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Pencil, Archive, RotateCcw, X, AlertTriangle } from 'lucide-react';

type EntityType = 'customer' | 'supplier' | 'product' | 'treasury';

interface Props {
  entityType: EntityType;
  entity: any;
  onRefresh: () => void | Promise<void>;
  showArchive?: boolean;
}

export default function EntityActions({ entityType, entity, onRefresh, showArchive = true }: Props) {
  const supabase = createClient();
  const [editing, setEditing] = useState<any>(null);
  const [deleting, setDeleting] = useState<any>(null);
  const [usageInfo, setUsageInfo] = useState<{ count: number; label: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const showToast = (msg: string, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const isActive = entity.is_active !== false;

  // ============ EDIT ============
  const openEdit = () => {
    if (entityType === 'customer') setEditing({ name: entity.name, phone: entity.phone || '', credit_limit: entity.credit_limit || 50000 });
    else if (entityType === 'supplier') setEditing({ name: entity.name, phone: entity.phone || '' });
    else if (entityType === 'product') setEditing({ product_name_ar: entity.product_name_ar, pricing_type: entity.pricing_type || 'multiplier', pricing_value: entity.pricing_value || 1, min_margin_percent: entity.min_margin_percent || 0 });
    else if (entityType === 'treasury') setEditing({ name_ar: entity.name_ar, account_type: entity.account_type || 'نقدية سائلة' });
  };

  const saveEdit = async () => {
    setBusy(true);
    let res;
    if (entityType === 'customer') res = await supabase.from('customers').update({ name: editing.name, phone: editing.phone, credit_limit: Number(editing.credit_limit) }).eq('id', entity.id);
    else if (entityType === 'supplier') res = await supabase.from('suppliers').update({ name: editing.name, phone: editing.phone }).eq('id', entity.id);
    else if (entityType === 'product') res = await supabase.from('inventory').update({ product_name_ar: editing.product_name_ar, pricing_type: editing.pricing_type, pricing_value: Number(editing.pricing_value), min_margin_percent: Number(editing.min_margin_percent) }).eq('product_code', entity.product_code);
    else if (entityType === 'treasury') res = await supabase.from('treasury_accounts').update({ name_ar: editing.name_ar, account_type: editing.account_type }).eq('treasury_code', entity.treasury_code);
    setBusy(false);
    if (res?.error) { showToast('خطأ: ' + res.error.message, 'error'); return; }
    setEditing(null);
    showToast('تم التحديث بنجاح');
    await onRefresh();
  };

  // ============ DELETE / ARCHIVE ============
  const requestDelete = async () => {
    let count = 0;
    let label = '';
    if (entityType === 'customer') {
      const { count: ic } = await supabase.from('sales_invoices').select('*', { count: 'exact', head: true }).eq('customer_name', entity.name);
      const { count: vc } = await supabase.from('financial_vouchers').select('*', { count: 'exact', head: true }).eq('entity_name', entity.name);
      count = (ic || 0) + (vc || 0) + (Number(entity.balance) > 0 ? 1 : 0);
      label = 'فاتورة / إيصال';
    } else if (entityType === 'supplier') {
      const { count: bc } = await supabase.from('batches').select('*', { count: 'exact', head: true }).eq('supplier_name', entity.name);
      const { count: vc } = await supabase.from('financial_vouchers').select('*', { count: 'exact', head: true }).eq('entity_name', entity.name);
      count = (bc || 0) + (vc || 0) + (Number(entity.balance) > 0 ? 1 : 0);
      label = 'دفعة / إيصال';
    } else if (entityType === 'product') {
      const { count: sc } = await supabase.from('sales_items').select('*', { count: 'exact', head: true }).eq('product_code', entity.product_code);
      const { count: pc } = await supabase.from('pathway_products').select('*', { count: 'exact', head: true }).eq('product_code', entity.product_code);
      count = (sc || 0) + (pc || 0);
      label = 'بيعة / مسار';
    } else if (entityType === 'treasury') {
      const { count: vc } = await supabase.from('financial_vouchers').select('*', { count: 'exact', head: true }).eq('treasury_code', entity.treasury_code);
      count = vc || 0;
      label = 'إيصال';
    }
    setUsageInfo({ count, label });
    setDeleting(entity);
  };

  const confirmDelete = async () => {
    setBusy(true);
    const archive = (usageInfo?.count || 0) > 0;
    let res;
    if (entityType === 'customer') res = archive ? await supabase.from('customers').update({ is_active: false }).eq('id', entity.id) : await supabase.from('customers').delete().eq('id', entity.id);
    else if (entityType === 'supplier') res = archive ? await supabase.from('suppliers').update({ is_active: false }).eq('id', entity.id) : await supabase.from('suppliers').delete().eq('id', entity.id);
    else if (entityType === 'product') res = archive ? await supabase.from('inventory').update({ is_active: false }).eq('product_code', entity.product_code) : await supabase.from('inventory').delete().eq('product_code', entity.product_code);
    else if (entityType === 'treasury') res = archive ? await supabase.from('treasury_accounts').update({ is_active: false }).eq('treasury_code', entity.treasury_code) : await supabase.from('treasury_accounts').delete().eq('treasury_code', entity.treasury_code);
    setBusy(false);
    if (res?.error) { showToast('خطأ: ' + res.error.message, 'error'); return; }
    setDeleting(null); setUsageInfo(null);
    showToast(archive ? 'تم الأرشفة' : 'تم الحذف');
    await onRefresh();
  };

  const reactivate = async () => {
    setBusy(true);
    let res;
    if (entityType === 'customer') res = await supabase.from('customers').update({ is_active: true }).eq('id', entity.id);
    else if (entityType === 'supplier') res = await supabase.from('suppliers').update({ is_active: true }).eq('id', entity.id);
    else if (entityType === 'product') res = await supabase.from('inventory').update({ is_active: true }).eq('product_code', entity.product_code);
    else if (entityType === 'treasury') res = await supabase.from('treasury_accounts').update({ is_active: true }).eq('treasury_code', entity.treasury_code);
    setBusy(false);
    if (res?.error) { showToast('خطأ: ' + res.error.message, 'error'); return; }
    showToast('تم الاستعادة');
    await onRefresh();
  };

  const typeLabel = entityType === 'customer' ? 'العميل' : entityType === 'supplier' ? 'المورد' : entityType === 'product' ? 'الصنف' : 'الخزينة';

  return (
    <>
      <div className="flex gap-2">
        <button onClick={openEdit} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 h-10 rounded-xl text-xs flex items-center gap-1.5">
          <Pencil className="w-3.5 h-3.5" />
          <span>تعديل</span>
        </button>
        {showArchive && (isActive ? (
          <button onClick={requestDelete} className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-3.5 h-10 rounded-xl text-xs flex items-center gap-1.5"><Archive className="w-3.5 h-3.5" /><span>أرشفة</span></button>
        ) : (
          <button onClick={reactivate} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 h-10 rounded-xl text-xs flex items-center gap-1.5"><RotateCcw className="w-3.5 h-3.5" /><span>استعادة</span></button>
        ))}

        </div>
      {/* ============ EDIT MODAL ============ */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !busy && setEditing(null)}>
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-black text-slate-800">تعديل {typeLabel}</h3>
              <button onClick={() => setEditing(null)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              {entityType === 'customer' && (
                <>
                  <div><label className="block text-xs font-bold text-slate-700 mb-1">الاسم</label><input type="text" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} className="w-full border-2 border-slate-200 rounded-xl px-3 h-10 text-xs font-bold bg-white" /></div>
                  <div><label className="block text-xs font-bold text-slate-700 mb-1">الهاتف</label><input type="text" value={editing.phone} onChange={e => setEditing({ ...editing, phone: e.target.value })} className="w-full border-2 border-slate-200 rounded-xl px-3 h-10 text-xs font-bold bg-white" /></div>
                  <div><label className="block text-xs font-bold text-slate-700 mb-1">سقف الائتمان (ج)</label><input type="number" value={editing.credit_limit} onChange={e => setEditing({ ...editing, credit_limit: e.target.value })} className="w-full border-2 border-slate-200 rounded-xl px-3 h-10 text-xs font-bold bg-white font-mono" /></div>
                </>
              )}
              {entityType === 'supplier' && (
                <>
                  <div><label className="block text-xs font-bold text-slate-700 mb-1">الاسم</label><input type="text" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} className="w-full border-2 border-slate-200 rounded-xl px-3 h-10 text-xs font-bold bg-white" /></div>
                  <div><label className="block text-xs font-bold text-slate-700 mb-1">الهاتف</label><input type="text" value={editing.phone} onChange={e => setEditing({ ...editing, phone: e.target.value })} className="w-full border-2 border-slate-200 rounded-xl px-3 h-10 text-xs font-bold bg-white" /></div>
                </>
              )}
              {entityType === 'product' && (
                <>
                  <div><label className="block text-xs font-bold text-slate-700 mb-1">اسم الصنف</label><input type="text" value={editing.product_name_ar} onChange={e => setEditing({ ...editing, product_name_ar: e.target.value })} className="w-full border-2 border-slate-200 rounded-xl px-3 h-10 text-xs font-bold bg-white" /></div>
                  <div><label className="block text-xs font-bold text-slate-700 mb-1">طريقة التسعير</label>
                    <select value={editing.pricing_type} onChange={e => setEditing({ ...editing, pricing_type: e.target.value })} className="w-full border-2 border-slate-200 rounded-xl px-3 h-10 text-xs font-bold bg-white">
                      <option value="multiplier">ضرب في البورصة</option>
                      <option value="addition">إضافة على البورصة</option>
                      <option value="fixed">سعر ثابت</option>
                    </select>
                  </div>
                  <div><label className="block text-xs font-bold text-slate-700 mb-1">المعامل</label><input type="number" step="0.01" value={editing.pricing_value} onChange={e => setEditing({ ...editing, pricing_value: e.target.value })} className="w-full border-2 border-slate-200 rounded-xl px-3 h-10 text-xs font-bold bg-white font-mono" /></div>
                  <div><label className="block text-xs font-bold text-slate-700 mb-1">هامش الربح الأدنى (%)</label><input type="number" step="0.1" value={editing.min_margin_percent} onChange={e => setEditing({ ...editing, min_margin_percent: e.target.value })} className="w-full border-2 border-slate-200 rounded-xl px-3 h-10 text-xs font-bold bg-white font-mono" /></div>
                </>
              )}
              {entityType === 'treasury' && (
                <>
                  <div><label className="block text-xs font-bold text-slate-700 mb-1">الاسم</label><input type="text" value={editing.name_ar} onChange={e => setEditing({ ...editing, name_ar: e.target.value })} className="w-full border-2 border-slate-200 rounded-xl px-3 h-10 text-xs font-bold bg-white" /></div>
                  <div><label className="block text-xs font-bold text-slate-700 mb-1">النوع</label>
                    <select value={editing.account_type} onChange={e => setEditing({ ...editing, account_type: e.target.value })} className="w-full border-2 border-slate-200 rounded-xl px-3 h-10 text-xs font-bold bg-white">
                      <option value="نقدية سائلة">نقدية سائلة</option>
                      <option value="حساب بنكي">حساب بنكي</option>
                      <option value="محفظة إلكترونية">محفظة إلكترونية</option>
                    </select>
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={saveEdit} disabled={busy} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-xs">{busy ? 'جاري الحفظ...' : 'حفظ التعديلات'}</button>
              <button onClick={() => setEditing(null)} disabled={busy} className="bg-slate-100 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* ============ DELETE / ARCHIVE MODAL ============ */}
      {deleting && usageInfo && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !busy && setDeleting(null)}>
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 text-amber-700 border-b pb-3">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold">{usageInfo.count > 0 ? 'تأكيد الأرشفة' : 'تأكيد الحذف'}</h3>
            </div>
            {usageInfo.count > 0 ? (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-xs font-bold text-amber-900 space-y-1">
                <p>هذا {typeLabel} له <b>{usageInfo.count}</b> {usageInfo.label}.</p>
                <p>سيتم <b>أرشفته</b> — يختفي من القوائم لكن تبقى كل سجلاته.</p>
              </div>
            ) : (
              <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl text-xs font-bold text-rose-900 space-y-1">
                <p>لا يوجد أي حركات لهذا {typeLabel}.</p>
                <p>سيتم <b>حذفه نهائياً</b>. لا يمكن التراجع.</p>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={confirmDelete} disabled={busy} className={'flex-1 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-xs ' + (usageInfo.count > 0 ? 'bg-amber-600 hover:bg-amber-700' : 'bg-rose-600 hover:bg-rose-700')}>{busy ? '...' : usageInfo.count > 0 ? 'تأكيد الأرشفة' : 'تأكيد الحذف'}</button>
              <button onClick={() => { setDeleting(null); setUsageInfo(null); }} disabled={busy} className="bg-slate-100 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* ============ TOAST ============ */}
      {toast && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[70] px-6 py-3 rounded-2xl shadow-2xl border text-sm font-bold ${toast.type === 'success' ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-rose-600 text-white border-rose-400'}`}>
          {toast.msg}
        </div>
      )}
    </>
  );
}
