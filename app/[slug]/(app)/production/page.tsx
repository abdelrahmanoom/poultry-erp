'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCurrentTenantId } from '@/lib/tenant-client';
import { Scissors, CheckCircle, AlertTriangle, RefreshCw, Plus, Save } from 'lucide-react';
import ProductFormModal from '@/components/ProductFormModal';
import Autocomplete from '@/components/Autocomplete';

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
  const [marketPrice, setMarketPrice] = useState<any>('');
  const [execPrice, setExecPrice] = useState<any>('');
  const [liveWeight, setLiveWeight] = useState<any>('');
  const [supplierName, setSupplierName] = useState('');
  const [suppliersList, setSuppliersList] = useState<any[]>([]);
  const [transportCost, setTransportCost] = useState<any>('');
  const [laborCost, setLaborCost] = useState<any>('');
  const [brokerCost, setBrokerCost] = useState<any>('');
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

  // Modals
  const [showProductModal, setShowProductModal] = useState(false);
  const [showSavePathwayModal, setShowSavePathwayModal] = useState(false);
  const [newPathwayName, setNewPathwayName] = useState('');
  const [savingPathway, setSavingPathway] = useState(false);

  const showToast = (msg: string, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ============ LOAD ============
  useEffect(() => {
    async function loadSuppliers() {
      const { data } = await supabase.from('suppliers').select('id, name, phone').eq('is_active', true).order('name');
      if (data) setSuppliersList(data);
    }
    loadSuppliers();

    async function loadAll() {
      const { data: settings } = await supabase.from('system_settings').select('*');
      if (settings) {
        const get = (k: string) => settings.find((s: any) => s.setting_key === k)?.setting_value;
        const t = Number(get('default_transport_cost') || 0);
        const l = Number(get('default_labor_cost') || 0);
        const b = Number(get('default_broker_cost') || 0);
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
        setMarketPrice(priceData.exchange_price ? Number(priceData.exchange_price) : '');
        setExecPrice(priceData.execution_price ? Number(priceData.execution_price) : '');
      }

      const { data: paths } = await supabase.from('slaughter_pathways').select('*').eq('is_active', true).order('pathway_code');
      if (paths && paths.length > 0) {
        setPathwaysList(paths);
        setPathway(paths[0].pathway_code);
      }

      const tid = getCurrentTenantId();
      const { data: prods } = await supabase.from('inventory')
        .select('product_code, product_name_ar, pricing_type, pricing_value, allocation_weight')
        .eq('tenant_id', tid)
        .eq('is_active', true)
        .order('product_code');
      if (prods) setProductsCatalog(prods);
    }
    loadAll();
  }, [supabase]);

  // ============ WHEN PATHWAY CHANGES ============
  useEffect(() => {
    async function loadPathwayProducts() {
      const buildVirtualList = () => productsCatalog.map((p: any) => ({
        product_code: p.product_code,
        expected_ratio: Number(p.allocation_weight || 0) / 100,
        _virtual: true,
      }));

      if (!pathway) {
        setPathwayProducts(buildVirtualList());
        return;
      }
      const { data } = await supabase
        .from('pathway_products')
        .select('*')
        .eq('pathway_code', pathway);

      if (!data || data.length === 0) {
        setPathwayProducts(buildVirtualList());
      } else {
        setPathwayProducts(data);
      }
      setActualQtys({});
    }
    loadPathwayProducts();
  }, [pathway, productsCatalog, supabase]);

  // ============ AUTO-CALCULATE QTY ============
  const getExpectedQty = (p: any) => Number(liveWeight) * Number(p.expected_ratio);
  const getActualQty = (p: any) => Number(actualQtys[p.product_code] || 0);

  const saveLogisticsAsDefault = async () => {
    try {
      const t = Number(transportCost) || 0;
      const l = Number(laborCost) || 0;
      const b = Number(brokerCost) || 0;

      const { data: userData } = await supabase.from('system_users').select('tenant_id').limit(1).maybeSingle();
      const tenantId = userData?.tenant_id;
      if (!tenantId) { showToast('تعذّر تحديد النشاط', 'error'); return; }

      const items = [
        { tenant_id: tenantId, setting_key: 'default_transport_cost', setting_value: String(t) },
        { tenant_id: tenantId, setting_key: 'default_labor_cost', setting_value: String(l) },
        { tenant_id: tenantId, setting_key: 'default_broker_cost', setting_value: String(b) },
      ];

      const { error } = await supabase.from('system_settings').upsert(items, { onConflict: 'tenant_id,setting_key' });
      if (error) { showToast('خطأ: ' + error.message, 'error'); return; }
      showToast('تم حفظ التكاليف كافتراضي');
    } catch (e: any) {
      showToast('خطأ: ' + e.message, 'error');
    }
  };

  const resetLogistics = () => {
    setTransportCost('');
    setLaborCost('');
    setBrokerCost('');
    showToast('تم تصفير التكاليف');
  };

  const handleQtyChange = (productCode: string, val: any) => {
    setActualQtys(prev => {
      if (val === '' || val === undefined || val === null) {
        const c = { ...prev };
        delete c[productCode];
        return c;
      }
      return { ...prev, [productCode]: Number(val) };
    });
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
  const handleSavePathway = async () => {
    if (!newPathwayName.trim()) { alert('ادخل اسم المسار'); return; }
    const items = pathwayProducts
      .filter((p: any) => actualQtys[p.product_code] !== undefined && Number(actualQtys[p.product_code]) > 0)
      .map((p: any) => ({ product_code: p.product_code, qty: Number(actualQtys[p.product_code]) }));
    if (items.length === 0) { alert('لا توجد أصناف بقيم'); return; }
    const totalQty = items.reduce((s: number, it: any) => s + it.qty, 0);
    if (totalQty <= 0) { alert('القيم غير صحيحة'); return; }
    setSavingPathway(true);
    try {
      const { data: last } = await supabase.from('slaughter_pathways').select('pathway_code').order('pathway_code', { ascending: false }).limit(1).maybeSingle();
      let nextNum = 1;
      if (last?.pathway_code) {
        const m = String(last.pathway_code).match(/PW-(\d+)/);
        if (m) nextNum = parseInt(m[1], 10) + 1;
      }
      const newCode = 'PW-' + String(nextNum).padStart(4, '0');
      const { error: pwErr } = await supabase.from('slaughter_pathways').insert([{ pathway_code: newCode, name_ar: newPathwayName.trim(), yield_formula_json: {}, is_active: true, tenant_id: getCurrentTenantId() }]);
      if (pwErr) throw pwErr;
      const products = items.map((it: any) => ({ pathway_code: newCode, product_code: it.product_code, expected_ratio: it.qty / totalQty, tenant_id: getCurrentTenantId() }));
      const { error: ppErr } = await supabase.from('pathway_products').insert(products);
      if (ppErr) throw ppErr;
      setShowSavePathwayModal(false);
      setNewPathwayName('');
      const { data: paths } = await supabase.from('slaughter_pathways').select('*').eq('is_active', true).order('pathway_code');
      if (paths) setPathwaysList(paths);
      setPathway(newCode);
    } catch (err: any) {
      alert('خطأ: ' + err.message);
    } finally {
      setSavingPathway(false);
    }
  };

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
        tenant_id: getCurrentTenantId(),
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
        tenant_id: getCurrentTenantId(),
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
        const { data: currentStock } = await supabase.from('inventory')
          .select('stock_kg')
          .eq('tenant_id', getCurrentTenantId())
          .eq('product_code', p.product_code)
          .maybeSingle();
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

      <div className="bg-white p-6 rounded-3xl border border-slate-200 flex flex-wrap justify-between items-center gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2 flex-wrap">
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
            <div className="bg-blue-50 border-2 border-blue-200 p-5 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="bg-blue-200 p-1.5 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-blue-800" />
                </div>
                <h3 className="text-sm font-black text-blue-900">لا يوجد مسار محفوظ بعد</h3>
              </div>
              <p className="text-xs font-bold text-blue-800 leading-relaxed">
                املأ الأوزان أدناه مباشرة، ثم اضغط زر
                <b className="text-blue-900"> "حفظ هذه الأصناف كمسار جديد" </b>
                أسفل البطاقة لإنشاء مسار للاستخدام المستقبلي.
              </p>
              <a href="/settings?tab=pathways&group=operations" className="inline-flex items-center gap-1.5 bg-white hover:bg-blue-100 text-blue-700 font-bold px-4 py-2.5 rounded-xl text-xs border-2 border-blue-300 transition flex-wrap">
                <span>فتح مسارات التجهيز</span>
                <span>←</span>
              </a>
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

        <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-3 gap-4">
          {/* بيانات الدفعة */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-4">
            <h2 className="text-sm font-black text-slate-800 border-b pb-2">بيانات الدفعة</h2>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">سعر البورصة المعلن (ج):</label>
              <input type="number" value={marketPrice} onChange={(e) => setMarketPrice(e.target.value)} className="w-full border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold bg-slate-50 font-mono" />
            </div>
            <div>
              <label className="block text-xs font-bold text-blue-700 mb-1">سعر التنفيذ الفعلي (ج):</label>
              <input type="number" value={execPrice} onChange={(e) => setExecPrice(e.target.value)} className="w-full border-2 border-blue-400 rounded-xl px-3 h-11 text-sm font-bold bg-blue-50 font-mono" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الوزن الإجمالي القائم (كجم):</label>
              <input type="number" value={liveWeight} onChange={(e) => setLiveWeight(e.target.value)} className="w-full border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold bg-slate-50 font-mono" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">اسم المورد أو المزرعة:</label>
              <Autocomplete
                value={supplierName}
                onChange={setSupplierName}
                suggestions={suppliersList.map((s: any) => ({ id: s.id, label: s.name, sublabel: s.phone || '' }))}
                placeholder="اسم المورد"
                className="w-full border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold bg-slate-50 outline-none focus:border-blue-600"
              />
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
              <input type="number" value={transportCost} onChange={(e) => setTransportCost(e.target.value)} className="w-full border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold bg-slate-50 font-mono" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">أجور عمالة التنزيل (ج):</label>
              <input type="number" value={laborCost} onChange={(e) => setLaborCost(e.target.value)} className="w-full border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold bg-slate-50 font-mono" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">رسوم الوساطة التجارية (ج):</label>
              <input type="number" value={brokerCost} onChange={(e) => setBrokerCost(e.target.value)} className="w-full border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold bg-slate-50 font-mono" />
            </div>

              <div className="col-span-3 flex flex-wrap gap-2 pt-2 border-t border-slate-200 mt-2">
                <button
                  type="button"
                  onClick={saveLogisticsAsDefault}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-300 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>حفظ كافتراضي</span>
                </button>
                <button
                  type="button"
                  onClick={resetLogistics}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>تصفير</span>
                </button>
              </div>
            <div className="bg-slate-50 p-3 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between flex-wrap gap-2 flex-wrap"><span className="font-bold text-slate-600">إجمالي التكلفة:</span><span className="font-mono font-black">{totalCost.toLocaleString()} ج</span></div>
              <div className="flex justify-between flex-wrap gap-2 flex-wrap"><span className="font-bold text-slate-600">تكلفة الكيلو الفعلي:</span><span className="font-mono font-black text-emerald-700">{effectiveKgCost.toFixed(2)} ج</span></div>
            </div>
          </div>

          {/* مخرجات التقطيع */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-3">
            <div className="flex justify-between items-center border-b pb-2 flex-wrap gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-black text-slate-800">مخرجات التقطيع</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowProductModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm flex-wrap"
              >
                <Plus className="w-4 h-4" />
                <span>صنف جديد</span>
              </button>
            </div>

            {/* إرشاد سياقي */}
            {pathwayProducts.some((p: any) => p._virtual) && (
              actualYield > 0 ? (
                <div className="bg-emerald-50 border-2 border-emerald-200 p-3 rounded-xl text-xs font-bold text-emerald-900 flex items-start gap-2 flex-wrap">
                  <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <b>ممتاز!</b> أدخلت أوزاناً فعلية. اضغط الزر الأخضر أسفل البطاقة لحفظها كمسار قابل لإعادة الاستخدام.
                  </div>
                </div>
              ) : (
                <div className="bg-blue-50 border-2 border-blue-200 p-3 rounded-xl text-xs font-bold text-blue-900 flex items-start gap-2 flex-wrap">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <b>ابدأ هنا:</b> أدخل الأوزان الفعلية لكل صنف من الحقول أدناه. بعد الإدخال يمكنك حفظ القائمة كمسار للاستخدام المستقبلي.
                  </div>
                </div>
              )
            )}
            {pathwayProducts.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs font-bold text-amber-900">
                المسار لا يحتوي على أصناف. أضفها من /settings → مسارات التجهيز.
              </div>
            ) : (
              <>
                <div className="text-[10px] font-bold text-slate-500 flex justify-between flex-wrap gap-2 flex-wrap">
                  <span>المتوقع: {expectedYield.toFixed(1)} كجم</span>
                  <span>الفعلي: {actualYield.toFixed(1)} كجم</span>
                  <span className={Math.abs(varianceRatio) > 0.08 ? 'text-amber-700' : 'text-emerald-700'}>
                    الانحراف: {(varianceRatio * 100).toFixed(1)}%
                  </span>
                </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 [&>*:last-child:nth-child(odd)]:sm:col-span-2">
                  {pathwayProducts.map((p: any) => {
                    const prod = productsCatalog.find(x => x.product_code === p.product_code);
                    const qtyRaw = actualQtys[p.product_code];
                    const qtyNum = Number(qtyRaw || 0);
                    const expected = getExpectedQty(p);
                    const expectedRatio = Number(p.expected_ratio || 0) * 100;
                    const liveRatio = Number(liveWeight) > 0 ? (qtyNum / Number(liveWeight)) * 100 : 0;
                    const hasValue = qtyRaw !== undefined && qtyNum > 0;
                    const ratioDiff = hasValue ? Math.abs(liveRatio - expectedRatio) : 0;
                    const ratioStatus = !hasValue ? 'idle' : ratioDiff < 3 ? 'ok' : ratioDiff < 10 ? 'warn' : 'bad';
                    return (
                      <div key={p.product_code}>
                        <label className="block text-xs font-bold text-slate-700 mb-1 flex justify-between flex-wrap gap-2 flex-wrap">
                          <span>{prod?.product_name_ar || p.product_code}</span>
                          <span className="font-mono">
                            {hasValue ? (
                              <span className={'px-1.5 py-0.5 rounded text-[10px] ' + (ratioStatus === 'ok' ? 'bg-emerald-100 text-emerald-700' : ratioStatus === 'warn' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700')}>
                                {liveRatio.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px]">{expectedRatio.toFixed(1)}%</span>
                            )}
                          </span>
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={qtyRaw ?? ''}
                          onChange={(e) => handleQtyChange(p.product_code, e.target.value)}
                          placeholder="0"
                          className="w-full border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold bg-slate-50 font-mono outline-none focus:border-blue-500 transition"
                        />
                        <div className="text-[10px] font-bold text-slate-500 mt-0.5">
                          متوقع: <span className="font-mono text-slate-700">{expected.toFixed(1)}</span> كجم
                        </div>
                      </div>
                    );
                  })}
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl text-[10px] font-bold text-slate-600 flex justify-between flex-wrap gap-2 flex-wrap">
                    <span>النسب: {(totalRatios * 100).toFixed(1)}%</span>
                    <span>الفاقد: {((1 - totalRatios) * 100).toFixed(1)}%</span>
                    <span>الإنتاج: {yieldPercent.toFixed(1)}% من الحي</span>
                  </div>

                {pathwayProducts.some((p: any) => p._virtual) && (
                  <button
                    type="button"
                    onClick={() => setShowSavePathwayModal(true)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-3 rounded-xl text-sm flex items-center justify-center gap-2 shadow mt-2 flex-wrap"
                  >
                    <Save className="w-4 h-4" />
                    <span>حفظ هذه الأصناف كمسار جديد</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <button type="submit" disabled={loading || pathwaysList.length === 0} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black py-4 rounded-2xl text-sm shadow-lg flex items-center justify-center gap-2 flex-wrap">
          {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
          {loading ? 'جاري الحفظ...' : 'اعتماد أمر وحفظ الإنتاج'}
        </button>
      </form>

      {showSavePathwayModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !savingPathway && setShowSavePathwayModal(false)}>
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b pb-3 flex-wrap gap-2 flex-wrap">
              <h3 className="text-base font-black text-slate-800">حفظ كمسار جديد</h3>
              <button onClick={() => setShowSavePathwayModal(false)} disabled={savingPathway} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">&times;</button>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">اسم المسار *</label>
              <input type="text" value={newPathwayName} onChange={(e) => setNewPathwayName(e.target.value)} placeholder="اسم المسار" className="w-full border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold outline-none focus:border-emerald-500" autoFocus />
            </div>
            <div className="flex gap-2 pt-2 flex-wrap">
              <button onClick={handleSavePathway} disabled={savingPathway || !newPathwayName.trim()} className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm">{savingPathway ? 'جاري الحفظ...' : 'حفظ المسار'}</button>
              <button onClick={() => setShowSavePathwayModal(false)} disabled={savingPathway} className="bg-slate-100 text-slate-700 font-bold px-5 py-3 rounded-xl text-sm">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      <ProductFormModal
        open={showProductModal}
        onClose={() => setShowProductModal(false)}
        onSuccess={() => setShowProductModal(false)}
      />

    </div>
  );
}
