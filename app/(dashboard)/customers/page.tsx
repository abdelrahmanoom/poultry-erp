'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import DataTable from '@/components/DataTable';
import * as XLSX from 'xlsx';
import { FileText, Wallet, History, TrendingDown, TrendingUp, Download } from 'lucide-react';

export default function CustomersPage() {
  const supabase = createClient();
  const router = useRouter();
  const [toast, setToast] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCust, setSelectedCust] = useState<any>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  const [totalDebit, setTotalDebit] = useState(0);
  const [totalCredit, setTotalCredit] = useState(0);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [treasuries, setTreasuries] = useState<any[]>([]);
  const [treasuryBalances, setTreasuryBalances] = useState<any>({});
  const [selectedTreasury, setSelectedTreasury] = useState('');
  const [invoiceModal, setInvoiceModal] = useState<any>(null);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [deleteModal, setDeleteModal] = useState<any>(null);
  const [invoiceItems, setInvoiceItems] = useState<any[]>([]);

  const showToast = (msg: string, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadTreasuries = async () => {
    const { data: treas } = await supabase.from('treasury_accounts').select('*').eq('is_active', true).order('treasury_code');
    if (treas) {
      setTreasuries(treas);
      if (!selectedTreasury && treas.length > 0) setSelectedTreasury(treas[0].treasury_code);

      const { data: vous } = await supabase.from('financial_vouchers').select('treasury_code, type, amount');
      if (vous) {
        const bals: any = {};
        treas.forEach((t: any) => bals[t.treasury_code] = 0);
        vous.forEach((v: any) => {
          const code = v.treasury_code || 'MAIN-CASH';
          if (bals[code] === undefined) bals[code] = 0;
          const amt = Number(v.amount || 0);
          if (v.type === 'receipt') bals[code] += amt;
          else bals[code] -= amt;
        });
        setTreasuryBalances(bals);
      }
    }
  };

  const loadCustomers = async () => {
    const { data } = await supabase.from('customers').select('*').order('balance', { ascending: false });
    if (data) setCustomers(data);
  };

  useEffect(() => { loadCustomers(); loadTreasuries(); }, []);

  const buildLedger = async (cust: any) => {
    const { data: invs } = await supabase.from('sales_invoices').select('*').eq('customer_name', cust.name).order('created_at');
    const { data: vous } = await supabase.from('financial_vouchers').select('*').eq('entity_name', cust.name).eq('type', 'receipt').order('created_at');

    const movements: any[] = [];

    (invs || []).forEach((inv: any) => {
      movements.push({
        date: inv.created_at,
        type: 'فاتورة مبيعات',
        ref: inv.id,
        desc: 'فاتورة بيع مجمعة',
        debit: Number(inv.total_amount),
        credit: 0,
        canOpen: true,
        invoiceId: inv.id
      });
    });

    (vous || []).forEach((v: any) => {
      movements.push({
        date: v.created_at,
        type: 'دفعة واردة',
        ref: '#' + v.id,
        desc: v.notes || 'تحصيل نقدي',
        debit: 0,
        credit: Number(v.amount),
        treasury: v.treasury_code,
        canOpen: false
      });
    });

    movements.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let running = 0;
    let td = 0, tc = 0;
    movements.forEach(m => {
      running += m.debit - m.credit;
      m.running = running;
      td += m.debit;
      tc += m.credit;
    });

    setLedger(movements);
    setTotalDebit(td);
    setTotalCredit(tc);
  };

  const openCustomerFile = async (cust: any) => {
    setSelectedCust(cust);
    await buildLedger(cust);
  };

  const refreshCustomer = async () => {
    if (!selectedCust) return;
    const { data: fresh } = await supabase.from('customers').select('*').eq('id', selectedCust.id).maybeSingle();
    if (fresh) {
      setSelectedCust(fresh);
      await buildLedger(fresh);
    }
  };

  const handleCollectPayment = async (e: any) => {
    e.preventDefault();
    if (!selectedCust || !paymentAmount || Number(paymentAmount) <= 0) {
      showToast('المبلغ مطلوب', 'error'); return;
    }
    if (!selectedTreasury) {
      showToast('اختر الخزينة', 'error'); return;
    }

    const { error } = await supabase.from('financial_vouchers').insert([{
      type: 'receipt',
      entity_name: selectedCust.name,
      amount: Number(paymentAmount),
      payment_method: 'cash',
      treasury_code: selectedTreasury,
      notes: 'تحصيل دفعة واردة'
    }]);

    if (error) { showToast('خطأ: ' + error.message, 'error'); return; }

    const newBalance = Math.max(0, Number(selectedCust.balance || 0) - Number(paymentAmount));
    await supabase.from('customers').update({ balance: newBalance }).eq('id', selectedCust.id);

    setPaymentAmount('');
    await refreshCustomer();
    loadCustomers();
    loadTreasuries();
    showToast('تم إثبات التحصيل');
  };

  const openInvoiceDetails = async (invoiceId: number) => {
    const { data: inv } = await supabase.from('sales_invoices').select('*').eq('id', invoiceId).maybeSingle();
    const { data: items } = await supabase.from('sales_items').select('*').eq('invoice_id', invoiceId);
    setInvoiceModal(inv);
    setInvoiceItems(items || []);
  };

  const exportCustomerLedger = () => {
    if (!selectedCust || ledger.length === 0) return;
    const rows = ledger.map((m: any) => ({
      'التاريخ': new Date(m.date).toLocaleDateString('en-GB'),
      'الحركة': m.type,
      'المرجع': m.ref,
      'البيان': m.desc,
      'مدين (ج)': m.debit > 0 ? m.debit : '',
      'دائن (ج)': m.credit > 0 ? m.credit : '',
      'الرصيد التراكمي': m.running
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 12 }, { wch: 18 }, { wch: 14 }, { wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'كشف الحساب');
    XLSX.writeFile(wb, 'كشف_حساب_' + selectedCust.name + '_' + new Date().toISOString().split('T')[0] + '.xlsx');
  };

  const getTreasuryName = (code: string) => {
    const t = treasuries.find(x => x.treasury_code === code);
    return t ? t.name_ar : code;
  };

  const getProductName = (code: string) => {
    const names: any = {
      'P-1001': 'بانيه فصوص', 'P-1002': 'شيش طاووق', 'P-1003': 'وراك مخلية',
      'P-1004': 'أجنحة', 'P-1005': 'كبد وقوانص', 'P-1006': 'هياكل وعظام',
      'P-1007': 'شاورما صدور بالجلد', 'P-1008': 'شاورما كاملة بالجلد', 'P-1009': 'فراخ صندوق كاملة'
    };
    return names[code] || code;
  };


  const customerColumns = [
    {
      key: 'customer_code',
      label: 'الكود',
      searchable: true,
      render: (c: any) => <span className="font-mono text-slate-500 font-bold text-[11px]">{c.customer_code || '—'}</span>
    },
    {
      key: 'name',
      exportValue: (c: any) => c.name,
      label: 'العميل أو المنشأة',
      searchable: true,
      render: (c: any) => (
        <span onClick={() => openCustomerFile(c)} className="font-bold text-blue-700 cursor-pointer hover:underline">
          {c.name}
        </span>
      )
    },
    {
      key: 'phone',
      label: 'رقم الاتصال',
      searchable: true,
      accessor: (c: any) => c.phone || '---'
    },
    {
      key: 'balance',
      exportValue: (c: any) => Number(c.balance || 0),
      label: 'الرصيد المدين القائم',
      render: (c: any) => <span className="font-bold text-rose-600 font-mono">{Number(c.balance || 0).toLocaleString()} ج</span>
    },
    {
      key: 'credit_limit',
      exportValue: (c: any) => Number(c.credit_limit || 50000),
      label: 'سقف الائتمان',
      render: (c: any) => <span className="font-mono text-slate-700">{Number(c.credit_limit || 50000).toLocaleString()} ج</span>
    },
    {
      key: 'credit_available',
      label: 'المتاح من الائتمان',
      defaultHidden: true,
      render: (c: any) => {
        const lim = Number(c.credit_limit || 50000);
        const bal = Number(c.balance || 0);
        const avail = Math.max(0, lim - bal);
        return <span className="font-mono text-emerald-700">{avail.toLocaleString()} ج</span>;
      }
    },
    {
      key: 'credit_usage',
      label: 'نسبة استخدام الائتمان (%)',
      defaultHidden: true,
      render: (c: any) => {
        const lim = Number(c.credit_limit || 50000);
        const bal = Number(c.balance || 0);
        const usage = lim > 0 ? (bal / lim) * 100 : 0;
        const color = usage > 80 ? 'text-rose-600' : usage > 50 ? 'text-amber-600' : 'text-emerald-700';
        return <span className={'font-mono font-bold ' + color}>{usage.toFixed(1)}%</span>;
      }
    },
    {
      key: 'is_active',
      label: 'الحالة',
      defaultHidden: true,
      render: (c: any) => c.is_active === false ? <span className="text-amber-700 font-bold text-xs">مؤرشف</span> : <span className="text-emerald-700 font-bold text-xs">نشط</span>
    }
  ];

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-2xl border text-sm font-bold ${toast.type === 'success' ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-rose-600 text-white border-rose-400'}`}>{toast.msg}</div>
      )}

      {invoiceModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-right">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-base font-black text-blue-900">تفاصيل الفاتورة #{invoiceModal.id}</h3>
              <button onClick={() => setInvoiceModal(null)} className="text-slate-400 font-bold text-sm">إغلاق</button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl">
                <span className="text-slate-500 block">التاريخ:</span>
                <b className="text-sm font-mono">{new Date(invoiceModal.created_at).toLocaleString('en-GB')}</b>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl">
                <span className="text-slate-500 block">الإجمالي:</span>
                <b className="text-sm font-mono text-blue-800">{Number(invoiceModal.total_amount).toLocaleString()} ج</b>
              </div>
              <div className="bg-emerald-50 p-3 rounded-xl">
                <span className="text-emerald-700 block">المحصل:</span>
                <b className="text-sm font-mono text-emerald-800">{Number(invoiceModal.paid_amount).toLocaleString()} ج</b>
              </div>
              <div className="bg-rose-50 p-3 rounded-xl">
                <span className="text-rose-700 block">المتبقي:</span>
                <b className="text-sm font-mono text-rose-800">{Number(invoiceModal.remaining_amount).toLocaleString()} ج</b>
              </div>
            </div>
            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-800 text-white">
              <tr>
                <th className="p-3 rounded-r-xl">العميل</th>
                <th className="p-3">الهاتف</th>
                <th className="p-3">الرصيد المدين</th>
                <th className="p-3 text-center rounded-l-xl">الإجراء</th>
              </tr>
            </thead>
                <tbody className="divide-y divide-slate-200 font-mono">
                  {invoiceItems.map((it: any) => (
                    <tr key={it.id}>
                      <td className="p-2 font-sans font-bold">{getProductName(it.product_code)}</td>
                      <td className="p-2">{it.quantity_kg} كجم</td>
                      <td className="p-2">{it.unit_price} ج</td>
                      <td className="p-2 font-bold">{Number(it.subtotal).toLocaleString()} ج</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-3xl border border-slate-200 flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900">سجل العملاء والمديونيات</h1>
          <p className="text-sm text-slate-500 font-bold mt-1">كشوف الحسابات الزمنية والتحصيلات النقدية</p>
        </div>
      </div>

      {selectedCust && (
        <div className="bg-white border-2 border-blue-500 rounded-3xl shadow-xl overflow-hidden">
          <div className="bg-blue-50 p-5 flex justify-between items-center border-b-2 border-blue-200">
            <div>
              <h2 className="text-base font-black text-blue-900">{selectedCust.name}</h2>
              <span className="text-xs font-bold text-slate-600">الهاتف: {selectedCust.phone || 'غير مسجل'}</span>
            </div>
            <button onClick={() => setSelectedCust(null)} className="text-slate-400 font-bold text-sm">إغلاق</button>
          </div>

          <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-rose-50 p-4 rounded-2xl border border-rose-200">
              <span className="text-xs font-bold text-rose-700 block mb-1">الرصيد المدين القائم</span>
              <p className="text-2xl font-black text-rose-700 font-mono">{Number(selectedCust.balance).toLocaleString()} ج</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border">
              <span className="text-xs font-bold text-slate-500 block mb-1 flex items-center gap-1"><TrendingDown className="w-3 h-3" /> إجمالي المبيعات</span>
              <p className="text-xl font-black text-slate-800 font-mono">{totalDebit.toLocaleString()} ج</p>
            </div>
            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200">
              <span className="text-xs font-bold text-emerald-700 block mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> إجمالي التحصيلات</span>
              <p className="text-xl font-black text-emerald-800 font-mono">{totalCredit.toLocaleString()} ج</p>
            </div>
          </div>

          <div className="px-5 pb-2">
            <form onSubmit={handleCollectPayment} className="bg-emerald-50 p-4 rounded-2xl border-2 border-emerald-200 space-y-3">
              <div className="flex items-center gap-2 text-emerald-900">
                <Wallet className="w-5 h-5" />
                <h3 className="text-sm font-black">تسجيل دفعة واردة</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="المبلغ" className="border-2 border-slate-200 rounded-xl px-4 text-sm font-bold bg-white h-11 font-mono outline-none" required />
                <select value={selectedTreasury} onChange={(e) => setSelectedTreasury(e.target.value)} className="border-2 border-slate-200 rounded-xl px-3 text-sm font-bold bg-white h-11" required>
                  {treasuries.map(t => (
                    <option key={t.treasury_code} value={t.treasury_code}>{t.name_ar} ({Number(treasuryBalances[t.treasury_code] || 0).toLocaleString()} ج)</option>
                  ))}
                </select>
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow">تأكيد التحصيل</button>
              </div>
            </form>
          </div>

          <div className="p-5">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600" />
                <span>كشف الحساب الزمني الكامل</span>
              </h3>
              <button onClick={exportCustomerLedger} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5" />
                <span>تصدير Excel</span>
              </button>
            </div>
            <div className="overflow-x-auto border-2 border-slate-200 rounded-2xl">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-800 text-white">
                  <tr>
                    <th className="p-3 rounded-r-xl">التاريخ</th>
                    <th className="p-3">الحركة</th>
                    <th className="p-3">المرجع</th>
                    <th className="p-3">البيان</th>
                    <th className="p-3 text-center">مدين</th>
                    <th className="p-3 text-center">دائن</th>
                    <th className="p-3 rounded-l-xl text-center">الرصيد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono">
                  {ledger.length === 0 && (
                    <tr><td colSpan={7} className="p-6 text-center text-slate-400 font-sans">لا توجد حركات بعد</td></tr>
                  )}
                  {ledger.map((m, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-3 text-slate-600">{new Date(m.date).toLocaleDateString('en-GB')}</td>
                      <td className="p-3 font-sans font-bold">
                        {m.type === 'فاتورة مبيعات' ? (
                          <span className="text-blue-700">{m.type}</span>
                        ) : (
                          <span className="text-emerald-700">{m.type}</span>
                        )}
                      </td>
                      <td className="p-3">
                        {m.canOpen ? (
                          <button onClick={() => openInvoiceDetails(m.invoiceId)} className="text-blue-700 font-bold underline hover:text-blue-900">{m.ref}</button>
                        ) : (
                          <span className="text-slate-500">{m.ref}</span>
                        )}
                      </td>
                      <td className="p-3 font-sans text-slate-700 text-[11px]">
                        {m.desc}
                        {m.treasury && <span className="block text-slate-400">← {getTreasuryName(m.treasury)}</span>}
                      </td>
                      <td className="p-3 font-bold text-rose-700">{m.debit > 0 ? m.debit.toLocaleString() : '—'}</td>
                      <td className="p-3 font-bold text-emerald-700">{m.credit > 0 ? m.credit.toLocaleString() : '—'}</td>
                      <td className="p-3 font-black text-slate-900">{m.running.toLocaleString()}</td>
                    </tr>
                  ))}
                  {ledger.length > 0 && (
                    <tr className="bg-slate-100 font-black">
                      <td colSpan={4} className="p-3 font-sans">الإجمالي</td>
                      <td className="p-3 text-rose-800">{totalDebit.toLocaleString()}</td>
                      <td className="p-3 text-emerald-800">{totalCredit.toLocaleString()}</td>
                      <td className="p-3 text-blue-900">{Number(selectedCust.balance).toLocaleString()}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-slate-500 font-bold mt-2">
              ملاحظة: اضغط على رقم أي فاتورة لفتح تفاصيل بنودها.
            </p>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-3xl border border-slate-200">
        <DataTable
          data={customers}
          columns={customerColumns}
          filename="العملاء"
          searchPlaceholder="بحث..."
          emptyMessage="لا يوجد عملاء"
          rowKey={(c: any) => c.id}
          rowHref={(c: any) => '/customers/' + (c.customer_code || c.id)}
        />
      </div>
    </div>
  );
}
