'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCurrentTenantId } from '@/lib/tenant-client';
import { Wallet, TrendingUp, AlertTriangle, Package, Scissors, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const YIELD_MAP = [
  { key: 'actual_fillet', label: 'بانيه فصوص' },
  { key: 'actual_thighs', label: 'وراك مخلية' },
  { key: 'actual_wings', label: 'أجنحة' },
  { key: 'actual_livers', label: 'كبد وقوانص' },
  { key: 'actual_carcass', label: 'هياكل وعظام' },
  { key: 'actual_shawarma_breast', label: 'شاورما صدور' },
  { key: 'actual_shawarma_whole', label: 'شاورما كاملة' },
  { key: 'actual_whole_box', label: 'فراخ صندوق' },
];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [exchangePrice, setExchangePrice] = useState<any>('');
  const [cashBalance, setCashBalance] = useState(0);
  const [receivables, setReceivables] = useState(0);
  const [payables, setPayables] = useState(0);
  const [inventory, setInventory] = useState<any[]>([]);
  const [latestBatch, setLatestBatch] = useState<any>(null);
  const [latestYield, setLatestYield] = useState<any>(null);
  const [salesDaily, setSalesDaily] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [recentMoves, setRecentMoves] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: priceData } = await supabase
      .from('market_prices').select('*')
      .eq('tenant_id', getCurrentTenantId())
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (priceData?.exchange_price) setExchangePrice(Number(priceData.exchange_price));

    const { data: vouchers } = await supabase.from('financial_vouchers').select('type, amount').eq('tenant_id', getCurrentTenantId());
    if (vouchers) {
      let total = 0;
      vouchers.forEach((v: any) => {
        const amt = Number(v.amount || 0);
        if (v.type === 'receipt' || v.type === 'opening_treasury') total += amt;
        else total -= amt;
      });
      setCashBalance(total);
    }

    const { data: custs } = await supabase.from('customers').select('balance').eq('tenant_id', getCurrentTenantId()).eq('is_active', true);
    if (custs) setReceivables(custs.reduce((s: number, c: any) => s + Number(c.balance || 0), 0));
    const { data: supps } = await supabase.from('suppliers').select('balance').eq('tenant_id', getCurrentTenantId()).eq('is_active', true);
    if (supps) setPayables(supps.reduce((s: number, c: any) => s + Number(c.balance || 0), 0));

    const { data: inv } = await supabase.from('inventory')
      .select('product_code, product_name_ar, stock_kg, pricing_value, pricing_type')
      .eq('tenant_id', getCurrentTenantId())
      .eq('is_active', true).order('product_code');
    if (inv) setInventory(inv);

    const { data: batch } = await supabase
      .from('batches').select('*')
      .eq('tenant_id', getCurrentTenantId())
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (batch) {
      setLatestBatch(batch);
      const { data: yp } = await supabase
        .from('yield_processing').select('*')
        .eq('tenant_id', getCurrentTenantId())
        .eq('batch_id', batch.id).maybeSingle();
      if (yp) setLatestYield(yp);
    }

    // مبيعات آخر 7 أيام
    const since = new Date();
    since.setDate(since.getDate() - 6);
    const sinceStr = since.toISOString().split('T')[0];
    const { data: invs } = await supabase
      .from('sales_invoices')
      .select('created_at, total_amount, cogs, status')
      .eq('tenant_id', getCurrentTenantId())
      .gte('created_at', sinceStr).order('created_at');
    const dayMap: any = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const key = d.toISOString().split('T')[0];
      dayMap[key] = { day: key.slice(5), revenue: 0, profit: 0 };
    }
    (invs || []).forEach((i: any) => {
      if (i.status === 'cancelled') return;
      const key = i.created_at.split('T')[0];
      if (dayMap[key]) {
        dayMap[key].revenue += Number(i.total_amount || 0);
        dayMap[key].profit += Number(i.total_amount || 0) - Number(i.cogs || 0);
      }
    });
    setSalesDaily(Object.values(dayMap));

    // تنبيهات
    const alertsList: any[] = [];
    // نحصر التنبيهات في الأصناف التي لها سجل إنتاج (ظهرت في آخر شروة)
    const producedCodes = new Set<string>();
    if (batch) {
      const { data: yp2 } = await supabase.from('yield_processing').select('*').eq('tenant_id', getCurrentTenantId()).eq('batch_id', batch.id).maybeSingle();
      if (yp2) {
        const codeMap: any = {
          actual_fillet: 'P-1001', actual_thighs: 'P-1003', actual_wings: 'P-1004',
          actual_livers: 'P-1005', actual_carcass: 'P-1006', actual_shawarma_breast: 'P-1007',
          actual_shawarma_whole: 'P-1008', actual_whole_box: 'P-1009'
        };
        Object.entries(codeMap).forEach(([k, v]) => {
          if (Number((yp2 as any)[k] || 0) > 0) producedCodes.add(v as string);
        });
      }
    }
    (inv || []).forEach((p: any) => {
      if (!producedCodes.has(p.product_code)) return; // تجاهل ما لم يُنتج
      const kg = Number(p.stock_kg);
      if (kg <= 0) {
        alertsList.push({ type: 'danger', msg: p.product_name_ar + ': المخزون = 0 — يحتاج توريد' });
      } else if (kg < 30) {
        alertsList.push({ type: 'warn', msg: p.product_name_ar + ': المخزون منخفض (' + kg.toFixed(0) + ' كجم)' });
      }
    });
    const { data: devInvs } = await supabase
      .from('sales_invoices')
      .select('invoice_code, id, status')
      .eq('tenant_id', getCurrentTenantId())
      .eq('has_price_deviation', true)
      .order('created_at', { ascending: false })
      .limit(3);
    (devInvs || []).forEach((d: any) => {
      if (d.status === 'cancelled') return;
      alertsList.push({ type: 'warn', msg: 'فاتورة ' + (d.invoice_code || 'INV-' + d.id) + ' بسعر شاذ — راجع /reports' });
    });
    setAlerts(alertsList);

    // آخر 5 حركات
    const { data: recent } = await supabase
      .from('financial_vouchers')
      .select('created_at, type, entity_name, amount')
      .eq('tenant_id', getCurrentTenantId())
      .order('created_at', { ascending: false }).limit(5);
    setRecentMoves(recent || []);
  }

  const fmtTime = (d: string) => {
    const dt = new Date(d);
    return dt.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }) + ' ' + dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const totalRev7 = salesDaily.reduce((s, d) => s + d.revenue, 0);
  const totalProfit7 = salesDaily.reduce((s, d) => s + d.profit, 0);

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-3xl border border-slate-200 flex flex-wrap justify-between items-center gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-black text-slate-900">لوحة التحكم</h1>
          <p className="text-xs text-blue-600 font-bold mt-1">
            سعر البورصة المعتمد اليوم: <span className="font-mono text-sm">{exchangePrice} ج</span>
          </p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 flex-wrap">
          <Wallet className="w-4 h-4 text-emerald-600" />
          <span>السيولة المتاحة:</span>
          <span className="font-mono font-black text-emerald-700 text-sm">{cashBalance.toLocaleString()} ج</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-6 border-b border-slate-200 text-xs font-black flex-wrap">
        <button onClick={() => setActiveTab('overview')} className={'pb-2 ' + (activeTab === 'overview' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400')}>
          نظرة عامة
        </button>
        <button onClick={() => setActiveTab('batch')} className={'pb-2 ' + (activeTab === 'batch' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400')}>
          الشروة الأخيرة
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-3xl border border-slate-200">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Package className="w-4 h-4 text-slate-700" />
              <h2 className="text-sm font-black text-slate-800">المخزون الحالي</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {inventory.map((p: any) => {
                const kg = Number(p.stock_kg);
                const cls = kg <= 0 ? 'bg-rose-50 border-rose-300 text-rose-700'
                  : kg < 30 ? 'bg-amber-50 border-amber-300 text-amber-700'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700';
                return (
                  <div key={p.product_code} className={'p-3 rounded-2xl border-2 ' + cls}>
                    <span className="text-[10px] font-bold block leading-tight">{p.product_name_ar}</span>
                    <span className="text-lg font-black font-mono">{kg.toFixed(0)}</span>
                    <span className="text-[10px] font-bold"> كجم</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200">
              <span className="text-xs font-bold text-slate-400">ديون العملاء</span>
              <p className={'text-2xl font-black font-mono mt-1 ' + (receivables > 0 ? 'text-rose-600' : 'text-emerald-600')}>{receivables.toLocaleString()} ج</p>
              <span className="text-[11px] text-slate-500 font-bold block mt-1">{receivables > 0 ? '⚠️ مستحقة التحصيل' : '✅ لا مديونيات قائمة'}</span>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-200">
              <span className="text-xs font-bold text-slate-400">مستحقات الموردين</span>
              <p className="text-2xl font-black font-mono text-slate-800 mt-1">{payables.toLocaleString()} ج</p>
              <span className="text-[11px] text-slate-500 font-bold block mt-1">{payables > 0 ? '⚠️ مستحقة السداد' : '✅ لا مستحقات'}</span>
            </div>
          </div>

          {alerts.length > 0 && (
            <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-black text-slate-800">تنبيهات ({alerts.length})</h2>
              </div>
              {alerts.map((a: any, i: number) => (
                <div key={i} className={'p-3 rounded-xl text-xs font-bold border ' + (a.type === 'danger' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-amber-50 border-amber-200 text-amber-800')}>
                  {a.msg}
                </div>
              ))}
            </div>
          )}

          <div className="bg-white p-6 rounded-3xl border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3 mb-4 flex-wrap gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="bg-blue-100 p-2 rounded-xl"><TrendingUp className="w-4 h-4 text-blue-700" /></div>
                <div>
                  <h2 className="text-sm font-black text-slate-800">مبيعات آخر 7 أيام</h2>
                  <p className="text-[11px] text-slate-500 font-bold">
                    إجمالي: <span className="font-mono text-blue-700">{totalRev7.toLocaleString()} ج</span>
                    {' • '}
                    ربح: <span className="font-mono text-emerald-700">{totalProfit7.toLocaleString()} ج</span>
                  </p>
                </div>
              </div>
            </div>
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer>
                <BarChart data={salesDaily} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fontWeight: 700, fill: '#64748B' }} reversed={true} />
                  <YAxis tick={{ fontSize: 10, fontWeight: 700, fill: '#64748B' }} tickFormatter={(v: number) => v >= 1000 ? (v/1000).toFixed(0) + 'k' : v.toString()} orientation="right" />
                  <Tooltip contentStyle={{ fontSize: 11, fontWeight: 700, borderRadius: 12, border: '2px solid #E2E8F0', direction: 'rtl' }} formatter={(v: any) => [Number(v).toLocaleString() + ' ج', '']} />
                  <Bar dataKey="revenue" fill="#2563EB" radius={[8, 8, 0, 0]} name="الإيراد" />
                  <Bar dataKey="profit" fill="#059669" radius={[8, 8, 0, 0]} name="صافي الربح" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Activity className="w-4 h-4 text-slate-700" />
              <h2 className="text-sm font-black text-slate-800">آخر 5 حركات</h2>
            </div>
            <div className="space-y-1.5">
              {recentMoves.length === 0 && <p className="text-xs text-slate-400 text-center py-3">لا توجد حركات</p>}
              {recentMoves.map((m: any, i: number) => (
                <div key={i} className="flex justify-between items-center p-2 bg-slate-50 rounded-xl text-xs font-bold flex-wrap gap-2 flex-wrap">
                  <span className="font-mono text-slate-500">{fmtTime(m.created_at)}</span>
                  <span className="flex-1 px-2">{m.type === 'receipt' ? 'تحصيل وارد' : m.type === 'payment' ? 'سداد صادر' : m.type === 'expense' ? 'مصروف' : 'قيد'} — {m.entity_name}</span>
                  <span className={'font-mono ' + (m.type === 'receipt' ? 'text-emerald-700' : 'text-rose-700')}>
                    {Number(m.amount).toLocaleString()} ج
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'batch' && (
        <div className="space-y-6">
          {latestBatch ? (
            <>
              <div className="bg-white p-5 rounded-3xl border border-slate-200">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <Scissors className="w-4 h-4 text-slate-700" />
                  <h2 className="text-sm font-black text-slate-800">آخر شروة</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-500 block">المزرعة</span>
                    <span className="text-sm font-black">{latestBatch.supplier_name || '—'}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-500 block">الوزن الحي</span>
                    <span className="text-sm font-black font-mono">{Number(latestBatch.live_weight_kg).toFixed(0)} كجم</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-500 block">التكلفة/كجم</span>
                    <span className="text-sm font-black font-mono text-emerald-700">{Number(latestBatch.effective_kg_cost).toFixed(2)} ج</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-500 block">التاريخ</span>
                    <span className="text-sm font-black font-mono">{new Date(latestBatch.created_at).toLocaleDateString('en-GB')}</span>
                  </div>
                </div>
              </div>

              {latestYield && (
                <div className="bg-white p-5 rounded-3xl border border-slate-200">
                  <h2 className="text-sm font-black text-slate-800 mb-4">توزيع القطع المُنتَجة</h2>
                  {(() => {
                    const totalYield = YIELD_MAP.reduce((s, i) => s + Number(latestYield[i.key] || 0), 0);
                    const denom = totalYield > 0 ? totalYield : 1;
                    return (
                      <div className="space-y-2.5">
                        {YIELD_MAP.map(item => {
                          const actual = Number(latestYield[item.key] || 0);
                          const pct = (actual / denom) * 100;
                          return (
                            <div key={item.key} className="flex items-center gap-3 flex-wrap">
                              <span className="w-32 text-xs font-bold text-slate-700 shrink-0">{item.label}</span>
                              <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                                <div className="bg-blue-600 h-full transition-all" style={{ width: pct + '%' }}></div>
                              </div>
                              <span className="w-24 text-xs font-mono font-bold text-slate-900 text-left shrink-0">{actual.toFixed(1)} كجم</span>
                              <span className="w-14 text-[10px] font-bold text-slate-500 text-left shrink-0">{pct.toFixed(1)}%</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                  {(() => {
                    const totalYield = YIELD_MAP.reduce((s, i) => s + Number(latestYield[i.key] || 0), 0);
                    const liveW = Number(latestBatch.live_weight_kg) || 0;
                    const isMismatch = liveW > 0 && totalYield > liveW;
                    const wastePct = !isMismatch && liveW > 0 ? ((liveW - totalYield) / liveW) * 100 : null;
                    return (
                      <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="bg-slate-50 p-3 rounded-xl">
                          <span className="text-slate-500 font-bold block text-[10px]">إجمالي الإنتاج</span>
                          <span className="font-mono font-black">{totalYield.toFixed(1)} كجم</span>
                        </div>
                        <div className={'p-3 rounded-xl ' + (isMismatch ? 'bg-rose-50 border border-rose-200' : 'bg-amber-50')}>
                          <span className={'font-bold block text-[10px] ' + (isMismatch ? 'text-rose-700' : 'text-amber-700')}>
                            {isMismatch ? '⚠️ بيانات غير متطابقة' : 'الفاقد'}
                          </span>
                          <span className={'font-mono font-black ' + (isMismatch ? 'text-rose-800' : 'text-amber-800')}>
                            {isMismatch ? `الحي ${liveW.toFixed(0)} < الإنتاج` : (wastePct !== null ? wastePct.toFixed(1) + '%' : '—')}
                          </span>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl">
                          <span className="text-slate-500 font-bold block text-[10px]">الوزن الحي</span>
                          <span className="font-mono font-black">{liveW.toFixed(0)} كجم</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="bg-white p-5 rounded-3xl border border-slate-200">
                <h2 className="text-sm font-black text-slate-800 mb-3">تفصيل تكلفة الشروة</h2>
                <div className="grid grid-cols-2 md:grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <span className="text-slate-500 font-bold block text-[10px]">سعر التنفيذ</span>
                    <span className="font-mono font-black">{Number(latestBatch.execution_price).toFixed(2)} ج/كجم</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <span className="text-slate-500 font-bold block text-[10px]">النقل</span>
                    <span className="font-mono font-black">{Number(latestBatch.transport_cost).toLocaleString()} ج</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <span className="text-slate-500 font-bold block text-[10px]">العمالة</span>
                    <span className="font-mono font-black">{Number(latestBatch.labor_cost).toLocaleString()} ج</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <span className="text-slate-500 font-bold block text-[10px]">السمسرة</span>
                    <span className="font-mono font-black">{Number(latestBatch.broker_cost).toLocaleString()} ج</span>
                  </div>
                  <div className="bg-emerald-50 p-3 rounded-xl col-span-2 md:col-span-4">
                    <span className="text-emerald-700 font-bold block text-[10px]">إجمالي التكلفة</span>
                    <span className="font-mono font-black text-emerald-800 text-base">{Number(latestBatch.total_cost).toLocaleString()} ج</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center">
              <p className="text-sm text-slate-400 font-bold">لا توجد شروة مسجلة بعد — سجّل من قسم الإنتاج</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}