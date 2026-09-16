'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Breadcrumbs from '@/components/Breadcrumbs';
import EntityActions from '@/components/EntityActions';
import DataTable from '@/components/DataTable';
import { ArrowRight, Wallet, TrendingUp, TrendingDown } from 'lucide-react';

export default function TreasuryFilePage() {
  const params = useParams();
  const router = useRouter();
  const code = String(params.code || '');
  const supabase = createClient();

  const [treasury, setTreasury] = useState<any>(null);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) { router.push('/treasury'); return; }
    load();
  }, [code]);

  async function load() {
    setLoading(true);
    const { data: t } = await supabase.from('treasury_accounts').select('*').eq('treasury_code', code).maybeSingle();
    if (!t) { setLoading(false); return; }
    setTreasury(t);
    const { data: v } = await supabase.from('financial_vouchers').select('*').eq('treasury_code', code).order('created_at', { ascending: false });
    setVouchers(v || []);
    const { data: bals } = await supabase.rpc('get_treasury_balances');
    const found = (bals || []).find((b: any) => b.treasury_code === code);
    setBalance(found ? Number(found.balance || 0) : 0);
    setLoading(false);
  }

  const totalIn = vouchers.filter(v => v.type === 'receipt' || v.type === 'opening_treasury').reduce((s, v) => s + Number(v.amount || 0), 0);
  const totalOut = vouchers.filter(v => v.type === 'payment' || v.type === 'expense').reduce((s, v) => s + Number(v.amount || 0), 0);

  const typeLabel = (t: string) => t === 'receipt' ? 'تحصيل وارد' : t === 'payment' ? 'سداد صادر' : t === 'expense' ? 'مصروف' : t === 'opening_treasury' ? 'رصيد افتتاحي' : t;

  const voucherColumns = [
    { key: 'voucher_code', label: 'المرجع', searchable: true, exportValue: (v: any) => v.voucher_code || 'VCH-' + v.id,
      render: (v: any) => <span className="font-mono font-bold text-blue-700">{v.voucher_code || 'VCH-' + v.id}</span> },
    { key: 'created_at', label: 'التاريخ', exportValue: (v: any) => new Date(v.created_at).toLocaleDateString('en-GB'),
      render: (v: any) => <span className="font-mono text-slate-500">{new Date(v.created_at).toLocaleDateString('en-GB')}</span> },
    { key: 'type', label: 'النوع', searchable: true, exportValue: (v: any) => typeLabel(v.type),
      render: (v: any) => {
        const isIn = v.type === 'receipt' || v.type === 'opening_treasury';
        return <span className={'text-[10px] font-bold px-2 py-0.5 rounded-lg ' + (isIn ? 'bg-emerald-100 text-emerald-700' : v.type === 'expense' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700')}>{typeLabel(v.type)}</span>;
      } },
    { key: 'entity_name', label: 'الجهة', searchable: true, exportValue: (v: any) => v.entity_name || '',
      render: (v: any) => <span className="font-bold">{v.entity_name || '—'}</span> },
    { key: 'amount', label: 'المبلغ (ج)', exportValue: (v: any) => Number(v.amount || 0),
      render: (v: any) => {
        const isIn = v.type === 'receipt' || v.type === 'opening_treasury';
        return <span className={'font-mono font-bold ' + (isIn ? 'text-emerald-700' : 'text-rose-700')}>{isIn ? '+' : '−'}{Number(v.amount).toLocaleString()}</span>;
      } },
    { key: 'payment_method', label: 'طريقة الدفع', exportValue: (v: any) => v.payment_method || '',
      render: (v: any) => <span className="text-slate-600">{v.payment_method || '—'}</span> },
    { key: 'notes', label: 'ملاحظات', searchable: true, exportValue: (v: any) => v.notes || '',
      render: (v: any) => <span className="text-[10px] text-slate-500 max-w-[250px] truncate inline-block">{v.notes || '—'}</span> },
  ];

  if (loading) return <div className="p-8 text-center text-sm font-bold text-slate-400">جاري التحميل...</div>;
  if (!treasury) return (
    <div className="p-8 text-center space-y-4">
      <p className="text-sm font-bold text-slate-500">الخزينة غير موجودة</p>
      <button onClick={() => router.push('/treasury')} className="text-xs font-bold text-blue-600 hover:underline">← العودة للخزائن</button>
    </div>
  );

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'الخزائن', href: '/treasury' }, { label: treasury.name_ar }]} />

      <div className="bg-white p-6 rounded-3xl border border-slate-200">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="bg-slate-100 hover:bg-slate-200 p-2.5 rounded-xl"><ArrowRight className="w-4 h-4 text-slate-700" /></button>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold bg-slate-100 px-2 py-0.5 rounded-lg text-slate-600">{treasury.treasury_code}</span>
                <h1 className="text-xl font-black text-slate-900">{treasury.name_ar}</h1>
              </div>
              <p className="text-xs text-slate-500 font-bold mt-1">{treasury.account_type}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <EntityActions entityType="treasury" entity={treasury} onRefresh={load} showArchive={false} />
            <div className="text-left">
              <span className="text-[10px] font-bold text-slate-400 block">الرصيد الحالي</span>
              <span className={'text-2xl font-black font-mono ' + (balance >= 0 ? 'text-emerald-600' : 'text-rose-600')}>{balance.toLocaleString()} ج</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200">
          <div className="flex items-center gap-2 text-emerald-500 mb-2"><TrendingUp className="w-4 h-4" /><span className="text-xs font-bold">إجمالي الداخل</span></div>
          <p className="text-2xl font-black font-mono text-emerald-700">{totalIn.toLocaleString()} ج</p>
          <span className="text-[10px] font-bold text-slate-500">تحصيلات + افتتاحي</span>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200">
          <div className="flex items-center gap-2 text-rose-500 mb-2"><TrendingDown className="w-4 h-4" /><span className="text-xs font-bold">إجمالي الخارج</span></div>
          <p className="text-2xl font-black font-mono text-rose-700">{totalOut.toLocaleString()} ج</p>
          <span className="text-[10px] font-bold text-slate-500">سداد + مصروفات</span>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200">
          <div className="flex items-center gap-2 text-slate-400 mb-2"><Wallet className="w-4 h-4" /><span className="text-xs font-bold">عدد الحركات</span></div>
          <p className="text-2xl font-black font-mono text-slate-900">{vouchers.length}</p>
          <span className="text-[10px] font-bold text-slate-500">إيصال في هذه الخزينة</span>
        </div>
      </div>

      <div className="bg-white p-5 rounded-3xl border border-slate-200">
        <DataTable
          data={vouchers}
          columns={voucherColumns}
          filename={'خزينة_' + treasury.name_ar}
          searchPlaceholder="بحث..."
          emptyMessage="لا توجد حركات"
          rowKey={(v: any) => v.id}
          storageKey={'treasury_' + code}
          dateKey="created_at"
            dateDefault="all"
          filters={[
            {
              key: 'type',
              label: 'النوع',
              accessor: (v: any) => v.type,
              options: [
                { value: 'receipt', label: 'تحصيل وارد' },
                { value: 'payment', label: 'سداد صادر' },
                { value: 'expense', label: 'مصروف' },
                { value: 'opening_treasury', label: 'رصيد افتتاحي' },
              ]
            }
          ]}
        />
      </div>
    </div>
  );
}