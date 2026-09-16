'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Autocomplete from '@/components/Autocomplete';

export default function ProductionPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  
  const [pathway, setPathway] = useState('retail');
  const [marketPrice, setMarketPrice] = useState(85);
  const [execPrice, setExecPrice] = useState(83);
  const [liveWeight, setLiveWeight] = useState(1000);
  const [supplierName, setSupplierName] = useState('');
  const [suppliersList, setSuppliersList] = useState<any[]>([]);
  const [transportCost, setTransportCost] = useState(3500);
  const [laborCost, setLaborCost] = useState(700);
  const [brokerCost, setBrokerCost] = useState(500);
  const [paymentMethod, setPaymentMethod] = useState('credit');
  const [selectedTreasury, setSelectedTreasury] = useState('MAIN-CASH');
  const [treasuriesList, setTreasuriesList] = useState<any[]>([]);
  const [treasuryBals, setTreasuryBals] = useState<any>({});
  const [productsCatalog, setProductsCatalog] = useState<any[]>([]);

  const [fillet, setFillet] = useState(250);
  const [thighs, setThighs] = useState(350);
  const [wings, setWings] = useState(125);
  const [livers, setLivers] = useState(35);
  const [carcass, setCarcass] = useState(75);
  const [shawarmaBreast, setShawarmaBreast] = useState(325);
  const [shawarmaWhole, setShawarmaWhole] = useState(500);
  const [wholeBox, setWholeBox] = useState(750);

  const showToast = (msg: string, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    setExecPrice(Math.max(0, marketPrice - 2));
    async function fetchDefaults() {
      const { data } = await supabase.from('system_settings').select('*');
      const { data: supsList } = await supabase.from('suppliers').select('id, name, phone').eq('is_active', true).order('name');
      if (supsList) setSuppliersList(supsList);
      if (data) {
        data.forEach(s => {
          if (s.setting_key === 'default_transport_cost') setTransportCost(Number(s.setting_value));
          if (s.setting_key === 'default_labor_cost') setLaborCost(Number(s.setting_value));
          if (s.setting_key === 'default_broker_cost') setBrokerCost(Number(s.setting_value));
        });
      }
    }
    fetchDefaults();

    async function loadTreasuries() {
      const { data: treasData } = await supabase.from('treasury_accounts').select('*').eq('is_active', true).order('treasury_code');
      if (treasData) setTreasuriesList(treasData);
      const { data: bals } = await supabase.rpc('get_treasury_balances');
      if (bals) {
        const m: any = {};
        bals.forEach((b: any) => m[b.treasury_code] = Number(b.balance || 0));
        setTreasuryBals(m);
      }
    }
    loadTreasuries();

    async function loadProductsCatalog() {
      const { data } = await supabase.from('inventory').select('product_code, product_name_ar, pricing_type, pricing_value, allocation_weight').eq('is_active', true);
      if (data) setProductsCatalog(data);
    }
    loadProductsCatalog();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const fixedTotal = Number(transportCost) + Number(laborCost) + Number(brokerCost);
      const rawCost = Number(liveWeight) * Number(execPrice);
      const totalCost = rawCost + fixedTotal;
      const effectiveCost = Number(liveWeight) > 0 ? (totalCost / Number(liveWeight)).toFixed(2) : '0';
      const batchId = 'B-' + Math.floor(1000 + Math.random() * 9000);

      let actualYield = 0;
      if (pathway === 'retail') {
        actualYield = Number(fillet) + Number(thighs) + Number(wings) + Number(livers) + Number(carcass);
      } else if (pathway === 'shawarma_breast') {
        actualYield = Number(shawarmaBreast) + Number(thighs) + Number(carcass);
      } else if (pathway === 'shawarma_whole') {
        actualYield = Number(shawarmaWhole) + Number(carcass);
      } else if (pathway === 'whole_box') {
        actualYield = Number(wholeBox) + Number(livers);
      }

      const expectedYield = Number(liveWeight) * 0.835;
      const diffRatio = expectedYield > 0 ? (((actualYield - expectedYield) / expectedYield) * 100).toFixed(2) : '0';

      let statusAlert = 'ضمن الحدود المعيارية';
      const diffNum = parseFloat(diffRatio);
      if (diffNum < -8 || diffNum > 8) statusAlert = 'انحراف فاقد حرج';
      else if (diffNum < -5 || diffNum > 5) statusAlert = 'تباين تشغيلي ملحوظ';

      await supabase.from('batches').insert([{
        id: batchId,
        supplier_name: supplierName || 'مورد عام',
        live_weight_kg: Number(liveWeight),
        execution_price: Number(execPrice),
        transport_cost: Number(transportCost),
        labor_cost: Number(laborCost),
        broker_cost: Number(brokerCost),
        total_cost: totalCost,
        effective_kg_cost: Number(effectiveCost),
        payment_method: paymentMethod,
        paid_amount: paymentMethod === 'cash' ? totalCost : 0
      }]);

      await supabase.from('yield_processing').insert([{
        batch_id: batchId,
        pathway_code: pathway,
        actual_fillet: Number(fillet),
        actual_thighs: Number(thighs),
        actual_wings: Number(wings),
        actual_livers: Number(livers),
        actual_carcass: Number(carcass),
        actual_shawarma_breast: Number(shawarmaBreast),
        actual_shawarma_whole: Number(shawarmaWhole),
        actual_whole_box: Number(wholeBox),
        total_actual_yield: actualYield,
        total_expected_yield: expectedYield,
        variance_ratio: Number(diffRatio),
        status_alert: statusAlert
      }]);

      const getSellPrice = (productCode: string): number => {
        const p = productsCatalog.find(x => x.product_code === productCode);
        if (!p) return 0;
        const pv = Number(p.pricing_value || 0);
        if (p.pricing_type === 'multiplier') return marketPrice * pv;
        if (p.pricing_type === 'addition') return marketPrice + pv;
        return pv;
      };

      const getWeightFactor = (productCode: string): number => {
        const p = productsCatalog.find(x => x.product_code === productCode);
        return p ? Number(p.allocation_weight || 1) : 1;
      };

      const codeMapping: Record<string, string> = {
        'fillet': 'P-1001', 'thighs': 'P-1003', 'wings': 'P-1004',
        'livers': 'P-1005', 'carcass': 'P-1006',
        'shawarma_breast': 'P-1007', 'shawarma_whole': 'P-1008', 'whole_box': 'P-1009'
      };

      const rawUpdates = [
        { code: 'fillet', qty: Number(fillet) },
        { code: 'thighs', qty: Number(thighs) },
        { code: 'wings', qty: Number(wings) },
        { code: 'livers', qty: Number(livers) },
        { code: 'carcass', qty: Number(carcass) },
        { code: 'shawarma_breast', qty: Number(shawarmaBreast) },
        { code: 'shawarma_whole', qty: Number(shawarmaWhole) },
        { code: 'whole_box', qty: Number(wholeBox) }
      ].filter(u => u.qty > 0);

      const allowedMap: Record<string, string[]> = {
        'retail': ['fillet', 'thighs', 'wings', 'livers', 'carcass'],
        'shawarma_breast': ['shawarma_breast', 'thighs', 'carcass'],
        'shawarma_whole': ['shawarma_whole', 'carcass'],
        'whole_box': ['whole_box', 'livers']
      };
      const allowed = allowedMap[pathway] || [];
      const updates = rawUpdates.filter(u => allowed.includes(u.code));

      let totalRelativeValue = 0;
      const allocations = updates.map(u => {
        const pc = codeMapping[u.code];
        const sellPrice = getSellPrice(pc);
        const factor = getWeightFactor(pc);
        const relativeValue = u.qty * sellPrice * factor;
        totalRelativeValue += relativeValue;
        return { ...u, productCode: pc, relativeValue, costPerKg: 0 };
      });

      allocations.forEach(a => {
        a.costPerKg = totalRelativeValue > 0 ? (a.relativeValue / totalRelativeValue) * totalCost / a.qty : 0;
      });

      for (const a of allocations) {
        await supabase.from('inventory_lots').insert([{
          product_code: a.productCode,
          source_type: 'production',
          source_ref: batchId,
          quantity_kg: a.qty,
          remaining_kg: a.qty,
          cost_per_kg: Number(a.costPerKg.toFixed(2))
        }]);

        const { data } = await supabase.from('inventory').select('stock_kg').eq('product_code', a.productCode).maybeSingle();
        const currentStock = data ? parseFloat(data.stock_kg || 0) : 0;
        await supabase.from('inventory').update({ stock_kg: currentStock + a.qty, last_updated: new Date() }).eq('product_code', a.productCode);
      }

      if (paymentMethod === 'cash') {
        const available = Number(treasuryBals[selectedTreasury] || 0);
        if (totalCost > available) {
          showToast(`الرصيد غير كافٍ. المتاح في ${selectedTreasury}: ${available.toLocaleString()} ج`, 'error');
          setLoading(false);
          return;
        }

        await supabase.from('financial_vouchers').insert([{
          type: 'payment',
          entity_name: supplierName || 'مورد عام',
          amount: totalCost,
          payment_method: 'cash',
          treasury_code: selectedTreasury,
          notes: 'سداد نقدي فوري لأمر توريد رقم ' + batchId
        }]);
      } else {
        const { data: supp } = await supabase.from('suppliers').select('*').eq('name', supplierName).maybeSingle();
        if (supp) {
          await supabase.from('suppliers').update({ balance: Number(supp.balance || 0) + totalCost }).eq('id', supp.id);
        } else if (supplierName) {
          await supabase.from('suppliers').insert([{ name: supplierName, balance: totalCost }]);
        }
      }

      showToast('تم اعتماد أمر التوريد والإنتاج وتحديث المخزن بنجاح');
      setTimeout(() => { window.location.href = '/dashboard'; }, 1500);
    } catch (err: any) {
      showToast('خطأ في التسجيل: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const estimatedTotalCost = (Number(liveWeight) * Number(execPrice)) + Number(transportCost) + Number(laborCost) + Number(brokerCost);
  const calculatedEffectiveCost = Number(liveWeight) > 0 ? (estimatedTotalCost / Number(liveWeight)).toFixed(2) : '0';

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-2xl border text-sm font-bold transition-all ${toast.type === 'success' ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-rose-600 text-white border-rose-400'}`}>
          {toast.msg}
        </div>
      )}

      <div className="bg-white p-6 rounded-3xl border border-slate-200 flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900">أمر توريد وتجهيز جديد</h1>
          <p className="text-sm text-slate-500 font-bold mt-1">تسجيل الدفعة الحية ومخرجات التقطيع وتوزيع التكلفة</p>
        </div>
        <select 
          value={pathway} 
          onChange={(e) => setPathway(e.target.value)}
          className="border-2 border-blue-500 rounded-2xl px-3 py-2 text-xs font-bold bg-blue-50 text-blue-900 outline-none h-11 max-w-md"
        >
          <option value="retail">مسار التجزئة المعتاد (بانيه، وراك، أجنحة، هياكل)</option>
          <option value="shawarma_breast">مسار شاورما صدور بالجلد مع وراك</option>
          <option value="shawarma_whole">مسار شاورما كاملة بالجلد</option>
          <option value="whole_box">مسار تعبئة كاملة صندوق</option>
        </select>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4">
            <h2 className="text-sm font-black text-slate-800 border-b pb-3">بيانات الدفعة</h2>
            <div>
              <label className="block text-sm font-extrabold text-slate-700 mb-1.5">سعر البورصة المعلن (ج):</label>
              <input type="number" value={marketPrice} onChange={(e) => setMarketPrice(Number(e.target.value))} className="w-full border-2 border-slate-200 rounded-2xl px-4 text-base font-black bg-slate-50 h-12 outline-none focus:border-blue-600 font-mono" required />
            </div>
            <div>
              <label className="block text-sm font-extrabold text-blue-700 mb-1.5">سعر التنفيذ الفعلي (ج):</label>
              <input type="number" value={execPrice} onChange={(e) => setExecPrice(Number(e.target.value))} className="w-full border-2 border-blue-400 rounded-2xl px-4 text-base font-black bg-blue-50 text-blue-900 h-12 outline-none font-mono" required />
            </div>
            <div>
              <label className="block text-sm font-extrabold text-slate-700 mb-1.5">الوزن الإجمالي القائم (كجم):</label>
              <input type="number" value={liveWeight} onChange={(e) => setLiveWeight(Number(e.target.value))} className="w-full border-2 border-slate-200 rounded-2xl px-4 text-base font-black bg-slate-50 h-12 outline-none focus:border-blue-600 font-mono" required />
            </div>
            <div>
              <label className="block text-sm font-extrabold text-slate-700 mb-1.5">اسم المورد أو المزرعة:</label>
              <Autocomplete value={supplierName} onChange={setSupplierName} suggestions={suppliersList.map((s: any) => ({ id: s.id, label: s.name, sublabel: s.phone }))} placeholder="اسم المورد (اكتب للبحث)" className="w-full border-2 border-slate-200 rounded-2xl px-4 text-sm font-bold bg-slate-50 h-12 outline-none focus:border-blue-600" required />
            </div>
            <div>
              <label className="block text-sm font-extrabold text-slate-700 mb-1.5">طريقة سداد الدفعة:</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full border-2 border-slate-200 rounded-2xl px-3 text-sm font-bold bg-slate-50 h-12 outline-none">
                <option value="credit">آجل يرحل لحساب المورد</option>
                <option value="cash">نقدي يسدد فورا من الخزينة</option>
              </select>
            </div>

            {paymentMethod === 'cash' && (
              <div>
                <label className="block text-sm font-extrabold text-blue-700 mb-1.5">الخزينة المصروف منها:</label>
                <select value={selectedTreasury} onChange={(e) => setSelectedTreasury(e.target.value)} className="w-full border-2 border-blue-400 rounded-2xl px-3 text-sm font-bold bg-blue-50 h-12 outline-none">
                  {treasuriesList.map(t => (
                    <option key={t.treasury_code} value={t.treasury_code}>
                      {t.name_ar} — ({Number(treasuryBals[t.treasury_code] || 0).toLocaleString()} ج)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4">
            <h2 className="text-sm font-black text-slate-800 border-b pb-3">التكاليف اللوجستية المحملة</h2>
            <div>
              <label className="block text-sm font-extrabold text-slate-700 mb-1.5">تكلفة الشحن والتفريغ (ج):</label>
              <input type="number" value={transportCost} onChange={(e) => setTransportCost(Number(e.target.value))} className="w-full border-2 border-slate-200 rounded-2xl px-4 text-base font-bold bg-slate-50 h-12 outline-none focus:border-blue-600 font-mono" />
            </div>
            <div>
              <label className="block text-sm font-extrabold text-slate-700 mb-1.5">أجور عمالة التنزيل (ج):</label>
              <input type="number" value={laborCost} onChange={(e) => setLaborCost(Number(e.target.value))} className="w-full border-2 border-slate-200 rounded-2xl px-4 text-base font-bold bg-slate-50 h-12 outline-none focus:border-blue-600 font-mono" />
            </div>
            <div>
              <label className="block text-sm font-extrabold text-slate-700 mb-1.5">رسوم الوساطة التجارية (ج):</label>
              <input type="number" value={brokerCost} onChange={(e) => setBrokerCost(Number(e.target.value))} className="w-full border-2 border-slate-200 rounded-2xl px-4 text-base font-bold bg-slate-50 h-12 outline-none focus:border-blue-600 font-mono" />
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 mt-4">
              <div className="flex justify-between text-xs font-black">
                <span>إجمالي التكلفة:</span>
                <span className="font-mono text-slate-900">{estimatedTotalCost.toLocaleString()} ج</span>
              </div>
              <div className="flex justify-between text-xs font-black">
                <span>تكلفة الكيلو القائم الفعلي:</span>
                <span className="font-mono text-emerald-700">{calculatedEffectiveCost} ج</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4">
            <h2 className="text-sm font-black text-slate-800 border-b pb-3">الأوزان المستخرجة فعليا (كجم)</h2>
            {pathway === 'retail' && (
              <div className="space-y-3">
                <div><label className="block text-xs font-bold text-slate-700 mb-1">بانيه فصوص:</label><input type="number" value={fillet} onChange={(e) => setFillet(Number(e.target.value))} className="w-full border rounded-xl px-3 text-sm font-bold bg-slate-50 h-11 font-mono" /></div>
                <div><label className="block text-xs font-bold text-slate-700 mb-1">وراك مخلية:</label><input type="number" value={thighs} onChange={(e) => setThighs(Number(e.target.value))} className="w-full border rounded-xl px-3 text-sm font-bold bg-slate-50 h-11 font-mono" /></div>
                <div><label className="block text-xs font-bold text-slate-700 mb-1">أجنحة:</label><input type="number" value={wings} onChange={(e) => setWings(Number(e.target.value))} className="w-full border rounded-xl px-3 text-sm font-bold bg-slate-50 h-11 font-mono" /></div>
                <div><label className="block text-xs font-bold text-slate-700 mb-1">كبد وقوانص:</label><input type="number" value={livers} onChange={(e) => setLivers(Number(e.target.value))} className="w-full border rounded-xl px-3 text-sm font-bold bg-slate-50 h-11 font-mono" /></div>
                <div><label className="block text-xs font-bold text-slate-700 mb-1">هياكل وعظام:</label><input type="number" value={carcass} onChange={(e) => setCarcass(Number(e.target.value))} className="w-full border rounded-xl px-3 text-sm font-bold bg-slate-50 h-11 font-mono" /></div>
              </div>
            )}
            {pathway === 'shawarma_breast' && (
              <div className="space-y-3">
                <div><label className="block text-xs font-bold text-slate-700 mb-1">شاورما صدور بالجلد:</label><input type="number" value={shawarmaBreast} onChange={(e) => setShawarmaBreast(Number(e.target.value))} className="w-full border rounded-xl px-3 text-sm font-bold bg-slate-50 h-11 font-mono" /></div>
                <div><label className="block text-xs font-bold text-slate-700 mb-1">وراك مخلية:</label><input type="number" value={thighs} onChange={(e) => setThighs(Number(e.target.value))} className="w-full border rounded-xl px-3 text-sm font-bold bg-slate-50 h-11 font-mono" /></div>
                <div><label className="block text-xs font-bold text-slate-700 mb-1">هياكل وعظام:</label><input type="number" value={carcass} onChange={(e) => setCarcass(Number(e.target.value))} className="w-full border rounded-xl px-3 text-sm font-bold bg-slate-50 h-11 font-mono" /></div>
              </div>
            )}
            {pathway === 'shawarma_whole' && (
              <div className="space-y-3">
                <div><label className="block text-xs font-bold text-slate-700 mb-1">شاورما كاملة بالجلد:</label><input type="number" value={shawarmaWhole} onChange={(e) => setShawarmaWhole(Number(e.target.value))} className="w-full border rounded-xl px-3 text-sm font-bold bg-slate-50 h-11 font-mono" /></div>
                <div><label className="block text-xs font-bold text-slate-700 mb-1">عظام مفرغة:</label><input type="number" value={carcass} onChange={(e) => setCarcass(Number(e.target.value))} className="w-full border rounded-xl px-3 text-sm font-bold bg-slate-50 h-11 font-mono" /></div>
              </div>
            )}
            {pathway === 'whole_box' && (
              <div className="space-y-3">
                <div><label className="block text-xs font-bold text-slate-700 mb-1">تعبئة صندوق كاملة:</label><input type="number" value={wholeBox} onChange={(e) => setWholeBox(Number(e.target.value))} className="w-full border rounded-xl px-3 text-sm font-bold bg-slate-50 h-11 font-mono" /></div>
                <div><label className="block text-xs font-bold text-slate-700 mb-1">كبد وقوانص:</label><input type="number" value={livers} onChange={(e) => setLivers(Number(e.target.value))} className="w-full border rounded-xl px-3 text-sm font-bold bg-slate-50 h-11 font-mono" /></div>
              </div>
            )}
          </div>
        </div>

        <div className="text-center pt-4">
          <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-black py-4 px-16 rounded-2xl shadow-xl transition text-sm">
            {loading ? 'جاري التحقق والاعتماد...' : 'اعتماد وحفظ أمر الإنتاج'}
          </button>
        </div>
      </form>
    </div>
  );
}
