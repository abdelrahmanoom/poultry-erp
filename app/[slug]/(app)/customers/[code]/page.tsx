'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Breadcrumbs from '@/components/Breadcrumbs';
import DataTable from '@/components/DataTable';
import EntityActions from '@/components/EntityActions';
import { ArrowRight, Phone, Wallet, TrendingUp, FileText, AlertTriangle, X, Save, CheckCircle } from 'lucide-react';

export default function CustomerFilePage() {
  const params = useParams();
  const router = useRouter();
  const codeParam = String(params.code || '');
  const supabase = createClient();

  const [customer, setCustomer] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'invoices' | 'receipts' | 'ledger'>('invoices');

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [selectedTreasury, setSelectedTreasury] = useState('');
  const [treasuriesList, setTreasuriesList] = useState<any[]>([]);
  const [treasuryBalances, setTreasuryBalances] = useState<any>({});
  const [savingPayment, setSavingPayment] = useState(false);
  const [invoiceDetail, setInvoiceDetail] = useState<any>(null);
  const [invoiceItems, setInvoiceItems] = useState<any[]>([]);

  useEffect(() => {
    if (!codeParam) { router.push('/customers'); return; }
    load();
  }, [codeParam]);

  async function load() {
    setLoading(true);
    let query = supabase.from('customers').select('*');
    if (/^\d+$/.test(codeParam)) {
      query = query.eq('id', Number(codeParam));
    } else {
      query = query.eq('customer_code', codeParam);
    }
    const { data: c } = await query.maybeSingle();
    if (!c) { setLoading(false); return; }
    setCustomer(c);
    const id = c.id;
    const { data: inv } = await supabase
      .from('sales_invoices').select('*')
      .or(`customer_id.eq.${id},customer_name.eq.${c.name}`)
      .order('created_at', { ascending: false });
    setInvoices(inv || []);
    const { data: rec } = await supabase
      .from('financial_vouchers').select('*')
      .eq('entity_name', c.name).eq('type', 'receipt')
      .order('created_at', { ascending: false });
    setReceipts(rec || []);
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
    if (!customer) return;

    setSavingPayment(true);
    try {
      // 1. إنشاء إيصال القبض
      const { error: vErr } = await supabase.from('financial_vouchers').insert([{
        type: 'receipt',
        entity_name: customer.name,
        amount: amount,
        payment_method: 'cash',
        treasury_code: selectedTreasury,
        notes: paymentNotes.trim() || 'تحصيل دفعة من العميل',
        tenant_id: customer.tenant_id || 1,
      }]);
      if (vErr) throw vErr;

      // 2. تحديث رصيد العميل
      const newBalance = Math.max(0, Number(customer.balance || 0) - amount);
      const { error: cErr } = await supabase.from('customers').update({ balance: newBalance }).eq('id', customer.id);
      if (cErr) throw cErr;

      // 3. تحديث الحالة
      setShowPaymentModal(false);
      setPaymentAmount('');
      setPaymentNotes('');
      setSelectedTreasury('');
      await load();
      await loadTreasuries();
    } catch (err: any) {
      alert('خطأ: ' + err.message);
    } finally {
      setSavingPayment(false);
    }
  };

  const openInvoice = async (inv: any) => {
    setInvoiceDetail(inv);
    setInvoiceItems([]);
    const { data } = await supabase.from('sales_items').select('*').eq('invoice_id', inv.id);
    setInvoiceItems(data || []);
  };

  const totalSales = invoices.filter(i => i.status !== 'cancelled').reduce((s, i) => s + Number(i.total_amount || 0), 0);
  const totalPaid = receipts.reduce((s, r) => s + Number(r.amount || 0), 0);
  const currentBalance = Number(customer?.balance || 0);

  const ledgerRows = [
    ...invoices.filter(i => i.status !== 'cancelled').map(i => ({
      date: i.created_at, type: 'فاتورة مبيعات', ref: i.invoice_code || 'INV-' + i.id,
      debit: Number(i.total_amount || 0), credit: 0
    })),
    ...receipts.map(r => ({
      date: r.created_at, type: 'تحصيل وارد', ref: r.voucher_code || 'VCH-' + r.id,
      debit: 0, credit: Number(r.amount || 0)
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Columns
  const invoiceColumns = [
    { key: 'invoice_code', label: 'رقم الفاتورة', searchable: true, exportValue: (i: any) => i.invoice_code || 'INV-' + i.id,
      render: (i: any) => <span className="font-mono font-bold text-blue-700 inline-flex items-center gap-1">{i.has_price_deviation && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}{i.invoice_code || 'INV-' + i.id}</span> },
    { key: 'created_at', label: 'التاريخ', exportValue: (i: any) => new Date(i.created_at).toLocaleDateString('en-GB'),
      render: (i: any) => <span className="font-mono text-slate-500">{new Date(i.created_at).toLocaleDateString('en-GB')}</span> },
    { key: 'total_amount', label: 'الإجمالي (ج)', exportValue: (i: any) => Number(i.total_amount || 0),
      render: (i: any) => <span className="font-mono font-bold">{Number(i.total_amount).toLocaleString()}</span> },
    { key: 'paid_amount', label: 'المدفوع (ج)', exportValue: (i: any) => Number(i.paid_amount || 0),
      render: (i: any) => <span className="font-mono text-emerald-700">{Number(i.paid_amount || 0).toLocaleString()}</span> },
    { key: 'remaining_amount', label: 'المتبقي (ج)', exportValue: (i: any) => Number(i.remaining_amount || 0),
      render: (i: any) => <span className="font-mono text-rose-700">{Number(i.remaining_amount || 0).toLocaleString()}</span> },
    { key: 'payment_status', label: 'الحالة', exportValue: (i: any) => i.status === 'cancelled' ? 'ملغاة' : i.payment_status === 'paid' ? 'مسددة' : i.payment_status === 'partial' ? 'جزئية' : 'آجلة',
      render: (i: any) => <span className={'text-[10px] font-bold px-2 py-0.5 rounded-lg ' + (i.status === 'cancelled' ? 'bg-rose-100 text-rose-700' : i.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700' : i.payment_status === 'partial' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600')}>{i.status === 'cancelled' ? 'ملغاة' : i.payment_status === 'paid' ? 'مسددة' : i.payment_status === 'partial' ? 'جزئية' : 'آجلة'}</span> },
  ];

  const receiptColumns = [
    { key: 'voucher_code', label: 'المرجع', searchable: true, exportValue: (r: any) => r.voucher_code || 'VCH-' + r.id,
      render: (r: any) => <span className="font-mono font-bold text-blue-700">{r.voucher_code || 'VCH-' + r.id}</span> },
    { key: 'created_at', label: 'التاريخ', exportValue: (r: any) => new Date(r.created_at).toLocaleDateString('en-GB'),
      render: (r: any) => <span className="font-mono text-slate-500">{new Date(r.created_at).toLocaleDateString('en-GB')}</span> },
    { key: 'treasury_code', label: 'الخزينة', searchable: true, exportValue: (r: any) => r.treasury_code || '',
      render: (r: any) => <span className="font-mono text-slate-700">{r.treasury_code || '—'}</span> },
    { key: 'payment_method', label: 'طريقة الدفع', exportValue: (r: any) => r.payment_method || '',
      render: (r: any) => <span className="text-slate-700 font-bold">{r.payment_method || '—'}</span> },
    { key: 'amount', label: 'المبلغ (ج)', exportValue: (r: any) => Number(r.amount || 0),
      render: (r: any) => <span className="font-mono font-bold text-emerald-700">{Number(r.amount).toLocaleString()}</span> },
    { key: 'notes', label: 'ملاحظات', searchable: true, exportValue: (r: any) => r.notes || '',
      render: (r: any) => <span className="text-[10px] text-slate-500 max-w-[200px] truncate inline-block">{r.notes || '—'}</span> },
  ];

  const ledgerColumns = [
    { key: 'date', label: 'التاريخ', exportValue: (r: any) => new Date(r.date).toLocaleDateString('en-GB'),
      render: (r: any) => <span className="font-mono text-slate-500">{new Date(r.date).toLocaleDateString('en-GB')}</span> },
    { key: 'type', label: 'نوع الحركة', searchable: true, exportValue: (r: any) => r.type,
      render: (r: any) => <span className="font-bold">{r.type}</span> },
    { key: 'ref', label: 'المرجع', searchable: true, exportValue: (r: any) => r.ref,
      render: (r: any) => <span className="font-mono text-blue-700">{r.ref}</span> },
    { key: 'debit', label: 'مدين (ج)', exportValue: (r: any) => Number(r.debit || 0),
      render: (r: any) => <span className="font-mono text-rose-700">{r.debit > 0 ? r.debit.toLocaleString() + ' ج' : '—'}</span> },
    { key: 'credit', label: 'دائن (ج)', exportValue: (r: any) => Number(r.credit || 0),
      render: (r: any) => <span className="font-mono text-emerald-700">{r.credit > 0 ? r.credit.toLocaleString() + ' ج' : '—'}</span> },
    { key: 'running', label: 'الرصيد التراكمي (ج)', exportValue: (r: any) => Number(r.running || 0),
      render: (r: any) => <span className={'font-mono font-bold ' + (r.running > 0 ? 'text-rose-700' : 'text-emerald-700')}>{Number(r.running || 0).toLocaleString()} ج</span> },
  ];

  // حساب الرصيد التراكمي للكشف
  let running = 0;
  const ledgerWithRunning = ledgerRows.map(r => {
    running += r.debit - r.credit;
    return { ...r, running };
  });

  const itemColumns = [
    { key: 'product_code', label: 'الصنف', searchable: true,
      render: (it: any) => <span className="font-mono font-bold">{it.product_code}</span> },
    { key: 'quantity_kg', label: 'الكمية (كجم)', exportValue: (it: any) => Number(it.quantity_kg || 0),
      render: (it: any) => <span className="font-mono">{Number(it.quantity_kg).toFixed(2)}</span> },
    { key: 'unit_price', label: 'السعر (ج)', exportValue: (it: any) => Number(it.unit_price || 0),
      render: (it: any) => <span className="font-mono">{Number(it.unit_price).toLocaleString()}</span> },
    { key: 'subtotal', label: 'الإجمالي (ج)', exportValue: (it: any) => Number(it.subtotal || 0),
      render: (it: any) => <span className="font-mono font-bold">{Number(it.subtotal).toLocaleString()}</span> },
  ];

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
  if (!customer) return (
    <div className="p-8 text-center space-y-4">
      <p className="text-sm font-bold text-slate-500">العميل غير موجود</p>
      <button onClick={() => router.push('/customers')} className="text-xs font-bold text-blue-600 hover:underline">← العودة للعملاء</button>
    </div>
  );

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'العملاء', href: '/customers' }, { label: customer.name }]} />

      <div className="bg-white p-6 rounded-3xl border border-slate-200">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="bg-slate-100 hover:bg-slate-200 p-2.5 rounded-xl"><ArrowRight className="w-4 h-4 text-slate-700" /></button>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold bg-slate-100 px-2 py-0.5 rounded-lg text-slate-600">{customer.customer_code || '—'}</span>
                <h1 className="text-xl font-black text-slate-900">{customer.name}</h1>
              </div>
              {customer.phone && <p className="text-xs text-slate-500 font-bold mt-1 flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {customer.phone}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3"><button onClick={() => setShowPaymentModal(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 h-10 rounded-xl text-xs flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5" /><span>تحصيل دفعة</span></button><EntityActions entityType="customer" entity={customer} onRefresh={load} showArchive={false} /><div className="text-left">
            <span className="text-[10px] font-bold text-slate-400 block">الرصيد الحالي</span>
            <span className={'text-2xl font-black font-mono ' + (currentBalance > 0 ? 'text-rose-600' : 'text-emerald-600')}>{currentBalance.toLocaleString()} ج</span>
            <span className="text-[10px] font-bold text-slate-500 block mt-0.5">{currentBalance > 0 ? '⚠️ مديونية قائمة' : '✅ لا مديونيات'}</span>
          </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200">
          <div className="flex items-center gap-2 text-slate-400 mb-2"><TrendingUp className="w-4 h-4" /><span className="text-xs font-bold">إجمالي المشتريات</span></div>
          <p className="text-2xl font-black font-mono text-slate-900">{totalSales.toLocaleString()} ج</p>
          <span className="text-[10px] font-bold text-slate-500">{invoices.filter(i => i.status !== 'cancelled').length} فاتورة</span>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200">
          <div className="flex items-center gap-2 text-emerald-500 mb-2"><Wallet className="w-4 h-4" /><span className="text-xs font-bold">إجمالي المدفوعات</span></div>
          <p className="text-2xl font-black font-mono text-emerald-700">{totalPaid.toLocaleString()} ج</p>
          <span className="text-[10px] font-bold text-slate-500">{receipts.length} إيصال</span>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200">
          <div className="flex items-center gap-2 text-slate-400 mb-2"><FileText className="w-4 h-4" /><span className="text-xs font-bold">سقف الائتمان</span></div>
          <p className="text-2xl font-black font-mono text-slate-900">{Number(customer.credit_limit || 0).toLocaleString()} ج</p>
          <span className="text-[10px] font-bold text-slate-500">متاح: {Math.max(0, Number(customer.credit_limit || 0) - currentBalance).toLocaleString()} ج</span>
        </div>
      </div>

      <div className="bg-white p-5 rounded-3xl border border-slate-200">
        <div className="flex flex-wrap gap-6 border-b border-slate-200 text-xs font-black mb-4 pb-3">
          <button onClick={() => setActiveTab('invoices')} className={'pb-2 ' + (activeTab === 'invoices' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400')}>الفواتير ({invoices.length})</button>
          <button onClick={() => setActiveTab('receipts')} className={'pb-2 ' + (activeTab === 'receipts' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400')}>الإيصالات ({receipts.length})</button>
          <button onClick={() => setActiveTab('ledger')} className={'pb-2 ' + (activeTab === 'ledger' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400')}>كشف الحساب</button>
        </div>

        {activeTab === 'invoices' && (
          <DataTable
            data={invoices}
            columns={invoiceColumns}
            filename={'فواتير_' + customer.name}
            searchPlaceholder="بحث برقم الفاتورة..."
            emptyMessage="لا توجد فواتير"
            rowKey={(i: any) => i.id}
            storageKey={'customer_invoices_' + (customer?.id || 'x')}
            dateKey="created_at"
            dateDefault="all"
            onRowClick={(i: any) => i.status !== 'cancelled' && openInvoice(i)}
            rowClassName={(i: any) => i.status === 'cancelled' ? 'bg-rose-50 opacity-60' : ''}
          />
        )}

        {activeTab === 'receipts' && (
          <DataTable
            data={receipts}
            columns={receiptColumns}
            filename={'ايصالات_' + customer.name}
            searchPlaceholder="بحث بالمرجع..."
            emptyMessage="لا توجد إيصالات"
            rowKey={(r: any) => r.id}
            storageKey={'customer_receipts_' + (customer?.id || 'x')}
            dateKey="created_at"
            dateDefault="all"
          />
        )}

        {activeTab === 'ledger' && (
          <DataTable
            data={ledgerWithRunning}
            columns={ledgerColumns}
            filename={'كشف_حساب_' + customer.name}
            searchPlaceholder="بحث..."
            emptyMessage="لا توجد حركات"
            rowKey={(r: any, i: number) => i}
            storageKey={'customer_ledger_' + (customer?.id || 'x')}
            dateKey="date"
            dateDefault="all"
          />
        )}
      </div>

      {invoiceDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setInvoiceDetail(null)}>
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[85vh] shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="bg-blue-50 p-5 border-b-2 border-blue-200 flex justify-between items-center rounded-t-3xl">
              <div>
                <h3 className="text-base font-bold text-blue-900">فاتورة {invoiceDetail.invoice_code || 'INV-' + invoiceDetail.id}</h3>
                <p className="text-xs text-slate-600 mt-1">{new Date(invoiceDetail.created_at).toLocaleString('en-GB')}</p>
              </div>
              <button onClick={() => setInvoiceDetail(null)} className="text-slate-500 hover:text-slate-800"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto p-5 space-y-4">
              <DataTable
                data={invoiceItems}
                columns={itemColumns}
                filename={'بنود_' + (invoiceDetail.invoice_code || invoiceDetail.id)}
                searchPlaceholder="بحث..."
                emptyMessage="لا توجد بنود"
                rowKey={(it: any) => it.id}
                storageKey="invoice_items_modal"
              />
              <div className="bg-slate-50 p-4 rounded-2xl grid grid-cols-2 gap-3 text-xs">
                <div><span className="text-slate-500">الإجمالي: </span><span className="font-mono font-bold">{Number(invoiceDetail.total_amount).toLocaleString()} ج</span></div>
                <div><span className="text-slate-500">المدفوع: </span><span className="font-mono font-bold text-emerald-700">{Number(invoiceDetail.paid_amount || 0).toLocaleString()} ج</span></div>
                <div><span className="text-slate-500">المتبقي: </span><span className="font-mono font-bold text-rose-700">{Number(invoiceDetail.remaining_amount || 0).toLocaleString()} ج</span></div>
                <div><span className="text-slate-500">COGS: </span><span className="font-mono font-bold text-slate-700">{Number(invoiceDetail.cogs || 0).toLocaleString()} ج</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !savingPayment && setShowPaymentModal(false)}>
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-base font-black text-slate-800">تحصيل دفعة من العميل</h3>
                <p className="text-xs text-slate-500 font-bold mt-0.5">{customer?.name}</p>
              </div>
              <button onClick={() => setShowPaymentModal(false)} disabled={savingPayment} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>

            <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl">
              <span className="text-[10px] font-bold text-rose-700 block">الرصيد الحالي</span>
              <span className="font-mono font-black text-rose-900 text-lg">{Number(customer?.balance || 0).toLocaleString()} ج</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">المبلغ المحصّل (ج) *</label>
                <input type="number" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="0.00" className="w-full border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold font-mono outline-none focus:border-emerald-600" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الخزينة *</label>
                <select value={selectedTreasury} onChange={(e) => setSelectedTreasury(e.target.value)} className="w-full border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold outline-none focus:border-emerald-600">
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
                <input type="text" value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} placeholder="ملاحظات" className="w-full border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold outline-none focus:border-emerald-600" />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={handleSavePayment} disabled={savingPayment} className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>{savingPayment ? 'جاري الحفظ...' : 'تأكيد التحصيل'}</span>
              </button>
              <button onClick={() => setShowPaymentModal(false)} disabled={savingPayment} className="bg-slate-100 text-slate-700 font-bold px-5 py-3 rounded-xl text-sm">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
