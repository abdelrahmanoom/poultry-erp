'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Breadcrumbs from '@/components/Breadcrumbs';
import EntityActions from '@/components/EntityActions';
import DataTable from '@/components/DataTable';
import { ArrowRight, Package, TrendingUp, Wallet } from 'lucide-react';

export default function ProductFilePage() {
  const params = useParams();
  const router = useRouter();
  const codeParam = String(params.code || '');
  const supabase = createClient();

  const [product, setProduct] = useState<any>(null);
  const [lots, setLots] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'lots' | 'sales' | 'adjustments'>('lots');

  useEffect(() => {
    if (!codeParam) { router.push('/inventory'); return; }
    load();
  }, [codeParam]);

  async function load() {
    setLoading(true);
    const { data: p } = await supabase.from('inventory').select('*').eq('product_code', codeParam).maybeSingle();
    if (!p) { setLoading(false); return; }
    setProduct(p);
    const { data: l } = await supabase.from('inventory_lots').select('*').eq('product_code', codeParam).order('received_at', { ascending: false });
    setLots(l || []);
    const { data: s } = await supabase.from('sales_items').select('*, sales_invoices(created_at, customer_name, status, invoice_code)').eq('product_code', codeParam).order('id', { ascending: false }).limit(100);
    setSales((s || []).filter((x: any) => x.sales_invoices?.status !== 'cancelled'));
    const { data: a } = await supabase.from('inventory_adjustments').select('*').eq('product_code', codeParam).order('created_at', { ascending: false });
    setAdjustments(a || []);
    setLoading(false);
  }

  const remainingKg = lots.reduce((s, l) => s + Number(l.remaining_kg || 0), 0);
  const totalReceived = lots.reduce((s, l) => s + Number(l.quantity_kg || 0), 0);
  const totalSold = sales.reduce((s, x) => s + Number(x.quantity_kg || 0), 0);
  const totalRevenue = sales.reduce((s, x) => s + Number(x.subtotal || 0), 0);
  const totalCogs = sales.reduce((s, x) => s + (Number(x.unit_cost || 0) * Number(x.quantity_kg || 0)), 0);
  const avgCost = lots.length > 0 ? (lots.reduce((s, l) => s + Number(l.cost_per_kg || 0) * Number(l.quantity_kg || 0), 0) / Math.max(totalReceived, 1)) : 0;

  // ============ COLUMNS ============
  const lotColumns = [
    { key: 'received_at', label: 'التاريخ', exportValue: (l: any) => new Date(l.received_at).toLocaleDateString('en-GB'),
      render: (l: any) => <span className="font-mono text-slate-500">{new Date(l.received_at).toLocaleDateString('en-GB')}</span> },
    { key: 'source_type', label: 'المصدر', searchable: true, exportValue: (l: any) => l.source_type === 'production' ? 'إنتاج' : l.source_type === 'purchase' ? 'شراء' : l.source_type || '—',
      render: (l: any) => <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600">{l.source_type === 'production' ? 'إنتاج' : l.source_type === 'purchase' ? 'شراء' : l.source_type || '—'}</span> },
    { key: 'quantity_kg', label: 'الكمية الواردة (كجم)', exportValue: (l: any) => Number(l.quantity_kg || 0),
      render: (l: any) => <span className="font-mono">{Number(l.quantity_kg).toFixed(1)}</span> },
    { key: 'remaining_kg', label: 'المتبقي (كجم)', exportValue: (l: any) => Number(l.remaining_kg || 0),
      render: (l: any) => <span className="font-mono font-bold">{Number(l.remaining_kg).toFixed(1)}</span> },
    { key: 'cost_per_kg', label: 'تكلفة/كجم (ج)', exportValue: (l: any) => Number(l.cost_per_kg || 0),
      render: (l: any) => <span className="font-mono">{Number(l.cost_per_kg).toFixed(2)}</span> },
    { key: 'value', label: 'قيمة المتبقي (ج)', exportValue: (l: any) => Number(l.remaining_kg || 0) * Number(l.cost_per_kg || 0),
      render: (l: any) => <span className="font-mono font-bold">{(Number(l.remaining_kg || 0) * Number(l.cost_per_kg || 0)).toLocaleString()}</span> },
    { key: 'status', label: 'الحالة', exportValue: (l: any) => { const qty = Number(l.quantity_kg || 0); const rem = Number(l.remaining_kg || 0); return qty > 0 ? (rem / qty * 100).toFixed(0) + '%' : '0%'; },
      render: (l: any) => {
        const qty = Number(l.quantity_kg || 0);
        const rem = Number(l.remaining_kg || 0);
        const pct = qty > 0 ? (rem / qty) * 100 : 0;
        return <span className={'text-[10px] font-bold px-2 py-0.5 rounded-lg ' + (pct <= 0 ? 'bg-slate-100 text-slate-500' : pct < 30 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700')}>{pct <= 0 ? 'منتهية' : pct.toFixed(0) + '% متبقي'}</span>;
      } },
  ];

  const salesColumns = [
    { key: 'date', label: 'التاريخ', exportValue: (s: any) => new Date(s.sales_invoices?.created_at).toLocaleDateString('en-GB'),
      render: (s: any) => <span className="font-mono text-slate-500">{new Date(s.sales_invoices?.created_at).toLocaleDateString('en-GB')}</span> },
    { key: 'invoice', label: 'الفاتورة', searchable: true, exportValue: (s: any) => s.sales_invoices?.invoice_code || 'INV-' + s.invoice_id,
      render: (s: any) => <span className="font-mono font-bold text-blue-700">{s.sales_invoices?.invoice_code || 'INV-' + s.invoice_id}</span> },
    { key: 'customer', label: 'العميل', searchable: true, exportValue: (s: any) => s.sales_invoices?.customer_name || '',
      render: (s: any) => <span className="font-bold">{s.sales_invoices?.customer_name || '—'}</span> },
    { key: 'quantity_kg', label: 'الكمية (كجم)', exportValue: (s: any) => Number(s.quantity_kg || 0),
      render: (s: any) => <span className="font-mono">{Number(s.quantity_kg).toFixed(2)}</span> },
    { key: 'unit_price', label: 'سعر البيع (ج)', exportValue: (s: any) => Number(s.unit_price || 0),
      render: (s: any) => <span className="font-mono">{Number(s.unit_price).toLocaleString()}</span> },
    { key: 'unit_cost', label: 'تكلفة الوحدة (ج)', exportValue: (s: any) => Number(s.unit_cost || 0),
      render: (s: any) => <span className="font-mono text-slate-500">{Number(s.unit_cost || 0).toFixed(2)}</span> },
    { key: 'subtotal', label: 'الإجمالي (ج)', exportValue: (s: any) => Number(s.subtotal || 0),
      render: (s: any) => <span className="font-mono font-bold">{Number(s.subtotal).toLocaleString()}</span> },
    { key: 'profit', label: 'الربح (ج)', exportValue: (s: any) => Number(s.subtotal || 0) - (Number(s.unit_cost || 0) * Number(s.quantity_kg || 0)),
      render: (s: any) => {
        const profit = Number(s.subtotal) - (Number(s.unit_cost || 0) * Number(s.quantity_kg || 0));
        return <span className={'font-mono font-bold ' + (profit >= 0 ? 'text-emerald-700' : 'text-rose-700')}>{profit.toLocaleString()}</span>;
      } },
  ];

  const adjustmentColumns = [
    { key: 'created_at', label: 'التاريخ', exportValue: (a: any) => new Date(a.created_at).toLocaleDateString('en-GB'),
      render: (a: any) => <span className="font-mono text-slate-500">{new Date(a.created_at).toLocaleDateString('en-GB')}</span> },
    { key: 'adjustment_type', label: 'النوع', searchable: true, exportValue: (a: any) => a.adjustment_type === 'drip_loss' ? 'فقد تقطير' : a.adjustment_type,
      render: (a: any) => <span className={'text-[10px] font-bold px-2 py-0.5 rounded-lg ' + (a.adjustment_type === 'drip_loss' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600')}>{a.adjustment_type === 'drip_loss' ? 'فقد تقطير' : a.adjustment_type}</span> },
    { key: 'qty_kg', label: 'الكمية (كجم)', exportValue: (a: any) => Number(a.qty_kg || 0),
      render: (a: any) => <span className="font-mono font-bold">{Number(a.qty_kg).toFixed(2)}</span> },
    { key: 'value_lost', label: 'القيمة المفقودة (ج)', exportValue: (a: any) => Number(a.value_lost || 0),
      render: (a: any) => <span className="font-mono text-rose-700">{Number(a.value_lost || 0).toLocaleString()}</span> },
    { key: 'reason', label: 'السبب', searchable: true, exportValue: (a: any) => a.reason || '',
      render: (a: any) => <span className="text-slate-600">{a.reason || '—'}</span> },
  ];

  if (loading) return <div className="p-8 text-center text-sm font-bold text-slate-400">جاري التحميل...</div>;
  if (!product) return (
    <div className="p-8 text-center space-y-4">
      <p className="text-sm font-bold text-slate-500">الصنف غير موجود</p>
      <button onClick={() => router.push('/inventory')} className="text-xs font-bold text-blue-600 hover:underline">← العودة للمخزون</button>
    </div>
  );

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'المخزون', href: '/inventory' }, { label: product.product_name_ar }]} />

      <div className="bg-white p-6 rounded-3xl border border-slate-200">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="bg-slate-100 hover:bg-slate-200 p-2.5 rounded-xl"><ArrowRight className="w-4 h-4 text-slate-700" /></button>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold bg-slate-100 px-2 py-0.5 rounded-lg text-slate-600">{product.product_code}</span>
                <h1 className="text-xl font-black text-slate-900">{product.product_name_ar}</h1>
              </div>
              <p className="text-xs text-slate-500 font-bold mt-1">المعامل: {product.pricing_value} × {product.pricing_type === 'multiplier' ? 'البورصة' : product.pricing_type}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <EntityActions entityType="product" entity={product} onRefresh={load} showArchive={false} />
            <div className="text-left">
              <span className="text-[10px] font-bold text-slate-400 block">المخزون الحالي</span>
              <span className={'text-2xl font-black font-mono ' + (Number(product.stock_kg) <= 0 ? 'text-rose-600' : Number(product.stock_kg) < 30 ? 'text-amber-600' : 'text-emerald-600')}>{Number(product.stock_kg).toFixed(1)} كجم</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200">
          <div className="flex items-center gap-2 text-slate-400 mb-2"><Package className="w-4 h-4" /><span className="text-xs font-bold">إجمالي الوارد</span></div>
          <p className="text-xl font-black font-mono text-slate-900">{totalReceived.toFixed(1)} كجم</p>
          <span className="text-[10px] font-bold text-slate-500">{lots.length} دفعة</span>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200">
          <div className="flex items-center gap-2 text-slate-400 mb-2"><TrendingUp className="w-4 h-4" /><span className="text-xs font-bold">إجمالي المبيع</span></div>
          <p className="text-xl font-black font-mono text-slate-900">{totalSold.toFixed(1)} كجم</p>
          <span className="text-[10px] font-bold text-slate-500">{sales.length} عملية</span>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200">
          <div className="flex items-center gap-2 text-slate-400 mb-2"><Wallet className="w-4 h-4" /><span className="text-xs font-bold">متوسط التكلفة</span></div>
          <p className="text-xl font-black font-mono text-slate-900">{avgCost.toFixed(2)} ج</p>
          <span className="text-[10px] font-bold text-slate-500">FIFO موزون</span>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200">
          <div className="flex items-center gap-2 text-slate-400 mb-2"><TrendingUp className="w-4 h-4" /><span className="text-xs font-bold">صافي الربح</span></div>
          <p className={'text-xl font-black font-mono ' + (totalRevenue - totalCogs >= 0 ? 'text-emerald-700' : 'text-rose-600')}>{(totalRevenue - totalCogs).toLocaleString()} ج</p>
          <span className="text-[10px] font-bold text-slate-500">إيراد {totalRevenue.toLocaleString()} - COGS {totalCogs.toLocaleString()}</span>
        </div>
      </div>

      <div className="bg-white p-5 rounded-3xl border border-slate-200">
        <div className="flex flex-wrap gap-6 border-b border-slate-200 text-xs font-black mb-4 pb-3">
          <button onClick={() => setActiveTab('lots')} className={'pb-2 ' + (activeTab === 'lots' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400')}>الدفعات ({lots.length})</button>
          <button onClick={() => setActiveTab('sales')} className={'pb-2 ' + (activeTab === 'sales' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400')}>المبيعات ({sales.length})</button>
          <button onClick={() => setActiveTab('adjustments')} className={'pb-2 ' + (activeTab === 'adjustments' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400')}>التسويات ({adjustments.length})</button>
        </div>

        {activeTab === 'lots' && (
          <DataTable
            data={lots}
            columns={lotColumns}
            filename={'دفعات_' + product.product_name_ar}
            searchPlaceholder="بحث..."
            emptyMessage="لا توجد دفعات"
            rowKey={(l: any) => l.id}
            storageKey={'product_lots_' + codeParam}
            dateKey="received_at"
            dateDefault="all"
          />
        )}

        {activeTab === 'sales' && (
          <DataTable
            data={sales}
            columns={salesColumns}
            filename={'مبيعات_' + product.product_name_ar}
            searchPlaceholder="بحث..."
            emptyMessage="لا توجد مبيعات"
            rowKey={(s: any) => s.id}
            storageKey={'product_sales_' + codeParam}
          />
        )}

        {activeTab === 'adjustments' && (
          <DataTable
            data={adjustments}
            columns={adjustmentColumns}
            filename={'تسويات_' + product.product_name_ar}
            searchPlaceholder="بحث..."
            emptyMessage="لا توجد تسويات"
            rowKey={(a: any) => a.id}
            storageKey={'product_adjustments_' + codeParam}
            dateKey="created_at"
            dateDefault="all"
          />
        )}
      </div>
    </div>
  );
}