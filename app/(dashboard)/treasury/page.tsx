'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Wallet, Building2, UserCheck, Plus, X, RefreshCw } from 'lucide-react';
import DataTable from '@/components/DataTable';

export default function TreasuryPage() {
  const supabase = createClient();
  const router = useRouter();
  const [toast, setToast] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [treasuries, setTreasuries] = useState<any[]>([]);
  const [balances, setBalances] = useState<any>({});
  const [selectedTreasury, setSelectedTreasury] = useState('');
  const [amount, setAmount] = useState('');
  const [entityName, setEntityName] = useState('');
  const [notes, setNotes] = useState('');
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [actualCash, setActualCash] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [closeTreasury, setCloseTreasury] = useState('');

  const showToast = (msg: string, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  };

  const loadData = async () => {
    const { data: treas } = await supabase
      .from('treasury_accounts')
      .select('*')
      .eq('is_active', true)
      .order('treasury_code');

    if (treas) {
      setTreasuries(treas);
      if (!selectedTreasury && treas.length > 0) setSelectedTreasury(treas[0].treasury_code);
    }

    const { data: vous } = await supabase
      .from('financial_vouchers')
      .select('*')
      .order('created_at', { ascending: false });

    if (vous) setVouchers(vous);

    const { data: treasuryBals } = await supabase.rpc('get_treasury_balances');
    if (treasuryBals) {
      const bals: any = {};
      treasuryBals.forEach((t: any) => bals[t.treasury_code] = Number(t.balance || 0));
      setBalances(bals);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleExpense = async (e: any) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0 || !selectedTreasury) {
      showToast('المبلغ والخزينة مطلوبان', 'error');
      return;
    }

    const currentBalance = Number(balances[selectedTreasury] || 0);
    if (Number(amount) > currentBalance) {
      showToast(`الرصيد غير كافٍ. المتاح في الخزينة: ${currentBalance.toLocaleString()} ج`, 'error');
      return;
    }

    const { error } = await supabase.from('financial_vouchers').insert([{
      type: 'expense',
      entity_name: entityName || 'مصروف تشغيلي',
      amount: Number(amount),
      payment_method: 'cash',
      treasury_code: selectedTreasury,
      notes: notes || 'نثريات تشغيل دورية'
    }]);

    if (error) { showToast('خطأ: ' + error.message, 'error'); return; }

    setAmount(''); setEntityName(''); setNotes('');
    setShowExpenseModal(false);
    loadData();
    showToast('تم إثبات صرف المصروف من الخزينة المختارة');
  };

  const handleCloseShift = async (e: any) => {
    e.preventDefault();
    const actual = Number(actualCash);
    if (!actualCash || actual < 0) {
      showToast('أدخل النقدية الفعلية المعدودة', 'error');
      return;
    }

    const treasuryCode = closeTreasury || treasuries[0]?.treasury_code || 'MAIN-CASH';
    const bookBalance = Number(balances[treasuryCode] || 0);
    const diff = actual - bookBalance;

    if (Math.abs(diff) < 0.01) {
      showToast('الرصيد متطابق تماماً — لا حاجة لتسوية');
      setShowCloseModal(false);
      setActualCash('');
      setCloseNotes('');
      return;
    }

    if (diff < 0) {
      await supabase.from('financial_vouchers').insert([{
        type: 'expense',
        entity_name: 'عجز في إقفال الوردية',
        amount: Math.abs(diff),
        payment_method: 'cash',
        treasury_code: treasuryCode,
        notes: closeNotes || 'تسوية عجز الدرج عند الإقفال اليومي'
      }]);
      showToast(`تم تسجيل عجز بقيمة ${Math.abs(diff).toFixed(2)} ج`);
    } else {
      await supabase.from('financial_vouchers').insert([{
        type: 'receipt',
        entity_name: 'زيادة في إقفال الوردية',
        amount: diff,
        payment_method: 'cash',
        treasury_code: treasuryCode,
        notes: closeNotes || 'تسوية زيادة الدرج عند الإقفال اليومي'
      }]);
      showToast(`تم تسجيل زيادة بقيمة ${diff.toFixed(2)} ج`);
    }

    setShowCloseModal(false);
    setActualCash('');
    setCloseNotes('');
    loadData();
  };

  const getTreasuryName = (code: string) => {
    const t = treasuries.find(x => x.treasury_code === code);
    return t ? t.name_ar : (code === 'MAIN-CASH' ? 'الخزينة الرئيسية' : code);
  };

  const getTreasuryIcon = (type: string) => {
    if (type === 'حساب بنكي') return <Building2 className="w-5 h-5" />;
    if (type === 'عهدة') return <UserCheck className="w-5 h-5" />;
    return <Wallet className="w-5 h-5" />;
  };

  const totalCash = Object.values(balances).reduce((s: number, v: any) => s + Number(v || 0), 0);

  const voucherColumns = [
    {
      key: 'created_at',
      label: 'التاريخ',
      render: (v: any) => <span className="text-slate-500 font-mono">{new Date(v.created_at).toLocaleDateString('en-GB')}</span>
    },
    {
      key: 'type',
      label: 'التصنيف',
      render: (v: any) => {
        if (v.type === 'receipt') return <span className="text-emerald-700 font-bold">تحصيل وارد</span>;
        if (v.type === 'payment') return <span className="text-rose-700 font-bold">سداد صادر</span>;
        if (v.type === 'expense') return <span className="text-slate-700 font-bold">مصروف</span>;
        if (v.type === 'opening_treasury') return <span className="text-blue-700 font-bold">رصيد افتتاحي</span>;
        return <span className="text-slate-700 font-bold">{v.type}</span>;
      }
    },
    {
      key: 'treasury_code',
      label: 'الخزينة',
      render: (v: any) => <span className="font-bold">{getTreasuryName(v.treasury_code || 'MAIN-CASH')}</span>
    },
    {
      key: 'entity_name',
      label: 'البيان والجهة',
      searchable: true,
      render: (v: any) => <span>{v.entity_name} {v.notes ? '— ' + v.notes : ''}</span>
    },
    {
      key: 'amount',
      label: 'القيمة',
      render: (v: any) => {
        const isIn = v.type === 'receipt' || v.type === 'opening_treasury';
        return (
          <span className={'font-bold font-mono ' + (isIn ? 'text-emerald-700' : 'text-rose-700')}>
            {isIn ? '+' : '-'}{Number(v.amount).toLocaleString()} ج
          </span>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl border text-sm font-bold ${toast.type === 'success' ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-rose-600 text-white border-rose-400'}`}>{toast.msg}</div>
      )}

      {showCloseModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-right">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-bold text-slate-800">إقفال الوردية ومطابقة الدرج</h3>
              <button onClick={() => setShowCloseModal(false)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCloseShift} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">الخزينة المُقفلة:</label>
                <select value={closeTreasury || treasuries[0]?.treasury_code || ''} onChange={(e) => setCloseTreasury(e.target.value)} className="w-full border-2 border-slate-200 rounded-xl px-3 text-sm font-bold bg-slate-50 h-11" required>
                  {treasuries.map(t => (
                    <option key={t.treasury_code} value={t.treasury_code}>
                      {t.name_ar} — الدفتري: {Number(balances[t.treasury_code] || 0).toLocaleString()} ج
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border space-y-2">
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-slate-600">الرصيد الدفتري:</span>
                  <span className="font-mono text-slate-800">
                    {Number(balances[closeTreasury || treasuries[0]?.treasury_code] || 0).toLocaleString()} ج
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">النقدية الفعلية المعدودة (ج):</label>
                <input type="number" step="0.01" value={actualCash} onChange={(e) => setActualCash(e.target.value)} placeholder="0.00" className="w-full border-2 border-blue-400 rounded-xl px-4 text-base font-bold bg-blue-50 h-12 font-mono text-center" required />
              </div>

              {actualCash !== '' && (
                (() => {
                  const book = Number(balances[closeTreasury || treasuries[0]?.treasury_code] || 0);
                  const diff = Number(actualCash) - book;
                  if (Math.abs(diff) < 0.01) {
                    const voucherColumns = [
    {
      key: 'created_at',
      label: 'التاريخ',
      render: (v: any) => <span className="text-slate-500 font-mono">{new Date(v.created_at).toLocaleDateString('en-GB')}</span>
    },
    {
      key: 'type',
      label: 'التصنيف',
      render: (v: any) => {
        if (v.type === 'receipt') return <span className="text-emerald-700 font-bold">تحصيل وارد</span>;
        if (v.type === 'payment') return <span className="text-rose-700 font-bold">سداد صادر</span>;
        if (v.type === 'expense') return <span className="text-slate-700 font-bold">مصروف</span>;
        if (v.type === 'opening_treasury') return <span className="text-blue-700 font-bold">رصيد افتتاحي</span>;
        return <span className="text-slate-700 font-bold">{v.type}</span>;
      }
    },
    {
      key: 'treasury_code',
      label: 'الخزينة',
      render: (v: any) => <span className="font-bold">{getTreasuryName(v.treasury_code || 'MAIN-CASH')}</span>
    },
    {
      key: 'entity_name',
      label: 'البيان والجهة',
      searchable: true,
      render: (v: any) => <span>{v.entity_name} {v.notes ? '— ' + v.notes : ''}</span>
    },
    {
      key: 'amount',
      label: 'القيمة',
      render: (v: any) => {
        const isIn = v.type === 'receipt' || v.type === 'opening_treasury';
        return (
          <span className={'font-bold font-mono ' + (isIn ? 'text-emerald-700' : 'text-rose-700')}>
            {isIn ? '+' : '-'}{Number(v.amount).toLocaleString()} ج
          </span>
        );
      }
    }
  ];

  return (
                      <div className="bg-emerald-50 border-2 border-emerald-200 p-4 rounded-2xl text-center">
                        <span className="text-sm font-bold text-emerald-800">✓ الرصيد متطابق تماماً</span>
                      </div>
                    );
                  }
                  if (diff < 0) {
                    const voucherColumns = [
    {
      key: 'created_at',
      label: 'التاريخ',
      render: (v: any) => <span className="text-slate-500 font-mono">{new Date(v.created_at).toLocaleDateString('en-GB')}</span>
    },
    {
      key: 'type',
      label: 'التصنيف',
      render: (v: any) => {
        if (v.type === 'receipt') return <span className="text-emerald-700 font-bold">تحصيل وارد</span>;
        if (v.type === 'payment') return <span className="text-rose-700 font-bold">سداد صادر</span>;
        if (v.type === 'expense') return <span className="text-slate-700 font-bold">مصروف</span>;
        if (v.type === 'opening_treasury') return <span className="text-blue-700 font-bold">رصيد افتتاحي</span>;
        return <span className="text-slate-700 font-bold">{v.type}</span>;
      }
    },
    {
      key: 'treasury_code',
      label: 'الخزينة',
      render: (v: any) => <span className="font-bold">{getTreasuryName(v.treasury_code || 'MAIN-CASH')}</span>
    },
    {
      key: 'entity_name',
      label: 'البيان والجهة',
      searchable: true,
      render: (v: any) => <span>{v.entity_name} {v.notes ? '— ' + v.notes : ''}</span>
    },
    {
      key: 'amount',
      label: 'القيمة',
      render: (v: any) => {
        const isIn = v.type === 'receipt' || v.type === 'opening_treasury';
        return (
          <span className={'font-bold font-mono ' + (isIn ? 'text-emerald-700' : 'text-rose-700')}>
            {isIn ? '+' : '-'}{Number(v.amount).toLocaleString()} ج
          </span>
        );
      }
    }
  ];

  return (
                      <div className="bg-rose-50 border-2 border-rose-200 p-4 rounded-2xl text-center">
                        <span className="text-xs font-bold text-rose-700 block">عجز في الدرج</span>
                        <span className="text-lg font-bold text-rose-900 font-mono">{Math.abs(diff).toFixed(2)} ج</span>
                      </div>
                    );
                  }
                  const voucherColumns = [
    {
      key: 'created_at',
      label: 'التاريخ',
      render: (v: any) => <span className="text-slate-500 font-mono">{new Date(v.created_at).toLocaleDateString('en-GB')}</span>
    },
    {
      key: 'type',
      label: 'التصنيف',
      render: (v: any) => {
        if (v.type === 'receipt') return <span className="text-emerald-700 font-bold">تحصيل وارد</span>;
        if (v.type === 'payment') return <span className="text-rose-700 font-bold">سداد صادر</span>;
        if (v.type === 'expense') return <span className="text-slate-700 font-bold">مصروف</span>;
        if (v.type === 'opening_treasury') return <span className="text-blue-700 font-bold">رصيد افتتاحي</span>;
        return <span className="text-slate-700 font-bold">{v.type}</span>;
      }
    },
    {
      key: 'treasury_code',
      label: 'الخزينة',
      render: (v: any) => <span className="font-bold">{getTreasuryName(v.treasury_code || 'MAIN-CASH')}</span>
    },
    {
      key: 'entity_name',
      label: 'البيان والجهة',
      searchable: true,
      render: (v: any) => <span>{v.entity_name} {v.notes ? '— ' + v.notes : ''}</span>
    },
    {
      key: 'amount',
      label: 'القيمة',
      render: (v: any) => {
        const isIn = v.type === 'receipt' || v.type === 'opening_treasury';
        return (
          <span className={'font-bold font-mono ' + (isIn ? 'text-emerald-700' : 'text-rose-700')}>
            {isIn ? '+' : '-'}{Number(v.amount).toLocaleString()} ج
          </span>
        );
      }
    }
  ];

  return (
                    <div className="bg-amber-50 border-2 border-amber-200 p-4 rounded-2xl text-center">
                      <span className="text-xs font-bold text-amber-700 block">زيادة في الدرج</span>
                      <span className="text-lg font-bold text-amber-900 font-mono">{diff.toFixed(2)} ج</span>
                    </div>
                  );
                })()
              )}

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">ملاحظات (اختياري):</label>
                <input type="text" value={closeNotes} onChange={(e) => setCloseNotes(e.target.value)} placeholder="سبب الفرق إن وُجد" className="w-full border-2 border-slate-200 rounded-xl px-4 text-xs font-bold bg-slate-50 h-11" />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-xs shadow">تأكيد الإقفال وتسجيل التسوية</button>
                <button type="button" onClick={() => setShowCloseModal(false)} className="bg-slate-100 text-slate-700 font-bold px-5 rounded-xl text-xs">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showExpenseModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-right">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-bold text-slate-800">تسجيل مصروف تشغيلي أو نثريات</h3>
              <button onClick={() => setShowExpenseModal(false)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">الخزينة المصروف منها:</label>
                <select value={selectedTreasury} onChange={(e) => setSelectedTreasury(e.target.value)} className="w-full border-2 border-slate-200 rounded-xl px-3 text-sm font-bold bg-slate-50 h-11" required>
                  {treasuries.map(t => (
                    <option key={t.treasury_code} value={t.treasury_code}>
                      {t.name_ar} — ({Number(balances[t.treasury_code] || 0).toLocaleString()} ج)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">المبلغ (ج):</label>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full border-2 border-slate-200 rounded-xl px-4 text-sm font-bold bg-slate-50 h-11 font-mono" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">بند المصروف:</label>
                <input type="text" value={entityName} onChange={(e) => setEntityName(e.target.value)} placeholder="كهرباء / ثلج / صيانة" className="w-full border-2 border-slate-200 rounded-xl px-4 text-xs font-bold bg-slate-50 h-11" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">البيان:</label>
                <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="تفاصيل إضافية" className="w-full border-2 border-slate-200 rounded-xl px-4 text-xs font-bold bg-slate-50 h-11" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-xl text-xs shadow">إثبات الخروج النقدي</button>
                <button type="button" onClick={() => setShowExpenseModal(false)} className="bg-slate-100 text-slate-700 font-bold px-5 rounded-xl text-xs">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-3xl border border-slate-200 flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">مركز السيولة والرقابة النقدية</h1>
          <p className="text-sm text-slate-500 font-bold mt-1">متابعة التدفقات النقدية وأرصدة كل خزينة على حدة</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-emerald-50 border border-emerald-200 px-5 py-2.5 rounded-2xl text-xs font-bold text-emerald-900">
            إجمالي السيولة المتاحة: <span className="font-mono text-base font-bold">{totalCash.toLocaleString()} ج</span>
          </div>
          <button onClick={loadData} disabled={loading} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs border flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </button>
          <button onClick={() => setShowCloseModal(true)} className="bg-slate-700 hover:bg-slate-800 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow">
            <Wallet className="w-4 h-4" />
            <span>إقفال الوردية</span>
          </button>
          <button onClick={() => setShowExpenseModal(true)} className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow">
            <Plus className="w-4 h-4" />
            <span>مصروف نثري</span>
          </button>
        </div>
      </div>

      <div className={treasuries.length === 1 ? 'grid grid-cols-1 gap-4' : treasuries.length === 2 ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'}>
        {treasuries.map(t => {
          const bal = Number(balances[t.treasury_code] || 0);
          const voucherColumns = [
    {
      key: 'created_at',
      label: 'التاريخ',
      render: (v: any) => <span className="text-slate-500 font-mono">{new Date(v.created_at).toLocaleDateString('en-GB')}</span>
    },
    {
      key: 'type',
      label: 'التصنيف',
      render: (v: any) => {
        if (v.type === 'receipt') return <span className="text-emerald-700 font-bold">تحصيل وارد</span>;
        if (v.type === 'payment') return <span className="text-rose-700 font-bold">سداد صادر</span>;
        if (v.type === 'expense') return <span className="text-slate-700 font-bold">مصروف</span>;
        if (v.type === 'opening_treasury') return <span className="text-blue-700 font-bold">رصيد افتتاحي</span>;
        return <span className="text-slate-700 font-bold">{v.type}</span>;
      }
    },
    {
      key: 'treasury_code',
      label: 'الخزينة',
      render: (v: any) => <span className="font-bold">{getTreasuryName(v.treasury_code || 'MAIN-CASH')}</span>
    },
    {
      key: 'entity_name',
      label: 'البيان والجهة',
      searchable: true,
      render: (v: any) => <span>{v.entity_name} {v.notes ? '— ' + v.notes : ''}</span>
    },
    {
      key: 'amount',
      label: 'القيمة',
      render: (v: any) => {
        const isIn = v.type === 'receipt' || v.type === 'opening_treasury';
        return (
          <span className={'font-bold font-mono ' + (isIn ? 'text-emerald-700' : 'text-rose-700')}>
            {isIn ? '+' : '-'}{Number(v.amount).toLocaleString()} ج
          </span>
        );
      }
    }
  ];

  return (
            <div key={t.id} className="bg-white p-5 rounded-3xl border-2 border-slate-200">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700">
                    {getTreasuryIcon(t.account_type)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">{t.name_ar}</h3>
                    <span className="text-[11px] font-bold text-slate-500">{t.account_type} • <span className="font-mono">{t.treasury_code}</span></span>
                  </div>
                </div>
                <p className="text-xl font-bold text-emerald-700 font-mono shrink-0">{bal.toLocaleString()} ج</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4">
        <h2 className="text-sm font-bold text-slate-800 border-b pb-3">سجل الحركات النقدية المعتمدة</h2>
        <DataTable
          data={vouchers}
          columns={voucherColumns}
          rowHref={(t: any) => '/treasury/' + t.treasury_code}
          filename="حركات_الخزينة"
          searchPlaceholder="بحث..."
          emptyMessage="لا توجد حركات بعد"
          rowKey={(v: any) => v.id}
          storageKey="treasury_vouchers"
          dateKey="created_at"
        />
      </div>
    </div>
  );
}