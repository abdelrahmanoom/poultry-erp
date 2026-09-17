'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Scissors, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';

// ربط product_code بعمود yield_processing
const YIELD_COLUMN_MAP: any = {
  'P-1001': 'actual_fillet',
  'P-1002': 'actual_shawarma_breast',  // شيش طاووق (احتياطي)
  'P-1003': 'actual_thighs',
  'P-1004': 'actual_wings',
  'P-1005': 'actual_livers',
  'P-1006': 'actual_carcass',
  'P-1007': 'actual_shawarma_breast',
  'P-1008': 'actual_shawarma_whole',
  'P-1009': 'actual_whole_box',
};

export default function ProductionPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  // بيانات الدفعة
  const [pathway, setPathway] = useState('');
  const [marketPrice, setMarketPrice] = useState(85);
  const [execPrice, setExecPrice] = useState(83);
  const [liveWeight, setLiveWeight] = useState(1000);
  const [supplierName, setSupplierName] = useState('');
  const [transportCost, setTransportCost] = useState(3500);
  const [laborCost, setLaborCost] = useState(700);
  const [brokerCost, setBrokerCost] = useState(500);
  const [paymentMethod, setPaymentMethod] = useState('credit');
  const [selectedTreasury, setSelectedTreasury] = useState('MAIN-CASH');
  const [treasuriesList, setTreasuriesList] = useState<any[]>([]);
  const [treasuryBals, setTreasuryBals] = useState<any>({});

  // المسارات
  const [pathwaysList, setPathwaysList] = useState<any[]>([]);
  const [pathwayProducts, setPathwayProducts] = useState<any[]>([]);
  const [productsCatalog, setProductsCatalog] = useState<any[]>([]);

  // الكميات الفعلية لكل صنف (product_code → qty)
  const [actualQtys, setActualQtys] = useState<Record<string, number>>({});

  const showToast = (msg: string, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ============ LOAD ============
  useEffect(() => {
    async function loadAll() {
      const { data: settings } = await supabase.from('system_settings').select('*');
      if (settings) {
        const get = (k: string) => settings.find((s: any) => s.setting_key === k)?.setting_value;
        const t = Number(get('transport_cost') || 3500);
        const l = Number(get('labor_cost') || 700);
        const b = Number(get('broker_cost') || 500);
        setTransportCost(t);
        setLaborCost(l);
        setBrokerCost(b);
      }

      const { data: treasData } = await supabase.from('treasury_accounts').select('*').eq('is_active', true).order('treasury_code');
      if (treasData) setTreasuriesList(treasData);

      const { data: bals } = await supabase.rpc('get_treasury_balances');
      if (bals) {
        const m: any = {};
        bals.forEach((b: any) => m[b.treasury_code] = Number(b.balance || 0));
        setTreasuryBals(m);
      }

      const { data: priceData } = await supabase.from('market_prices').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (priceData) {
        setMarketPrice(Number(priceData.exchange_price || 85));
        setExecPrice(Number(priceData.execution_price || 83));
      }

      const { data: paths } = await supabase.from('slaughter_pathways').select('*').eq('is_active', true).order('pathway_code');
      if (paths && paths.length > 0) {
        setPathwaysList(paths);
        setPathway(paths[0].pathway_code);
      }

      const { data: prods } = await supabase.from('inventory').select('product_code, product_name_ar, pricing_type, pricing_value, allocation_weight').eq('is_active', true).order('product_code');
      if (prods) setProductsCatalog(prods);
    }
    loadAll();
  }, [supabase]);

  // ============ WHEN PATHWAY CHANGES ============
  useEffect(() => {
    async function loadPathwayProducts() {
      if (!pathway) {
        setPathwayProducts([]);
        return;
      }
      const { data } = await supabase
        .from('pathway_products')
        .select('*')
        .eq('pathway_code', pathway);
      setPathwayProducts(data || []);
      // إعادة ضبط الكميات
      setActualQtys({});
    }
    loadPathwayProducts();
  }, [pathway, supabase]);

  // ============ AUTO-CALCULATE QTY ============
  const getExpectedQty = (p: any) => Number(liveWeight) * Number(p.expected_ratio);
  const getActualQty = (p: any) => actualQtys[p.product_code] ?? getExpectedQty(p);

  const handleQtyChange = (productCode: string, val: number) => {
    setActualQtys(prev => ({ ...prev, [productCode]: val }));
  };

  // ============ CALCULATIONS ============
  const totalCost = Number(liveWeight) * Number(execPrice) + Number(transportCost) + Number(laborCost) + Number(brokerCost);
  const effectiveKgCost = Number(liveWeight) > 0 ? totalCost / Number(liveWeight) : 0;

  const actualYield = pathwayProducts.reduce((s, p) => s + getActualQty(p), 0);
  const expectedYield = pathwayProducts.reduce((s, p) => s + getExpectedQty(p), 0);
  const varianceRatio = expectedYield > 0 ? (actualYield - expectedYield) / expectedYield : 0;
  const yieldPercent = Number(liveWeight) > 0 ? (actualYield / Number(liveWeight)) * 100 : 0;
  const totalRatios = pathwayProducts.reduce((s, p) => s + Number(p.expected_ratio), 0);

  // ============ SUBMIT ============
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pathway) { showToast('اختر مسار التقطيع', 'error'); return; }
    if (!supplierName.trim()) { showToast('اسم المورد مطلوب', 'error'); return; }
    if (pathwayProducts.length === 0) { showToast('المسار لا يحتوي على أصناف — أضفها من الإعدادات', 'error'); return; }

    setLoading(true);
    try {
      const batchId = 'B-' + Math.floor(1000 + Math.random() * 9000);

      // 1. batches
      const { error: batchErr } = await supabase.from('batches').insert([{
        id: batchId,
        supplier_name: supplierName.trim(),
        live_weight_kg: Number(liveWeight),
        execution_price: Number(execPrice),
        transport_cost: Number(transportCost),
        labor_cost: Number(laborCost),
        broker_cost: Number(brokerCost),
        total_cost: totalCost,
        effective_kg_cost: effectiveKgCost,
        payment_method: paymentMethod,
        paid_amount: paymentMethod === 'cash' ? totalCost : 0
      }]);
      if (batchErr) throw batchErr;

      // 2. yield_processing
      const ypRow: any = {
        batch_id: batchId,
        pathway_code: pathway,
        total_actual_yield: actualYield,
        total_expected_yield: expectedYield,
        variance_ratio: varianceRatio,
        status_alert: Math.abs(varianceRatio) > 0.08 ? 'high_variance' : 'ok',
      };
      pathwayProducts.forEach(p => {
        const col = YIELD_COLUMN_MAP[p.product_code];
        if (col) ypRow[col] = getActualQty(p);
      });

      const { error: ypErr } = await supabase.from('yield_processing').insert([ypRow]);
      if (ypErr) throw ypErr;

      // 3. inventory_lots (FIFO) + update inventory.stock_kg
      for (const p of pathwayProducts) {
        const qty = getActualQty(p);
        if (qty <= 0) continue;

        // حساب تكلفة الصنف من allocation_weight
        const prod = productsCatalog.find(x => x.product_code === p.product_code);
        const weight = prod?.allocation_weight ? Number(prod.allocation_weight) : 1;
        const totalWeight = pathwayProducts.reduce((s, x) => {
          const pr = productsCatalog.find(y => y.product_code === x.product_code);
          return s + (pr?.allocation_weight ? Number(pr.allocation_weight) : 1);
        }, 0);
        const costShare = totalWeight > 0 ? (weight / totalWeight) : 1;
        const costPerKg = qty > 0 ? (totalCost * costShare) / qty : 0;

        // inventory_lots
        await supabase.from('inventory_lots').insert([{
          product_code: p.product_code,
          source_type: 'production',
          source_ref: batchId,
          quantity_kg: qty,
          remaining_kg: qty,
          cost_per_kg: Number(costPerKg.toFixed(2))
        }]);

        // inventory.stock_kg
        const { data: currentStock } = await supabase.from('inventory').select('stock_kg').eq('product_code', p.product_code).maybeSingle();
        if (currentStock) {
          await supabase.from('inventory').update({
            stock_kg: Number(currentStock.stock_kg || 0) + qty,
            last_updated: new Date().toISOString()
          }).eq('product_code', p.product_code);
        }
      }

      // 4. financial_vouchers (if cash)
      if (paymentMethod === 'cash' && totalCost > 0) {
        await supabase.from('financial_vouchers').insert([{
          type: 'payment',
          entity_name: supplierName.trim(),
          amount: totalCost,
          payment_method: 'cash',
          treasury_code: selectedTreasury,
          notes: 'دفعة شراء رقم ' + batchId
        }]);
      }

      // 5. supplier balance
      const { data: supp } = await supabase.from('suppliers').select('*').eq('name', supplierName.trim()).maybeSingle();
      const remaining = paymentMethod === 'cash' ? 0 : totalCost;
      if (supp) {
        await supabase.from('suppliers').update({ balance: Number(supp.balance || 0) + remaining }).eq('id', supp.id);
      } else {
        await supabase.from('suppliers').insert([{ name: supplierName.trim(), balance: remaining }]);
      }

      showToast('تم اعتماد أمر الإنتاج وتحديث المخزون بنجاح');
      setSupplierName('');
      setActualQtys({});
    } catch (err: any) {
      showToast('خطأ: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-2xl border text-sm font-bold ${toast.type === 'success' ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-rose-600 text-white border-rose-400'}`}>
          {toast.msg}
        </div>
      )}

      <div className="bg-white p-6 rounded-3xl border border-slate-200 flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Scissors className="w-5 h-5 text-slate-700" />
            أمر توريد وتجهيز جديد
          </h1>
          <p className="text-sm text-slate-500 font-bold mt-1">تسجيل الدفعة الحية ومخرجات التقطيع وتوزيع التكلفة</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* المسار */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200">
          <label className="block text-xs font-bold text-slate-700 mb-2">مسار التقطيع:</label>
          {pathwaysList.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-xs font-bold text-amber-900">
              لا توجد مسارات في الإعدادات. اذهب إلى /settings → مسارات التجهيز وأنشئ مساراً.
            </div>
          ) : (
            <select
              value={pathway}
              onChange={(e) => setPathway(e.target.value)}
              className="w-full border-2 border-slate-200 rounded-2xl px-4 text-sm font-bold bg-slate-50 h-12 outline-none focus:border-blue-600"
            >
              {pathwaysList.map((p: any) => (
                <option key={p.pathway_code} value={p.pathway_code}>{p.name_ar}</option>
              ))}
            </select>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* بيانات الدفعة */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-4">
            <h2 className="text-sm font-black text-slate-800 border-b pb-2">بيانات الدفعة</h2>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">سعر البورصة المعلن (ج):</label>
              <input type="number" value={marketPrice} onChange={(e) => setMarketPrice(Number(e.target.value))} className="w-full border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold bg-slate-50 font-mono" />
            </div>
            <div>
              <label className="block text-xs font-bold text-blue-700 mb-1">سعر التنفيذ الفعلي (ج):</label>
              <input type="number" value={execPrice} onChange={(e) => setExecPrice(Number(e.target.value))} className="w-full border-2 border-blue-400 rounded-xl px-3 h-11 text-sm font-bold bg-blue-50 font-mono" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الوزن الإجمالي القائم (كجم):</label>
              <input type="number" value={liveWeight} onChange={(e) => setLiveWeight(Number(e.target.value))} className="w-full border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold bg-slate-50 font-mono" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">اسم المورد أو المزرعة:</label>
              <input type="text" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="اسم المورد" className="w-full border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold bg-slate-50" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">طريقة سداد الدفعة:</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold bg-slate-50">
                <option value="credit">آجل</option>
                <option value="cash">نقدي</option>
              </select>
            </div>
            {paymentMethod === 'cash' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الخزينة:</label>
                <select value={selectedTreasury} onChange={(e) => setSelectedTreasury(e.target.value)} className="w-full border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold bg-slate-50">
                  {treasuriesList.map((t: any) => (
                    <option key={t.treasury_code} value={t.treasury_code}>{t.name_ar} ({(treasuryBals[t.treasury_code] || 0).toLocaleString()} ج)</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* اللوجستيك */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-4">
            <h2 className="text-sm font-black text-slate-800 border-b pb-2">التكاليف اللوجستية المحملة</h2>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">تكلفة الشحن والتفريغ (ج):</label>
              <input type="number" value={transportCost} onChange={(e) => setTransportCost(Number(e.target.value))} className="w-full border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold bg-slate-50 font-mono" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">أجور عمالة التنزيل (ج):</label>
              <input type="number" value={laborCost} onChange={(e) => setLaborCost(Number(e.target.value))} className="w-full border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold bg-slate-50 font-mono" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">رسوم الوساطة التجارية (ج):</label>
              <input type="number" value={brokerCost} onChange={(e) => setBrokerCost(Number(e.target.value))} className="w-full border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold bg-slate-50 font-mono" />
            </div>
            <div className="bg-slate-50 p-3 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between"><span className="font-bold text-slate-600">إجمالي التكلفة:</span><span className="font-mono font-black">{totalCost.toLocaleString()} ج</span></div>
              <div className="flex justify-between"><span className="font-bold text-slate-600">تكلفة الكيلو الفعلي:</span><span className="font-mono font-black text-emerald-700">{effectiveKgCost.toFixed(2)} ج</span></div>
            </div>
          </div>

          {/* مخرجات التقطيع */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-3">
            <h2 className="text-sm font-black text-slate-800 border-b pb-2">مخرجات التقطيع</h2>
            {pathwayProducts.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs font-bold text-amber-900">
                المسار لا يحتوي على أصناف. أضفها من /settings → مسارات التجهيز.
              </div>
            ) : (
              <>
                <div className="text-[10px] font-bold text-slate-500 flex justify-between">
                  <span>المتوقع: {expectedYield.toFixed(1)} كجم</span>
                  <span>الفعلي: {actualYield.toFixed(1)} كجم</span>
                  <span className={Math.abs(varianceRatio) > 0.08 ? 'text-amber-700' : 'text-emerald-700'}>
                    الانحراف: {(varianceRatio * 100).toFixed(1)}%
                  </span>
                </div>
                {pathwayProducts.map((p: any) => {
                  const prod = productsCatalog.find(x => x.product_code === p.product_code);
                  const qty = getActualQty(p);
                  const expected = getExpectedQty(p);
                  return (
                    <div key={p.product_code}>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex justify-between">
                        <span>{prod?.product_name_ar || p.product_code}</span>
                        <span className="text-[10px] text-slate-500">متوقع {expected.toFixed(1)} كجم ({(Number(p.expected_ratio) * 100).toFixed(1)}%)</span>
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={qty}
                        onChange={(e) => handleQtyChange(p.product_code, Number(e.target.value))}
                        className="w-full border-2 border-slate-200 rounded-xl px-3 h-10 text-sm font-bold bg-slate-50 font-mono"
                      />
                    </div>
                  );
                })}
                <div className="bg-slate-50 p-2 rounded-xl text-[10px] font-bold text-slate-600 flex justify-between">
                  <span>النسب: {(totalRatios * 100).toFixed(1)}%</span>
                  <span>الفاقد: {((1 - totalRatios) * 100).toFixed(1)}%</span>
                  <span>الإنتاج: {yieldPercent.toFixed(1)}% من الحي</span>
                </div>
              </>
            )}
          </div>
        </div>

        <button type="submit" disabled={loading || pathwaysList.length === 0} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black py-4 rounded-2xl text-sm shadow-lg flex items-center justify-center gap-2">
          {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
          {loading ? 'جاري الحفظ...' : 'اعتماد أمر وحفظ الإنتاج'}
        </button>
      </form>
    </div>
  );
}