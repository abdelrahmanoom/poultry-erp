'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCurrentTenantId } from '@/lib/tenant-client';
import { AlertTriangle } from 'lucide-react';
import DataTable from '@/components/DataTable';
import Autocomplete from '@/components/Autocomplete';
import { arError } from '@/lib/error-translator';

export default function SalesPage() {
  const supabase = createClient();
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [showLowPriceModal, setShowLowPriceModal] = useState(false);
  const [lowPriceItems, setLowPriceItems] = useState<any[]>([]);
  const [minMargin, setMinMargin] = useState(0);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [invoiceDetail, setInvoiceDetail] = useState<any>(null);
  const [invoiceDetailItems, setInvoiceDetailItems] = useState<any[]>([]);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; phone?: string }>({});
  const [phone, setPhone] = useState('');
  const [paymentType, setPaymentType] = useState('cash');
  const [paidAmount, setPaidAmount] = useState(0);
  const [marketPrice, setMarketPrice] = useState<number>(0);
  const [showPriceDeviationModal, setShowPriceDeviationModal] = useState(false);
  const [priceDeviations, setPriceDeviations] = useState<any[]>([]);

  const [items, setItems] = useState<any[]>([
    { id: 1, product_code: 'P-1001', name: 'بانيه فصوص', qty: 10, price: 238 }
  ]);

  const showToast = (msg: string, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    async function loadProducts() {
      const { data } = await supabase.from('inventory').select('product_code, product_name_ar, stock_kg, pricing_value, pricing_type').eq('tenant_id', getCurrentTenantId()).eq('is_active', true).order('product_code');
      if (data) setAvailableProducts(data);
    }
    loadProducts();

    async function loadCustomersList() {
      const { data } = await supabase.from('customers').select('id, name, phone').eq('tenant_id', getCurrentTenantId()).eq('is_active', true).order('name');
      if (data) setCustomersList(data);
    }
    loadCustomersList();

    async function loadMarginSetting() {
      const { data } = await supabase.from('system_settings').select('setting_value').eq('tenant_id', getCurrentTenantId()).eq('setting_key', 'min_profit_margin_percent').maybeSingle();
      if (data) setMinMargin(Number(data.setting_value || 0));
    }
    loadMarginSetting();

    async function loadMarketPrice() {
      const { data } = await supabase.from('market_prices').select('exchange_price').eq('tenant_id', getCurrentTenantId()).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (data) setMarketPrice(Number(data.exchange_price || 0));
    }
    loadMarketPrice();

    const sessionStr = localStorage.getItem('erp_user_session') || sessionStorage.getItem('erp_user_session');
    if (sessionStr) {
      try {
        const u = JSON.parse(sessionStr);
        setIsAdmin(u.role === 'admin');
      } catch(e) {}
    }

    async function loadRecentInvoices() {
      const { data } = await supabase
        .from('sales_invoices')
        .select('*')
        .eq('tenant_id', getCurrentTenantId())
        .order('created_at', { ascending: false })
        .limit(15);
      if (data) setRecentInvoices(data);
    }
    loadRecentInvoices();
  }, [supabase]);

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (Number(item.qty || 0) * Number(item.price || 0)), 0);
  };

  const addItem = () => {
    setItems([...items, { id: Date.now(), product_code: availableProducts[0]?.product_code || 'P-1001', name: availableProducts[0]?.product_name_ar || 'بانيه فصوص', qty: 5, price: 238 }]);
  };

  const removeItem = (id: number) => {
    if (items.length > 1) {
      setItems(items.filter(i => i.id !== id));
    }
  };

  const validateFields = (name: string, ph: string, wIn: boolean) => {
    const errs: { name?: string; phone?: string } = {};
    if (!wIn) {
      if (!name.trim()) errs.name = 'اسم العميل مطلوب';
      else if (name.trim().length < 2) errs.name = 'الاسم قصير جداً (حرفان على الأقل)';
      if (!ph.trim()) errs.phone = 'رقم الهاتف مطلوب';
      else if (!/^01[0125][0-9]{8}$/.test(ph.trim())) errs.phone = 'رقم غير صحيح — 11 خانة يبدأ بـ 010/011/012/015';
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };
  const updateItem = (id: number, field: string, val: any) => {
    setItems(prev => prev.map(i => {
      if (i.id !== id) return i;
      const updated = { ...i, [field]: val };
      if (field === 'product_code') {
        const exp = expectedPriceFor(val);
        if (exp && exp > 0) updated.price = Number(exp.toFixed(2));
      }
      return updated;
    }));
  };

  const handleCancelInvoice = async () => {
    if (!selectedInvoice || !cancelReason.trim()) {
      showToast('اكتب سبب الإلغاء', 'error');
      return;
    }
    const { error } = await supabase.rpc('cancel_invoice', {
      p_tenant_id: getCurrentTenantId(),
      p_invoice_id: selectedInvoice.id,
      p_reason: cancelReason.trim()
    });
    if (error) {
      showToast(arError(error), 'error');
      return;
    }
    showToast('تم إلغاء الفاتورة وعكس أثرها المحاسبي');
    setShowCancelModal(false);
    setSelectedInvoice(null);
    setCancelReason('');
    const { data } = await supabase.from('sales_invoices').select('*').eq('tenant_id', getCurrentTenantId()).order('created_at', { ascending: false }).limit(15);
    if (data) setRecentInvoices(data);
  };

  const checkLowPriceItems = async (): Promise<any[]> => {
    if (minMargin <= 0) return [];
    const violations: any[] = [];
    for (const item of items) {
      const { data: cost } = await supabase.rpc('peek_fifo_cost', {
        p_tenant_id: getCurrentTenantId(),
        p_product_code: item.product_code,
        p_qty: Number(item.qty)
      });
      const itemCost = Number(cost || 0);
      if (itemCost < 0) continue;
      const minAllowed = itemCost * (1 + minMargin / 100);
      if (Number(item.price) < minAllowed) {
        const prod = availableProducts.find(p => p.product_code === item.product_code);
        violations.push({
          product_code: item.product_code,
          product_name: prod?.product_name_ar || item.product_code,
          sell_price: Number(item.price),
          cost: itemCost,
          min_price: minAllowed,
          loss_per_kg: itemCost - Number(item.price)
        });
      }
    }
    return violations;
  };

  const DEVIATION_THRESHOLD = 20;

  const expectedPriceFor = (productCode: string): number | null => {
    if (!marketPrice || !productCode) return null;
    const prod = availableProducts.find(p => p.product_code === productCode);
    if (!prod || !prod.pricing_type) return null;
    if (prod.pricing_value === null || prod.pricing_value === undefined) return null;
    const val = Number(prod.pricing_value);
    if (prod.pricing_type === 'multiplier' || prod.pricing_type === 'per_kg') return marketPrice * val;
    if (prod.pricing_type === 'addition' || prod.pricing_type === 'fixed_add') return marketPrice + val;
    return null;
  };

  const deviationPct = (item: any): number => {
    const expected = expectedPriceFor(item.product_code);
    if (expected === null || expected === 0) return 0;
    const actual = Number(item.price || 0);
    return ((actual - expected) / expected) * 100;
  };

  const checkPriceDeviations = (): any[] => {
    const violations: any[] = [];
    for (const item of items) {
      if (!item.product_code) continue;
      const expected = expectedPriceFor(item.product_code);
      if (expected === null) continue;
      const pct = deviationPct(item);
      if (Math.abs(pct) > DEVIATION_THRESHOLD) {
        const prod = availableProducts.find(p => p.product_code === item.product_code);
        violations.push({
          product_code: item.product_code,
          product_name: prod?.product_name_ar || item.product_code,
          actual: Number(item.price || 0),
          expected: expected,
          pct: pct
        });
      }
    }
    return violations;
  };

  const handleSaveInvoice = async (bypassDeviation: boolean = false) => {
    if (!customerName.trim() || customerName.trim().length < 2) {
      showToast('اسم العميل مطلوب (حرفان على الأقل)', 'error');
      return;
    }
    if (!phone.trim()) {
      showToast('رقم الهاتف مطلوب', 'error');
      return;
    }
    if (!/^01[0125][0-9]{8}$/.test(phone.trim())) {
      showToast('رقم الهاتف غير صحيح — 11 خانة يبدأ بـ 010/011/012/015', 'error');
      return;
    }
    // ⚠️ تحقق من الكميات قبل الإرسال
    for (const item of items) {
      const qty = Number(item.qty || 0);
      if (qty <= 0) {
        const prod = availableProducts.find((p: any) => p.product_code === item.product_code);
        showToast('الكمية غير صحيحة للصنف: ' + (prod?.product_name_ar || item.product_code), 'error');
        return;
      }
      const prod = availableProducts.find((p: any) => p.product_code === item.product_code);
      const avail = prod ? Number(prod.stock_kg || 0) : 0;
      if (qty > avail) {
        showToast(
          'الكمية المطلوبة من "' + (prod?.product_name_ar || item.product_code) + 
          '" (' + qty + ' كجم) أكبر من المتاح (' + avail.toFixed(1) + ' كجم)',
          'error'
        );
        return;
      }
    }

    const deviations = checkPriceDeviations();
    if (!bypassDeviation && deviations.length > 0) {
      setPriceDeviations(deviations);
      setShowPriceDeviationModal(true);
      return;
    }
    const hasPriceDeviation = deviations.length > 0;

    const total = calculateTotal();
    const paid = paymentType === 'cash' ? total : Number(paidAmount);
    const remaining = Math.max(0, total - paid);

    let savedInvoiceId: number | null = null;

    try {
      if (remaining > 0 && customerName) {
        const { data: custCheck } = await supabase.from('customers').select('balance, credit_limit').eq('tenant_id', getCurrentTenantId()).eq('name', customerName).maybeSingle();
        const { data: creditSetting } = await supabase.from('system_settings').select('setting_value').eq('tenant_id', getCurrentTenantId()).eq('setting_key', 'alert_credit_limit').maybeSingle();
        const defaultLimit = Number(creditSetting?.setting_value || 50000);
        const currentDebt = custCheck ? Number(custCheck.balance || 0) : 0;
        const creditLimit = custCheck ? Number(custCheck.credit_limit || defaultLimit) : defaultLimit;

        if (currentDebt + remaining > creditLimit) {
          const available = creditLimit - currentDebt;
          showToast(`تجاوز حد الائتمان. المتاح: ${available.toLocaleString()} ج من أصل ${creditLimit.toLocaleString()} ج`, 'error');
          return;
        }
      }

      const { data: inv, error: invErr } = await supabase.from('sales_invoices').insert([{
        tenant_id: getCurrentTenantId(),
        customer_name: customerName || 'عميل تجزئة مباشر',
        total_amount: total,
        paid_amount: paid,
        remaining_amount: remaining,
        payment_status: remaining === 0 ? 'paid' : (paid > 0 ? 'partial' : 'credit'),
        has_price_deviation: hasPriceDeviation
      }]).select().single();

      if (invErr) throw invErr;
      savedInvoiceId = inv.id;

      let totalCogs = 0;

      for (const item of items) {
        const { data: cogsResult, error: cogsErr } = await supabase.rpc('consume_fifo', {
          p_tenant_id: getCurrentTenantId(),
          p_product_code: item.product_code,
          p_qty: Number(item.qty)
        });

        if (cogsErr) {
          const prodName = availableProducts.find(p => p.product_code === item.product_code)?.product_name_ar || item.product_code;
          const prod = availableProducts.find(p => p.product_code === item.product_code);
          const avail = prod ? Number(prod.stock_kg || 0).toFixed(1) : '0';
          throw new Error(`الكمية المطلوبة من "${prodName}" (${item.qty} كجم) أكبر من المتاح (${avail} كجم)`);
        }

        const lineCogs = Number(cogsResult || 0);
        const unitCost = Number(item.qty) > 0 ? (lineCogs / Number(item.qty)) : 0;
        totalCogs += lineCogs;

        await supabase.from('sales_items').insert([{
          tenant_id: getCurrentTenantId(),
          invoice_id: inv.id,
          product_code: item.product_code,
          quantity_kg: Number(item.qty),
          unit_price: Number(item.price),
          subtotal: Number(item.qty) * Number(item.price),
          unit_cost: Number(unitCost.toFixed(2)),
          price_deviation_percent: Number(deviationPct(item).toFixed(2))
        }]);

        const { data: stockData } = await supabase.from('inventory').select('stock_kg').eq('tenant_id', getCurrentTenantId()).eq('product_code', item.product_code).maybeSingle();
        if (stockData) {
          await supabase.from('inventory').update({
            stock_kg: Number(stockData.stock_kg || 0) - Number(item.qty),
            last_updated: new Date()
          }).eq('tenant_id', getCurrentTenantId()).eq('product_code', item.product_code);
        }
      }

      await supabase.from('sales_invoices').update({ cogs: Number(totalCogs.toFixed(2)) }).eq('tenant_id', getCurrentTenantId()).eq('id', inv.id);

      if (paid > 0) {
        await supabase.from('financial_vouchers').insert([{
          tenant_id: getCurrentTenantId(),
          type: 'receipt',
          entity_name: customerName || 'عميل تجزئة مباشر',
          amount: paid,
          payment_method: 'cash',
          notes: 'إثبات تحصيل نقدية لمبيعات رقم ' + inv.id
        }]);
      }

      if (customerName && customerName.trim() && customerName !== 'عميل تجزئة مباشر') {
        const { data: cust } = await supabase.from('customers').select('*').eq('tenant_id', getCurrentTenantId()).eq('name', customerName.trim()).maybeSingle();
        let linkedCustomerId: number | null = null;
        if (cust) {
          linkedCustomerId = cust.id;
          if (remaining > 0) {
            await supabase.from('customers').update({ balance: Number(cust.balance || 0) + remaining }).eq('tenant_id', getCurrentTenantId()).eq('id', cust.id);
          }
        } else {
          const { data: newCust } = await supabase.from('customers').insert([{ tenant_id: getCurrentTenantId(), name: customerName.trim(), phone: phone || null, balance: remaining > 0 ? remaining : 0 }]).select().single();
          if (newCust) linkedCustomerId = newCust.id;
        }
        if (linkedCustomerId) {
          await supabase.from('sales_invoices').update({ customer_id: linkedCustomerId }).eq('tenant_id', getCurrentTenantId()).eq('id', inv.id);
        }
      }

      showToast('تم اعتماد الفاتورة وترحيل المخزون بنجاح');
      const { data: updated } = await supabase.from('sales_invoices').select('*').eq('tenant_id', getCurrentTenantId()).order('created_at', { ascending: false }).limit(15);
      if (updated) setRecentInvoices(updated);
      const { data: freshProds } = await supabase.from('inventory')
        .select('product_code, product_name_ar, stock_kg, pricing_value, pricing_type')
        .eq('tenant_id', getCurrentTenantId())
        .eq('is_active', true).order('product_code');
      if (freshProds) setAvailableProducts(freshProds);
      setCustomerName('');
      setPhone('');
      setPaidAmount(0);
      setPaymentType('cash');
      setItems([{ id: Date.now(), product_code: '', qty: 0, price: 0 }]);
    } catch (err: any) {
      if (savedInvoiceId) {
        await supabase.from('sales_items').delete().eq('tenant_id', getCurrentTenantId()).eq('invoice_id', savedInvoiceId);
        await supabase.from('sales_invoices').delete().eq('tenant_id', getCurrentTenantId()).eq('id', savedInvoiceId);
      }
      showToast(arError(err), 'error');
    }
  };

  const grandTotal = calculateTotal();
  const remainingCredit = Math.max(0, grandTotal - (paymentType === 'cash' ? grandTotal : Number(paidAmount)));

  const openInvoiceDetails = async (inv: any) => {
    if (!inv || inv.status === 'cancelled') return;
    setInvoiceDetail(inv);
    setInvoiceDetailItems([]);
    const { data } = await supabase.from('sales_items').select('*').eq('tenant_id', getCurrentTenantId()).eq('invoice_id', inv.id);
    if (data) setInvoiceDetailItems(data);
  };
  const invoiceColumns = [
    {
      key: 'invoice_code',
      exportValue: (inv: any) => inv.invoice_code || ('INV-' + inv.id),
      label: 'رقم الفاتورة',
      searchable: true,
      render: (inv: any) => <span className="font-bold text-blue-700 font-mono inline-flex items-center gap-1 flex-wrap">{inv.has_price_deviation && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}{inv.invoice_code || ('INV-' + inv.id)}</span>
    },
    {
      key: 'created_at',
      label: 'التاريخ',
      render: (inv: any) => <span className="text-slate-500 font-mono">{new Date(inv.created_at).toLocaleDateString('en-GB')}</span>
    },
    {
      key: 'customer_name',
      label: 'العميل',
      searchable: true,
      render: (inv: any) => <span className="font-bold">{inv.customer_name}</span>
    },
    {
      key: 'total_amount',
      exportValue: (inv: any) => Number(inv.total_amount || 0),
      label: 'الإجمالي (ج)',
      render: (inv: any) => <span className="font-mono">{Number(inv.total_amount).toLocaleString()}</span>
    },
    {
      key: 'cogs',
      exportValue: (inv: any) => Number(inv.cogs || 0),
      label: 'تكلفة المبيعات (ج)',
      defaultHidden: true,
      render: (inv: any) => <span className="font-mono text-slate-600">{Number(inv.cogs || 0).toLocaleString()}</span>
    },
    {
      key: 'profit',
      exportValue: (inv: any) => Number(inv.total_amount || 0) - Number(inv.cogs || 0),
      label: 'الربح (ج)',
      defaultHidden: true,
      render: (inv: any) => {
        const p = Number(inv.total_amount || 0) - Number(inv.cogs || 0);
        return <span className={'font-mono font-bold ' + (p >= 0 ? 'text-emerald-700' : 'text-rose-700')}>{p.toLocaleString()}</span>;
      }
    },
    {
      key: 'status',
      label: 'الحالة',
      render: (inv: any) => inv.status === 'cancelled' ? (
        <span className="text-[11px] bg-rose-100 text-rose-700 border border-rose-300 px-2 py-0.5 rounded-lg font-bold">ملغاة</span>
      ) : (
        <span className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-300 px-2 py-0.5 rounded-lg font-bold">نشطة</span>
      )
    }
  ];
  return (
    <>
    {showLowPriceModal && lowPriceItems.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 text-right max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 border-b pb-3 text-rose-700 flex-wrap">
              <AlertTriangle className="w-8 h-8" />
              <div>
                <h3 className="text-base font-bold">تحذير: البيع بأقل من التكلفة</h3>
                <p className="text-xs text-slate-600 mt-0.5">الهامش الأدنى المطلوب: {minMargin}%</p>
              </div>
            </div>

            <div className="overflow-x-auto border rounded-2xl">
              <table className="w-full text-right text-xs min-w-[600px]">
                <thead className="bg-slate-800 text-white">
                  <tr>
                    <th className="p-2">الصنف</th>
                    <th className="p-2 text-center">سعر البيع</th>
                    <th className="p-2 text-center">التكلفة</th>
                    <th className="p-2 text-center">الحد الأدنى</th>
                    <th className="p-2 text-center">الخسارة/كجم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono">
                  {lowPriceItems.map((v: any, i: number) => (
                    <tr key={i} className="bg-rose-50">
                      <td className="p-2 font-sans font-bold">{v.product_name}</td>
                      <td className="p-2 text-center text-rose-700 font-bold">{v.sell_price.toFixed(1)}</td>
                      <td className="p-2 text-center">{v.cost.toFixed(2)}</td>
                      <td className="p-2 text-center font-bold">{v.min_price.toFixed(2)}</td>
                      <td className="p-2 text-center text-rose-700 font-bold">{v.loss_per_kg.toFixed(2)} ج</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl text-xs font-bold text-amber-900">
              هذه الفاتورة ستحقق خسارة. هل أنت متأكد من المتابعة؟
            </div>

            <div className="flex gap-2 flex-wrap">
              <button onClick={() => handleSaveInvoice(true)} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-xl text-xs">أوافق على البيع بأقل من التكلفة</button>
              <button onClick={() => { setShowLowPriceModal(false); setLowPriceItems([]); }} className="bg-slate-100 text-slate-700 font-bold px-5 rounded-xl text-xs">إلغاء</button>
            </div>
          </div>
        </div>
      )}

            {showPriceDeviationModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowPriceDeviationModal(false)}>
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="bg-amber-50 p-5 border-b-2 border-amber-200 rounded-t-3xl">
              <h3 className="text-base font-bold text-amber-900">تنبيه: أسعار شاذة عن السعر المتوقع</h3>
              <p className="text-xs text-slate-600 mt-1">الأسعار التالية تختلف عن سعر السوق بأكثر من 20%</p>
            </div>
            <div className="p-5 max-h-[60vh] overflow-y-auto">
              <table className="w-full text-right text-xs min-w-[600px]">
                <thead className="bg-slate-800 text-white">
                  <tr>
                    <th className="p-2">الصنف</th>
                    <th className="p-2">السعر المُدخل</th>
                    <th className="p-2">المتوقع</th>
                    <th className="p-2">الانحراف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {priceDeviations.map((d, i) => (
                    <tr key={i}>
                      <td className="p-2 font-bold">{d.product_name}</td>
                      <td className="p-2 font-mono">{d.actual.toFixed(2)} ج</td>
                      <td className="p-2 font-mono text-slate-500">{d.expected.toFixed(2)} ج</td>
                      <td className={'p-2 font-mono font-bold ' + (d.pct > 0 ? 'text-rose-700' : 'text-emerald-700')}>{d.pct > 0 ? '+' : ''}{d.pct.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-xl p-3 mt-4 font-bold">
                هل تريد المتابعة رغم الانحراف؟ سيتم تسجيل النسبة في التقرير.
              </p>
            </div>
            <div className="p-5 border-t flex gap-2 flex-wrap">
              <button onClick={() => { setShowPriceDeviationModal(false); handleSaveInvoice(true); }} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-xl text-xs">متابعة على أي حال</button>
              <button onClick={() => { setShowPriceDeviationModal(false); setPriceDeviations([]); }} className="bg-slate-100 text-slate-700 font-bold px-5 rounded-xl text-xs">رجوع للتعديل</button>
            </div>
          </div>
        </div>
      )}
      <div className="space-y-6">
      {toast && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-2xl border text-sm font-bold transition-all ${toast.type === 'success' ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-rose-600 text-white border-rose-400'}`}>
          {toast.msg}
        </div>
      )}

      <div className="bg-white p-6 rounded-3xl border border-slate-200">
        <h1 className="text-xl font-black text-slate-900">إصدار فواتير المبيعات</h1>
        <p className="text-sm text-slate-500 font-bold mt-1">تسجيل أوامر البيع النقدية والتسهيلات الآجلة والطباعة الفورية</p>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">اسم العميل أو الجهة:</label>
            <div className="space-y-2">
              <Autocomplete
                value={customerName}
                onChange={setCustomerName}
                suggestions={customersList.map((c: any) => ({ id: c.id, label: c.name, sublabel: c.phone }))}
                placeholder="اسم العميل"
                className="w-full border rounded-xl px-3 text-xs font-bold bg-white h-11"
              />
              <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 cursor-pointer select-none flex-wrap">
                عميل نقدي بدون تسجيل
              </label>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">رقم الهاتف:</label>
            <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="رقم الاتصال" className="w-full border rounded-xl px-3 text-xs font-bold bg-white h-11" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">طريقة التسوية:</label>
            <select value={paymentType} onChange={(e) => setPaymentType(e.target.value)} className="w-full border rounded-xl px-2 text-xs font-bold bg-white h-11">
              <option value="cash">سداد نقدي فوري</option>
              <option value="credit">تسهيل آجل بالكامل</option>
              <option value="partial">سداد جزئي مع آجل متبقي</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">المبلغ المحصل نقدا (ج):</label>
            <input type="number" value={paymentType === 'cash' ? grandTotal : paidAmount} onChange={(e) => setPaidAmount(Number(e.target.value))} disabled={paymentType === 'cash'} className="w-full border rounded-xl px-3 text-xs font-bold bg-white h-11 font-mono" />
          </div>
        </div>

        <div className="overflow-x-auto space-y-3">
          <table className="w-full text-right text-xs min-w-[600px]">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th className="p-3 rounded-r-xl">الصنف</th>
                <th className="p-3 text-center">المتاح</th>
                <th className="p-3">الوزن (كجم)</th>
                <th className="p-3">سعر الكيلو (ج)</th>
                <th className="p-3">الإجمالي</th>
                <th className="p-3 text-center rounded-l-xl">حذف البند</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="p-2.5">
                    <select value={item.product_code} onChange={(e) => updateItem(item.id, 'product_code', e.target.value)} className="w-full border rounded-lg px-2 text-xs font-bold bg-white h-10">
                      {availableProducts.map(p => (
                        <option key={p.product_code} value={p.product_code}>{p.product_name_ar}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2.5 text-center">
                    {(() => {
                      const prod = availableProducts.find(p => p.product_code === item.product_code);
                      const stock = prod ? Number(prod.stock_kg || 0) : 0;
                      const insufficient = Number(item.qty) > stock;
                      return (
                        <span className={`text-sm font-mono font-bold ${insufficient ? 'text-rose-600' : 'text-emerald-700'}`}>
                          {stock.toFixed(1)} كجم
                        </span>
                      );
                    })()}
                  </td>
                  <td className="p-2.5">
                    <input type="number" step="0.1" value={item.qty} onChange={(e) => updateItem(item.id, 'qty', e.target.value)} className="w-24 border rounded-lg px-2 text-xs font-bold font-mono h-10" />
                  </td>
                  <td className="p-2.5">
                    <div className="flex items-center gap-1 flex-wrap"><input type="number" step="0.5" value={item.price} onChange={(e) => updateItem(item.id, 'price', e.target.value)} className={`w-24 border rounded-lg px-2 text-xs font-bold font-mono h-10 ${Math.abs(deviationPct(item)) > 20 ? 'border-2 border-amber-500 bg-amber-50' : ''}`} />{Math.abs(deviationPct(item)) > 20 && <span className="text-[10px] font-bold text-amber-700">{deviationPct(item) > 0 ? '+' : ''}{deviationPct(item).toFixed(0)}%</span>}</div>
                  </td>
                  <td className="p-2.5 font-mono font-bold text-emerald-700">
                    {(Number(item.qty || 0) * Number(item.price || 0)).toFixed(1)} ج
                  </td>
                  <td className="p-2.5 text-center">
                    <button type="button" onClick={() => removeItem(item.id)} className="text-rose-600 hover:bg-rose-50 font-bold px-3 py-1.5 rounded-lg text-[11px]">حذف</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" onClick={addItem} className="w-full py-2.5 bg-blue-50 text-blue-700 font-bold rounded-xl border border-dashed border-blue-200 text-xs">
            إضافة بند جديد للفاتورة
          </button>
        </div>

        <div className="flex flex-wrap justify-between items-center bg-slate-50 p-5 rounded-2xl border border-slate-200 gap-3 flex-wrap">
          <div className="flex gap-6 flex-wrap">
            <div>
              <span className="text-xs font-bold text-slate-500">القيمة الإجمالية:</span>
              <p className="text-2xl font-black text-slate-900 font-mono">{grandTotal.toLocaleString()} ج</p>
            </div>
            <div>
              <span className="text-xs font-bold text-slate-500">الرصيد الآجل المرحل:</span>
              <p className="text-2xl font-black text-rose-600 font-mono">{remainingCredit.toLocaleString()} ج</p>
            </div>
          </div>
          <button type="button" onClick={() => handleSaveInvoice()} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-8 py-3.5 rounded-2xl text-xs shadow-lg transition">
            اعتماد الفاتورة وإصدار الإيصال
          </button>
        </div>
      </div>
    </div>
      <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4 mt-6">
        <div className="flex justify-between items-center border-b pb-3 flex-wrap gap-2 flex-wrap">
          <h2 className="text-sm font-bold text-slate-800">أحدث الفواتير المعتمدة</h2>
          <span className="text-xs text-slate-500">آخر 15 فاتورة</span>
        </div>
        <DataTable
          data={recentInvoices}
          columns={invoiceColumns}
          onRowClick={openInvoiceDetails}
          filename="فواتير_المبيعات"
          searchPlaceholder="بحث..."
          emptyMessage="لا توجد فواتير بعد"
          rowKey={(inv: any) => inv.id}
          storageKey="sales_invoices"
          dateKey="created_at"
          rowClassName={(inv: any) => inv.status === 'cancelled' ? 'bg-rose-50 opacity-70' : ''}
          rowActions={isAdmin ? (inv: any) => (
            inv.status !== 'cancelled' ? (
              <button
                onClick={(e: any) => { e.stopPropagation(); setSelectedInvoice(inv); setShowCancelModal(true); }}
                className="text-rose-600 hover:bg-rose-50 font-bold px-3 py-1.5 rounded-lg text-[11px]">
                إلغاء
              </button>
            ) : <span className="text-slate-400">—</span>
          ) : null}
        />
      </div>

      {invoiceDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setInvoiceDetail(null)}>
          <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            <div className="bg-blue-50 p-5 border-b-2 border-blue-200 flex justify-between items-center rounded-t-3xl shrink-0 flex-wrap gap-2 flex-wrap">
              <div>
                <h3 className="text-base font-bold text-blue-900 flex items-center gap-2 flex-wrap">
                  {invoiceDetail.has_price_deviation && <AlertTriangle className="w-5 h-5 text-amber-500" />}
                  فاتورة {invoiceDetail.invoice_code || ('INV-' + invoiceDetail.id)}
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  {invoiceDetail.customer_name} • {new Date(invoiceDetail.created_at).toLocaleString('en-GB')}
                </p>
              </div>
              <button onClick={() => setInvoiceDetail(null)} className="text-slate-500 hover:text-slate-800 font-bold text-sm">إغلاق</button>
            </div>
            <div className="overflow-y-auto p-5 space-y-4">
              {invoiceDetail.has_price_deviation && (
                <div className="bg-gradient-to-l from-amber-50 to-amber-100 border-2 border-amber-300 rounded-2xl p-4 flex items-start gap-3 flex-wrap">
                  <div className="bg-amber-500 p-2 rounded-xl shrink-0">
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-black text-amber-900 text-sm">بيع شاذ — أسعار غير طبيعية</h4>
                    <p className="text-xs text-amber-800 font-bold mt-1 leading-relaxed">
                      هذه الفاتورة تحتوي على أصناف بسعر انحرف بأكثر من 20% عن التسعير المتوقع.
                    </p>
                  </div>
                </div>
              )}
              <table className="w-full text-right text-xs min-w-[600px]">
                <thead className="bg-slate-800 text-white">
                  <tr>
                    <th className="p-2">الصنف</th>
                    <th className="p-2">الكمية</th>
                    <th className="p-2">سعر البيع</th>
                    <th className="p-2">المتوقع</th>
                    <th className="p-2">الانحراف</th>
                    <th className="p-2">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {invoiceDetailItems.map((it: any, i: number) => {
                    const pct = Number(it.price_deviation_percent || 0);
                    const actual = Number(it.unit_price || 0);
                    const expected = pct !== -100 ? actual / (1 + pct / 100) : 0;
                    const hasDev = pct !== 0;
                    return (
                      <tr key={i} className={hasDev ? 'bg-amber-50' : ''}>
                        <td className="p-2 font-bold font-mono">{it.product_code}</td>
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
              <div className="bg-slate-50 rounded-2xl p-4 grid grid-cols-2 gap-3 text-xs">
                <div><span className="text-slate-500">إجمالي الفاتورة: </span><span className="font-mono font-bold">{Number(invoiceDetail.total_amount).toLocaleString()} ج</span></div>
                <div><span className="text-slate-500">المدفوع: </span><span className="font-mono font-bold text-emerald-700">{Number(invoiceDetail.paid_amount || 0).toLocaleString()} ج</span></div>
                <div><span className="text-slate-500">المتبقي: </span><span className="font-mono font-bold text-rose-700">{Number(invoiceDetail.remaining_amount || 0).toLocaleString()} ج</span></div>
                <div><span className="text-slate-500">تكلفة المبيعات: </span><span className="font-mono font-bold text-slate-700">{Number(invoiceDetail.cogs || 0).toLocaleString()} ج</span></div>
                <div className="col-span-2 border-t pt-2"><span className="text-slate-500">صافي الربح: </span><span className="font-mono font-black text-emerald-800">{(Number(invoiceDetail.total_amount || 0) - Number(invoiceDetail.cogs || 0)).toLocaleString()} ج</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
      {showCancelModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-right">
            <div className="flex items-center gap-2 text-rose-700 border-b pb-3 flex-wrap">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold">إلغاء الفاتورة {selectedInvoice.invoice_code || ('INV-' + selectedInvoice.id)}</h3>
            </div>
            <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl text-xs font-bold text-rose-900 space-y-1">
              <p>سيتم عكس الأثر المحاسبي كاملاً:</p>
              <p>• إرجاع المخزون</p>
              <p>• عكس تحصيل النقدية ({Number(selectedInvoice.paid_amount).toLocaleString()} ج)</p>
              <p>• تخفيض مديونية العميل ({Number(selectedInvoice.remaining_amount).toLocaleString()} ج)</p>
              <p className="pt-2 text-rose-800">لا يمكن التراجع عن هذا الإجراء.</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">سبب الإلغاء:</label>
              <input type="text" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="سبب التسوية" className="w-full border-2 border-slate-200 rounded-xl px-3 bg-slate-50 h-11 text-sm" />
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={handleCancelInvoice} disabled={!cancelReason.trim()} className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-bold py-2.5 rounded-xl text-xs">تأكيد الإلغاء</button>
              <button onClick={() => { setShowCancelModal(false); setSelectedInvoice(null); setCancelReason(''); }} className="bg-slate-100 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs">تراجع</button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
