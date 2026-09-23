'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getCurrentTenantId } from '@/lib/tenant-client';
import DataTable from '@/components/DataTable';
import { Package, Plus, X, Truck, ShoppingCart, Snowflake, Sun, RefreshCw } from 'lucide-react';
import ProductFormModal from '@/components/ProductFormModal';

const productToColumn: Record<string, string> = {
  'P-1001': 'actual_fillet',
  'P-1002': 'actual_thighs',
  'P-1003': 'actual_wings',
  'P-1004': 'actual_livers',
  'P-1005': 'actual_carcass',
  'P-1006': 'actual_shawarma_breast',
  'P-1007': 'actual_shawarma_whole',
  'P-1008': 'actual_whole_box'
};

export default function InventoryPage() {
  const supabase = createClient();
  const router = useRouter();
  const [toast, setToast] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [stock, setStock] = useState<any[]>([]);
  const [adjProduct, setAdjProduct] = useState('');
  const [adjQty, setAdjQty] = useState('');
  const [showDripModal, setShowDripModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [productBatches, setProductBatches] = useState<any[]>([]);
  const [productSales, setProductSales] = useState<any[]>([]);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(50);
  const [freshHoursLimit, setFreshHoursLimit] = useState<number>(48);

  const showToast = (msg: string, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  };

  const loadStock = async () => {
    setLoading(true);
    const { data: settingsData } = await supabase.from('system_settings').select('setting_key, setting_value').eq('tenant_id', getCurrentTenantId()).in('setting_key', ['alert_low_stock', 'alert_fresh_hours']);
    if (settingsData) {
      settingsData.forEach((s: any) => {
        if (s.setting_key === 'alert_low_stock') setLowStockThreshold(Number(s.setting_value || 50));
        if (s.setting_key === 'alert_fresh_hours') setFreshHoursLimit(Number(s.setting_value || 48));
      });
    }

    const { data } = await supabase.from('inventory').select('*').eq('tenant_id', getCurrentTenantId()).eq('is_active', true).order('product_code');
    if (data) {
      setStock(data);
      if (!adjProduct && data.length > 0) setAdjProduct(data[0].product_code);
    }
    setLoading(false);
  };

  useEffect(() => { loadStock(); }, []);

  const openProductAudit = async (prod: any) => {
    setSelectedProduct(prod);
    setProductBatches([]);
    setProductSales([]);

    const columnName = productToColumn[prod.product_code];

    if (columnName) {
      const { data: bData } = await supabase
        .from('yield_processing')
        .select('*, batches(*)')
        .eq('tenant_id', getCurrentTenantId())
        .gt(columnName, 0)
        .order('created_at', { ascending: false })
        .limit(8);
      if (bData) setProductBatches(bData);
    }

    const { data: sData } = await supabase
      .from('sales_items')
      .select('*, sales_invoices(*)')
      .eq('tenant_id', getCurrentTenantId())
      .eq('product_code', prod.product_code)
      .order('id', { ascending: false })
      .limit(8);
    if (sData) setProductSales(sData);
  };

  const handleDripLoss = async (e: any) => {
    e.preventDefault();
    if (!adjQty || Number(adjQty) <= 0) return;

    const { data: cogsResult, error: cogsErr } = await supabase.rpc('consume_fifo', {
      p_tenant_id: getCurrentTenantId(),
      p_product_code: adjProduct,
      p_qty: Number(adjQty)
    });

    if (cogsErr) {
      const item = stock.find(i => i.product_code === adjProduct);
      const avail = item ? Number(item.stock_kg || 0).toFixed(1) : '0';
      showToast(`الكمية المطلوبة (${adjQty} كجم) أكبر من المتاح (${avail} كجم)`, 'error');
      return;
    }

    const lossValue = Number(cogsResult || 0);

    await supabase.from('inventory_adjustments').insert([{
      tenant_id: getCurrentTenantId(),
      product_code: adjProduct,
      adjustment_type: 'drip_loss',
      qty_kg: Number(adjQty),
      value_lost: lossValue,
      reason: 'تسوية رطوبة وفقد وزن التبريد'
    }]);

    const item = stock.find(i => i.product_code === adjProduct);
    const cur = item ? Number(item.stock_kg || 0) : 0;
    await supabase.from('inventory').update({
      stock_kg: Math.max(0, cur - Number(adjQty)),
      last_updated: new Date()
    }).eq('tenant_id', getCurrentTenantId()).eq('product_code', adjProduct);

    setAdjQty('');
    setShowDripModal(false);
    loadStock();
    showToast(`تم إثبات تسوية الفاقد (قيمة الخسارة: ${lossValue.toFixed(2)} ج)`);
  };

  const getFreshnessBadge = (item: any) => {
    const lastUpdate = new Date(item.last_updated).getTime();
    const hoursPassed = (Date.now() - lastUpdate) / (1000 * 60 * 60);
    const bal = Number(item.stock_kg || 0);

    if (bal === 0) {
      const inventoryColumns = [
    {
      key: 'product_code',
      label: 'الكود',
      searchable: true,
      render: (i: any) => <span className="font-mono text-slate-600 font-bold">{i.product_code}</span>
    },
    {
      key: 'product_name_ar',
      exportValue: (i: any) => i.product_name_ar,
      label: 'الصنف',
      searchable: true,
      render: (i: any) => <span className="font-bold text-slate-800">{i.product_name_ar}</span>
    },
    {
      key: 'stock_kg',
      label: 'الرصيد (كجم)',
      render: (i: any) => {
        const bal = Number(i.stock_kg || 0);
        const isLow = bal < lowStockThreshold && bal > 0;
        const isEmpty = bal === 0;
        const cls = isEmpty ? 'text-slate-400' : isLow ? 'text-rose-600' : 'text-slate-900';
        return <span className={'font-bold font-mono ' + cls}>{bal.toFixed(1)}</span>;
      }
    },
    {
      key: 'freshness',
      label: 'الحالة',
      render: (i: any) => getFreshnessBadge(i)
    },
    {
      key: 'pricing_type',
      label: 'طريقة التسعير',
      defaultHidden: true,
      render: (i: any) => <span className="text-xs text-slate-600">{i.pricing_type}</span>
    },
    {
      key: 'pricing_value',
      label: 'المعامل',
      defaultHidden: true,
      render: (i: any) => <span className="font-mono">{i.pricing_value}</span>
    },
    {
      key: 'allocation_weight',
      label: 'معامل التوزيع',
      defaultHidden: true,
      render: (i: any) => <span className="font-mono">{i.allocation_weight || 1}</span>
    }
  ];

  return (
        <span className="inline-flex items-center gap-1 text-[10px] bg-slate-100 text-slate-600 border border-slate-300 px-2 py-1 rounded-lg font-bold flex-wrap">
          <X className="w-3 h-3" />
          <span>غير متوفر</span>
        </span>
      );
    }

    if (hoursPassed < freshHoursLimit / 2) {
      const inventoryColumns = [
    {
      key: 'product_code',
      label: 'الكود',
      searchable: true,
      render: (i: any) => <span className="font-mono text-slate-600 font-bold">{i.product_code}</span>
    },
    {
      key: 'product_name_ar',
      exportValue: (i: any) => i.product_name_ar,
      label: 'الصنف',
      searchable: true,
      render: (i: any) => <span className="font-bold text-slate-800">{i.product_name_ar}</span>
    },
    {
      key: 'stock_kg',
      label: 'الرصيد (كجم)',
      render: (i: any) => {
        const bal = Number(i.stock_kg || 0);
        const isLow = bal < lowStockThreshold && bal > 0;
        const isEmpty = bal === 0;
        const cls = isEmpty ? 'text-slate-400' : isLow ? 'text-rose-600' : 'text-slate-900';
        return <span className={'font-bold font-mono ' + cls}>{bal.toFixed(1)}</span>;
      }
    },
    {
      key: 'freshness',
      label: 'الحالة',
      render: (i: any) => getFreshnessBadge(i)
    },
    {
      key: 'pricing_type',
      label: 'طريقة التسعير',
      defaultHidden: true,
      render: (i: any) => <span className="text-xs text-slate-600">{i.pricing_type}</span>
    },
    {
      key: 'pricing_value',
      label: 'المعامل',
      defaultHidden: true,
      render: (i: any) => <span className="font-mono">{i.pricing_value}</span>
    },
    {
      key: 'allocation_weight',
      label: 'معامل التوزيع',
      defaultHidden: true,
      render: (i: any) => <span className="font-mono">{i.allocation_weight || 1}</span>
    }
  ];

  return (
        <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-300 px-2 py-1 rounded-lg font-bold flex-wrap">
          <Sun className="w-3 h-3" />
          <span>طازج</span>
        </span>
      );
    }

    if (hoursPassed < freshHoursLimit) {
      const inventoryColumns = [
    {
      key: 'product_code',
      label: 'الكود',
      searchable: true,
      render: (i: any) => <span className="font-mono text-slate-600 font-bold">{i.product_code}</span>
    },
    {
      key: 'product_name_ar',
      exportValue: (i: any) => i.product_name_ar,
      label: 'الصنف',
      searchable: true,
      render: (i: any) => <span className="font-bold text-slate-800">{i.product_name_ar}</span>
    },
    {
      key: 'stock_kg',
      label: 'الرصيد (كجم)',
      render: (i: any) => {
        const bal = Number(i.stock_kg || 0);
        const isLow = bal < lowStockThreshold && bal > 0;
        const isEmpty = bal === 0;
        const cls = isEmpty ? 'text-slate-400' : isLow ? 'text-rose-600' : 'text-slate-900';
        return <span className={'font-bold font-mono ' + cls}>{bal.toFixed(1)}</span>;
      }
    },
    {
      key: 'freshness',
      label: 'الحالة',
      render: (i: any) => getFreshnessBadge(i)
    },
    {
      key: 'pricing_type',
      label: 'طريقة التسعير',
      defaultHidden: true,
      render: (i: any) => <span className="text-xs text-slate-600">{i.pricing_type}</span>
    },
    {
      key: 'pricing_value',
      label: 'المعامل',
      defaultHidden: true,
      render: (i: any) => <span className="font-mono">{i.pricing_value}</span>
    },
    {
      key: 'allocation_weight',
      label: 'معامل التوزيع',
      defaultHidden: true,
      render: (i: any) => <span className="font-mono">{i.allocation_weight || 1}</span>
    }
  ];

  return (
        <span className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-700 border border-amber-300 px-2 py-1 rounded-lg font-bold flex-wrap">
          <Sun className="w-3 h-3" />
          <span>قارب على الانتهاء</span>
        </span>
      );
    }

    const inventoryColumns = [
    {
      key: 'product_code',
      label: 'الكود',
      searchable: true,
      render: (i: any) => <span className="font-mono text-slate-600 font-bold">{i.product_code}</span>
    },
    {
      key: 'product_name_ar',
      exportValue: (i: any) => i.product_name_ar,
      label: 'الصنف',
      searchable: true,
      render: (i: any) => <span className="font-bold text-slate-800">{i.product_name_ar}</span>
    },
    {
      key: 'stock_kg',
      label: 'الرصيد (كجم)',
      render: (i: any) => {
        const bal = Number(i.stock_kg || 0);
        const isLow = bal < lowStockThreshold && bal > 0;
        const isEmpty = bal === 0;
        const cls = isEmpty ? 'text-slate-400' : isLow ? 'text-rose-600' : 'text-slate-900';
        return <span className={'font-bold font-mono ' + cls}>{bal.toFixed(1)}</span>;
      }
    },
    {
      key: 'freshness',
      label: 'الحالة',
      render: (i: any) => getFreshnessBadge(i)
    },
    {
      key: 'pricing_type',
      label: 'طريقة التسعير',
      defaultHidden: true,
      render: (i: any) => <span className="text-xs text-slate-600">{i.pricing_type}</span>
    },
    {
      key: 'pricing_value',
      label: 'المعامل',
      defaultHidden: true,
      render: (i: any) => <span className="font-mono">{i.pricing_value}</span>
    },
    {
      key: 'allocation_weight',
      label: 'معامل التوزيع',
      defaultHidden: true,
      render: (i: any) => <span className="font-mono">{i.allocation_weight || 1}</span>
    }
  ];

  return (
      <span className="inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-700 border border-blue-300 px-2 py-1 rounded-lg font-bold flex-wrap">
        <Snowflake className="w-3 h-3" />
        <span>مجمد</span>
      </span>
    );
  };

  const inventoryColumns = [
    {
      key: 'product_code',
      label: 'الكود',
      searchable: true,
      render: (i: any) => <span className="font-mono text-slate-600 font-bold">{i.product_code}</span>
    },
    {
      key: 'product_name_ar',
      exportValue: (i: any) => i.product_name_ar,
      label: 'الصنف',
      searchable: true,
      render: (i: any) => <span className="font-bold text-slate-800">{i.product_name_ar}</span>
    },
    {
      key: 'stock_kg',
      label: 'الرصيد (كجم)',
      render: (i: any) => {
        const bal = Number(i.stock_kg || 0);
        const isLow = bal < lowStockThreshold && bal > 0;
        const isEmpty = bal === 0;
        const cls = isEmpty ? 'text-slate-400' : isLow ? 'text-rose-600' : 'text-slate-900';
        return <span className={'font-bold font-mono ' + cls}>{bal.toFixed(1)}</span>;
      }
    },
    {
      key: 'freshness',
      label: 'الحالة',
      render: (i: any) => getFreshnessBadge(i)
    },
    {
      key: 'pricing_type',
      label: 'طريقة التسعير',
      defaultHidden: true,
      render: (i: any) => <span className="text-xs text-slate-600">{i.pricing_type}</span>
    },
    {
      key: 'pricing_value',
      label: 'المعامل',
      defaultHidden: true,
      render: (i: any) => <span className="font-mono">{i.pricing_value}</span>
    },
    {
      key: 'allocation_weight',
      label: 'معامل التوزيع',
      defaultHidden: true,
      render: (i: any) => <span className="font-mono">{i.allocation_weight || 1}</span>
    }
  ];

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl border text-sm font-bold ${toast.type === 'success' ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-rose-600 text-white border-rose-400'}`}>{toast.msg}</div>
      )}

      {showDripModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-right">
            <div className="flex justify-between items-center border-b pb-3 flex-wrap gap-2 flex-wrap">
              <h3 className="text-base font-bold text-slate-800">إثبات تسوية فقد وزن التبريد</h3>
              <button onClick={() => setShowDripModal(false)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-[11px] text-slate-600 font-medium">يُسجَّل الفاقد اليومي الناتج عن تنقيط المياه أثناء التبريد.</p>
            <form onSubmit={handleDripLoss} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">الصنف المفحوص:</label>
                <select value={adjProduct} onChange={(e) => setAdjProduct(e.target.value)} className="w-full border-2 border-slate-200 rounded-xl px-3 text-sm font-bold bg-slate-50 h-11">
                  {stock.map(i => (
                    <option key={i.product_code} value={i.product_code}>{i.product_name_ar}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">الوزن المفقود (كجم):</label>
                <input type="number" step="0.1" value={adjQty} onChange={(e) => setAdjQty(e.target.value)} placeholder="0.0" className="w-full border-2 border-slate-200 rounded-xl px-4 text-sm font-bold bg-slate-50 h-11 font-mono" required />
              </div>
              <div className="flex gap-2 pt-2 flex-wrap">
                <button type="submit" className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-xl text-xs shadow">خصم الفاقد</button>
                <button type="button" onClick={() => setShowDripModal(false)} className="bg-slate-100 text-slate-700 font-bold px-5 rounded-xl text-xs">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedProduct(null)}>
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[85vh] overflow-hidden shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="bg-slate-50 p-5 border-b flex justify-between items-center flex-wrap gap-2 flex-wrap">
              <div>
                <h3 className="text-base font-bold text-slate-800">بطاقة تتبع الصنف: {selectedProduct.product_name_ar}</h3>
                <span className="text-xs text-slate-500 font-mono">{selectedProduct.product_code}</span>
              </div>
              <button onClick={() => setSelectedProduct(null)} className="text-slate-500 hover:text-slate-800"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 overflow-y-auto flex-1 space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border">
                  <span className="text-slate-500 block">الرصيد الحالي:</span>
                  <b className="text-base font-mono">{Number(selectedProduct.stock_kg).toFixed(1)} كجم</b>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border">
                  <span className="text-slate-500 block">طريقة التسعير:</span>
                  <b className="text-sm">{selectedProduct.pricing_type}</b>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border">
                  <span className="text-slate-500 block">المعامل:</span>
                  <b className="text-sm font-mono">{selectedProduct.pricing_value}</b>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border">
                  <span className="text-slate-500 block">آخر تحديث:</span>
                  <b className="text-sm font-mono">{new Date(selectedProduct.last_updated).toLocaleDateString('en-GB')}</b>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2 flex-wrap">
                  <Truck className="w-4 h-4" />
                  <span>دفعات الإنتاج التي ورد منها هذا الصنف</span>
                </h4>
                <div className="overflow-x-auto border rounded-xl max-h-44">
                  <table className="w-full text-right text-xs min-w-[600px]">
                    <thead className="bg-slate-800 text-white sticky top-0">
                      <tr><th className="p-2.5">كود الدفعة</th><th className="p-2.5">التاريخ</th><th className="p-2.5">المورد</th><th className="p-2.5">حالة الجودة</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono">
                      {productBatches.length === 0 && (<tr><td colSpan={4} className="p-4 text-center text-slate-400 font-sans">لا توجد دفعات إنتاج سابقة</td></tr>)}
                      {productBatches.map(b => (
                        <tr key={b.id} className="hover:bg-slate-50">
                          <td className="p-2 text-blue-700 font-bold">{b.batch_id}</td>
                          <td className="p-2 text-slate-500">{new Date(b.created_at).toLocaleDateString('en-GB')}</td>
                          <td className="p-2 font-sans font-bold">{b.batches?.supplier_name || 'مورد عام'}</td>
                          <td className="p-2 font-sans text-emerald-700 text-[11px]">{b.status_alert}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2 flex-wrap">
                  <ShoppingCart className="w-4 h-4" />
                  <span>حركات البيع الأخيرة</span>
                </h4>
                <div className="overflow-x-auto border rounded-xl max-h-44">
                  <table className="w-full text-right text-xs min-w-[600px]">
                    <thead className="bg-slate-800 text-white sticky top-0">
                      <tr><th className="p-2.5">الفاتورة</th><th className="p-2.5">العميل</th><th className="p-2.5">الكمية</th><th className="p-2.5">السعر</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono">
                      {productSales.length === 0 && (<tr><td colSpan={4} className="p-4 text-center text-slate-400 font-sans">لا توجد مبيعات سابقة</td></tr>)}
                      {productSales.map(s => (
                        <tr key={s.id} className="hover:bg-slate-50">
                          <td className="p-2 text-blue-700 font-bold">{s.sales_invoices?.invoice_code || s.invoice_id}</td>
                          <td className="p-2 font-sans font-bold">{s.sales_invoices?.customer_name || 'عميل تجزئة'}</td>
                          <td className="p-2 font-bold">{s.quantity_kg} كجم</td>
                          <td className="p-2">{s.unit_price} ج</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-3xl border border-slate-200 flex flex-wrap justify-between items-center gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-800">المخازن وأرصدة غرف التبريد</h1>
          <p className="text-sm text-slate-500 font-bold mt-1">انقر على أي صنف لعرض بطاقة تتبعه الكاملة</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={loadStock} disabled={loading} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs border flex items-center gap-2 flex-wrap">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>تحديث الأرصدة</span>
          </button>
          <button onClick={() => setShowProductModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow flex-wrap">
            <Plus className="w-4 h-4" />
            <span>صنف جديد</span>
          </button>
          <button onClick={() => setShowDripModal(true)} className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow flex-wrap">
            <Plus className="w-4 h-4" />
            <span>تسجيل هالك تبريد</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4">
        <h2 className="text-sm font-bold text-slate-800 border-b pb-3">أرصدة الأصناف المتوفرة</h2>
        <DataTable
          data={stock}
          columns={inventoryColumns}
          filename="المخزون"
          searchPlaceholder="بحث..."
          emptyMessage="لا توجد أصناف"
          rowKey={(i: any) => i.product_code}
          storageKey="inventory"
          rowHref={(i: any) => '/inventory/' + i.product_code}
        />
      </div>

      <ProductFormModal
        open={showProductModal}
        onClose={() => setShowProductModal(false)}
        onSuccess={() => { loadStock(); setShowProductModal(false); }}
      />
    </div>
  );
}
