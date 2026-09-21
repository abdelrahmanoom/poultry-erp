'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X, Package, CheckCircle, AlertTriangle } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: (newProduct: any) => void;
  tenantId?: number;
  editProduct?: any;
}

export default function ProductFormModal({ open, onClose, onSuccess, tenantId = 1, editProduct }: Props) {
  const supabase = createClient();
  const [name, setName] = useState('');
  const [type, setType] = useState('multiplier');
  const [value, setValue] = useState('2.8');
  const [allocationWeight, setAllocationWeight] = useState('25');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      if (editProduct) {
        setName(editProduct.product_name_ar || '');
        setType(editProduct.pricing_type || 'multiplier');
        setValue(String(editProduct.pricing_value || 2.8));
        setAllocationWeight(String(Math.round((Number(editProduct.allocation_weight) || 0) * 100)));
      } else {
        setName('');
        setType('multiplier');
        setValue('2.8');
        setAllocationWeight('25');
      }
      setError('');
      setSuccess(false);
    }
  }, [open, editProduct]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || name.trim().length < 2) {
      setError('اسم الصنف مطلوب (حرفان على الأقل)');
      return;
    }

    const aw = Number(allocationWeight) / 100;
    if (isNaN(aw) || aw < 0 || aw > 1) {
      setError('معامل التوزيع يجب أن يكون بين 0% و 100%');
      return;
    }

    const pv = Number(value);
    if (isNaN(pv) || pv <= 0) {
      setError('المعامل يجب أن يكون أكبر من صفر');
      return;
    }

    setSaving(true);

    try {
      if (editProduct) {
        // تحديث
        const { error: updErr } = await supabase
          .from('inventory')
          .update({
            product_name_ar: name.trim(),
            pricing_type: type,
            pricing_value: pv,
            allocation_weight: aw,
          })
          .eq('product_code', editProduct.product_code)
          .eq('tenant_id', tenantId);

        if (updErr) throw updErr;
        setSuccess(true);
        setTimeout(() => {
          onSuccess?.({ ...editProduct, product_name_ar: name.trim(), pricing_type: type, pricing_value: pv, allocation_weight: aw });
          setSuccess(false);
          onClose();
        }, 700);
      } else {
        // تحقق من التكرار
        const { data: existing } = await supabase
          .from('inventory')
          .select('product_code')
          .eq('product_name_ar', name.trim())
          .eq('tenant_id', tenantId)
          .maybeSingle();

        if (existing) {
          setError('يوجد صنف آخر بنفس الاسم');
          setSaving(false);
          return;
        }

        // توليد الكود
        const { data: lastCode } = await supabase
          .from('inventory')
          .select('product_code')
          .eq('tenant_id', tenantId)
          .order('product_code', { ascending: false })
          .limit(1)
          .maybeSingle();

        let nextNum = 1001;
        if (lastCode?.product_code) {
          const m = String(lastCode.product_code).match(/P-(\d+)/);
          if (m) nextNum = parseInt(m[1], 10) + 1;
        }
        const newCode = 'P-' + nextNum;

        const { data, error: insertErr } = await supabase
          .from('inventory')
          .insert([{
            product_code: newCode,
            product_name_ar: name.trim(),
            pricing_type: type,
            pricing_value: pv,
            allocation_weight: aw,
            stock_kg: 0,
            is_active: true,
            tenant_id: tenantId,
          }])
          .select()
          .single();

        if (insertErr) throw insertErr;

        setSuccess(true);
        setTimeout(() => {
          onSuccess?.(data);
          setSuccess(false);
          onClose();
        }, 700);
      }
    } catch (err: any) {
      setError('خطأ: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !saving && onClose()}>
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 p-2 rounded-xl">
              <Package className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800">
                {editProduct ? 'تعديل الصنف' : 'إضافة صنف جديد'}
              </h3>
              <p className="text-[11px] text-slate-500 font-bold">
                {editProduct ? 'الكود: ' + editProduct.product_code : 'الكود يُولَّد تلقائياً'}
              </p>
            </div>
          </div>
          <button onClick={onClose} disabled={saving} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl flex items-center gap-2 text-xs font-bold text-rose-800">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center gap-2 text-xs font-bold text-emerald-800">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>تم الحفظ بنجاح</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">اسم الصنف *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="اسم الصنف"
              className="w-full border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold outline-none focus:border-blue-500"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">طريقة التسعير *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold outline-none focus:border-blue-500"
              >
                <option value="multiplier">ضرب في البورصة</option>
                <option value="addition">إضافة على البورصة</option>
                <option value="fixed">سعر ثابت</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">المعامل *</label>
              <input
                type="number"
                step="0.01"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold font-mono outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              معامل التوزيع <span className="text-slate-400 font-normal">(%) — لتوزيع تكلفة الدفعة</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="1"
                min="0"
                max="100"
                value={allocationWeight}
                onChange={(e) => setAllocationWeight(e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl pr-3 pl-9 h-11 text-sm font-bold font-mono outline-none focus:border-blue-500"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-slate-500 pointer-events-none">%</span>
            </div>
            <p className="mt-1 text-[10px] text-slate-500 font-bold">
              المحفوظ رقمياً: <span className="font-mono">{(Number(allocationWeight) / 100).toFixed(4)}</span>
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={saving || success}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{saving ? 'جاري الحفظ...' : (editProduct ? 'حفظ التعديلات' : 'إضافة الصنف')}</span>
            </button>
            <button type="button" onClick={onClose} disabled={saving} className="bg-slate-100 text-slate-700 font-bold px-5 py-3 rounded-xl text-sm">
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}