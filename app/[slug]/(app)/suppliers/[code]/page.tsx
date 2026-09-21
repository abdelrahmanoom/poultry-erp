'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Breadcrumbs from '@/components/Breadcrumbs';
import EntityActions from '@/components/EntityActions';
import DataTable from '@/components/DataTable';
import { ArrowRight, Phone, Wallet, TrendingUp, FileText, X, CheckCircle } from 'lucide-react';

export default function SupplierFilePage() {
  const params = useParams();
  const router = useRouter();
  const codeParam = String(params.code || '');
  const supabase = createClient();

  const [supplier, setSupplier] = useState<any>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'batches' | 'payments' | 'ledger'>('batches');

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [selectedTreasury, setSelectedTreasury] = useState('');
  const [treasuriesList, setTreasuriesList] = useState<any[]>([]);
  const [treasuryBalances, setTreasuryBalances] = useState<any>({});
  const [savingPayment, setSavingPayment] = useState(false);
  const [batchDetail, setBatchDetail] = useState<any>(null);
  const [yieldData, setYieldData] = useState<any>(null);

  useEffect(() => {
    if (!codeParam) { router.push('/suppliers'); return; }
    load();
  }, [codeParam]);

  async function load() {
    setLoading(true);
    let query = supabase.from('suppliers').select('*');
    if (/^\d+$/.test(codeParam)) query = query.eq('id', Number(codeParam));
    else query = query.eq('supplier_code', codeParam);
    const { data: s } = await query.maybeSingle();
    if (!s) { setLoading(false); return; }
    setSupplier(s);
    const { data: bat } = await supabase.from('batches').select('*').eq('supplier_name', s.name).order('created_at', { ascending: false });
    setBatches(bat || []);
    const { data: pay } = await supabase.from('financial_vouchers').select('*').eq('entity_name', s.name).eq('type', 'payment').order('created_at', { ascending: false });
    setPayments(pay || []);
    setLoading(false);
    loadTreasuries();
  }

  const loadTreasuries = async () => {
    const { data } = await supabase.from('treasury_accounts').select('*').eq('is_active', true).order('treasury_code');
    if (data) setTreasuriesList(data);
    const { data: bals } = await supabase.rpc('get_treasury_balances');
    if (bals) {
      const m: any = {};
      bals.forEach((b: any) => { m[b.treasury_code] = Number(b.balance || 0); });
      setTreasuryBalances(m);
    }
  };

  const handleSavePayment = async () => {
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) { alert('أدخل مبلغاً صحيحاً'); return; }
    if (!selectedTreasury) { alert('اختر الخزينة'); return; }
    if (!supplier) return;

    setSavingPayment(true);
    try {
      // 1. إيصال الدفع للمورد
      const { error: vErr } = await supabase.from('financial_vouchers').insert([{
        type: 'payment',
        entity_name: supplier.name,
        amount: amount,
        payment_method: 'cash',
        treasury_code: selectedTreasury,
        notes: paymentNotes.trim() || 'دفعة سداد للمورد',
      }]);
      if (vErr) throw vErr;

      // 2. تحديث رصيد المورد
      const newBalance = Math.max(0, Number(supplier.balance || 0) - amount);
      const { error: sErr } = await supabase.from('suppliers').update({ balance: newBalance }).eq('id', supplier.id);
      if (sErr) throw sErr;

      setShowPaymentModal(false);
      setPaymentAmount('');
      setPaymentNotes('');
      setSelectedTreasury('');
      await load();
    } catch (err: any) {
      alert('خطأ: ' + err.message);
    } finally {
      setSavingPayment(false);
    }
  };

  const openBatch = async (b: any) => {
    setBatchDetail(b);
    setYieldData(null);
    const { data } = await supabase.from('yield_processing').select('*').eq('batch_id', b.id).maybeSingle();
    setYieldData(data || null);
  };

  const totalSupplied = batches.reduce((s, b) => s + Number(b.total_cost || 0), 0);
  const totalPaid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const currentBalance = Number(supplier?.balance || 0);
  const avgCost = batches.length > 0 ? batches.reduce((s, b) => s + Number(b.effective_kg_cost || 0), 0) / batches.length : 0;

  const ledger = [
    ...batches.map(b => ({ date: b.created_at, type: 'أمر توريد', ref: b.batch_code || b.id, debit: 0, credit: Number(b.total_cost || 0) })),
    ...payments.map(p => ({ date: p.created_at, type: 'سداد نقدي', ref: p.voucher_code || 'VCH-' + p.id, debit: Number(p.amount || 0), credit: 0 })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  let running = 0;
  const ledgerWithRunning = ledger.map(r => {
    running += r.credit - r.debit;
    return { ...r, running };
  });

  // ============ COLUMNS ============
  const batchColumns = [
    { key: 'batch_code', label: 'رقم الدفعة', searchable: true, exportValue: (b: any) => b.batch_code || b.id,
      render: (b: any) => <span className="font-mono font-bold text-blue-700">{b.batch_code || b.id}</span> },
    { key: 'created_at', label: 'التاريخ', exportValue: (b: any) => new Date(b.created_at).toLocaleDateString('en-GB'),
      render: (b: any) => <span className="font-mono text-slate-500">{new Date(b.created_at).toLocaleDateString('en-GB')}</span> },
    { key: 'live_weight_kg', label: 'الوزن الحي (كجم)', exportValue: (b: any) => Number(b.live_weight_kg || 0),
      render: (b: any) => <span className="font-mono">{Number(b.live_weight_kg).toFixed(0)}</span> },
    { key: 'effective_kg_cost', label: 'تكلفة/كجم (ج)', exportValue: (b: any) => Number(b.effective_kg_cost || 0),
      render: (b: any) => <span className="font-mono font-bold text-emerald-700">{Number(b.effective_kg_cost).toFixed(2)}</span> },
    { key: 'total_cost', label: 'الإجمالي (ج)', exportValue: (b: any) => Number(b.total_cost || 0),
      render: (b: any) => <span className="font-mono font-bold">{Number(b.total_cost).toLocaleString()}</span> },
    { key: 'payment_method', label: 'طريقة الدفع', searchable: true, exportValue: (b: any) => b.payment_method === 'cash' ? 'نقدي' : b.payment_method === 'credit' ? 'آجل' : '',
      render: (b: any) => <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600">{b.payment_method === 'cash' ? 'نقدي' : b.payment_method === 'credit' ? 'آجل' : '—'}</span> },
  ];

  const paymentColumns = [
    { key: 'voucher_code', label: 'المرجع', searchable: true, exportValue: (p: any) => p.voucher_code || 'VCH-' + p.id,
      render: (p: any) => <span className="font-mono font-bold text-blue-700">{p.voucher_code || 'VCH-' + p.id}</span> },
    { key: 'created_at', label: 'التاريخ', exportValue: (p: any) => new Date(p.created_at).toLocaleDateString('en-GB'),
      render: (p: any) => <span className="font-mono text-slate-500">{new Date(p.created_at).toLocaleDateString('en-GB')}</span> },
    { key: 'treasury_code', label: 'الخزينة', searchable: true, exportValue: (p: any) => p.treasury_code || '',
      render: (p: any) => <span className="font-mono text-slate-700">{p.treasury_code || '—'}</span> },
    { key: 'payment_method', label: 'طريقة الدفع', exportValue: (p: any) => p.payment_method || '',
      render: (p: any) => <span className="text-slate-700 font-bold">{p.payment_method || '—'}</span> },
    { key: 'amount', label: 'المبلغ (ج)', exportValue: (p: any) => Number(p.amount || 0),
      render: (p: any) => <span className="font-mono font-bold text-rose-700">{Number(p.amount).toLocaleString()}</span> },
    { key: 'notes', label: 'ملاحظات', searchable: true, exportValue: (p: any) => p.notes || '',
      render: (p: any) => <span className="text-[10px] text-slate-500 max-w-[250px] truncate inline-block">{p.notes || '—'}</span> },
  ];

  const ledgerColumns = [
    { key: 'date', label: 'التاريخ', exportValue: (r: any) => new Date(r.date).toLocaleDateString('en-GB'),
      render: (r: any) => <span className="font-mono text-slate-500">{new Date(r.date).toLocaleDateString('en-GB')}</span> },
    { key: 'type', label: 'نوع الحركة', searchable: true, exportValue: (r: any) => r.type,
      render: (r: any) => <span className="font-bold">{r.type}</span> },
    { key: 'ref', label: 'المرجع', searchable: true, exportValue: (r: any) => r.ref,
      render: (r: any) => <span className="font-mono text-blue-700">{r.ref}</span> },
    { key: 'debit', label: 'مدين - سداد (ج)', exportValue: (r: any) => Number(r.debit || 0),
      render: (r: any) => <span className="font-mono text-emerald-700">{r.debit > 0 ? r.debit.toLocaleString() + ' ج' : '—'}</span> },
    { key: 'credit', label: 'دائن - توريد (ج)', exportValue: (r: any) => Number(r.credit || 0),
      render: (r: any) => <span className="font-mono text-rose-700">{r.credit > 0 ? r.credit.toLocaleString() + ' ج' : '—'}</span> },
    { key: 'running', label: 'الرصيد التراكمي (ج)', exportValue: (r: any) => Number(r.running || 0),
      render: (r: any) => <span className={'font-mono font-bold ' + (r.running > 0 ? 'text-rose-700' : 'text-emerald-700')}>{Number(r.running || 0).toLocaleString()} ج</span> },
  ];

  // ============ YIELD LABELS ============
  const yieldLabels: any = {
    actual_fillet: 'بانيه فصوص', actual_thighs: 'وراك مخلية', actual_wings: 'أجنحة',
    actual_livers: 'كبد وقوانص', actual_carcass: 'هياكل وعظام',
    actual_shawarma_breast: 'شاورما صدور', actual_shawarma_whole: 'شاورما كاملة',
    actual_whole_box: 'فراخ صندوق'
  };

  if (loading) return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 animate-pulse">
        <div className="flex justify-between items-start gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-200 rounded-xl"></div>
            <div className="space-y-2">
              <div className="h-5 w-40 bg-slate-200 rounded-lg"></div>
              <div className="h-3 w-32 bg-slate-200 rounded-lg"></div>
            </div>
          </div>
          <div className="text-left space-y-2">
            <div className="h-3 w-24 bg-slate-200 rounded-lg"></div>
            <div className="h-8 w-32 bg-slate-200 rounded-lg"></div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1,2,3].map(i => (
          <div key={i} className="bg-white p-5 rounded-3xl border border-slate-200 animate-pulse space-y-3">
            <div className="h-3 w-24 bg-slate-200 rounded-lg"></div>
            <div className="h-7 w-32 bg-slate-200 rounded-lg"></div>
            <div className="h-3 w-20 bg-slate-200 rounded-lg"></div>
          </div>
        ))}
      </div>
      <div className="bg-white p-5 rounded-3xl border border-slate-200 animate-pulse space-y-4">
        <div className="flex gap-6 border-b pb-3">
          <div className="h-4 w-24 bg-slate-200 rounded-lg"></div>
          <div className="h-4 w-20 bg-slate-200 rounded-lg"></div>
          <div className="h-4 w-24 bg-slate-200 rounded-lg"></div>
        </div>
        <div className="space-y-2">
          <div className="h-12 w-full bg-slate-100 rounded-xl"></div>
          <div className="h-12 w-full bg-slate-100 rounded-xl"></div>
          <div className="h-12 w-full bg-slate-100 rounded-xl"></div>
        </div>
      </div>
    </div>
  );
  if (!supplier) return (
    <div className="p-8 text-center space-y-4">
      <p className="text-sm font-bold text-slate-500">المورد غير موجود</p>
      <button onClick={() => router.push('/suppliers')} className="text-xs font-bold text-blue-600 hover:underline">← العودة للموردين</button>
    </div>
  );

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'الموردين', href: '/suppliers' }, { label: supplier.name }]} />

      <div className="bg-white p-6 rounded-3xl border border-slate-200">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="bg-slate-100 hover:bg-slate-200 p-2.5 rounded-xl"><ArrowRight className="w-4 h-4 text-slate-700" /></button>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold bg-slate-100 px-2 py-0.5 rounded-lg text-slate-600">{supplier.supplier_code || '—'}</span>
                <h1 className="text-xl font-black text-slate-900">{supplier.name}</h1>
              </div>
              {supplier.phone && <p className="text-xs text-slate-500 font-bold mt-1 flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {supplier.phone}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowPaymentModal(true)} className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-3.5 h-10 rounded-xl text-xs flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5" /><span>دفع للمورد</span></button>
            <EntityActions entityType="supplier" entity={supplier} onRefresh={load} showArchive={false} />
            <div className="text-left">
              <span className="text-[10px] font-bold text-slate-400 block">الرصيد الحالي</span>
              <span className={'text-2xl font-black font-mono ' + (currentBalance > 0 ? 'text-rose-600' : 'text-emerald-600')}>{currentBalance.toLocaleString()} ج</span>
              <span className="text-[10px] font-bold text-slate-500 block mt-0.5">{currentBalance > 0 ? '⚠️ مستحق السداد' : '✅ لا مستحقات'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200">
          <div className="flex items-center gap-2 text-slate-400 mb-2"><TrendingUp className="w-4 h-4" /><span className="text-xs font-bold">إجمالي التوريدات</span></div>
          <p className="text-2xl font-black font-mono text-slate-900">{totalSupplied.toLocaleString()} ج</p>
          <span className="text-[10px] font-bold text-slate-500">{batches.length} دفعة</span>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200">
          <div className="flex items-center gap-2 text-emerald-500 mb-2"><Wallet className="w-4 h-4" /><span className="text-xs font-bold">إجمالي السدادات</span></div>
          <p className="text-2xl font-black font-mono text-emerald-700">{totalPaid.toLocaleString()} ج</p>
          <span className="text-[10px] font-bold text-slate-500">{payments.length} إيصال</span>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200">
          <div className="flex items-center gap-2 text-slate-400 mb-2"><FileText className="w-4 h-4" /><span className="text-xs font-bold">متوسط التكلفة/كجم</span></div>
          <p className="text-2xl font-black font-mono text-slate-900">{avgCost.toFixed(2)} ج</p>
          <span className="text-[10px] font-bold text-slate-500">عبر {batches.length} دفعة</span>
        </div>
      </div>

      <div className="bg-white p-5 rounded-3xl border border-slate-200">
        <div className="flex flex-wrap gap-6 border-b border-slate-200 text-xs font-black mb-4 pb-3">
          <button onClick={() => setActiveTab('batches')} className={'pb-2 ' + (activeTab === 'batches' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400')}>التوريدات ({batches.length})</button>
          <button onClick={() => setActiveTab('payments')} className={'pb-2 ' + (activeTab === 'payments' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400')}>المدفوعات ({payments.length})</button>
          <button onClick={() => setActiveTab('ledger')} className={'pb-2 ' + (activeTab === 'ledger' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400')}>كشف الحساب</button>
        </div>

        {activeTab === 'batches' && (
          <DataTable
            data={batches}
            columns={batchColumns}
            filename={'توريدات_' + supplier.name}
            searchPlaceholder="بحث..."
            emptyMessage="لا توجد توريدات"
            rowKey={(b: any) => b.id}
            storageKey={'supplier_batches_' + (supplier?.id || 'x')}
            dateKey="created_at"
            dateDefault="all"
            onRowClick={openBatch}
          />
        )}

        {activeTab === 'payments' && (
          <DataTable
            data={payments}
            columns={paymentColumns}
            filename={'مدفوعات_' + supplier.name}
            searchPlaceholder="بحث..."
            emptyMessage="لا توجد مدفوعات"
            rowKey={(p: any) => p.id}
            storageKey={'supplier_payments_' + (supplier?.id || 'x')}
            dateKey="created_at"
            dateDefault="all"
          />
        )}

        {activeTab === 'ledger' && (
          <DataTable
            data={ledgerWithRunning}
            columns={ledgerColumns}
            filename={'كشف_حساب_' + supplier.name}
            searchPlaceholder="بحث..."
            emptyMessage="لا توجد حركات"
            rowKey={(r: any, i: number) => i}
            storageKey={'supplier_ledger_' + (supplier?.id || 'x')}
            dateKey="date"
            dateDefault="all"
          />
        )}
      </div>

      {batchDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => { setBatchDetail(null); setYieldData(null); }}>
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[85vh] shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="bg-blue-50 p-5 border-b-2 border-blue-200 flex justify-between items-center rounded-t-3xl">
              <div>
                <h3 className="text-base font-bold text-blue-900">دفعة {batchDetail.batch_code || batchDetail.id}</h3>
                <p className="text-xs text-slate-600 mt-1">{new Date(batchDetail.created_at).toLocaleString('en-GB')}</p>
              </div>
              <button onClick={() => { setBatchDetail(null); setYieldData(null); }} className="text-slate-500 hover:text-slate-800"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl"><span className="text-slate-500 font-bold block text-[10px]">الوزن الحي</span><span className="font-mono font-bold">{Number(batchDetail.live_weight_kg).toFixed(0)} كجم</span></div>
                <div className="bg-slate-50 p-3 rounded-xl"><span className="text-slate-500 font-bold block text-[10px]">سعر التنفيذ</span><span className="font-mono font-bold">{Number(batchDetail.execution_price).toFixed(2)} ج</span></div>
                <div className="bg-slate-50 p-3 rounded-xl"><span className="text-slate-500 font-bold block text-[10px]">النقل</span><span className="font-mono font-bold">{Number(batchDetail.transport_cost || 0).toLocaleString()} ج</span></div>
                <div className="bg-slate-50 p-3 rounded-xl"><span className="text-slate-500 font-bold block text-[10px]">العمالة</span><span className="font-mono font-bold">{Number(batchDetail.labor_cost || 0).toLocaleString()} ج</span></div>
                <div className="bg-slate-50 p-3 rounded-xl"><span className="text-slate-500 font-bold block text-[10px]">السمسرة</span><span className="font-mono font-bold">{Number(batchDetail.broker_cost || 0).toLocaleString()} ج</span></div>
                <div className="bg-emerald-50 p-3 rounded-xl"><span className="text-emerald-700 font-bold block text-[10px]">الإجمالي</span><span className="font-mono font-black text-emerald-800">{Number(batchDetail.total_cost).toLocaleString()} ج</span></div>
              </div>
              {yieldData && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 mb-2">توزيع القطع المنتجة</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {Object.entries(yieldLabels).map(([key, label]: any) => {
                      const val = Number(yieldData[key] || 0);
                      if (val === 0) return null;
                      return (
                        <div key={key} className="bg-slate-50 p-2.5 rounded-xl text-xs">
                          <span className="text-slate-500 font-bold block text-[10px]">{label}</span>
                          <span className="font-mono font-bold text-slate-900">{val.toFixed(1)} كجم</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !savingPayment && setShowPaymentModal(false)}>
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-base font-black text-slate-800">دفعة سداد للمورد</h3>
                <p className="text-xs text-slate-500 font-bold mt-0.5">{supplier?.name}</p>
              </div>
              <button onClick={() => setShowPaymentModal(false)} disabled={savingPayment} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>

            <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl">
              <span className="text-[10px] font-bold text-rose-700 block">الرصيد المستحق للمورد</span>
              <span className="font-mono font-black text-rose-900 text-lg">{Number(supplier?.balance || 0).toLocaleString()} ج</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">المبلغ المدفوع (ج) *</label>
                <input type="number" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="0.00" className="w-full border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold font-mono outline-none focus:border-rose-600" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الخزينة *</label>
                <select value={selectedTreasury} onChange={(e) => setSelectedTreasury(e.target.value)} className="w-full border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold outline-none focus:border-rose-600">
                  <option value="">— اختر الخزينة —</option>
                  {treasuriesList.map((t: any) => (
                    <option key={t.treasury_code} value={t.treasury_code}>
                      {t.name_ar} ({(treasuryBalances[t.treasury_code] || 0).toLocaleString()} ج)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات</label>
                <input type="text" value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} placeholder="ملاحظات" className="w-full border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold outline-none focus:border-rose-600" />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={handleSavePayment} disabled={savingPayment} className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>{savingPayment ? 'جاري الحفظ...' : 'تأكيد الدفع'}</span>
              </button>
              <button onClick={() => setShowPaymentModal(false)} disabled={savingPayment} className="bg-slate-100 text-slate-700 font-bold px-5 py-3 rounded-xl text-sm">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
