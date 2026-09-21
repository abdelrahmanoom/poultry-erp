'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import DataTable from '@/components/DataTable';
import { Scale, FileSpreadsheet, Printer, Lock, RefreshCw, BarChart3, PieChart as PieChartIcon, TrendingUp, Download, Columns3, Search, X, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import * as XLSX from 'xlsx-js-style';

export default function ReportsPage() {
  const supabase = createClient();
  const [activeView, setActiveView] = useState('journal');
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

  const [summary, setSummary] = useState({
    cash_balance: 0,
    receivables: 0,
    payables: 0,
    inventory_value: 0,
    total_revenue: 0,
    total_cogs: 0,
    total_expenses: 0,
    net_profit: 0
  });

  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [journalDetail, setJournalDetail] = useState<any>(null);
  const [journalDetailItems, setJournalDetailItems] = useState<any[]>([]);
  const [journalDetailDeviations, setJournalDetailDeviations] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [accountSearch, setAccountSearch] = useState('');
  const [accountVisibleCols, setAccountVisibleCols] = useState<string[]>(['date', 'type', 'entity', 'ref', 'amount']);
  const [showAccountCols, setShowAccountCols] = useState(false);
  const [accountDates, setAccountDates] = useState<any>({});
  const [showClosingModal, setShowClosingModal] = useState(false);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [topCustomers, setTopCustomers] = useState<any[]>([]);
  const [salesTrend, setSalesTrend] = useState<any[]>([]);
  const [accountMovements, setAccountMovements] = useState<any[]>([]);
  const [movementDetail, setMovementDetail] = useState<any>(null);
  const [movementDetailItems, setMovementDetailItems] = useState<any[]>([]);

  const showToast = (msg: string, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadSummary = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_financial_summary');
    if (error) {
      showToast('خطأ في جلب البيانات: ' + error.message, 'error');
    } else if (data && data.length > 0) {
      setSummary(data[0]);
    }
    const { data: datesData } = await supabase.rpc('get_account_last_dates');
    if (datesData && datesData.length > 0) setAccountDates(datesData[0]);

    setLoading(false);
  };

  const loadJournal = async () => {
    const to = dateTo + 'T23:59:59';
    const { data: invs } = await supabase.from('sales_invoices').select('*').gte('created_at', dateFrom).lte('created_at', to);
    const { data: bats } = await supabase.from('batches').select('*').gte('created_at', dateFrom).lte('created_at', to);
    const { data: vous } = await supabase.from('financial_vouchers').select('*').gte('created_at', dateFrom).lte('created_at', to);

    // Preload deviations for invoices
    const devByInv: any = {};
    if (invs && invs.length > 0) {
      const devIds = invs.filter((i: any) => i.has_price_deviation).map((i: any) => i.id);
      if (devIds.length > 0) {
        const { data: devItems } = await supabase
          .from('sales_items')
          .select('invoice_id, product_code, unit_price, price_deviation_percent')
          .in('invoice_id', devIds)
          .neq('price_deviation_percent', 0);
        (devItems || []).forEach((it: any) => {
          if (!devByInv[it.invoice_id]) devByInv[it.invoice_id] = [];
          devByInv[it.invoice_id].push(it);
        });
      }
    }

    const master: any[] = [];
    if (invs) invs.forEach(i => master.push({ 
      date: i.created_at, 
      type: 'فاتورة مبيعات', 
      ref: i.invoice_code || i.id, 
      entity: i.customer_name, 
      amount: i.total_amount, 
      has_dev: i.has_price_deviation,
      invoice_id: i.id,
      deviations: devByInv[i.id] || []
    }));
    if (bats) bats.forEach(b => master.push({ date: b.created_at, type: 'أمر توريد وإنتاج', ref: b.id, entity: b.supplier_name, amount: b.total_cost }));
    if (vous) vous.forEach(v => {
      const label = v.type === 'receipt' ? 'إيصال تحصيل نقدية' : (v.type === 'payment' ? 'إثبات سداد مورد' : 'مصروف تشغيلي');
      master.push({ date: v.created_at, type: label, ref: v.voucher_code || ('VCH-' + String(v.id).padStart(4, '0')), entity: v.entity_name, amount: v.amount });
    });

    master.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setJournalEntries(master);
  };

  useEffect(() => {
    loadSummary();
    loadJournal();
  }, [dateFrom, dateTo]);

  const getDate = (d: any) => d ? new Date(d).toLocaleDateString('en-GB') : '—';

  const trialRows = [
    { code: '101', displayCode: 'CASH', name: 'الخزينة وصندوق النقدية', date: accountDates.cash_date, debit: Number(summary.cash_balance) >= 0 ? Number(summary.cash_balance) : 0, credit: Number(summary.cash_balance) < 0 ? Math.abs(Number(summary.cash_balance)) : 0 },
    { code: '102', displayCode: 'CUST', name: 'أرصدة العملاء والمديونيات القائمة', date: accountDates.cust_date, debit: Number(summary.receivables), credit: 0 },
    { code: '103', displayCode: 'INVT', name: 'مخزون بضاعة غرف التبريد', date: accountDates.invt_date, debit: Number(summary.inventory_value), credit: 0 },
    { code: '201', displayCode: 'SUPP', name: 'مستحقات المزارع والموردين الدائنة', date: accountDates.supp_date, debit: 0, credit: Number(summary.payables) },
    { code: '301', displayCode: 'CAPT', name: 'رأس المال والأرصدة الافتتاحية', date: null, debit: 0, credit: 0 },
    { code: '401', displayCode: 'SALE', name: 'إيرادات المبيعات المحققة', date: accountDates.sale_date, debit: 0, credit: Number(summary.total_revenue) },
    { code: '501', displayCode: 'COGS', name: 'تكلفة البضاعة المباعة', date: null, debit: Number(summary.total_cogs), credit: 0 },
    { code: '502', displayCode: 'EXPS', name: 'المصروفات التشغيلية والنثريات', date: accountDates.exps_date, debit: Number(summary.total_expenses), credit: 0 },
  ];

  const totalDebit = trialRows.reduce((s, r) => s + Number(r.debit), 0);
  const totalCredit = trialRows.reduce((s, r) => s + Number(r.credit), 0);
  const balanceDiff = Math.abs(totalDebit - totalCredit);

  const openAccountDetails = async (code: string, name: string, displayCode?: string) => {
    setSelectedAccount({ code, name, displayCode } as any);
    const movements: any[] = [];

    if (code === '101') {
      const { data } = await supabase.from('financial_vouchers').select('*').order('created_at', { ascending: false });
      (data || []).forEach((v: any) => {
        movements.push({
          date: v.created_at,
          type: v.type === 'receipt' ? 'تحصيل وارد' : v.type === 'payment' ? 'سداد صادر' : v.type === 'expense' ? 'مصروف' : 'رصيد افتتاحي',
          entity: v.entity_name,
          amount: v.type === 'receipt' || v.type === 'opening_treasury' ? Number(v.amount) : -Number(v.amount),
          ref: v.voucher_code || v.id,
          kind: 'voucher',
          srcId: v.id,
          treasury: v.treasury_code,
          notes: v.notes,
          payment_method: v.payment_method
        });
      });
    } else if (code === '102') {
      const { data } = await supabase.from('sales_invoices').select('*').order('created_at', { ascending: false });
      (data || []).forEach((inv: any) => {
        movements.push({ date: inv.created_at, type: 'فاتورة مبيعات', entity: inv.customer_name, amount: Number(inv.total_amount), ref: inv.invoice_code || ('INV-' + inv.id), kind: 'invoice', srcId: inv.id });
      });
      const { data: vouchers } = await supabase.from('financial_vouchers').select('*').eq('type', 'receipt').order('created_at', { ascending: false });
      (vouchers || []).forEach((v: any) => {
        movements.push({ date: v.created_at, type: 'تحصيل نقدي', entity: v.entity_name, amount: -Number(v.amount), ref: v.voucher_code || v.id, kind: 'voucher', srcId: v.id, notes: v.notes, payment_method: v.payment_method });
      });
    } else if (code === '103' || code === '501') {
      const { data } = await supabase.from('batches').select('*').order('created_at', { ascending: false });
      (data || []).forEach((b: any) => {
        movements.push({ date: b.created_at, type: code === '103' ? 'توريد للمخزون' : 'تكلفة شراء', entity: b.supplier_name, amount: Number(b.total_cost), ref: b.id, kind: 'batch', srcId: b.id });
      });
    } else if (code === '201') {
      const { data } = await supabase.from('batches').select('*').order('created_at', { ascending: false });
      (data || []).forEach((b: any) => {
        movements.push({ date: b.created_at, type: 'أمر توريد آجل', entity: b.supplier_name, amount: Number(b.total_cost), ref: b.id, kind: 'batch', srcId: b.id });
      });
      const { data: vouchers } = await supabase.from('financial_vouchers').select('*').eq('type', 'payment').order('created_at', { ascending: false });
      (vouchers || []).forEach((v: any) => {
        movements.push({ date: v.created_at, type: 'سداد نقدي', entity: v.entity_name, amount: -Number(v.amount), ref: v.voucher_code || v.id, kind: 'voucher', srcId: v.id, notes: v.notes, payment_method: v.payment_method });
      });
    } else if (code === '401') {
      const { data } = await supabase.from('sales_invoices').select('*').order('created_at', { ascending: false });
      (data || []).forEach((inv: any) => {
        movements.push({ date: inv.created_at, type: 'إيراد مبيعات', entity: inv.customer_name, amount: Number(inv.total_amount), ref: inv.invoice_code || ('INV-' + inv.id), kind: 'invoice', srcId: inv.id });
      });
    } else if (code === '502') {
      const { data } = await supabase.from('financial_vouchers').select('*').eq('type', 'expense').order('created_at', { ascending: false });
      (data || []).forEach((v: any) => {
        movements.push({ date: v.created_at, type: 'مصروف تشغيلي', entity: v.entity_name, amount: Number(v.amount), ref: v.voucher_code || v.id, kind: 'voucher', srcId: v.id, notes: v.notes, payment_method: v.payment_method });
      });
    }

    movements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setAccountMovements(movements);
  };

  const openMovementDetail = async (m: any) => {
    if (!m) return;
    setMovementDetail(m);
    setMovementDetailItems([]);
    if (m.kind === 'invoice' && m.srcId) {
      const { data } = await supabase.from('sales_items').select('*').eq('invoice_id', m.srcId);
      if (data) setMovementDetailItems(data);
    }
  };

  const accountColDefs = [
    { key: 'date', label: 'التاريخ' },
    { key: 'type', label: 'نوع الحركة' },
    { key: 'entity', label: 'الجهة' },
    { key: 'ref', label: 'المرجع' },
    { key: 'amount', label: 'القيمة' }
  ];

  const filteredAccountMovements = useMemo(() => {
    if (!accountSearch.trim()) return accountMovements;
    const q = accountSearch.toLowerCase();
    return accountMovements.filter(m =>
      String(m.type || '').toLowerCase().includes(q) ||
      String(m.entity || '').toLowerCase().includes(q) ||
      String(m.ref || '').toLowerCase().includes(q)
    );
  }, [accountMovements, accountSearch]);

  const exportAccountExcel = () => {
    const rows = filteredAccountMovements.map(m => {
      const obj: any = {};
      accountColDefs.forEach(col => {
        if (!accountVisibleCols.includes(col.key)) return;
        let val: any = m[col.key];
        if (col.key === 'date') val = new Date(val).toLocaleDateString('en-GB');
        if (col.key === 'amount') val = Number(val);
        obj[col.label] = val ?? '';
      });
      return obj;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    const borderThin = {
      top: { style: 'thin', color: { rgb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
      left: { style: 'thin', color: { rgb: 'CBD5E1' } },
      right: { style: 'thin', color: { rgb: 'CBD5E1' } }
    };
    for (let cc = range.s.c; cc <= range.e.c; cc++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c: cc });
      if (!ws[addr]) continue;
      ws[addr].s = {
        fill: { fgColor: { rgb: '1E293B' } },
        font: { color: { rgb: 'FFFFFF' }, bold: true, sz: 12 },
        alignment: { horizontal: 'center', vertical: 'center', readingOrder: 2 },
        border: borderThin
      };
    }
    for (let rr = 1; rr <= range.e.r; rr++) {
      const isEven = rr % 2 === 0;
      for (let cc = range.s.c; cc <= range.e.c; cc++) {
        const addr = XLSX.utils.encode_cell({ r: rr, c: cc });
        if (!ws[addr]) continue;
        ws[addr].s = {
          fill: { fgColor: { rgb: isEven ? 'F1F5F9' : 'FFFFFF' } },
          font: { color: { rgb: '0F172A' }, sz: 11 },
          alignment: { horizontal: 'right', vertical: 'center', readingOrder: 2 },
          border: borderThin
        };
      }
    }
    ws['!cols'] = accountColDefs.filter(x => accountVisibleCols.includes(x.key)).map(x => ({ wch: Math.max(x.label.length + 4, 15) }));
    const wb = XLSX.utils.book_new();
    wb.Workbook = { Views: [{ RTL: true }] };
    XLSX.utils.book_append_sheet(wb, ws, 'كشف الحساب');
    const today = new Date().toISOString().split('T')[0];
    const codeName = selectedAccount?.displayCode || selectedAccount?.code || 'account';
    XLSX.writeFile(wb, 'account_' + codeName + '_' + today + '.xlsx');
  };
  const exportExcel = () => {
    let csv = '\uFEFF';
    csv += 'ميزان المراجعة والرقابة المالية\r\n\r\n';
    csv += 'كود الحساب,اسم الحساب,الرصيد المدين,الرصيد الدائن\r\n';
    trialRows.forEach(r => {
      csv += `${r.code},${r.name},${r.debit},${r.credit}\r\n`;
    });
    csv += `الإجمالي,,${totalDebit},${totalCredit}\r\n\r\n`;
    csv += `إجمالي الإيرادات,${summary.total_revenue}\r\n`;
    csv += `تكلفة البضاعة المباعة,${summary.total_cogs}\r\n`;
    csv += `المصروفات,${summary.total_expenses}\r\n`;
    csv += `صافي الربح,${summary.net_profit}\r\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ميزان_المراجعة_${dateFrom}_${dateTo}.csv`;
    link.click();
  };

  const handleYearEndClosing = async () => {
    showToast('معالج إقفال السنة سيكون متاحاً بعد تأكيد صحة البيانات', 'error');
  };

  const openJournalDetails = async (row: any) => {
    if (!row) return;
    setJournalDetail(row);
    setJournalDetailItems([]);
    setJournalDetailDeviations([]);
    if (row.type === 'فاتورة مبيعات' && row.ref) {
      const match = String(row.ref).match(/\d+/);
      const invId = match ? Number(match[0]) : null;
      if (invId) {
        const { data } = await supabase.from('sales_items').select('*').eq('invoice_id', invId);
        if (data) setJournalDetailItems(data);
      }
    }
  };
  const journalColumns = [
    { 
      key: 'has_dev', 
      label: '⚠', 
      exportValue: (j: any) => j.has_dev ? 'سعر شاذ' : '',
      render: (j: any) => {
        if (!j.has_dev) return null;
        const devs = j.deviations || [];
        return (
          <span className="relative inline-flex items-center justify-center group cursor-help">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <div className="absolute bottom-full mb-2 right-1/2 translate-x-1/2 hidden group-hover:block bg-slate-900 text-white text-[10px] font-bold p-3 rounded-lg z-50 shadow-xl min-w-[300px] text-right" dir="rtl">
              <div className="text-amber-300 mb-2 pb-2 border-b border-slate-700 font-black">⚠ أصناف بسعر شاذ</div>
              {devs.length === 0 && <div className="text-slate-400 text-center py-2">جاري التحميل...</div>}
              {devs.slice(0, 5).map((d: any, k: number) => {
                const actual = Number(d.unit_price || 0);
                const pct = Number(d.price_deviation_percent || 0);
                const expected = pct !== -100 ? actual / (1 + pct / 100) : 0;
                return (
                  <div key={k} className="grid grid-cols-3 gap-2 py-1 items-center">
                    <span className="text-slate-300 font-mono text-right">{d.product_code}</span>
                    <span className="font-mono text-center">
                      <span className="text-rose-300">{actual.toFixed(0)}</span>
                      <span className="text-slate-500"> → </span>
                      <span className="text-emerald-300">{expected.toFixed(0)}</span>
                    </span>
                    <span className={(pct > 0 ? 'text-rose-300' : 'text-emerald-300') + ' font-mono text-center'}>
                      {pct > 0 ? '+' : ''}{pct.toFixed(0)}%
                    </span>
                  </div>
                );
              })}
              {devs.length > 5 && <div className="text-slate-400 mt-2 text-center">... و {devs.length - 5} أصناف أخرى</div>}
              <div className="text-slate-500 mt-2 pt-2 border-t border-slate-700 text-center">اضغط الصف لعرض التفاصيل</div>
              <span className="absolute top-full right-1/2 translate-x-1/2 border-4 border-transparent border-t-slate-900"></span>
            </div>
          </span>
        );
      }
    },
    {
      key: 'date',
      label: 'التاريخ والوقت',
      render: (j: any) => <span className="text-slate-500 font-mono">{new Date(j.date).toLocaleDateString('en-GB')} {new Date(j.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
    },
    {
      key: 'type',
      label: 'نوع الحركة',
      searchable: true,
      render: (j: any) => <span className="font-bold text-blue-700">{j.type}</span>
    },
    {
      key: 'ref',
      label: 'رقم المرجع',
      searchable: true,
      render: (j: any) => <span className="font-mono text-slate-700 font-bold">{j.ref}</span>
    },
    {
      key: 'entity',
      label: 'الطرف المقابل',
      searchable: true,
      render: (j: any) => <span className="font-bold">{j.entity}</span>
    },
    {
      key: 'amount',
      label: 'القيمة',
      render: (j: any) => <span className="font-bold font-mono">{Number(j.amount).toLocaleString()} ج</span>
    }
  ];

  const trialColumns = [
    {
      key: 'displayCode',
      label: 'كود الحساب',
      render: (r: any) => <span className="font-bold text-blue-700 font-mono">{r.displayCode || r.code}</span>
    },
    {
      key: 'name',
      label: 'اسم الحساب في الدفتر العام',
      searchable: true,
      render: (r: any) => <span className="font-bold text-slate-800">{r.name}</span>
    },
    {
      key: 'debit',
      label: 'الرصيد المدين (ج)',
      render: (r: any) => <span className="text-slate-900 font-mono">{Number(r.debit) > 0 ? Number(r.debit).toLocaleString() : '—'}</span>,
      exportValue: (r: any) => Number(r.debit) || 0
    },
    {
      key: 'credit',
      label: 'الرصيد الدائن (ج)',
      render: (r: any) => <span className="text-slate-900 font-mono">{Number(r.credit) > 0 ? Number(r.credit).toLocaleString() : '—'}</span>,
      exportValue: (r: any) => Number(r.credit) || 0
    },
    {
      key: 'date',
      label: 'آخر حركة',
      render: (r: any) => <span className="text-slate-500 font-mono text-xs">{getDate(r.date)}</span>,
      exportValue: (r: any) => getDate(r.date)
    }
  ];

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-2xl border text-sm font-bold transition-all ${toast.type === 'success' ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-rose-600 text-white border-rose-400'}`}>
          {toast.msg}
        </div>
      )}

      {selectedAccount && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedAccount(null)}>
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[85vh] shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="bg-blue-50 p-5 border-b-2 border-blue-200 flex justify-between items-center rounded-t-3xl">
              <div>
                <h3 className="text-base font-bold text-blue-900">
                  <span className="font-mono bg-white px-3 py-1 rounded-lg ml-3">{selectedAccount.displayCode || selectedAccount.code}</span>
                  {selectedAccount.name}
                </h3>
                <p className="text-xs text-slate-600 mt-1">كل الحركات التي أثّرت على هذا الحساب</p>
              </div>
              <button onClick={() => setSelectedAccount(null)} className="text-slate-500 hover:text-slate-800 font-bold text-sm">إغلاق</button>
            </div>
                        <div className="overflow-y-auto flex-1 rounded-b-3xl"><div className="p-5">
              <DataTable
                data={filteredAccountMovements}
                columns={[
                  { key: 'date', label: 'التاريخ', exportValue: (m: any) => new Date(m.date).toLocaleDateString('en-GB'),
                    render: (m: any) => <span className="font-mono text-slate-600">{new Date(m.date).toLocaleDateString('en-GB')}</span> },
                  { key: 'type', label: 'نوع الحركة', searchable: true, exportValue: (m: any) => m.type,
                    render: (m: any) => <span className="font-bold">{m.type}</span> },
                  { key: 'entity', label: 'الجهة', searchable: true, exportValue: (m: any) => m.entity || '',
                    render: (m: any) => m.entity || '—' },
                  { key: 'ref', label: 'المرجع', searchable: true, exportValue: (m: any) => m.ref || '',
                    render: (m: any) => <span className="font-mono text-blue-700">{m.ref || '—'}</span> },
                  { key: 'amount', label: 'القيمة (ج)', exportValue: (m: any) => Number(m.amount || 0),
                    render: (m: any) => <span className={'font-bold font-mono ' + (m.amount >= 0 ? 'text-rose-700' : 'text-emerald-700')}>{Number(m.amount).toLocaleString()} ج</span> },
                ]}
                filename={'كشف_حساب_' + (selectedAccount?.displayCode || selectedAccount?.code || 'account')}
                searchPlaceholder="بحث..."
                emptyMessage="لا توجد حركات مسجّلة على هذا الحساب"
                rowKey={(m: any, i: number) => i}
                storageKey={'account_movements_' + (selectedAccount?.code || 'x')}
                onRowClick={openMovementDetail}
              />
              </div>
            </div>
          </div>
        </div>
      )}

      {showClosingModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-right">
            <div className="text-center space-y-2">
              <Lock className="w-10 h-10 text-blue-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">معالج إقفال السنة المالية وترحيل الأرصدة</h3>
            </div>
            <p className="text-xs text-slate-600 font-bold leading-relaxed">
              يقوم هذا الإجراء بإقفال كافة حسابات الإيرادات والمصروفات للفترة المنتهية، وتحويل صافي الأرباح إلى رأس المال، وتثبيت أرصدة العملاء والموردين والمخزون والخزينة كأرصدة افتتاحية للدورة الجديدة.
            </p>
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-xs font-bold text-amber-900">
              تنبيه: هذا الإجراء لا يمكن التراجع عنه. تأكد من صحة البيانات قبل المتابعة.
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setShowClosingModal(false); showToast('سيتم تفعيل إقفال السنة في التحديث القادم', 'error'); }} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-xs">تأكيد الإقفال</button>
              <button onClick={() => setShowClosingModal(false)} className="bg-slate-100 text-slate-700 font-bold px-5 rounded-xl text-xs">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {movementDetail && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setMovementDetail(null)}>
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[80vh] shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="bg-emerald-50 p-5 border-b-2 border-emerald-200 flex justify-between items-center rounded-t-3xl">
              <div>
                <h3 className="text-base font-bold text-emerald-900">{movementDetail.type}</h3>
                <p className="text-xs text-slate-600 mt-1">
                  المرجع: <span className="font-mono font-bold">{movementDetail.ref}</span>
                </p>
              </div>
              <button onClick={() => setMovementDetail(null)} className="text-slate-500 hover:text-slate-800 font-bold text-sm">إغلاق</button>
            </div>
            <div className="overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl">
                  <span className="text-slate-500 font-bold">التاريخ: </span>
                  <span className="font-mono font-bold">{new Date(movementDetail.date).toLocaleString('en-GB')}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl">
                  <span className="text-slate-500 font-bold">الجهة: </span>
                  <span className="font-bold">{movementDetail.entity}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl col-span-2">
                  <span className="text-slate-500 font-bold">القيمة: </span>
                  <span className="font-mono font-bold">{Number(movementDetail.amount).toLocaleString()} ج</span>
                </div>
                {movementDetail.treasury && (
                  <div className="bg-blue-50 p-3 rounded-xl col-span-2">
                    <span className="text-slate-500 font-bold">الخزينة: </span>
                    <span className="font-mono font-bold text-blue-800">{movementDetail.treasury}</span>
                  </div>
                )}
                {movementDetail.payment_method && (
                  <div className="bg-emerald-50 p-3 rounded-xl col-span-2">
                    <span className="text-slate-500 font-bold">طريقة الدفع: </span>
                    <span className="font-bold text-emerald-800">{movementDetail.payment_method}</span>
                  </div>
                )}
                {movementDetail.notes && (
                  <div className="bg-amber-50 p-3 rounded-xl col-span-2">
                    <span className="text-slate-500 font-bold">ملاحظات: </span>
                    <span className="font-bold text-amber-900">{movementDetail.notes}</span>
                  </div>
                )}
              </div>

              {movementDetailItems.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 mb-2">بنود الفاتورة</h4>
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-800 text-white">
                      <tr>
                        <th className="p-2">الصنف</th>
                        <th className="p-2">الكمية</th>
                        <th className="p-2">السعر</th>
                        <th className="p-2">المتوقع</th>
                        <th className="p-2">الانحراف</th>
                        <th className="p-2">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {movementDetailItems.map((it: any, i: number) => {
                        const pct = Number(it.price_deviation_percent || 0);
                        const actual = Number(it.unit_price || 0);
                        const expected = pct !== -100 ? actual / (1 + pct / 100) : 0;
                        const hasDev = pct !== 0;
                        return (
                          <tr key={i} className={hasDev ? 'bg-amber-50' : ''}>
                            <td className="p-2 font-mono font-bold">{it.product_code}</td>
                            <td className="p-2 font-mono">{Number(it.quantity_kg).toFixed(2)} كجم</td>
                            <td className="p-2 font-mono">{actual.toLocaleString()} ج</td>
                            <td className="p-2 font-mono text-slate-500">{hasDev ? expected.toFixed(2) + ' ج' : '—'}</td>
                            <td className={'p-2 font-mono font-bold ' + (hasDev ? (pct > 0 ? 'text-rose-700' : 'text-emerald-700') : 'text-slate-400')}>
                              {hasDev ? (pct > 0 ? '+' : '') + pct.toFixed(1) + '%' : '—'}
                            </td>
                            <td className="p-2 font-mono font-bold">{Number(it.subtotal).toLocaleString()} ج</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {movementDetailItems.length === 0 && movementDetail.kind === 'invoice' && (
                <p className="text-xs text-slate-400 text-center py-4">لا توجد بنود مسجلة لهذه الفاتورة</p>
              )}
              {movementDetail.kind === 'voucher' && (
                <p className="text-xs text-slate-500 text-center py-4 bg-slate-50 rounded-xl font-bold">
                  هذا إيصال — التفاصيل معروضة أعلاه
                </p>
              )}
              {movementDetail.kind === 'batch' && (
                <p className="text-xs text-slate-500 text-center py-4 bg-slate-50 rounded-xl font-bold">
                  أمر توريد/إنتاج — للتفاصيل الكاملة افتح قسم الإنتاج
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      {journalDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setJournalDetail(null)}>
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="bg-blue-50 p-5 border-b-2 border-blue-200 flex justify-between items-center rounded-t-3xl">
              <div>
                <h3 className="text-base font-bold text-blue-900">{journalDetail.type}</h3>
                <p className="text-xs text-slate-600 mt-1">المرجع: <span className="font-mono font-bold">{journalDetail.ref}</span></p>
              </div>
              <button onClick={() => setJournalDetail(null)} className="text-slate-500 hover:text-slate-800 font-bold text-sm">إغلاق</button>
            </div>
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {journalDetail.has_dev && (
                <div className="bg-gradient-to-l from-amber-50 to-amber-100 border-2 border-amber-300 rounded-2xl p-4 flex items-start gap-3">
                  <div className="bg-amber-500 p-2 rounded-xl shrink-0">
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-black text-amber-900 text-sm">بيع شاذ — أسعار غير طبيعية</h4>
                    <p className="text-xs text-amber-800 font-bold mt-1 leading-relaxed">
                      هذا المستند يحتوي على أسعار انحرفت بأكثر من 20% عن التسعير المتوقع للبورصة اليومية.
                    </p>
                  </div>
                </div>
              )}
              {journalDetailDeviations.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                  <h4 className="text-xs font-bold text-amber-900 mb-3">تفاصيل الأسعار الشاذة</h4>
                  <table className="w-full text-right text-xs">
                    <thead className="bg-amber-100 text-amber-900">
                      <tr>
                        <th className="p-2">الصنف</th>
                        <th className="p-2">السعر المُدخل</th>
                        <th className="p-2">السعر المتوقع</th>
                        <th className="p-2">الانحراف</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-200">
                      {journalDetailDeviations.map((d: any, i: number) => (
                        <tr key={i}>
                          <td className="p-2 font-bold">{d.product_name}</td>
                          <td className="p-2 font-mono">{Number(d.actual).toFixed(2)} ج</td>
                          <td className="p-2 font-mono text-slate-500">{Number(d.expected).toFixed(2)} ج</td>
                          <td className={'p-2 font-mono font-bold ' + (d.pct > 0 ? 'text-rose-700' : 'text-emerald-700')}>
                            {d.pct > 0 ? '+' : ''}{Number(d.pct).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl">
                  <span className="text-slate-500 font-bold">التاريخ: </span>
                  <span className="font-mono font-bold">{new Date(journalDetail.date).toLocaleString('en-GB')}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl">
                  <span className="text-slate-500 font-bold">الطرف المقابل: </span>
                  <span className="font-bold">{journalDetail.entity}</span>
                </div>
                <div className="bg-emerald-50 p-3 rounded-xl col-span-2">
                  <span className="text-slate-500 font-bold">القيمة: </span>
                  <span className="font-mono font-bold text-emerald-800">{Number(journalDetail.amount).toLocaleString()} ج</span>
                </div>
              </div>
              {journalDetailItems.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 mb-2">بنود الفاتورة</h4>
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-800 text-white">
                      <tr>
                        <th className="p-2">الصنف</th>
                        <th className="p-2">الكمية</th>
                        <th className="p-2">سعر الوحدة</th>
                        <th className="p-2">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {journalDetailItems.map((it, i) => (
                        <tr key={i}>
                          <td className="p-2 font-bold">{it.product_code}</td>
                          <td className="p-2 font-mono">{Number(it.quantity_kg).toFixed(1)} كجم</td>
                          <td className="p-2 font-mono">{Number(it.unit_price).toLocaleString()} ج</td>
                          <td className="p-2 font-mono font-bold">{Number(it.subtotal).toLocaleString()} ج</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {journalDetailItems.length === 0 && journalDetail.type !== 'فاتورة مبيعات' && (
                <p className="text-xs text-slate-500 text-center py-4">لا توجد بنود إضافية لهذه الحركة</p>
              )}
            </div>
          </div>
        </div>
      )}

<div className="bg-white p-6 rounded-3xl border border-slate-200 flex flex-wrap justify-between items-center gap-3">        <div>
          <h1 className="text-xl font-black text-slate-900">المركز المالي وميزان المراجعة الرقابي</h1>
          <p className="text-sm text-slate-500 font-bold mt-1">الرقابة المالية على توازن القيود والدفتر المالي العام وإقفال السنة</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={loadSummary} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>تحديث البيانات</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-6">
        <div className="flex flex-wrap gap-4 border-b border-slate-200 text-xs font-black pb-3">
          <button onClick={() => setActiveView('journal')} className={`pb-2 ${activeView === 'journal' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400'}`}>سجل العمليات العام الموحد</button>
          <button onClick={() => setActiveView('trial_balance')} className={`pb-2 ${activeView === 'trial_balance' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400'}`}>ميزان المراجعة التحليلي</button>
          <button onClick={() => setActiveView('pnl')} className={`pb-2 ${activeView === 'pnl' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400'}`}>قائمة الأرباح والخسائر</button>
          <button onClick={() => setActiveView('analysis')} className={`pb-2 ${activeView === 'analysis' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400'}`}>تحليل المبيعات</button>
        </div>

        {activeView === 'trial_balance' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs font-black">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-blue-600" />
                <span>حالة توازن ميزان المراجعة:</span>
                {balanceDiff < 1 ? (
                  <span className="text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg">متزن محاسبياً</span>
                ) : (
                  <span className="text-rose-700 bg-rose-100 px-2.5 py-1 rounded-lg">فارق تسوية: {balanceDiff.toLocaleString()} ج</span>
                )}
              </div>
              <span className="font-mono">تاريخ الاستخراج: {new Date().toLocaleDateString('en-GB')}</span>
            </div>

            <DataTable
              data={trialRows}
              columns={trialColumns}
              filename="ميزان_المراجعة"
              searchPlaceholder="بحث..."
              emptyMessage="لا توجد حسابات"
              rowKey={(r: any) => r.code}
              storageKey="reports_trial_balance"
              onRowClick={(r: any) => openAccountDetails(r.code, r.name, r.displayCode)}
            />

            <div className="bg-slate-100 rounded-2xl p-4 flex justify-between items-center font-bold text-sm mt-3">
              <span className="text-slate-700">الإجمالي المتوازن</span>
              <div className="flex gap-6">
                <span className="text-emerald-800 font-mono">مدين: {totalDebit.toLocaleString()} ج</span>
                <span className="text-emerald-800 font-mono">دائن: {totalCredit.toLocaleString()} ج</span>
              </div>
            </div>
          </div>
        )}

        {activeView === 'journal' && (
          <div className="space-y-4">

            <DataTable
              data={journalEntries}
          onRowClick={openJournalDetails}
              columns={journalColumns}
              filename="سجل_العمليات"
              searchPlaceholder="بحث..."
              emptyMessage="لا توجد حركات في هذه الفترة"
              rowKey={(j: any, idx: number) => idx}
              storageKey="reports_journal"
              dateKey="date"
              dateDefault="today"
            />
          </div>
        )}

        {activeView === 'pnl' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="bg-emerald-50 p-5 rounded-3xl border border-emerald-200">
                <span className="text-xs font-bold text-emerald-700 block mb-1">إجمالي الإيرادات المحققة</span>
                <b className="text-2xl font-black text-emerald-950 font-mono">{Number(summary.total_revenue).toLocaleString()} ج</b>
              </div>
              <div className="bg-rose-50 p-5 rounded-3xl border border-rose-200">
                <span className="text-xs font-bold text-rose-700 block mb-1">تكلفة البضاعة المباعة + المصروفات</span>
                <b className="text-2xl font-black text-rose-950 font-mono">{(Number(summary.total_cogs) + Number(summary.total_expenses)).toLocaleString()} ج</b>
              </div>
              <div className={`p-5 rounded-3xl border ${Number(summary.net_profit) >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'}`}>
                <span className="text-xs font-bold text-blue-700 block mb-1">صافي النتيجة المالية</span>
                <b className={`text-2xl font-black font-mono ${Number(summary.net_profit) >= 0 ? 'text-blue-950' : 'text-amber-950'}`}>{Number(summary.net_profit).toLocaleString()} ج</b>
              </div>
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-2 text-xs font-bold">
              <div className="flex justify-between"><span>إجمالي الإيرادات:</span><span className="font-mono text-emerald-700">{Number(summary.total_revenue).toLocaleString()} ج</span></div>
              <div className="flex justify-between"><span>مطروح: تكلفة البضاعة المباعة:</span><span className="font-mono text-rose-700">- {Number(summary.total_cogs).toLocaleString()} ج</span></div>
              <div className="flex justify-between"><span>مطروح: المصروفات التشغيلية والنثريات:</span><span className="font-mono text-rose-700">- {Number(summary.total_expenses).toLocaleString()} ج</span></div>
              <div className="flex justify-between border-t pt-2"><span>صافي النتيجة المالية:</span><span className="font-mono text-blue-800 text-sm">{Number(summary.net_profit).toLocaleString()} ج</span></div>
            </div>

            <div className="bg-slate-50 border-2 border-slate-200 p-5 rounded-3xl flex flex-wrap justify-between items-center gap-3">
              <div className="flex items-center gap-3">
                <Lock className="w-8 h-8 text-slate-600" />
                <div>
                  <h4 className="text-sm font-bold text-slate-800">معالج إقفال السنة المالية</h4>
                  <p className="text-[11px] text-slate-600 font-bold mt-1">تصفير حسابات الإيرادات والمصروفات وترحيل الأرصدة للسنة الجديدة.</p>
                </div>
              </div>
              <button onClick={() => setShowClosingModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl text-xs shadow">
                بدء إقفال السنة
              </button>
            </div>
          </div>
        )}

        {activeView === 'analysis' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-white p-5 rounded-3xl border border-slate-200">
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-blue-600" />
                  <span>الأصناف الأكثر مبيعاً (كجم)</span>
                </h3>
                {topProducts.length === 0 ? (
                  <p className="text-center text-slate-400 font-bold py-8 text-xs">لا توجد مبيعات بعد</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={topProducts} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                        {topProducts.map((_, i) => (
                          <Cell key={i} fill={['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4'][i % 6]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200">
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-600" />
                  <span>أهم العملاء (قيمة الشراء الإجمالية)</span>
                </h3>
                {topCustomers.length === 0 ? (
                  <p className="text-center text-slate-400 font-bold py-8 text-xs">لا توجد مبيعات بعد</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={topCustomers}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#10b981" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200">
              <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span>تطور المبيعات اليومية</span>
              </h3>
              {salesTrend.length === 0 ? (
                <p className="text-center text-slate-400 font-bold py-8 text-xs">لا توجد مبيعات بعد</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={salesTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

        {false && (
          <div className="space-y-5 max-w-xl mx-auto bg-slate-50 p-6 rounded-3xl border border-slate-200 text-xs">
            <div className="text-center space-y-2">
              <Lock className="w-8 h-8 text-blue-600 mx-auto" />
              <h3 className="text-base font-black text-slate-900">معالج إقفال السنة المالية وترحيل الأرصدة</h3>
              <p className="text-slate-500 font-bold leading-relaxed">
                يقوم هذا الإجراء بإقفال كافة حسابات الإيرادات والمصروفات للفترة المنتهية، وتحويل صافي الأرباح إلى رأس المال، وتثبيت أرصدة العملاء والموردين والمخزون والخزينة كأرصدة افتتاحية للدورة الجديدة.
              </p>
            </div>
            <button onClick={handleYearEndClosing} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl text-xs shadow-xl transition">
              بدء اعتماد إقفال السنة المالية وترحيل الأرصدة
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
