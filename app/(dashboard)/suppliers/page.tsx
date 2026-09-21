'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import DataTable from '@/components/DataTable';
import * as XLSX from 'xlsx';
import { Wallet, History, TrendingDown, TrendingUp, Download, ExternalLink } from 'lucide-react';

export default function SuppliersPage() {
  const supabase = createClient();
  const router = useRouter();
  const [toast, setToast] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupp, setSelectedSupp] = useState<any>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  const [totalSupply, setTotalSupply] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [treasuries, setTreasuries] = useState<any[]>([]);
  const [treasuryBalances, setTreasuryBalances] = useState<any>({});
  const [selectedTreasury, setSelectedTreasury] = useState('');
  const [batchModal, setBatchModal] = useState<any>(null);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [deleteModal, setDeleteModal] = useState<any>(null);

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

  const loadSuppliers = async () => {
    const { data } = await supabase.from('suppliers').select('*').order('balance', { ascending: false });
    if (data) setSuppliers(data);
  };

  useEffect(() => { loadSuppliers(); loadTreasuries(); }, []);

  const buildLedger = async (supp: any) => {
    const { data: batches } = await supabase.from('batches').select('*').eq('supplier_name', supp.name).order('created_at');
    const { data: vous } = await supabase.from('financial_vouchers').select('*').eq('entity_name', supp.name).eq('type', 'payment').order('created_at');

    const movements: any[] = [];

    (batches || []).forEach((b: any) => {
      movements.push({
        date: b.created_at,
        type: 'أمر توريد',
        ref: b.id,
        desc: `وزن قائم: ${Number(b.live_weight_kg).toLocaleString()} كجم`,
        debit: 0,
        credit: Number(b.total_cost),
        canOpen: true,
        batchId: b.id
      });
    });

    (vous || []).forEach((v: any) => {
      movements.push({
        date: v.created_at,
        type: 'سداد نقدي',
        ref: '#' + v.id,
        desc: v.notes || 'سداد دفعة صادرة',
        debit: Number(v.amount),
        credit: 0,
        treasury: v.treasury_code,
        canOpen: false
      });
    });

    movements.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let running = 0;
    let ts = 0, tp = 0;
    movements.forEach(m => {
      running += m.credit - m.debit;
      m.running = running;
      ts += m.credit;
      tp += m.debit;
    });

    setLedger(movements);
    setTotalSupply(ts);
    setTotalPaid(tp);
  };

  const openSupplierFile = async (supp: any) => {
    setSelectedSupp(supp);
    await buildLedger(supp);
  };

  const refreshSupplier = async () => {
    if (!selectedSupp) return;
    const { data: fresh } = await supabase.from('suppliers').select('*').eq('id', selectedSupp.id).maybeSingle();
    if (fresh) {
      setSelectedSupp(fresh);
      await buildLedger(fresh);
    }
  };

  const handlePayout = async (e: any) => {
    e.preventDefault();
    if (!selectedSupp || !payoutAmount || Number(payoutAmount) <= 0) {
      showToast('المبلغ مطلوب', 'error'); return;
    }
    if (!selectedTreasury) {
      showToast('اختر الخزينة', 'error'); return;
    }

    const currentBal = Number(selectedSupp.balance || 0);
    if (Number(payoutAmount) > currentBal) {
      showToast('المبلغ أكبر من المستحق للمورد', 'error');
      return;
    }

    const { error } = await supabase.from('financial_vouchers').insert([{
      type: 'payment',
      entity_name: selectedSupp.name,
      amount: Number(payoutAmount),
      payment_method: 'cash',
      treasury_code: selectedTreasury,
      notes: 'سداد دفعة صادرة للمورد'
    }]);

    if (error) { showToast('خطأ: ' + error.message, 'error'); return; }

    const newBalance = Math.max(0, currentBal - Number(payoutAmount));
    await supabase.from('suppliers').update({ balance: newBalance }).eq('id', selectedSupp.id);

    setPayoutAmount('');
    await refreshSupplier();
    loadSuppliers();
    loadTreasuries();
    showToast('تم إثبات السداد من ' + getTreasuryName(selectedTreasury));
  };

  const openBatchDetails = async (batchId: string) => {
    const { data: b } = await supabase.from('batches').select('*').eq('id', batchId).maybeSingle();
    const { data: yp } = await supabase.from('yield_processing').select('*').eq('batch_id', batchId).maybeSingle();
    setBatchModal({ batch: b, yield: yp });
  };

  const exportSupplierLedger = () => {
    if (!selectedSupp || ledger.length === 0) return;
    const rows = ledger.map((m: any) => ({
      'التاريخ': new Date(m.date).toLocaleDateString('en-GB'),
      'الحركة': m.type,
      'المرجع': m.ref,
      'البيان': m.desc,
      'مدين (سدّدنا)': m.debit > 0 ? m.debit : '',
      'دائن (توريد)': m.credit > 0 ? m.credit : '',
      'الرصيد': m.running
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 12 }, { wch: 18 }, { wch: 14 }, { wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'كشف الحساب');
    XLSX.writeFile(wb, 'كشف_حساب_' + selectedSupp.name + '_' + new Date().toISOString().split('T')[0] + '.xlsx');
  };

  const getTreasuryName = (code: string) => {
    const t = treasuries.find(x => x.treasury_code === code);
    return t ? t.name_ar : code;
  };


  const supplierColumns = [
    {
      key: 'supplier_code',
      label: 'الكود',
      searchable: true,
      render: (s: any) => <span className="font-mono text-slate-500 font-bold text-[11px]">{s.supplier_code || '—'}</span>
    },
    {
      key: 'name',
      exportValue: (s: any) => s.name,
      label: 'المورد أو المزرعة',
      searchable: true,
      render: (s: any) => (
        <span onClick={() => openSupplierFile(s)} className="font-bold text-blue-700 cursor-pointer hover:underline">
          {s.name}
        </span>
      )
    },
    {
      key: 'phone',
      label: 'رقم الاتصال',
      searchable: true,
      accessor: (s: any) => s.phone || '---'
    },
    {
      key: 'balance',
      label: 'الرصيد المستحق',
      render: (s: any) => <span className="font-bold text-rose-600 font-mono">{Number(s.balance || 0).toLocaleString()} ج</span>
    },
    {
      key: 'is_active',
      label: 'الحالة',
      defaultHidden: true,
      render: (s: any) => s.is_active === false ? <span className="text-amber-700 font-bold text-xs">مؤرشف</span> : <span className="text-emerald-700 font-bold text-xs">نشط</span>
    }
  ];

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-2xl border text-sm font-bold ${toast.type === 'success' ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-rose-600 text-white border-rose-400'}`}>{toast.msg}</div>
      )}

      {batchModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-right">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-base font-black text-blue-900">تفاصيل أمر التوريد {batchModal.batch?.id}</h3>
              <button onClick={() => setBatchModal(null)} className="text-slate-400 font-bold text-sm">إغلاق</button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs font-bold">
              <div className="bg-slate-50 p-3 rounded-xl">
                <span className="text-slate-500 block">التاريخ:</span>
                <b className="text-sm font-mono">{new Date(batchModal.batch?.created_at).toLocaleString('en-GB')}</b>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl">
                <span className="text-slate-500 block">المورد:</span>
                <b className="text-sm">{batchModal.batch?.supplier_name}</b>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl">
                <span className="text-slate-500 block">الوزن القائم:</span>
                <b className="text-sm font-mono">{Number(batchModal.batch?.live_weight_kg).toLocaleString()} كجم</b>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl">
                <span className="text-slate-500 block">سعر التنفيذ:</span>
                <b className="text-sm font-mono">{batchModal.batch?.execution_price} ج/كجم</b>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl">
                <span className="text-slate-500 block">مصاريف النقل:</span>
                <b className="text-sm font-mono">{Number(batchModal.batch?.transport_cost).toLocaleString()} ج</b>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl">
                <span className="text-slate-500 block">عمالة:</span>
                <b className="text-sm font-mono">{Number(batchModal.batch?.labor_cost).toLocaleString()} ج</b>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl">
                <span className="text-slate-500 block">وساطة:</span>
                <b className="text-sm font-mono">{Number(batchModal.batch?.broker_cost).toLocaleString()} ج</b>
              </div>
              <div className="bg-blue-50 p-3 rounded-xl">
                <span className="text-blue-700 block">التكلفة الإجمالية:</span>
                <b className="text-sm font-mono text-blue-900">{Number(batchModal.batch?.total_cost).toLocaleString()} ج</b>
              </div>
              <div className="bg-emerald-50 p-3 rounded-xl col-span-2">
                <span className="text-emerald-700 block">تكلفة الكيلو القائم:</span>
                <b className="text-sm font-mono text-emerald-900">{batchModal.batch?.effective_kg_cost} ج/كجم</b>
              </div>
            </div>
            {batchModal.yield && (
              <div className="bg-slate-50 p-4 rounded-xl text-xs">
                <h4 className="font-black text-slate-800 mb-2">نتائج التشفية:</h4>
                <div className="grid grid-cols-3 gap-2 font-mono">
                  <div>بانيه: {Number(batchModal.yield.actual_fillet).toFixed(1)} كجم</div>
                  <div>وراك: {Number(batchModal.yield.actual_thighs).toFixed(1)} كجم</div>
                  <div>أجنحة: {Number(batchModal.yield.actual_wings).toFixed(1)} كجم</div>
                  <div>كبد: {Number(batchModal.yield.actual_livers).toFixed(1)} كجم</div>
                  <div>هياكل: {Number(batchModal.yield.actual_carcass).toFixed(1)} كجم</div>
                  <div className="text-blue-700 font-bold col-span-3">الانحراف: {batchModal.yield.variance_ratio}% — {batchModal.yield.status_alert}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-3xl border border-slate-200 flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900">سجل الموردين ومصادر التوريد</h1>
          <p className="text-sm text-slate-500 font-bold mt-1">كشوف مستحقات المزارع وسجل دفعات التوريدات</p>
        </div>
      </div>

      {selectedSupp && (
        <div className="bg-white border-2 border-blue-500 rounded-3xl shadow-xl overflow-hidden">
          <div className="bg-blue-50 p-5 flex justify-between items-center border-b-2 border-blue-200">
            <div>
              <h2 className="text-base font-black text-blue-900">{selectedSupp.name}</h2>
              <span className="text-xs font-bold text-slate-600">الهاتف: {selectedSupp.phone || 'غير مسجل'}</span>
            </div>
            <div className="flex gap-2 items-center"><button onClick={() => { const code = selectedSupp.supplier_code || selectedSupp.id; setSelectedSupp(null); router.push('/suppliers/' + code); }} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1"><ExternalLink className="w-3.5 h-3.5" /><span>فتح الملف الكامل</span></button><button onClick={() => setSelectedSupp(null)} className="text-slate-400 hover:text-slate-700 font-bold text-sm">إغلاق</button></div>
          </div>

          <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-rose-50 p-4 rounded-2xl border border-rose-200">
              <span className="text-xs font-bold text-rose-700 block mb-1">الرصيد الدائن المستحق للمورد</span>
              <p className="text-2xl font-black text-rose-700 font-mono">{Number(selectedSupp.balance).toLocaleString()} ج</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border">
              <span className="text-xs font-bold text-slate-500 block mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> إجمالي التوريدات</span>
              <p className="text-xl font-black text-slate-800 font-mono">{totalSupply.toLocaleString()} ج</p>
            </div>
            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200">
              <span className="text-xs font-bold text-emerald-700 block mb-1 flex items-center gap-1"><TrendingDown className="w-3 h-3" /> إجمالي المسدد</span>
              <p className="text-xl font-black text-emerald-800 font-mono">{totalPaid.toLocaleString()} ج</p>
            </div>
          </div>

          <div className="px-5 pb-2">
            <form onSubmit={handlePayout} className="bg-blue-50 p-4 rounded-2xl border-2 border-blue-200 space-y-3">
              <div className="flex items-center gap-2 text-blue-900">
                <Wallet className="w-5 h-5" />
                <h3 className="text-sm font-black">تسجيل سداد دفعة صادرة</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input type="number" value={payoutAmount} onChange={(e) => setPayoutAmount(e.target.value)} placeholder="المبلغ" className="border-2 border-slate-200 rounded-xl px-4 text-sm font-bold bg-white h-11 font-mono outline-none" required />
                <select value={selectedTreasury} onChange={(e) => setSelectedTreasury(e.target.value)} className="border-2 border-slate-200 rounded-xl px-3 text-sm font-bold bg-white h-11" required>
                  {treasuries.map(t => (
                    <option key={t.treasury_code} value={t.treasury_code}>{t.name_ar} ({Number(treasuryBalances[t.treasury_code] || 0).toLocaleString()} ج)</option>
                  ))}
                </select>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow">تأكيد السداد</button>
              </div>
            </form>
          </div>

          <div className="p-5">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600" />
                <span>كشف حساب المورد الزمني</span>
              </h3>
              <button onClick={exportSupplierLedger} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5">
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
                        {m.type === 'أمر توريد' ? (<span className="text-blue-700">{m.type}</span>) : (<span className="text-emerald-700">{m.type}</span>)}
                      </td>
                      <td className="p-3">
                        {m.canOpen ? (
                          <button onClick={() => openBatchDetails(m.batchId)} className="text-blue-700 font-bold underline hover:text-blue-900">{m.ref}</button>
                        ) : (<span className="text-slate-500">{m.ref}</span>)}
                      </td>
                      <td className="p-3 font-sans text-slate-700 text-[11px]">
                        {m.desc}
                        {m.treasury && <span className="block text-slate-400">← {getTreasuryName(m.treasury)}</span>}
                      </td>
                      <td className="p-3 font-bold text-emerald-700">{m.debit > 0 ? m.debit.toLocaleString() : '—'}</td>
                      <td className="p-3 font-bold text-rose-700">{m.credit > 0 ? m.credit.toLocaleString() : '—'}</td>
                      <td className="p-3 font-black text-slate-900">{m.running.toLocaleString()}</td>
                    </tr>
                  ))}
                  {ledger.length > 0 && (
                    <tr className="bg-slate-100 font-black">
                      <td colSpan={4} className="p-3 font-sans">الإجمالي</td>
                      <td className="p-3 text-emerald-800">{totalPaid.toLocaleString()}</td>
                      <td className="p-3 text-rose-800">{totalSupply.toLocaleString()}</td>
                      <td className="p-3 text-blue-900">{Number(selectedSupp.balance).toLocaleString()}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-slate-500 font-bold mt-2">اضغط على كود أي أمر توريد لفتح تفاصيله الكاملة.</p>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-3xl border border-slate-200">
        <DataTable
          data={suppliers}
          columns={supplierColumns}
          filename="الموردين"
          searchPlaceholder="بحث..."
          emptyMessage="لا يوجد موردون"
          rowKey={(s: any) => s.id}
          storageKey="suppliers"
        />
      </div>
    </div>
  );
}
