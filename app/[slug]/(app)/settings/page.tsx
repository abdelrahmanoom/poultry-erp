'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getCurrentTenantId } from '@/lib/tenant-client';
import { Plus, Trash2, BookOpen, Wallet, X, ChevronDown, ChevronLeft, Package, AlertTriangle, RefreshCw, Eye, EyeOff, Truck, Pencil, Building2, UserCheck, Users, Boxes, Bell, BellOff, Lock, Mail, MapPin, FileText, Calendar, Save, CheckCircle, Download, Link2 as LinkIcon } from 'lucide-react';

export default function SettingsPage() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('business');
  const [urlInitialized, setUrlInitialized] = useState(false);
  const [activeGroup, setActiveGroup] = useState('basic');
  // قراءة URL عند التحميل
  useEffect(() => {
    const urlTab = searchParams.get('tab');
    const urlGroup = searchParams.get('group');
    if (urlTab) setActiveTab(urlTab);
    if (urlGroup) setActiveGroup(urlGroup);
    setUrlInitialized(true);
  }, [searchParams]);

  // تحديث URL عند تغيير التبويب
  useEffect(() => {
    if (!urlInitialized || typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('tab', activeTab);
    url.searchParams.set('group', activeGroup);
    window.history.replaceState({}, '', url.toString());
  }, [activeTab, activeGroup, urlInitialized]);

  const [openingSubTab, setOpeningSubTab] = useState('treasuries');
  const [toast, setToast] = useState<any>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [openingLocked, setOpeningLocked] = useState(false);
  const [showLockConfirm, setShowLockConfirm] = useState(false);
  const [savedSubTabs, setSavedSubTabs] = useState<{ treasuries: boolean; customers: boolean; suppliers: boolean; inventory: boolean }>({ treasuries: false, customers: false, suppliers: false, inventory: false });

  const [products, setProducts] = useState<any[]>([]);
  const [pathways, setPathways] = useState<any[]>([]);
  const [pathwayProducts, setPathwayProducts] = useState<any[]>([]);
  const [treasuries, setTreasuries] = useState<any[]>([]);
  const [treasuryBalances, setTreasuryBalances] = useState<any>({});
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [suppliersList, setSuppliersList] = useState<any[]>([]);
  const [expandedPathway, setExpandedPathway] = useState<string | null>(null);
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);

  const [deleteModal, setDeleteModal] = useState<any>(null);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editingTreasury, setEditingTreasury] = useState<any>(null);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [editingPathway, setEditingPathway] = useState<any>(null);

  const [pName, setPName] = useState('');
  const [pType, setPType] = useState('multiplier');
  const [pValue, setPValue] = useState('2.8');

  const [newPathwayName, setNewPathwayName] = useState('');
  const [showNewPathwayForm, setShowNewPathwayForm] = useState(false);
  const [addingToPathway, setAddingToPathway] = useState<string | null>(null);
  const [selectedProductToAdd, setSelectedProductToAdd] = useState('');
  const [ratioToAdd, setRatioToAdd] = useState('25');

  const [newTreasuryName, setNewTreasuryName] = useState('');
  const [newTreasuryType, setNewTreasuryType] = useState('نقدية سائلة');
  const [showNewTreasuryForm, setShowNewTreasuryForm] = useState(false);

  const [transCost, setTransCost] = useState('3500');
  const [labCost, setLabCost] = useState('700');
  const [brokCost, setBrokCost] = useState('500');

  const [alertFreshOn, setAlertFreshOn] = useState(true);
  const [alertFresh, setAlertFresh] = useState('48');
  const [alertStockOn, setAlertStockOn] = useState(true);
  const [alertStock, setAlertStock] = useState('50');
  const [alertVarianceOn, setAlertVarianceOn] = useState(true);
  const [alertVariance, setAlertVariance] = useState('8.0');
  const [alertCreditOn, setAlertCreditOn] = useState(true);
  const [alertCredit, setAlertCredit] = useState('50000');
  const [alertDebtDaysOn, setAlertDebtDaysOn] = useState(true);
  const [alertDebtDays, setAlertDebtDays] = useState('15');
  const [alertMinTreasuryOn, setAlertMinTreasuryOn] = useState(false);
  const [alertMinTreasury, setAlertMinTreasury] = useState('5000');
  const [alertCreditWarningOn, setAlertCreditWarningOn] = useState(true);
  const [alertCreditWarning, setAlertCreditWarning] = useState('80');
  const [minProfitMargin, setMinProfitMargin] = useState('0');

  const [openTreasuries, setOpenTreasuries] = useState<any[]>([]);
  const [openCustomers, setOpenCustomers] = useState<any[]>([{ name: '', phone: '', balance: 0 }]);
  const [openSuppliers, setOpenSuppliers] = useState<any[]>([{ name: '', phone: '', balance: 0 }]);
  const [openStock, setOpenStock] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [businessData, setBusinessData] = useState<any>(null);
  const [slugCheckStatus, setSlugCheckStatus] = useState<string>('idle');
  const [slugCheckMessage, setSlugCheckMessage] = useState('');
  const [businessSaving, setBusinessSaving] = useState(false);
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserFullName, setNewUserFullName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('cashier');
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editingUserPassword, setEditingUserPassword] = useState('');
  const [changingPasswordUser, setChangingPasswordUser] = useState<any>(null);
  const [newPasswordForUser, setNewPasswordForUser] = useState('');

  const showToast = (msg: string, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  };

  const loadData = async () => {
    const { data: prods } = await supabase.from('inventory').select('*').eq('tenant_id', getCurrentTenantId()).order('is_active', { ascending: false }).order('product_code');
    if (prods) {
      setProducts(prods);
      const active = prods.filter((p: any) => p.is_active !== false);
      setOpenStock(active.map((p: any) => {
        const ex = openStock.find((s: any) => s.code === p.product_code);
        return ex ? { ...ex, name: p.product_name_ar } : { code: p.product_code, name: p.product_name_ar, weight: 0, cost: 0 };
      }));
    }

    const { data: paths } = await supabase.from('slaughter_pathways').select('*').eq('tenant_id', getCurrentTenantId()).order('pathway_code');
    if (paths) setPathways(paths);

    const { data: pp } = await supabase.from('pathway_products').select('*').eq('tenant_id', getCurrentTenantId());
    if (pp) setPathwayProducts(pp);

    const { data: treas } = await supabase.from('treasury_accounts').select('*').eq('tenant_id', getCurrentTenantId()).order('is_active', { ascending: false }).order('treasury_code');
    if (treas) {
      setTreasuries(treas);
      const active = treas.filter((t: any) => t.is_active !== false);
      setOpenTreasuries(active.map((t: any) => {
        const ex = openTreasuries.find((ot: any) => ot.code === t.treasury_code);
        return ex ? { ...ex, name: t.name_ar, type: t.account_type } : { code: t.treasury_code, name: t.name_ar, type: t.account_type, balance: 0 };
      }));
    }

    const { data: treasuryBals } = await supabase.rpc('get_treasury_balances');
    if (treasuryBals) {
      const bals: any = {};
      treasuryBals.forEach((t: any) => bals[t.treasury_code] = Number(t.balance || 0));
      setTreasuryBalances(bals);
    }

    const { data: custData } = await supabase.from('customers').select('*').eq('tenant_id', getCurrentTenantId()).order('is_active', { ascending: false }).order('name');
    if (custData) setCustomersList(custData);

    const { data: suppData } = await supabase.from('suppliers').select('*').eq('tenant_id', getCurrentTenantId()).order('is_active', { ascending: false }).order('name');
    if (suppData) setSuppliersList(suppData);

    // تفاصيل النشاط
    const { data: bizData } = await supabase.from('tenants').select('*').eq('id', 1).maybeSingle();
    if (bizData) setBusinessData(bizData);

    // المستخدمون
    const { data: usersData } = await supabase.from('system_users').select('id, username, full_name, role, tenant_id, is_active, created_at').eq('tenant_id', getCurrentTenantId()).order('id');
    if (usersData) setUsersList(usersData);

    const { data: settings } = await supabase.from('system_settings').select('*').eq('tenant_id', getCurrentTenantId());
    if (settings) {
      settings.forEach(item => {
        if (item.setting_key === 'default_transport_cost') setTransCost(item.setting_value);
        if (item.setting_key === 'default_labor_cost') setLabCost(item.setting_value);
        if (item.setting_key === 'default_broker_cost') setBrokCost(item.setting_value);
        if (item.setting_key === 'alert_fresh_hours') setAlertFresh(item.setting_value);
        if (item.setting_key === 'alert_fresh_enabled') setAlertFreshOn(item.setting_value === 'true');
        if (item.setting_key === 'alert_low_stock') setAlertStock(item.setting_value);
        if (item.setting_key === 'alert_low_stock_enabled') setAlertStockOn(item.setting_value === 'true');
        if (item.setting_key === 'alert_max_variance') setAlertVariance(item.setting_value);
        if (item.setting_key === 'alert_max_variance_enabled') setAlertVarianceOn(item.setting_value === 'true');
        if (item.setting_key === 'alert_credit_limit') setAlertCredit(item.setting_value);
        if (item.setting_key === 'alert_credit_limit_enabled') setAlertCreditOn(item.setting_value === 'true');
        if (item.setting_key === 'alert_debt_days') setAlertDebtDays(item.setting_value);
        if (item.setting_key === 'alert_debt_days_enabled') setAlertDebtDaysOn(item.setting_value === 'true');
        if (item.setting_key === 'alert_min_treasury') setAlertMinTreasury(item.setting_value);
        if (item.setting_key === 'alert_min_treasury_enabled') setAlertMinTreasuryOn(item.setting_value === 'true');
        if (item.setting_key === 'alert_credit_warning') setAlertCreditWarning(item.setting_value);
        if (item.setting_key === 'min_profit_margin_percent') setMinProfitMargin(item.setting_value);
        if (item.setting_key === 'alert_credit_warning_enabled') setAlertCreditWarningOn(item.setting_value === 'true');
        if (item.setting_key === 'opening_balances_locked') setOpeningLocked(item.setting_value === 'true');
      });
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleAddProduct = async (e: any) => {
    e.preventDefault();
    if (!pName) { showToast('اسم الصنف مطلوب', 'error'); return; }
    const { error } = await supabase.from('inventory').insert([{
      tenant_id: getCurrentTenantId(),
      product_name_ar: pName.trim(), stock_kg: 0, pricing_type: pType, pricing_value: Number(pValue), is_active: true
    }]);
    if (error) { showToast('خطأ: ' + error.message, 'error'); return; }
    setPName(''); loadData(); showToast('تم إضافة الصنف بكود تلقائي');
  };

  const confirmEditProduct = async () => {
    if (!editingProduct) return;
    await supabase.from('inventory').update({
      product_name_ar: editingProduct.product_name_ar,
      pricing_type: editingProduct.pricing_type,
      pricing_value: Number(editingProduct.pricing_value),
      allocation_weight: Number(editingProduct.allocation_weight || 1)
    }).eq('tenant_id', getCurrentTenantId()).eq('product_code', editingProduct.product_code);
    setEditingProduct(null); loadData(); showToast('تم تحديث الصنف');
  };

  const requestDeleteProduct = async (prod: any) => {
    const { count: sc } = await supabase.from('sales_items').select('*', { count: 'exact', head: true }).eq('tenant_id', getCurrentTenantId()).eq('product_code', prod.product_code);
    const { count: pc } = await supabase.from('pathway_products').select('*', { count: 'exact', head: true }).eq('tenant_id', getCurrentTenantId()).eq('product_code', prod.product_code);
    setDeleteModal({ type: 'product', code: prod.product_code, name: prod.product_name_ar, usage: { total: (sc || 0) + (pc || 0) } });
  };

  const confirmDeleteProduct = async () => {
    if (!deleteModal) return;
    const { code, usage } = deleteModal;
    if (usage.total > 0) {
      await supabase.from('inventory').update({ is_active: false }).eq('tenant_id', getCurrentTenantId()).eq('product_code', code);
      showToast('تم أرشفة الصنف');
    } else {
      await supabase.from('pathway_products').delete().eq('tenant_id', getCurrentTenantId()).eq('product_code', code);
      await supabase.from('inventory').delete().eq('tenant_id', getCurrentTenantId()).eq('product_code', code);
      showToast('تم الحذف النهائي');
    }
    setDeleteModal(null); loadData();
  };

  const reactivateProduct = async (code: string) => {
    await supabase.from('inventory').update({ is_active: true }).eq('tenant_id', getCurrentTenantId()).eq('product_code', code);
    showToast('تم الاستعادة'); loadData();
  };

  const handleCreatePathway = async (e: any) => {
    e.preventDefault();
    if (!newPathwayName) return;
    const code = 'PATH-' + Date.now().toString(36).toUpperCase();
    await supabase.from('slaughter_pathways').insert([{ tenant_id: getCurrentTenantId(), pathway_code: code, name_ar: newPathwayName.trim(), yield_formula_json: {}, is_active: true }]);
    setNewPathwayName(''); setShowNewPathwayForm(false); setExpandedPathway(code);
    loadData(); showToast('تم إنشاء المسار');
  };

  const confirmEditPathway = async () => {
    if (!editingPathway) return;
    await supabase.from('slaughter_pathways').update({ name_ar: editingPathway.name_ar }).eq('tenant_id', getCurrentTenantId()).eq('pathway_code', editingPathway.pathway_code);
    setEditingPathway(null); loadData(); showToast('تم تحديث اسم المسار');
  };

  const requestDeletePathway = async (pw: any) => {
    const { count } = await supabase.from('batches').select('*', { count: 'exact', head: true }).eq('tenant_id', getCurrentTenantId()).eq('pathway_code', pw.pathway_code);
    setDeleteModal({ type: 'pathway', code: pw.pathway_code, name: pw.name_ar, usage: { total: count || 0 } });
  };

  const confirmDeletePathway = async () => {
    if (!deleteModal) return;
    const { code, usage } = deleteModal;
    if (usage.total > 0) {
      await supabase.from('slaughter_pathways').update({ is_active: false }).eq('tenant_id', getCurrentTenantId()).eq('pathway_code', code);
      showToast('تم الأرشفة');
    } else {
      await supabase.from('pathway_products').delete().eq('tenant_id', getCurrentTenantId()).eq('pathway_code', code);
      await supabase.from('slaughter_pathways').delete().eq('tenant_id', getCurrentTenantId()).eq('pathway_code', code);
      showToast('تم الحذف');
    }
    setDeleteModal(null); loadData();
  };

  const reactivatePathway = async (code: string) => {
    await supabase.from('slaughter_pathways').update({ is_active: true }).eq('tenant_id', getCurrentTenantId()).eq('pathway_code', code);
    showToast('تم الاستعادة'); loadData();
  };

  const handleAddProductToPathway = async (pc: string) => {
    if (!selectedProductToAdd) return;
    const r = Number(ratioToAdd) / 100;
    if (r <= 0 || r > 1) { showToast('النسبة غير صحيحة', 'error'); return; }
    await supabase.from('pathway_products').insert([{ tenant_id: getCurrentTenantId(), pathway_code: pc, product_code: selectedProductToAdd, expected_ratio: r }]);
    setAddingToPathway(null); setSelectedProductToAdd(''); setRatioToAdd('25');
    loadData(); showToast('تم إضافة الصنف');
  };

  const handleRemoveProductFromPathway = async (pc: string, productCode: string) => {
    await supabase.from('pathway_products').delete().eq('tenant_id', getCurrentTenantId()).eq('pathway_code', pc).eq('product_code', productCode);
    loadData(); showToast('تم الحذف');
  };

  const handleAddTreasury = async (e: any) => {
    e.preventDefault();
    if (!newTreasuryName.trim()) { showToast('الاسم مطلوب', 'error'); return; }
    const code = 'TR-' + Date.now().toString(36).toUpperCase();
    const { error } = await supabase.from('treasury_accounts').insert([{
      tenant_id: getCurrentTenantId(),
      treasury_code: code, name_ar: newTreasuryName.trim(), account_type: newTreasuryType, is_active: true
    }]);
    if (error) { showToast('خطأ: ' + error.message, 'error'); return; }
    setNewTreasuryName(''); setShowNewTreasuryForm(false);
    loadData(); showToast('تم إنشاء الخزينة');
  };

  const confirmEditTreasury = async () => {
    if (!editingTreasury) return;
    await supabase.from('treasury_accounts').update({ name_ar: editingTreasury.name_ar, account_type: editingTreasury.account_type }).eq('tenant_id', getCurrentTenantId()).eq('treasury_code', editingTreasury.treasury_code);
    setEditingTreasury(null); loadData(); showToast('تم التحديث');
  };

  const requestDeleteTreasury = async (t: any) => {
    const { count } = await supabase.from('financial_vouchers').select('*', { count: 'exact', head: true }).eq('tenant_id', getCurrentTenantId()).eq('treasury_code', t.treasury_code);
    setDeleteModal({ type: 'treasury', code: t.treasury_code, name: t.name_ar, usage: { total: count || 0 } });
  };

  const confirmDeleteTreasury = async () => {
    if (!deleteModal) return;
    const { code, usage } = deleteModal;
    if (usage.total > 0) {
      await supabase.from('treasury_accounts').update({ is_active: false }).eq('tenant_id', getCurrentTenantId()).eq('treasury_code', code);
      showToast('تم الأرشفة');
    } else {
      await supabase.from('treasury_accounts').delete().eq('tenant_id', getCurrentTenantId()).eq('treasury_code', code);
      showToast('تم الحذف');
    }
    setDeleteModal(null); loadData();
  };

  const reactivateTreasury = async (code: string) => {
    await supabase.from('treasury_accounts').update({ is_active: true }).eq('tenant_id', getCurrentTenantId()).eq('treasury_code', code);
    showToast('تم الاستعادة'); loadData();
  };

  const confirmEditCustomer = async () => {
    if (!editingCustomer) return;
    await supabase.from('customers').update({
      name: editingCustomer.name,
      phone: editingCustomer.phone,
      credit_limit: Number(editingCustomer.credit_limit || 50000)
    }).eq('tenant_id', getCurrentTenantId()).eq('id', editingCustomer.id);
    setEditingCustomer(null); loadData(); showToast('تم تحديث العميل');
  };

  const requestDeleteCustomer = async (c: any) => {
    const { count: ic } = await supabase.from('sales_invoices').select('*', { count: 'exact', head: true }).eq('tenant_id', getCurrentTenantId()).eq('customer_name', c.name);
    const { count: vc } = await supabase.from('financial_vouchers').select('*', { count: 'exact', head: true }).eq('tenant_id', getCurrentTenantId()).eq('entity_name', c.name);
    setDeleteModal({ type: 'customer', id: c.id, name: c.name, usage: { total: (ic || 0) + (vc || 0) + (Number(c.balance) > 0 ? 1 : 0) } });
  };

  const confirmDeleteCustomer = async () => {
    if (!deleteModal) return;
    const { id, usage } = deleteModal;
    if (usage.total > 0) {
      await supabase.from('customers').update({ is_active: false }).eq('tenant_id', getCurrentTenantId()).eq('id', id);
      showToast('تم أرشفة العميل');
    } else {
      await supabase.from('customers').delete().eq('tenant_id', getCurrentTenantId()).eq('id', id);
      showToast('تم الحذف');
    }
    setDeleteModal(null); loadData();
  };

  const reactivateCustomer = async (id: number) => {
    await supabase.from('customers').update({ is_active: true }).eq('tenant_id', getCurrentTenantId()).eq('id', id);
    showToast('تم الاستعادة'); loadData();
  };

  const confirmEditSupplier = async () => {
    if (!editingSupplier) return;
    await supabase.from('suppliers').update({ name: editingSupplier.name, phone: editingSupplier.phone }).eq('tenant_id', getCurrentTenantId()).eq('id', editingSupplier.id);
    setEditingSupplier(null); loadData(); showToast('تم تحديث المورد');
  };

  const requestDeleteSupplier = async (s: any) => {
    const { count: bc } = await supabase.from('batches').select('*', { count: 'exact', head: true }).eq('tenant_id', getCurrentTenantId()).eq('supplier_name', s.name);
    const { count: vc } = await supabase.from('financial_vouchers').select('*', { count: 'exact', head: true }).eq('tenant_id', getCurrentTenantId()).eq('entity_name', s.name);
    setDeleteModal({ type: 'supplier', id: s.id, name: s.name, usage: { total: (bc || 0) + (vc || 0) + (Number(s.balance) > 0 ? 1 : 0) } });
  };

  const confirmDeleteSupplier = async () => {
    if (!deleteModal) return;
    const { id, usage } = deleteModal;
    if (usage.total > 0) {
      await supabase.from('suppliers').update({ is_active: false }).eq('tenant_id', getCurrentTenantId()).eq('id', id);
      showToast('تم أرشفة المورد');
    } else {
      await supabase.from('suppliers').delete().eq('tenant_id', getCurrentTenantId()).eq('id', id);
      showToast('تم الحذف');
    }
    setDeleteModal(null); loadData();
  };

  const reactivateSupplier = async (id: number) => {
    await supabase.from('suppliers').update({ is_active: true }).eq('tenant_id', getCurrentTenantId()).eq('id', id);
    showToast('تم الاستعادة'); loadData();
  };

  const getProductName = (code: string) => {
    const p = products.find(x => x.product_code === code);
    return p ? p.product_name_ar : code;
  };

  const getPathwayProductsVisible = (pc: string) => pathwayProducts.filter(pp => {
    if (pp.pathway_code !== pc) return false;
    const p = products.find(x => x.product_code === pp.product_code);
    if (!p) return false;
    return showArchived ? true : p.is_active !== false;
  });

  const getAvailableProductsForPathway = (pc: string) => {
    const ex = pathwayProducts.filter(pp => pp.pathway_code === pc).map(pp => pp.product_code);
    return products.filter(p => p.is_active !== false && !ex.includes(p.product_code));
  };

  const getPathwayTotal = (pc: string) => getPathwayProductsVisible(pc).reduce((s, i) => s + Number(i.expected_ratio) * 100, 0);

  const saveLogistics = async () => {
    await supabase.from('system_settings').upsert([
      { tenant_id: getCurrentTenantId(), setting_key: 'default_transport_cost', setting_value: transCost },
      { tenant_id: getCurrentTenantId(), setting_key: 'default_labor_cost', setting_value: labCost },
      { tenant_id: getCurrentTenantId(), setting_key: 'default_broker_cost', setting_value: brokCost }
    ], { onConflict: 'setting_key' });
    showToast('تم حفظ التكاليف');
  };

  const saveAlerts = async () => {
    await supabase.from('system_settings').upsert([
      { tenant_id: getCurrentTenantId(), setting_key: 'alert_fresh_hours', setting_value: alertFresh },
      { tenant_id: getCurrentTenantId(), setting_key: 'alert_fresh_enabled', setting_value: alertFreshOn ? 'true' : 'false' },
      { tenant_id: getCurrentTenantId(), setting_key: 'alert_low_stock', setting_value: alertStock },
      { tenant_id: getCurrentTenantId(), setting_key: 'alert_low_stock_enabled', setting_value: alertStockOn ? 'true' : 'false' },
      { tenant_id: getCurrentTenantId(), setting_key: 'alert_max_variance', setting_value: alertVariance },
      { tenant_id: getCurrentTenantId(), setting_key: 'alert_max_variance_enabled', setting_value: alertVarianceOn ? 'true' : 'false' },
      { tenant_id: getCurrentTenantId(), setting_key: 'alert_credit_limit', setting_value: alertCredit },
      { tenant_id: getCurrentTenantId(), setting_key: 'alert_credit_limit_enabled', setting_value: alertCreditOn ? 'true' : 'false' },
      { tenant_id: getCurrentTenantId(), setting_key: 'alert_debt_days', setting_value: alertDebtDays },
      { tenant_id: getCurrentTenantId(), setting_key: 'alert_debt_days_enabled', setting_value: alertDebtDaysOn ? 'true' : 'false' },
      { tenant_id: getCurrentTenantId(), setting_key: 'alert_min_treasury', setting_value: alertMinTreasury },
      { tenant_id: getCurrentTenantId(), setting_key: 'alert_min_treasury_enabled', setting_value: alertMinTreasuryOn ? 'true' : 'false' },
      { tenant_id: getCurrentTenantId(), setting_key: 'alert_credit_warning', setting_value: alertCreditWarning },
      { tenant_id: getCurrentTenantId(), setting_key: 'min_profit_margin_percent', setting_value: minProfitMargin },
      { tenant_id: getCurrentTenantId(), setting_key: 'alert_credit_warning_enabled', setting_value: alertCreditWarningOn ? 'true' : 'false' }
    ], { onConflict: 'setting_key' });
    showToast('تم حفظ إعدادات التنبيهات');
  };

  const saveSubTab = async (tab: string) => {
    if (openingLocked) { showToast('الأرصدة مقفلة', 'error'); return 0; }
    let saved = 0;

    if (tab === 'treasuries') {
      await supabase.from('financial_vouchers').delete().eq('tenant_id', getCurrentTenantId()).eq('type', 'opening_treasury');
      for (const t of openTreasuries) {
        if (Number(t.balance) > 0) {
          await supabase.from('financial_vouchers').insert([{
            tenant_id: getCurrentTenantId(),
            type: 'opening_treasury', entity_name: 'رصيد افتتاحي - ' + t.name,
            amount: Number(t.balance), payment_method: 'cash', treasury_code: t.code, notes: 'رصيد افتتاحي مرحّل'
          }]);
          saved++;
        }
      }
    }

    if (tab === 'customers') {
      await supabase.from('financial_vouchers').delete().eq('tenant_id', getCurrentTenantId()).eq('type', 'opening_debit');
      for (const c of openCustomers) {
        if (c.name.trim() && Number(c.balance) > 0) {
          const { data: existing } = await supabase.from('customers').select('id').eq('tenant_id', getCurrentTenantId()).eq('name', c.name.trim()).maybeSingle();
          if (existing) {
            await supabase.from('customers').update({ balance: Number(c.balance), phone: c.phone.trim() || null }).eq('tenant_id', getCurrentTenantId()).eq('id', existing.id);
          } else {
            await supabase.from('customers').insert([{ tenant_id: getCurrentTenantId(), name: c.name.trim(), phone: c.phone.trim() || null, balance: Number(c.balance), is_active: true }]);
          }
          await supabase.from('financial_vouchers').insert([{
            tenant_id: getCurrentTenantId(),
            type: 'opening_debit', entity_name: c.name.trim(), amount: Number(c.balance),
            payment_method: 'cash', notes: 'رصيد افتتاحي - مديونية سابقة'
          }]);
          saved++;
        }
      }
    }

    if (tab === 'suppliers') {
      await supabase.from('financial_vouchers').delete().eq('tenant_id', getCurrentTenantId()).eq('type', 'opening_credit');
      for (const s of openSuppliers) {
        if (s.name.trim() && Number(s.balance) > 0) {
          const { data: existing } = await supabase.from('suppliers').select('id').eq('tenant_id', getCurrentTenantId()).eq('name', s.name.trim()).maybeSingle();
          if (existing) {
            await supabase.from('suppliers').update({ balance: Number(s.balance), phone: s.phone.trim() || null }).eq('tenant_id', getCurrentTenantId()).eq('id', existing.id);
          } else {
            await supabase.from('suppliers').insert([{ tenant_id: getCurrentTenantId(), name: s.name.trim(), phone: s.phone.trim() || null, balance: Number(s.balance), is_active: true }]);
          }
          await supabase.from('financial_vouchers').insert([{
            tenant_id: getCurrentTenantId(),
            type: 'opening_credit', entity_name: s.name.trim(), amount: Number(s.balance),
            payment_method: 'cash', notes: 'رصيد افتتاحي - مستحق سابق'
          }]);
          saved++;
        }
      }
    }

    if (tab === 'inventory') {
      await supabase.from('inventory_lots').delete().eq('tenant_id', getCurrentTenantId()).eq('source_type', 'opening');
      for (const st of openStock) {
        if (Number(st.weight) > 0) {
          await supabase.from('inventory').update({ stock_kg: Number(st.weight), last_updated: new Date() }).eq('tenant_id', getCurrentTenantId()).eq('product_code', st.code);
          await supabase.from('inventory_lots').insert([{
          tenant_id: getCurrentTenantId(),
            product_code: st.code, source_type: 'opening', source_ref: 'OPENING-BALANCE',
            quantity_kg: Number(st.weight), remaining_kg: Number(st.weight), cost_per_kg: Number(st.cost) || 0
          }]);
          saved++;
        }
      }
    }

    setSavedSubTabs(prev => ({ ...prev, [tab]: true }));
    return saved;
  };

  const handleSaveCurrentTab = async () => {
    const saved = await saveSubTab(openingSubTab);
    showToast('تم حفظ ' + saved + ' سجل في التبويب الحالي');
    loadData();
  };

  const handleSaveAll = async () => {
    let total = 0;
    total += await saveSubTab('treasuries');
    total += await saveSubTab('customers');
    total += await saveSubTab('suppliers');
    total += await saveSubTab('inventory');
    showToast('تم حفظ ' + total + ' سجل في كل التبويبات');
    loadData();
  };

  // ============================================================
  // USERS MANAGEMENT
  // ============================================================
  const loadUsers = async () => {
    const { data } = await supabase
      .from('system_users')
      .select('id, username, full_name, role, tenant_id, is_active, created_at')
      .eq('tenant_id', getCurrentTenantId())
      .order('id');
    if (data) setUsersList(data);
  };

  const RESERVED_SLUGS = [
    'dashboard', 'sales', 'production', 'inventory', 'customers',
    'suppliers', 'treasury', 'finance', 'reports', 'settings',
    'login', 'logout', 'master', 'help', 'api', 'admin',
    'app', 'www', 'static', 'public', 'b', 'w', 'u', 'user',
    'account', 'auth', 'invoices', 'vouchers', 'batches'
  ];

  const checkSlug = async (value: string) => {
    if (!value) { setSlugCheckStatus('idle'); setSlugCheckMessage(''); return; }
    const pattern = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;
    if (RESERVED_SLUGS.includes(value)) {
      setSlugCheckStatus('invalid');
      setSlugCheckMessage('هذا المعرّف محجوز للنظام — اختر اسماً آخر');
      return;
    }
    if (!pattern.test(value)) {
      setSlugCheckStatus('invalid');
      setSlugCheckMessage('التنسيق: أحرف إنجليزية صغيرة وأرقام وشرطة، 3-30 حرفاً');
      return;
    }
    setSlugCheckStatus('checking');
    setSlugCheckMessage('جاري التحقق...');
    const { data } = await supabase.from('tenants').select('id').eq('slug', value).neq('id', 1).maybeSingle();
    if (data) {
      setSlugCheckStatus('taken');
      setSlugCheckMessage('هذا المعرّف محجوز — جرّب اسماً آخر');
    } else {
      setSlugCheckStatus('available');
      setSlugCheckMessage('المعرّف متاح');
    }
  };

  const handleSaveBusiness = async () => {
    if (!businessData) return;
    setBusinessSaving(true);
    const { error } = await supabase.from('tenants').update({
      name: businessData.name,
      business_type: businessData.business_type,
      owner_name: businessData.owner_name,
      phone: businessData.phone,
      email: businessData.email,
      address: businessData.address,
      city: businessData.city,
      country: businessData.country,
      tax_id: businessData.tax_id,
      commercial_register: businessData.commercial_register,
      notes: businessData.notes,
      slug: businessData.slug || null,
      updated_at: new Date().toISOString(),
    }).eq('id', 1);
    setBusinessSaving(false);
    if (error) { showToast('خطأ: ' + error.message, 'error'); return; }
    showToast('تم حفظ تفاصيل النشاط');
    loadData();
  };

  const handleAddUser = async (e: any) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserFullName.trim() || !newUserPassword.trim()) {
      showToast('املأ كل الحقول', 'error');
      return;
    }
    // تحقق من التفرد داخل نفس tenant
    const { data: existing } = await supabase.from('system_users').select('id').eq('username', newUserName.trim()).eq('tenant_id', getCurrentTenantId()).maybeSingle();
    if (existing) { showToast('اسم المستخدم موجود مسبقاً', 'error'); return; }

    const { error } = await supabase.from('system_users').insert([{
      username: newUserName.trim(),
      full_name: newUserFullName.trim(),
      password_hash: newUserPassword.trim(),
      role: newUserRole,
      tenant_id: getCurrentTenantId(),
      is_active: true,
    }]);

    if (error) { showToast('خطأ: ' + error.message, 'error'); return; }

    showToast('تم إضافة المستخدم');
    setShowNewUserForm(false);
    setNewUserName(''); setNewUserFullName(''); setNewUserPassword(''); setNewUserRole('cashier');
    loadUsers();
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    // التحقق من عدم تكرار username
    if (editingUser.username !== editingUser._originalUsername) {
      const { data: dup } = await supabase
        .from('system_users')
        .select('id')
        .eq('username', editingUser.username.trim())
        .eq('tenant_id', getCurrentTenantId())
        .maybeSingle();
      if (dup) { showToast('اسم المستخدم موجود مسبقاً', 'error'); return; }
    }

    const updateData: any = {
      full_name: editingUser.full_name?.trim(),
      username: editingUser.username?.trim(),
      role: editingUser.role,
    };

    // إذا أُدخلت كلمة مرور جديدة → استبدلها بـ bcrypt
    if (editingUserPassword.trim()) {
      if (editingUserPassword.trim().length < 6) {
        showToast('كلمة المرور 6 أحرف على الأقل', 'error');
        return;
      }
      const bcryptLib = await import('bcryptjs');
      updateData.password_hash = await bcryptLib.hash(editingUserPassword.trim(), 10);
    }

    const { error } = await supabase.from('system_users').update(updateData).eq('tenant_id', getCurrentTenantId()).eq('id', editingUser.id);

    if (error) { showToast('خطأ: ' + error.message, 'error'); return; }
    showToast('تم التحديث');
    setEditingUser(null);
    setEditingUserPassword('');
    loadUsers();
  };

  const handleChangeUserPassword = async () => {
    if (!changingPasswordUser || !newPasswordForUser.trim()) return;
    if (newPasswordForUser.length < 6) { showToast('كلمة المرور 6 أحرف على الأقل', 'error'); return; }

    const bcryptLib = await import('bcryptjs');
    const hash = await bcryptLib.hash(newPasswordForUser.trim(), 10);

    const { error } = await supabase.from('system_users').update({ password_hash: hash }).eq('tenant_id', getCurrentTenantId()).eq('id', changingPasswordUser.id);
    if (error) { showToast('خطأ: ' + error.message, 'error'); return; }

    showToast('تم تغيير كلمة المرور');
    setChangingPasswordUser(null);
    setNewPasswordForUser('');
  };

  const handleDeleteUser = async (user: any) => {
    if (user.username === 'admin') { showToast('لا يمكن حذف المدير', 'error'); return; }
    if (!confirm('تأكيد حذف المستخدم ' + user.username + '؟')) return;
    const { error } = await supabase.from('system_users').delete().eq('tenant_id', getCurrentTenantId()).eq('id', user.id);
    if (error) { showToast('خطأ: ' + error.message, 'error'); return; }
    showToast('تم الحذف');
    loadUsers();
  };

  const approveAndLock = async () => {
    if (openingLocked) { showToast('الأرصدة مقفلة مسبقاً', 'error'); return; }
    let total = 0;
    total += await saveSubTab('treasuries');
    total += await saveSubTab('customers');
    total += await saveSubTab('suppliers');
    total += await saveSubTab('inventory');
    await supabase.from('system_settings').upsert([{ tenant_id: getCurrentTenantId(), setting_key: 'opening_balances_locked', setting_value: 'true' }], { onConflict: 'setting_key' });
    setOpeningLocked(true);
    setShowLockConfirm(false);
    showToast('تم اعتماد ' + total + ' حركة وقفلها نهائياً');
    loadData();
  };

  // تحميل الأرصدة الافتتاحية المحفوظة بعد القفل
  useEffect(() => {
    if (!openingLocked) return;
    (async () => {
      // 1. بضاعة الثلاجة
      const { data: lots } = await supabase.from('inventory_lots').select('*').eq('tenant_id', getCurrentTenantId()).eq('source_type', 'opening');
      if (lots && lots.length > 0) {
        setOpenStock(prev => {
          const map: any = {};
          prev.forEach((s: any) => { map[s.code] = { ...s }; });
          lots.forEach((l: any) => {
            if (map[l.product_code]) {
              map[l.product_code].weight = Number(l.quantity_kg || 0);
              map[l.product_code].cost = Number(l.cost_per_kg || 0);
            }
          });
          return Object.values(map);
        });
      }

      // 2. الخزائن
      const { data: treas } = await supabase.from('financial_vouchers').select('*').eq('tenant_id', getCurrentTenantId()).eq('type', 'opening_treasury');
      if (treas && treas.length > 0) {
        setOpenTreasuries(prev => {
          const map: any = {};
          prev.forEach((t: any) => { map[t.code] = { ...t }; });
          treas.forEach((v: any) => {
            if (map[v.treasury_code]) map[v.treasury_code].balance = Number(v.amount || 0);
          });
          return Object.values(map);
        });
      }

      // 3. العملاء
      const { data: custV } = await supabase.from('financial_vouchers').select('*').eq('tenant_id', getCurrentTenantId()).eq('type', 'opening_debit');
      const { data: custList } = await supabase.from('customers').select('*').eq('tenant_id', getCurrentTenantId());
      if (custV && custV.length > 0) {
        setOpenCustomers(custV.map((v: any) => {
          const c = (custList || []).find((x: any) => x.name === v.entity_name);
          return { name: v.entity_name || '', phone: c?.phone || '', balance: Number(v.amount || 0) };
        }));
      }

      // 4. الموردين
      const { data: suppV } = await supabase.from('financial_vouchers').select('*').eq('tenant_id', getCurrentTenantId()).eq('type', 'opening_credit');
      const { data: suppList } = await supabase.from('suppliers').select('*').eq('tenant_id', getCurrentTenantId());
      if (suppV && suppV.length > 0) {
        setOpenSuppliers(suppV.map((v: any) => {
          const s = (suppList || []).find((x: any) => x.name === v.entity_name);
          return { name: v.entity_name || '', phone: s?.phone || '', balance: Number(v.amount || 0) };
        }));
      }
    })();
  }, [openingLocked]);
  const displayedProducts = showArchived ? products : products.filter(p => p.is_active !== false);
  const displayedPathways = showArchived ? pathways : pathways.filter(p => p.is_active !== false);
  const displayedTreasuries = showArchived ? treasuries : treasuries.filter(t => t.is_active !== false);
  const displayedCustomers = showArchived ? customersList : customersList.filter(c => c.is_active !== false);
  const displayedSuppliers = showArchived ? suppliersList : suppliersList.filter(s => s.is_active !== false);
  const totalCash = Object.values(treasuryBalances).reduce((s: number, v: any) => s + Number(v || 0), 0) as number;

  const tabGroups = [
    {
      key: 'basic',
      label: '📦 البيانات الأساسية',
      color: 'blue',
      tabs: [
        { key: 'products', label: 'الأصناف' },
        { key: 'treasuries', label: 'الخزائن' },
        { key: 'suppliers', label: 'الموردين' },
        { key: 'customers', label: 'العملاء' },
      ],
    },
    {
      key: 'operations',
      label: '⚙️ التشغيل',
      color: 'amber',
      tabs: [
        { key: 'pathways', label: 'مسارات التجهيز' },
        { key: 'logistics', label: 'التكاليف اللوجستية' },
        { key: 'alerts', label: 'قواعد التنبيهات' },
      ],
    },
    {
      key: 'accounting',
      label: '💰 المحاسبة',
      color: 'emerald',
      tabs: [
        { key: 'opening', label: 'الأرصدة الافتتاحية' },
      ],
    },
    {
      key: 'admin',
      label: '🏢 الإدارة',
      color: 'rose',
      tabs: [
        { key: 'business', label: 'تفاصيل النشاط' },
        { key: 'users', label: 'المستخدمون' },
      ],
    },
  ];

  const currentGroup = tabGroups.find(g => g.key === activeGroup) || tabGroups[0];

  const switchGroup = (groupKey: string) => {
    setActiveGroup(groupKey);
    const grp = tabGroups.find(g => g.key === groupKey);
    if (grp && grp.tabs.length > 0) {
      setActiveTab(grp.tabs[0].key);
    }
  };
  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl border text-sm font-bold ${toast.type === 'success' ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-rose-600 text-white border-rose-400'}`}>{toast.msg}</div>
      )}

      {editingPathway && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-right">
            <h3 className="text-base font-black text-slate-800">تعديل اسم المسار</h3>
            <p className="text-xs text-slate-500 font-bold">الكود: <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{editingPathway.pathway_code}</span></p>
            <div className="text-xs font-bold">
              <label className="block text-slate-700 mb-1.5">اسم المسار بالعربي:</label>
              <input type="text" value={editingPathway.name_ar} onChange={(e) => setEditingPathway({ ...editingPathway, name_ar: e.target.value })} className="w-full border-2 rounded-xl px-3 bg-slate-50 h-11" />
            </div>
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-2xl text-[11px] font-bold text-blue-900">
              سيظهر الاسم الجديد فوراً في الإنتاج وفي كل الصفحات.
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={confirmEditPathway} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs">حفظ</button>
              <button onClick={() => setEditingPathway(null)} className="bg-slate-100 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-right">
            <h3 className="text-base font-black text-slate-800">تعديل الصنف</h3>
            <p className="text-xs text-slate-500 font-bold">الكود: <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{editingProduct.product_code}</span></p>
            <div className="space-y-3 text-xs font-bold">
              <div><label className="block text-slate-700 mb-1.5">الاسم:</label><input type="text" value={editingProduct.product_name_ar} onChange={(e) => setEditingProduct({ ...editingProduct, product_name_ar: e.target.value })} className="w-full border-2 rounded-xl px-3 bg-slate-50 h-11" /></div>
              <div><label className="block text-slate-700 mb-1.5">التسعير:</label><select value={editingProduct.pricing_type} onChange={(e) => setEditingProduct({ ...editingProduct, pricing_type: e.target.value })} className="w-full border-2 rounded-xl px-2 bg-slate-50 h-11"><option value="multiplier">معامل ضرب</option><option value="addition">إضافة ثابتة</option><option value="fixed">سعر حر</option></select></div>
              <div><label className="block text-slate-700 mb-1.5">المعامل:</label><input type="number" step="0.05" value={editingProduct.pricing_value} onChange={(e) => setEditingProduct({ ...editingProduct, pricing_value: e.target.value })} className="w-full border-2 rounded-xl px-3 bg-slate-50 h-11 font-mono" /></div>
              <div>
                <label className="block text-slate-700 mb-1.5">معامل التوزيع على التكلفة:</label>
                <input type="number" step="0.1" min="0.1" value={editingProduct.allocation_weight || 1} onChange={(e) => setEditingProduct({ ...editingProduct, allocation_weight: Number(e.target.value) })} className="w-full border-2 rounded-xl px-3 bg-slate-50 h-11 font-mono" />
                <p className="text-xs text-slate-600 font-medium mt-1">القيمة الافتراضية 1.0 — زدها لصنف مرتفع القيمة، أنقصها لصنف منخفض.</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={confirmEditProduct} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs">حفظ</button>
              <button onClick={() => setEditingProduct(null)} className="bg-slate-100 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {editingTreasury && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-right">
            <h3 className="text-base font-black text-slate-800">تعديل الخزينة</h3>
            <div className="space-y-3 text-xs font-bold">
              <div><label className="block text-slate-700 mb-1.5">الاسم:</label><input type="text" value={editingTreasury.name_ar} onChange={(e) => setEditingTreasury({ ...editingTreasury, name_ar: e.target.value })} className="w-full border-2 rounded-xl px-3 bg-slate-50 h-11" /></div>
              <div><label className="block text-slate-700 mb-1.5">النوع:</label>
                <select value={editingTreasury.account_type} onChange={(e) => setEditingTreasury({ ...editingTreasury, account_type: e.target.value })} className="w-full border-2 rounded-xl px-2 bg-slate-50 h-11">
                  <option value="نقدية سائلة">نقدية سائلة</option>
                  <option value="حساب بنكي">حساب بنكي</option>
                  <option value="عهدة">عهدة</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={confirmEditTreasury} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs">حفظ</button>
              <button onClick={() => setEditingTreasury(null)} className="bg-slate-100 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {editingCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-right">
            <h3 className="text-base font-black text-slate-800">تعديل العميل</h3>
            <div className="space-y-3 text-xs font-bold">
              <div><label className="block text-slate-700 mb-1.5">الاسم:</label><input type="text" value={editingCustomer.name} onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })} className="w-full border-2 rounded-xl px-3 bg-slate-50 h-11" /></div>
              <div><label className="block text-slate-700 mb-1.5">الهاتف:</label><input type="text" value={editingCustomer.phone || ''} onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })} className="w-full border-2 rounded-xl px-3 bg-slate-50 h-11 font-mono" /></div>
              <div><label className="block text-slate-700 mb-1.5">سقف الائتمان (ج):</label><input type="number" value={editingCustomer.credit_limit || 50000} onChange={(e) => setEditingCustomer({ ...editingCustomer, credit_limit: e.target.value })} className="w-full border-2 rounded-xl px-3 bg-slate-50 h-11 font-mono" /></div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={confirmEditCustomer} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs">حفظ</button>
              <button onClick={() => setEditingCustomer(null)} className="bg-slate-100 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {editingSupplier && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-right">
            <h3 className="text-base font-black text-slate-800">تعديل المورد</h3>
            <div className="space-y-3 text-xs font-bold">
              <div><label className="block text-slate-700 mb-1.5">الاسم:</label><input type="text" value={editingSupplier.name} onChange={(e) => setEditingSupplier({ ...editingSupplier, name: e.target.value })} className="w-full border-2 rounded-xl px-3 bg-slate-50 h-11" /></div>
              <div><label className="block text-slate-700 mb-1.5">الهاتف:</label><input type="text" value={editingSupplier.phone || ''} onChange={(e) => setEditingSupplier({ ...editingSupplier, phone: e.target.value })} className="w-full border-2 rounded-xl px-3 bg-slate-50 h-11 font-mono" /></div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={confirmEditSupplier} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs">حفظ</button>
              <button onClick={() => setEditingSupplier(null)} className="bg-slate-100 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {deleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-right">
            <div className="flex items-center gap-2 text-slate-700 flex-wrap">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-black">تأكيد الحذف</h3>
            </div>
            <p className="text-sm font-bold text-slate-700">{deleteModal.name}</p>
            {deleteModal.usage.total > 0 ? (
              <>
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-xs font-bold text-slate-700">
                  مستخدم في {deleteModal.usage.total} حركة. سيتم الأرشفة (لا يمكن الحذف النهائي حفاظاً على الأثر المحاسبي).
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={deleteModal.type === 'product' ? confirmDeleteProduct : deleteModal.type === 'pathway' ? confirmDeletePathway : deleteModal.type === 'treasury' ? confirmDeleteTreasury : deleteModal.type === 'customer' ? confirmDeleteCustomer : confirmDeleteSupplier} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs">أرشفة الآن</button>
                  <button onClick={() => setDeleteModal(null)} className="bg-slate-100 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs">إلغاء</button>
                </div>
              </>
            ) : (
              <>
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-xs font-bold text-slate-700">لا استخدام سابق. سيتم الحذف النهائي.</div>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={deleteModal.type === 'product' ? confirmDeleteProduct : deleteModal.type === 'pathway' ? confirmDeletePathway : deleteModal.type === 'treasury' ? confirmDeleteTreasury : deleteModal.type === 'customer' ? confirmDeleteCustomer : confirmDeleteSupplier} className="flex-1 bg-rose-600 text-white font-bold py-2.5 rounded-xl text-xs">حذف نهائي</button>
                  <button onClick={() => setDeleteModal(null)} className="bg-slate-100 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs">إلغاء</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-3xl border border-slate-200 flex flex-wrap justify-between items-center gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-black text-slate-900">مركز الإعدادات والتهيئة</h1>
          <p className="text-sm text-slate-500 font-bold mt-1">إدارة الشجيرات والخزائن والمسارات والأرصدة</p>
        </div>
        <button onClick={() => setShowArchived(!showArchived)} className={`font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 border-2 ${showArchived ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
          {showArchived ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          <span>{showArchived ? 'إخفاء المؤرشف' : 'إظهار المؤرشف'}</span>
        </button>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-6">
        {/* Level 1: Groups */}
        <div className="flex flex-wrap gap-2 border-b-2 border-slate-300 pb-3 flex-wrap">
          {tabGroups.map(g => (
            <button
              key={g.key}
              onClick={() => switchGroup(g.key)}
              className={
                'px-4 py-2.5 rounded-xl text-xs font-black transition ' +
                (activeGroup === g.key
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
              }
            >
              {g.label}
            </button>
          ))}
        </div>

        {/* Level 2: Sub-tabs */}
        <div className="flex flex-wrap gap-3 pt-1 pb-2 border-b border-slate-200 flex-wrap">
          {currentGroup.tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={
                'pb-2 text-xs font-black transition ' +
                (activeTab === t.key
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-slate-400 hover:text-slate-600')
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'products' && (
          <div className="space-y-6">
            <form onSubmit={handleAddProduct} className="bg-slate-50 p-6 rounded-3xl border space-y-4">
              <h3 className="text-xs font-black text-slate-800">إضافة صنف جديد (الكود يُولَّد تلقائياً)</h3>
              <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-bold">
                <div><label className="block text-slate-700 mb-1.5">الاسم:</label><input type="text" value={pName} onChange={(e) => setPName(e.target.value)} className="w-full border rounded-xl px-3 bg-white h-11" required /></div>
                <div><label className="block text-slate-700 mb-1.5">طريقة التسعير:</label><select value={pType} onChange={(e) => setPType(e.target.value)} className="w-full border rounded-xl px-2 bg-white h-11"><option value="multiplier">معامل ضرب في البورصة</option><option value="addition">إضافة ثابتة</option><option value="fixed">سعر حر</option></select></div>
                <div><label className="block text-slate-700 mb-1.5">المعامل:</label><input type="number" step="0.05" value={pValue} onChange={(e) => setPValue(e.target.value)} className="w-full border rounded-xl px-3 bg-white h-11 font-mono" required /></div>
              </div>
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs">إدراج الصنف</button>
            </form>
            <div className="overflow-x-auto border rounded-2xl">
              <table className="w-full text-right text-xs min-w-[600px]">
                <thead className="bg-slate-800 text-white font-bold"><tr><th className="p-3">الكود</th><th className="p-3">الاسم</th><th className="p-3">طريقة التسعير</th><th className="p-3">المعامل</th><th className="p-3 text-center">معامل التوزيع</th><th className="p-3 text-center">إجراءات</th></tr></thead>
                <tbody className="divide-y divide-slate-200">
                  {displayedProducts.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-slate-400 font-sans">لا توجد أصناف</td></tr>}
                  {displayedProducts.map(p => {
                    const active = p.is_active !== false;
                    return (
                      <tr key={p.id} className={!active ? 'bg-slate-50 opacity-70' : ''}>
                        <td className="p-3 font-bold text-slate-700 font-mono">{p.product_code}</td>
                        <td className="p-3 font-bold text-slate-800">{p.product_name_ar}{!active && <span className="mr-2 text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-lg font-bold">مؤرشف</span>}</td>
                        <td className="p-3 text-slate-600 font-bold">{p.pricing_type}</td>
                        <td className="p-3 font-bold text-slate-900 font-mono">{p.pricing_value}</td>
                        <td className="p-3 text-center font-bold text-slate-700 font-mono">{p.allocation_weight || 1}</td>
                        <td className="p-3 text-center">
                          {active ? (
                            <div className="flex gap-1 justify-center flex-wrap">
                              <button onClick={() => setEditingProduct({ ...p })} className="text-slate-700 hover:bg-slate-100 p-2 rounded-lg"><Pencil className="w-4 h-4" /></button>
                              <button onClick={() => requestDeleteProduct(p)} className="text-rose-600 hover:bg-rose-50 p-2 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          ) : (
                            <button onClick={() => reactivateProduct(p.product_code)} className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 mx-auto flex-wrap"><RefreshCw className="w-3 h-3" /><span>استعادة</span></button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'treasuries' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-200 flex-wrap gap-2 flex-wrap">
              <div>
                <h3 className="text-sm font-black text-slate-800">شجرة الخزائن والحسابات النقدية</h3>
                <p className="text-xs text-slate-600 font-bold mt-1">إجمالي السيولة: <span className="font-mono text-base">{totalCash.toLocaleString()} ج</span></p>
              </div>
              <button onClick={() => setShowNewTreasuryForm(!showNewTreasuryForm)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 flex-wrap"><Plus className="w-4 h-4" /><span>خزينة جديدة</span></button>
            </div>
            {showNewTreasuryForm && (
              <form onSubmit={handleAddTreasury} className="bg-slate-50 p-5 rounded-2xl border space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <div><label className="block text-xs font-bold text-slate-700 mb-1.5">الاسم:</label><input type="text" value={newTreasuryName} onChange={(e) => setNewTreasuryName(e.target.value)} className="w-full border-2 rounded-xl px-4 text-sm font-bold bg-white h-11" required /></div>
                  <div><label className="block text-xs font-bold text-slate-700 mb-1.5">النوع:</label>
                    <select value={newTreasuryType} onChange={(e) => setNewTreasuryType(e.target.value)} className="w-full border-2 rounded-xl px-3 text-sm font-bold bg-white h-11">
                      <option value="نقدية سائلة">نقدية سائلة</option>
                      <option value="حساب بنكي">حساب بنكي</option>
                      <option value="عهدة">عهدة</option>
                    </select>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs h-11">حفظ</button>
                    <button type="button" onClick={() => setShowNewTreasuryForm(false)} className="bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs h-11">إلغاء</button>
                  </div>
                </div>
              </form>
            )}
            <div className="overflow-x-auto border rounded-2xl">
              <table className="w-full text-right text-xs min-w-[600px]">
                <thead className="bg-slate-800 text-white font-bold"><tr><th className="p-3">الكود</th><th className="p-3">الاسم</th><th className="p-3">النوع</th><th className="p-3">الرصيد</th><th className="p-3 text-center">إجراءات</th></tr></thead>
                <tbody className="divide-y divide-slate-200">
                  {displayedTreasuries.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-slate-400 font-sans">لا توجد خزائن</td></tr>}
                  {displayedTreasuries.map(t => {
                    const active = t.is_active !== false;
                    const balance = Number(treasuryBalances[t.treasury_code] || 0);
                    return (
                      <tr key={t.id} className={!active ? 'bg-slate-50 opacity-70' : ''}>
                        <td className="p-3 font-bold text-slate-700 font-mono">{t.treasury_code}</td>
                        <td className="p-3 font-bold text-slate-800">{t.name_ar}{!active && <span className="mr-2 text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-lg">مؤرشف</span>}</td>
                        <td className="p-3 text-slate-600 font-bold">{t.account_type}</td>
                        <td className="p-3 font-black text-slate-900 font-mono">{balance.toLocaleString()} ج</td>
                        <td className="p-3 text-center">
                          {active ? (
                            <div className="flex gap-1 justify-center flex-wrap">
                              <button onClick={() => setEditingTreasury({ ...t })} className="text-slate-700 hover:bg-slate-100 p-2 rounded-lg"><Pencil className="w-4 h-4" /></button>
                              <button onClick={() => requestDeleteTreasury(t)} className="text-rose-600 hover:bg-rose-50 p-2 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          ) : (
                            <button onClick={() => reactivateTreasury(t.treasury_code)} className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 mx-auto flex-wrap"><RefreshCw className="w-3 h-3" /><span>استعادة</span></button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'suppliers' && (
          <div className="space-y-6">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <h3 className="text-sm font-black text-slate-800">شجرة الموردين</h3>
              <p className="text-xs text-slate-600 font-bold mt-1">لإضافة مورد جديد، استخدم معالج الأرصدة الافتتاحية أو أمر توريد</p>
            </div>
            <div className="overflow-x-auto border rounded-2xl">
              <table className="w-full text-right text-xs min-w-[600px]">
                <thead className="bg-slate-800 text-white font-bold"><tr><th className="p-3">الاسم</th><th className="p-3">الهاتف</th><th className="p-3">الرصيد المستحق</th><th className="p-3">الحالة</th><th className="p-3 text-center">إجراءات</th></tr></thead>
                <tbody className="divide-y divide-slate-200">
                  {displayedSuppliers.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-slate-400 font-sans">لا يوجد موردون</td></tr>}
                  {displayedSuppliers.map(s => {
                    const active = s.is_active !== false;
                    return (
                      <tr key={s.id} className={!active ? 'bg-slate-50 opacity-70' : ''}>
                        <td className="p-3 font-bold text-slate-800">{s.name}{!active && <span className="mr-2 text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-lg">مؤرشف</span>}</td>
                        <td className="p-3 text-slate-600 font-mono">{s.phone || '---'}</td>
                        <td className="p-3 font-bold text-slate-800 font-mono">{Number(s.balance || 0).toLocaleString()} ج</td>
                        <td className="p-3">{active ? <span className="text-slate-700 font-bold text-[11px]">نشط</span> : <span className="text-slate-500 font-bold text-[11px]">مؤرشف</span>}</td>
                        <td className="p-3 text-center">
                          {active ? (
                            <div className="flex gap-1 justify-center flex-wrap">
                              <button onClick={() => setEditingSupplier({ ...s })} className="text-slate-700 hover:bg-slate-100 p-2 rounded-lg"><Pencil className="w-4 h-4" /></button>
                              <button onClick={() => requestDeleteSupplier(s)} className="text-rose-600 hover:bg-rose-50 p-2 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          ) : (
                            <button onClick={() => reactivateSupplier(s.id)} className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 mx-auto flex-wrap"><RefreshCw className="w-3 h-3" /><span>استعادة</span></button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'customers' && (
          <div className="space-y-6">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <h3 className="text-sm font-black text-slate-800">شجرة العملاء</h3>
              <p className="text-xs text-slate-600 font-bold mt-1">لإضافة عميل جديد، استخدم معالج الأرصدة الافتتاحية أو فاتورة مبيعات</p>
            </div>
            <div className="overflow-x-auto border rounded-2xl">
              <table className="w-full text-right text-xs min-w-[600px]">
                <thead className="bg-slate-800 text-white font-bold"><tr><th className="p-3">الاسم</th><th className="p-3">الهاتف</th><th className="p-3">الرصيد المدين</th><th className="p-3">سقف الائتمان</th><th className="p-3">الحالة</th><th className="p-3 text-center">إجراءات</th></tr></thead>
                <tbody className="divide-y divide-slate-200">
                  {displayedCustomers.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-slate-400 font-sans">لا يوجد عملاء</td></tr>}
                  {displayedCustomers.map(c => {
                    const active = c.is_active !== false;
                    return (
                      <tr key={c.id} className={!active ? 'bg-slate-50 opacity-70' : ''}>
                        <td className="p-3 font-bold text-slate-800">{c.name}{!active && <span className="mr-2 text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-lg">مؤرشف</span>}</td>
                        <td className="p-3 text-slate-600 font-mono">{c.phone || '---'}</td>
                        <td className="p-3 font-bold text-slate-800 font-mono">{Number(c.balance || 0).toLocaleString()} ج</td>
                        <td className="p-3 text-slate-700 font-mono">{Number(c.credit_limit || 50000).toLocaleString()} ج</td>
                        <td className="p-3">{active ? <span className="text-slate-700 font-bold text-[11px]">نشط</span> : <span className="text-slate-500 font-bold text-[11px]">مؤرشف</span>}</td>
                        <td className="p-3 text-center">
                          {active ? (
                            <div className="flex gap-1 justify-center flex-wrap">
                              <button onClick={() => setEditingCustomer({ ...c })} className="text-slate-700 hover:bg-slate-100 p-2 rounded-lg"><Pencil className="w-4 h-4" /></button>
                              <button onClick={() => requestDeleteCustomer(c)} className="text-rose-600 hover:bg-rose-50 p-2 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          ) : (
                            <button onClick={() => reactivateCustomer(c.id)} className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 mx-auto flex-wrap"><RefreshCw className="w-3 h-3" /><span>استعادة</span></button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'pathways' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-200 flex-wrap gap-2 flex-wrap">
              <div><h3 className="text-sm font-black text-slate-800">مسارات التجهيز والتقطيع</h3><p className="text-xs text-slate-600 font-bold mt-1">الأصناف المؤرشفة لا تظهر إلا عند التفعيل</p></div>
              <button onClick={() => setShowNewPathwayForm(!showNewPathwayForm)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 flex-wrap"><Plus className="w-4 h-4" /><span>مسار جديد</span></button>
            </div>
            {showNewPathwayForm && (
              <form onSubmit={handleCreatePathway} className="bg-slate-50 p-5 rounded-2xl border space-y-3">
                <div className="flex gap-3 items-end flex-wrap">
                  <div className="flex-1"><label className="block text-xs font-bold text-slate-700 mb-1.5">اسم المسار:</label><input type="text" value={newPathwayName} onChange={(e) => setNewPathwayName(e.target.value)} className="w-full border-2 rounded-xl px-4 text-sm font-bold bg-white h-11" required /></div>
                  <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs h-11">حفظ</button>
                  <button type="button" onClick={() => setShowNewPathwayForm(false)} className="bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs h-11">إلغاء</button>
                </div>
              </form>
            )}
            <div className="space-y-3">
              {displayedPathways.length === 0 && <p className="text-center text-slate-400 py-6 font-sans">لا توجد مسارات</p>}
              {displayedPathways.map(pw => {
                const items = getPathwayProductsVisible(pw.pathway_code);
                const total = getPathwayTotal(pw.pathway_code);
                const isExpanded = expandedPathway === pw.pathway_code;
                const available = getAvailableProductsForPathway(pw.pathway_code);
                const active = pw.is_active !== false;
                return (
                  <div key={pw.pathway_code} className={`border-2 rounded-2xl overflow-hidden ${!active ? 'border-slate-200 bg-slate-50' : 'border-slate-200'}`}>
                    <div className="bg-slate-50 p-4 flex justify-between items-center cursor-pointer flex-wrap gap-2 flex-wrap" onClick={() => active && setExpandedPathway(isExpanded ? null : pw.pathway_code)}>
                      <div className="flex items-center gap-3 flex-wrap">
                        {active && (isExpanded ? <ChevronDown className="w-5 h-5 text-slate-700" /> : <ChevronLeft className="w-5 h-5 text-slate-400" />)}
                        <div><h4 className="text-sm font-black text-slate-900">{pw.name_ar}{!active && <span className="mr-2 text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-lg">مؤرشف</span>}</h4><span className="text-[11px] font-bold text-slate-500">{items.length} أصناف • النسب: {total.toFixed(1)}% • الفاقد: {(100 - total).toFixed(1)}%</span></div>
                      </div>
                      <div>
                        {active ? (
                          <div className="flex gap-1 flex-wrap">
                            <button onClick={(e) => { e.stopPropagation(); setEditingPathway({ ...pw }); }} className="text-slate-700 hover:bg-slate-100 p-2 rounded-lg" title="تعديل الاسم"><Pencil className="w-4 h-4" /></button>
                            <button onClick={(e) => { e.stopPropagation(); requestDeletePathway(pw); }} className="text-rose-600 hover:bg-rose-50 p-2 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        ) : (
                          <button onClick={(e) => { e.stopPropagation(); reactivatePathway(pw.pathway_code); }} className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 flex-wrap"><RefreshCw className="w-3 h-3" /><span>استعادة</span></button>
                        )}
                      </div>
                    </div>
                    {isExpanded && active && (
                      <div className="p-4 bg-white space-y-3">
                        {items.length === 0 ? (<p className="text-xs text-slate-400 text-center py-4 font-bold">لا أصناف بعد</p>) : (
                          <div className="space-y-2">
                            {items.map(item => (
                              <div key={item.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border flex-wrap gap-2 flex-wrap">
                                <div className="flex items-center gap-2 flex-wrap"><Package className="w-4 h-4 text-slate-700" /><span className="text-xs font-bold text-slate-800">{getProductName(item.product_code)}</span><span className="text-[10px] text-slate-400 font-mono">{item.product_code}</span></div>
                                <div className="flex items-center gap-3 flex-wrap"><span className="text-sm font-black text-slate-800 font-mono">{(Number(item.expected_ratio) * 100).toFixed(1)}%</span><button onClick={() => handleRemoveProductFromPathway(pw.pathway_code, item.product_code)} className="text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg"><X className="w-4 h-4" /></button></div>
                              </div>
                            ))}
                          </div>
                        )}
                        {addingToPathway === pw.pathway_code ? (
                          <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-200 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div><label className="block text-xs font-bold text-slate-700 mb-1">الصنف:</label><select value={selectedProductToAdd} onChange={(e) => setSelectedProductToAdd(e.target.value)} className="w-full border rounded-xl px-3 bg-white h-10 text-xs font-bold"><option value="">— اختر —</option>{available.map(p => (<option key={p.product_code} value={p.product_code}>{p.product_name_ar}</option>))}</select></div>
                              <div><label className="block text-xs font-bold text-slate-700 mb-1">النسبة (%):</label><input type="number" step="0.5" value={ratioToAdd} onChange={(e) => setRatioToAdd(e.target.value)} className="w-full border rounded-xl px-3 bg-white h-10 text-xs font-bold font-mono" /></div>
                            </div>
                            <div className="flex gap-2 flex-wrap"><button onClick={() => handleAddProductToPathway(pw.pathway_code)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 rounded-lg text-xs">إضافة</button><button onClick={() => { setAddingToPathway(null); setSelectedProductToAdd(''); }} className="bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-lg text-xs">إلغاء</button></div>
                          </div>
                        ) : (
                          <button onClick={() => { setAddingToPathway(pw.pathway_code); setSelectedProductToAdd(available[0]?.product_code || ''); }} disabled={available.length === 0} className="w-full py-2.5 bg-slate-50 text-slate-700 font-bold rounded-xl border border-dashed border-slate-300 text-xs disabled:opacity-50">{available.length === 0 ? 'كل الأصناف مُضافة' : '+ إضافة صنف للمسار'}</button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'logistics' && (
          <div className="space-y-6">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-700 font-bold">القيم تُستخدم تلقائياً في شاشة الإنتاج، ويمكن تعديلها لكل دفعة على حدة.</div>
            <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-bold">
              <div className="bg-slate-50 p-5 rounded-2xl border space-y-1.5"><label className="block text-slate-700 font-bold flex items-center gap-1.5 flex-wrap"><Truck className="w-4 h-4 text-slate-700" /> تكلفة الشحن والتفريغ (ج):</label><input type="number" value={transCost} onChange={(e) => setTransCost(e.target.value)} className="w-full border-2 rounded-xl px-4 bg-white h-12 font-mono text-base" /></div>
              <div className="bg-slate-50 p-5 rounded-2xl border space-y-1.5"><label className="block text-slate-700 font-bold">أجور عمالة التنزيل (ج):</label><input type="number" value={labCost} onChange={(e) => setLabCost(e.target.value)} className="w-full border-2 rounded-xl px-4 bg-white h-12 font-mono text-base" /></div>
              <div className="bg-slate-50 p-5 rounded-2xl border space-y-1.5"><label className="block text-slate-700 font-bold">رسوم الوساطة التجارية (ج):</label><input type="number" value={brokCost} onChange={(e) => setBrokCost(e.target.value)} className="w-full border-2 rounded-xl px-4 bg-white h-12 font-mono text-base" /></div>
            </div>
            <button onClick={saveLogistics} className="bg-slate-900 text-white font-bold px-8 py-3 rounded-2xl text-xs">حفظ التكاليف</button>
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="space-y-6">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-700 font-bold flex items-center gap-2 flex-wrap">
              <Bell className="w-4 h-4 text-slate-700" />
              <span className="text-sm">اضغط أيقونة الجرس بجانب أي تنبيه لتفعيله أو إيقافه. الأرقام تُعدَّل بشكل مستقل.</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-2xl border-2 border-slate-200">
                <div className="flex flex-wrap items-center gap-4 flex-wrap">
                  <button onClick={() => setAlertFreshOn(!alertFreshOn)} className={`w-12 h-12 rounded-xl flex items-center justify-center transition shrink-0 ${alertFreshOn ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>
                    {alertFreshOn ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                  </button>
                  <div className="flex-1 min-w-[200px]">
                    <h3 className="text-base font-bold text-slate-800">ساعات صلاحية الطازج في الثلاجة</h3>
                    <p className="text-sm text-slate-500 font-medium mt-0.5">يظهر تنبيه في المخازن عند تجاوز هذه المدة بضرورة تحويل الصنف لمجمد.</p>
                  </div>
                  <input type="number" value={alertFresh} onChange={(e) => setAlertFresh(e.target.value)} disabled={!alertFreshOn} className="w-full border-2 border-slate-200 rounded-xl px-3 bg-white h-12 font-mono text-base font-bold text-center disabled:bg-slate-50 disabled:text-slate-400" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border-2 border-slate-200">
                <div className="flex flex-wrap items-center gap-4 flex-wrap">
                  <button onClick={() => setAlertStockOn(!alertStockOn)} className={`w-12 h-12 rounded-xl flex items-center justify-center transition shrink-0 ${alertStockOn ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>
                    {alertStockOn ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                  </button>
                  <div className="flex-1 min-w-[200px]">
                    <h3 className="text-base font-bold text-slate-800">حد إعادة الطلب للمخزون (كجم)</h3>
                    <p className="text-sm text-slate-500 font-medium mt-0.5">ينبّه النظام عند نقص أي صنف في الثلاجة عن هذا الحد.</p>
                  </div>
                  <input type="number" value={alertStock} onChange={(e) => setAlertStock(e.target.value)} disabled={!alertStockOn} className="w-full border-2 border-slate-200 rounded-xl px-3 bg-white h-12 font-mono text-base font-bold text-center disabled:bg-slate-50 disabled:text-slate-400" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border-2 border-slate-200">
                <div className="flex flex-wrap items-center gap-4 flex-wrap">
                  <button onClick={() => setAlertVarianceOn(!alertVarianceOn)} className={`w-12 h-12 rounded-xl flex items-center justify-center transition shrink-0 ${alertVarianceOn ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>
                    {alertVarianceOn ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                  </button>
                  <div className="flex-1 min-w-[200px]">
                    <h3 className="text-base font-bold text-slate-800">الحد الأقصى لانحراف الفاقد (%)</h3>
                    <p className="text-sm text-slate-500 font-medium mt-0.5">إذا تجاوز الفاقد في التشفية هذه النسبة يُصنَّف كـ "هدر حرج".</p>
                  </div>
                  <input type="number" step="0.5" value={alertVariance} onChange={(e) => setAlertVariance(e.target.value)} disabled={!alertVarianceOn} className="w-full border-2 border-slate-200 rounded-xl px-3 bg-white h-12 font-mono text-base font-bold text-center disabled:bg-slate-50 disabled:text-slate-400" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border-2 border-slate-200">
                <div className="flex flex-wrap items-center gap-4 flex-wrap">
                  <button onClick={() => setAlertCreditOn(!alertCreditOn)} className={`w-12 h-12 rounded-xl flex items-center justify-center transition shrink-0 ${alertCreditOn ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>
                    {alertCreditOn ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                  </button>
                  <div className="flex-1 min-w-[200px]">
                    <h3 className="text-base font-bold text-slate-800">سقف الائتمان الافتراضي (ج)</h3>
                    <p className="text-sm text-slate-500 font-medium mt-0.5">للعملاء الجدد. كل عميل له سقفه الخاص من شجرة العملاء.</p>
                  </div>
                  <input type="number" value={alertCredit} onChange={(e) => setAlertCredit(e.target.value)} disabled={!alertCreditOn} className="w-full border-2 border-slate-200 rounded-xl px-3 bg-white h-12 font-mono text-base font-bold text-center disabled:bg-slate-50 disabled:text-slate-400" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border-2 border-slate-200">
                <div className="flex flex-wrap items-center gap-4 flex-wrap">
                  <button onClick={() => setAlertDebtDaysOn(!alertDebtDaysOn)} className={`w-12 h-12 rounded-xl flex items-center justify-center transition shrink-0 ${alertDebtDaysOn ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>
                    {alertDebtDaysOn ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                  </button>
                  <div className="flex-1 min-w-[200px]">
                    <h3 className="text-base font-bold text-slate-800">أيام المديونيات الراكدة</h3>
                    <p className="text-sm text-slate-500 font-medium mt-0.5">تنبيه عند مرور هذه الأيام على فاتورة آجلة بدون تحصيل.</p>
                  </div>
                  <input type="number" value={alertDebtDays} onChange={(e) => setAlertDebtDays(e.target.value)} disabled={!alertDebtDaysOn} className="w-full border-2 border-slate-200 rounded-xl px-3 bg-white h-12 font-mono text-base font-bold text-center disabled:bg-slate-50 disabled:text-slate-400" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border-2 border-slate-200">
                <div className="flex flex-wrap items-center gap-4 flex-wrap">
                  <button onClick={() => setAlertMinTreasuryOn(!alertMinTreasuryOn)} className={`w-12 h-12 rounded-xl flex items-center justify-center transition shrink-0 ${alertMinTreasuryOn ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>
                    {alertMinTreasuryOn ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                  </button>
                  <div className="flex-1 min-w-[200px]">
                    <h3 className="text-base font-bold text-slate-800">الحد الأدنى لرصيد الخزينة (ج)</h3>
                    <p className="text-sm text-slate-500 font-medium mt-0.5">تنبيه عند نزول رصيد أي خزينة تحت هذا الحد.</p>
                  </div>
                  <input type="number" value={alertMinTreasury} onChange={(e) => setAlertMinTreasury(e.target.value)} disabled={!alertMinTreasuryOn} className="w-full border-2 border-slate-200 rounded-xl px-3 bg-white h-12 font-mono text-base font-bold text-center disabled:bg-slate-50 disabled:text-slate-400" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border-2 border-slate-200">
                <div className="flex flex-wrap items-center gap-4 flex-wrap">
                  <button onClick={() => setAlertCreditWarningOn(!alertCreditWarningOn)} className={`w-12 h-12 rounded-xl flex items-center justify-center transition shrink-0 ${alertCreditWarningOn ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>
                    {alertCreditWarningOn ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                  </button>
                  <div className="flex-1 min-w-[200px]">
                    <h3 className="text-base font-bold text-slate-800">نسبة تحذير الائتمان (%)</h3>
                    <p className="text-sm text-slate-500 font-medium mt-0.5">تنبيه مبكر عند وصول العميل لهذه النسبة من سقفه.</p>
                  </div>
                  <input type="number" step="5" value={alertCreditWarning} onChange={(e) => setAlertCreditWarning(e.target.value)} disabled={!alertCreditWarningOn} className="w-full border-2 border-slate-200 rounded-xl px-3 bg-white h-12 font-mono text-base font-bold text-center disabled:bg-slate-50 disabled:text-slate-400" />
                </div>
              </div>
            </div>
            
            <button onClick={saveAlerts} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3 rounded-2xl text-sm">حفظ إعدادات التنبيهات</button>
          </div>
        )}

        {activeTab === 'opening' && (
          <div className="space-y-5">
            {openingLocked && (
              <div className="bg-slate-100 border-2 border-slate-300 p-5 rounded-3xl flex items-center gap-3 flex-wrap">
                <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white font-black">✓</div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">تم اعتماد الأرصدة الافتتاحية وقفلها</h3>
                  <p className="text-xs font-bold text-slate-600 mt-0.5">للتفعيل مجدداً، يجب تصفير النظام بأمر SQL من Supabase.</p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 bg-slate-100 p-2 rounded-2xl flex-wrap">
              <button onClick={() => setOpeningSubTab('treasuries')} className={`flex-1 min-w-[140px] py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 ${openingSubTab === 'treasuries' ? 'bg-white text-slate-900 shadow' : 'text-slate-600'}`}><Wallet className="w-4 h-4" /><span>رصيد الخزائن</span></button>
              <button onClick={() => setOpeningSubTab('customers')} className={`flex-1 min-w-[140px] py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 ${openingSubTab === 'customers' ? 'bg-white text-slate-900 shadow' : 'text-slate-600'}`}><Users className="w-4 h-4" /><span>مديونيات العملاء</span></button>
              <button onClick={() => setOpeningSubTab('suppliers')} className={`flex-1 min-w-[140px] py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 ${openingSubTab === 'suppliers' ? 'bg-white text-slate-900 shadow' : 'text-slate-600'}`}><Truck className="w-4 h-4" /><span>مستحقات الموردين</span></button>
              <button onClick={() => setOpeningSubTab('inventory')} className={`flex-1 min-w-[140px] py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 ${openingSubTab === 'inventory' ? 'bg-white text-slate-900 shadow' : 'text-slate-600'}`}><Boxes className="w-4 h-4" /><span>بضاعة الثلاجة</span></button>
            </div>

            <div className="space-y-5">
              {openingSubTab === 'treasuries' && (
                <div className="bg-slate-50 p-5 rounded-3xl border space-y-3">
                  <div className="flex justify-between items-center border-b pb-2 flex-wrap gap-2 flex-wrap">
                    <div>
                      <h3 className="text-sm font-black text-slate-800">الأرصدة الافتتاحية للخزائن</h3>
                      <p className="text-[11px] text-slate-500 font-bold mt-1">كل خزينة في "شجرة الخزائن" تظهر هنا تلقائياً</p>
                    </div>
                    {!openingLocked && (
                      <button type="button" onClick={() => { setShowNewTreasuryForm(true); setActiveTab('treasuries'); }} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1 flex-wrap">
                        <Plus className="w-3.5 h-3.5" /><span>إنشاء خزينة</span>
                      </button>
                    )}
                  </div>
                  {openTreasuries.length === 0 && <p className="text-xs text-slate-400 text-center py-3 font-bold">لا توجد خزائن بعد</p>}
                  {openTreasuries.map((t, idx) => {
                    const hasValue = Number(t.balance) > 0;
                    return (
                      <div key={t.code} className={'p-4 rounded-2xl border-2 transition flex flex-wrap gap-3 items-center ' + (hasValue ? 'bg-emerald-50/60 border-emerald-300' : 'bg-white border-slate-200')}>
                        <div className="flex-1 min-w-[200px]">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            {t.type === 'حساب بنكي' ? <Building2 className={'w-4 h-4 ' + (hasValue ? 'text-emerald-700' : 'text-slate-700')} /> : t.type === 'عهدة' ? <UserCheck className={'w-4 h-4 ' + (hasValue ? 'text-emerald-700' : 'text-slate-700')} /> : <Wallet className={'w-4 h-4 ' + (hasValue ? 'text-emerald-700' : 'text-slate-700')} />}
                            <span className={'text-sm font-bold ' + (hasValue ? 'text-emerald-800' : 'text-slate-800')}>{t.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{t.code}</span>
                          </div>
                          <span className={'text-[11px] font-bold ' + (hasValue ? 'text-emerald-600' : 'text-slate-500')}>{t.type}</span>
                        </div>
                        <div>
                          <label className={'block text-[10px] font-bold mb-0.5 ' + (hasValue ? 'text-emerald-700' : 'text-slate-500')}>الرصيد الافتتاحي (ج)</label>
                          <input type="number" step="0.01" value={t.balance} disabled={openingLocked} onChange={(e) => { const u = [...openTreasuries]; u[idx].balance = Number(e.target.value); setOpenTreasuries(u); }} className={'w-40 border-2 rounded-xl px-3 text-sm font-bold font-mono h-11 ' + (hasValue ? 'border-emerald-300 bg-white text-emerald-900' : 'border-slate-300 disabled:bg-slate-100')} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {openingSubTab === 'customers' && (
                <div className="bg-slate-50 p-5 rounded-3xl border space-y-3">
                  <div className="flex justify-between items-center border-b pb-2 flex-wrap gap-2 flex-wrap">
                    <div>
                      <h3 className="text-sm font-black text-slate-800">مديونيات العملاء المرحّلة</h3>
                      <p className="text-[11px] text-slate-500 font-bold mt-1">كل عميل يُسجَّل كحركة افتتاحية في كشف حسابه</p>
                    </div>
                    {!openingLocked && (
                      <button type="button" onClick={() => setOpenCustomers([...openCustomers, { name: '', phone: '', balance: 0 }])} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1 flex-wrap"><Plus className="w-3.5 h-3.5" /><span>عميل</span></button>
                    )}
                  </div>
                  {openCustomers.map((c, idx) => {
                    const hasValue = Number(c.balance) > 0;
                    return (
                      <div key={idx} className={'p-3 rounded-2xl border-2 transition space-y-2 ' + (hasValue ? 'bg-emerald-50/60 border-emerald-300' : 'bg-white border-slate-200')}>
                        <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                          <div>
                            <label className={'block text-[10px] font-bold mb-0.5 ' + (hasValue ? 'text-emerald-700' : 'text-slate-500')}>اسم العميل</label>
                            <input type="text" value={c.name} disabled={openingLocked} onChange={(e) => { const u = [...openCustomers]; u[idx].name = e.target.value; setOpenCustomers(u); }} className={'w-full border rounded-xl px-3 text-xs font-bold h-10 ' + (hasValue ? 'border-emerald-300 bg-white text-emerald-900' : 'border-slate-200 disabled:bg-slate-100')} />
                          </div>
                          <div>
                            <label className={'block text-[10px] font-bold mb-0.5 ' + (hasValue ? 'text-emerald-700' : 'text-slate-500')}>الهاتف</label>
                            <input type="text" value={c.phone} disabled={openingLocked} onChange={(e) => { const u = [...openCustomers]; u[idx].phone = e.target.value; setOpenCustomers(u); }} className={'w-full border rounded-xl px-3 text-xs font-bold h-10 ' + (hasValue ? 'border-emerald-300 bg-white text-emerald-900' : 'border-slate-200 disabled:bg-slate-100')} />
                          </div>
                          <div className="flex gap-2 items-end flex-wrap">
                            <div className="flex-1">
                              <label className={'block text-[10px] font-bold mb-0.5 ' + (hasValue ? 'text-emerald-700' : 'text-slate-500')}>المديونية الافتتاحية (ج)</label>
                              <input type="number" value={c.balance} disabled={openingLocked} onChange={(e) => { const u = [...openCustomers]; u[idx].balance = Number(e.target.value); setOpenCustomers(u); }} className={'w-full border-2 rounded-xl px-3 text-xs font-bold font-mono h-10 ' + (hasValue ? 'border-emerald-300 bg-white text-emerald-900' : 'border-slate-300 disabled:bg-slate-100')} />
                            </div>
                            {!openingLocked && openCustomers.length > 1 && <button type="button" onClick={() => setOpenCustomers(openCustomers.filter((_, i) => i !== idx))} className="text-rose-600 p-2 hover:bg-rose-50 rounded-lg mb-1"><Trash2 className="w-4 h-4" /></button>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {openingSubTab === 'suppliers' && (
                <div className="bg-slate-50 p-5 rounded-3xl border space-y-3">
                  <div className="flex justify-between items-center border-b pb-2 flex-wrap gap-2 flex-wrap">
                    <div>
                      <h3 className="text-sm font-black text-slate-800">مستحقات الموردين المرحّلة</h3>
                      <p className="text-[11px] text-slate-500 font-bold mt-1">كل مورد يُسجَّل كحركة افتتاحية في كشف حسابه</p>
                    </div>
                    {!openingLocked && (
                      <button type="button" onClick={() => setOpenSuppliers([...openSuppliers, { name: '', phone: '', balance: 0 }])} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1 flex-wrap"><Plus className="w-3.5 h-3.5" /><span>مورد</span></button>
                    )}
                  </div>
                  {openSuppliers.map((s, idx) => {
                    const hasValue = Number(s.balance) > 0;
                    return (
                      <div key={idx} className={'p-3 rounded-2xl border-2 transition space-y-2 ' + (hasValue ? 'bg-emerald-50/60 border-emerald-300' : 'bg-white border-slate-200')}>
                        <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                          <div>
                            <label className={'block text-[10px] font-bold mb-0.5 ' + (hasValue ? 'text-emerald-700' : 'text-slate-500')}>اسم المورد</label>
                            <input type="text" value={s.name} disabled={openingLocked} onChange={(e) => { const u = [...openSuppliers]; u[idx].name = e.target.value; setOpenSuppliers(u); }} className={'w-full border rounded-xl px-3 text-xs font-bold h-10 ' + (hasValue ? 'border-emerald-300 bg-white text-emerald-900' : 'border-slate-200 disabled:bg-slate-100')} />
                          </div>
                          <div>
                            <label className={'block text-[10px] font-bold mb-0.5 ' + (hasValue ? 'text-emerald-700' : 'text-slate-500')}>الهاتف</label>
                            <input type="text" value={s.phone} disabled={openingLocked} onChange={(e) => { const u = [...openSuppliers]; u[idx].phone = e.target.value; setOpenSuppliers(u); }} className={'w-full border rounded-xl px-3 text-xs font-bold h-10 ' + (hasValue ? 'border-emerald-300 bg-white text-emerald-900' : 'border-slate-200 disabled:bg-slate-100')} />
                          </div>
                          <div className="flex gap-2 items-end flex-wrap">
                            <div className="flex-1">
                              <label className={'block text-[10px] font-bold mb-0.5 ' + (hasValue ? 'text-emerald-700' : 'text-slate-500')}>المستحق الافتتاحي (ج)</label>
                              <input type="number" value={s.balance} disabled={openingLocked} onChange={(e) => { const u = [...openSuppliers]; u[idx].balance = Number(e.target.value); setOpenSuppliers(u); }} className={'w-full border-2 rounded-xl px-3 text-xs font-bold font-mono h-10 ' + (hasValue ? 'border-emerald-300 bg-white text-emerald-900' : 'border-slate-300 disabled:bg-slate-100')} />
                            </div>
                            {!openingLocked && openSuppliers.length > 1 && <button type="button" onClick={() => setOpenSuppliers(openSuppliers.filter((_, i) => i !== idx))} className="text-rose-600 p-2 hover:bg-rose-50 rounded-lg mb-1"><Trash2 className="w-4 h-4" /></button>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {openingSubTab === 'inventory' && (
                <div className="bg-slate-50 p-5 rounded-3xl border space-y-3">
                  <div className="flex justify-between items-center border-b pb-2 flex-wrap gap-2 flex-wrap">
                    <div>
                      <h3 className="text-sm font-black text-slate-800">بضاعة أول المدة في الثلاجة</h3>
                      <p className="text-[11px] text-slate-500 font-bold mt-1">كل صنف في "شجرة الأصناف" يظهر هنا تلقائياً</p>
                    </div>
                    {!openingLocked && (
                      <button type="button" onClick={() => setActiveTab('products')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1 flex-wrap">
                        <Plus className="w-3.5 h-3.5" /><span>إنشاء صنف</span>
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {openStock.map((st, idx) => {
                      const hasValue = Number(st.weight) > 0;
                      return (
                        <div key={st.code} className={'p-3 rounded-2xl border-2 space-y-2 transition ' + (hasValue ? 'bg-emerald-50/60 border-emerald-300' : 'bg-white border-slate-200')}>
                          <span className={'text-xs font-bold block ' + (hasValue ? 'text-emerald-800' : 'text-slate-700')}>{st.name}:</span>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div>
                              <label className={'block text-[10px] font-bold mb-0.5 ' + (hasValue ? 'text-emerald-700' : 'text-slate-500')}>الكمية (كجم)</label>
                              <input type="number" step="0.1" value={st.weight} disabled={openingLocked} onChange={(e) => { const u = [...openStock]; u[idx].weight = Number(e.target.value); setOpenStock(u); }} className={'w-full border rounded-lg px-2 h-9 text-xs font-mono ' + (hasValue ? 'border-emerald-300 bg-white font-bold text-emerald-900' : 'border-slate-200 disabled:bg-slate-100')} />
                            </div>
                            <div>
                              <label className={'block text-[10px] font-bold mb-0.5 ' + (hasValue ? 'text-emerald-700' : 'text-slate-500')}>تكلفة/كجم (ج)</label>
                              <input type="number" value={st.cost} disabled={openingLocked} onChange={(e) => { const u = [...openStock]; u[idx].cost = Number(e.target.value); setOpenStock(u); }} className={'w-full border rounded-lg px-2 h-9 text-xs font-mono ' + (hasValue ? 'border-emerald-300 bg-white font-bold text-emerald-900' : 'border-slate-200 disabled:bg-slate-100')} />
                            </div>
                            <div>
                              <label className={'block text-[10px] font-bold mb-0.5 ' + (hasValue ? 'text-emerald-700' : 'text-slate-500')}>القيمة (ج)</label>
                              <div className={'w-full border rounded-lg px-2 h-9 text-xs font-mono flex items-center justify-center ' + (hasValue ? 'border-emerald-300 bg-emerald-100 text-emerald-900 font-bold' : 'border-slate-200 bg-slate-50 text-slate-400')}>
                                {(Number(st.weight) * Number(st.cost)).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {!openingLocked && (
                <div className="flex gap-3 items-center flex-wrap">
                  <button type="button" onClick={handleSaveCurrentTab} className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-4 py-3 rounded-2xl text-xs">حفظ التبويب الحالي</button>
                  <button type="button" onClick={handleSaveAll} className="bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold px-4 py-3 rounded-2xl text-xs">حفظ الكل</button>
                  <button type="button" onClick={() => setShowLockConfirm(true)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-xl text-sm">اعتماد وقفل الأرصدة الافتتاحية</button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'business' && businessData && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-200 flex-wrap gap-2 flex-wrap">
              <div>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 flex-wrap">
                  <Building2 className="w-4 h-4" />
                  تفاصيل النشاط التجاري
                </h3>
                <p className="text-xs text-slate-500 font-bold mt-1">
                  الاسم والعنوان والبيانات الرسمية — تظهر في الفواتير والتقارير
                </p>
              </div>
              <button onClick={handleSaveBusiness} disabled={businessSaving} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 flex-wrap">
                <Save className="w-4 h-4" />
                <span>{businessSaving ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
              </button>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم النشاط التجاري *</label>
                  <input type="text" value={businessData.name || ''} onChange={(e) => setBusinessData({ ...businessData, name: e.target.value })} className="w-full border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold bg-slate-50 outline-none focus:border-blue-600" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نوع النشاط</label>
                  <select value={businessData.business_type || 'دواجن'} onChange={(e) => setBusinessData({ ...businessData, business_type: e.target.value })} className="w-full border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold bg-slate-50 outline-none focus:border-blue-600">
                    <option value="دواجن">دواجن</option>
                    <option value="لحوم">لحوم</option>
                    <option value="أسماك">أسماك</option>
                    <option value="مطعم">مطعم</option>
                    <option value="بقالة">بقالة</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم المالك</label>
                  <input type="text" value={businessData.owner_name || ''} onChange={(e) => setBusinessData({ ...businessData, owner_name: e.target.value })} className="w-full border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold bg-slate-50 outline-none focus:border-blue-600" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف</label>
                  <input type="text" value={businessData.phone || ''} onChange={(e) => setBusinessData({ ...businessData, phone: e.target.value })} className="w-full border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold bg-slate-50 outline-none focus:border-blue-600 font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">البريد الإلكتروني</label>
                  <input type="email" value={businessData.email || ''} onChange={(e) => setBusinessData({ ...businessData, email: e.target.value })} className="w-full border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold bg-slate-50 outline-none focus:border-blue-600 font-mono" dir="ltr" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المدينة</label>
                  <input type="text" value={businessData.city || ''} onChange={(e) => setBusinessData({ ...businessData, city: e.target.value })} className="w-full border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold bg-slate-50 outline-none focus:border-blue-600" />
                </div>
              </div>

              <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="bg-blue-200 p-1.5 rounded-lg">
                    <LinkIcon className="w-3.5 h-3.5 text-blue-800" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-blue-900">المعرّف الفريد (URL النشاط)</h4>
                    <p className="text-[10px] font-bold text-blue-700 mt-0.5">يُستخدم لإنشاء رابط الدخول الخاص بنشاطك</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-500 font-mono bg-white px-3 h-11 rounded-xl border-2 border-slate-200 flex items-center shrink-0">poultry-erp.com/</span>
                  <input type="text" value={businessData.slug || ''} onChange={(e) => { const v = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''); setBusinessData({ ...businessData, slug: v }); checkSlug(v); }} className="flex-1 min-w-[150px] border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold bg-white outline-none focus:border-blue-600 font-mono" dir="ltr" />
                </div>
                {slugCheckStatus !== 'idle' && (
                  <div className="text-[11px] font-bold">
                    <span className={slugCheckStatus === 'available' ? 'text-emerald-700' : 'text-rose-700'}>
                      {slugCheckStatus === 'available' ? 'OK ' : 'X '}{slugCheckMessage}
                    </span>
                  </div>
                )}
                {businessData.slug && slugCheckStatus === 'available' && (
                  <div className="bg-white p-3 rounded-xl border border-blue-200">
                    <p className="text-[10px] font-bold text-slate-500 mb-1">رابط الدخول الكامل:</p>
                    <p className="text-xs font-black text-blue-900 font-mono" dir="ltr">poultry-erp.com/{businessData.slug}/login</p>
                  </div>
                )}
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl">
                  <p className="text-[10px] font-bold text-amber-900 leading-relaxed">تحذير: بعد الحفظ، لا يمكن تغيير هذا المعرّف — لأنه سيصبح رابط الدخول الدائم لموظفيك.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">العنوان التفصيلي</label>
                <input type="text" value={businessData.address || ''} onChange={(e) => setBusinessData({ ...businessData, address: e.target.value })} className="w-full border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold bg-slate-50 outline-none focus:border-blue-600" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الدولة</label>
                  <input type="text" value={businessData.country || 'مصر'} onChange={(e) => setBusinessData({ ...businessData, country: e.target.value })} className="w-full border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold bg-slate-50 outline-none focus:border-blue-600" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">السجل التجاري</label>
                  <input type="text" value={businessData.commercial_register || ''} onChange={(e) => setBusinessData({ ...businessData, commercial_register: e.target.value })} className="w-full border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold bg-slate-50 outline-none focus:border-blue-600 font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الرقم الضريبي</label>
                  <input type="text" value={businessData.tax_id || ''} onChange={(e) => setBusinessData({ ...businessData, tax_id: e.target.value })} className="w-full border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold bg-slate-50 outline-none focus:border-blue-600 font-mono" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات إضافية</label>
                <textarea value={businessData.notes || ''} onChange={(e) => setBusinessData({ ...businessData, notes: e.target.value })} rows={3} className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-bold bg-slate-50 outline-none focus:border-blue-600 resize-none" />
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] font-bold text-slate-500">
                <Calendar className="w-3.5 h-3.5 inline mr-1" />
                تاريخ الإنشاء: {businessData.created_at ? new Date(businessData.created_at).toLocaleDateString('en-GB') : '—'}
                {businessData.updated_at && (
                  <span className="mr-4">
                    آخر تحديث: {new Date(businessData.updated_at).toLocaleDateString('en-GB')}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-200 flex-wrap gap-2 flex-wrap">
              <div>
                <h3 className="text-sm font-black text-slate-800">إدارة مستخدمي النشاط</h3>
                <p className="text-xs text-slate-500 font-bold mt-1">
                  {usersList.length} مستخدم • كل مستخدم له صلاحيات مختلفة
                </p>
              </div>
              {!showNewUserForm && (
                <button onClick={() => setShowNewUserForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 flex-wrap">
                  <Plus className="w-4 h-4" /><span>مستخدم جديد</span>
                </button>
              )}
            </div>

            {/* Add Form */}
            {showNewUserForm && (
              <form onSubmit={handleAddUser} className="bg-emerald-50 border-2 border-emerald-200 p-5 rounded-2xl space-y-3">
                <div className="flex justify-between items-center border-b border-emerald-200 pb-2 flex-wrap gap-2 flex-wrap">
                  <h4 className="text-sm font-black text-emerald-900">إضافة مستخدم جديد</h4>
                  <button type="button" onClick={() => setShowNewUserForm(false)} className="text-emerald-700"><X className="w-5 h-5" /></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-emerald-900 mb-1">اسم المستخدم *</label>
                    <input type="text" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} className="w-full border-2 border-emerald-200 rounded-xl px-3 h-11 text-sm font-bold bg-white" required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-emerald-900 mb-1">الاسم الكامل *</label>
                    <input type="text" value={newUserFullName} onChange={(e) => setNewUserFullName(e.target.value)} className="w-full border-2 border-emerald-200 rounded-xl px-3 h-11 text-sm font-bold bg-white" required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-emerald-900 mb-1">كلمة المرور *</label>
                    <input type="text" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} className="w-full border-2 border-emerald-200 rounded-xl px-3 h-11 text-sm font-bold bg-white font-mono" required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-emerald-900 mb-1">الدور *</label>
                    <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)} className="w-full border-2 border-emerald-200 rounded-xl px-3 h-11 text-sm font-bold bg-white">
                      <option value="admin">مدير</option>
                      <option value="cashier">كاشير</option>
                      <option value="inventory">مخزن</option>
                      <option value="slaughter">جزار/إنتاج</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs">إضافة المستخدم</button>
                  <button type="button" onClick={() => setShowNewUserForm(false)} className="bg-slate-200 text-slate-700 font-bold px-5 py-2.5 rounded-xl text-xs">إلغاء</button>
                </div>
              </form>
            )}

            {/* Users List */}
            {usersList.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6 font-bold">لا يوجد مستخدمون</p>
            ) : (
              <div className="overflow-x-auto border-2 border-slate-200 rounded-2xl">
                <table className="w-full text-right text-xs min-w-[600px]">
                  <thead className="bg-slate-800 text-white">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">اسم المستخدم</th>
                      <th className="p-3">الاسم الكامل</th>
                      <th className="p-3">الدور</th>
                      <th className="p-3">الحالة</th>
                      <th className="p-3 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono text-slate-500">{u.id}</td>
                        <td className="p-3 font-bold font-mono text-slate-800">{u.username}</td>
                        <td className="p-3 font-bold text-slate-700">{u.full_name}</td>
                        <td className="p-3">
                          <span className={'text-[10px] font-bold px-2 py-0.5 rounded-lg ' + (
                            u.role === 'admin' ? 'bg-rose-100 text-rose-700' :
                            u.role === 'cashier' ? 'bg-blue-100 text-blue-700' :
                            u.role === 'inventory' ? 'bg-amber-100 text-amber-700' :
                            'bg-slate-100 text-slate-700'
                          )}>
                            {u.role === 'admin' ? 'مدير' :
                             u.role === 'cashier' ? 'كاشير' :
                             u.role === 'inventory' ? 'مخزن' :
                             u.role === 'slaughter' ? 'جزار/إنتاج' : u.role}
                          </span>
                        </td>
                        <td className="p-3">
                          {u.is_active !== false ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg">نشط</span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">معطّل</span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1 justify-center flex-wrap">
                            <button onClick={() => { setEditingUser({ ...u, _originalUsername: u.username }); setEditingUserPassword(''); }} className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg" title="تعديل">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => { setChangingPasswordUser(u); setNewPasswordForUser(''); }} className="text-amber-600 hover:bg-amber-50 p-2 rounded-lg" title="تغيير كلمة المرور">
                              <Lock className="w-3.5 h-3.5" />
                            </button>
                            {u.username !== 'admin' && (
                              <button onClick={() => handleDeleteUser(u)} className="text-rose-600 hover:bg-rose-50 p-2 rounded-lg" title="حذف">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Edit Modal */}
            {editingUser && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setEditingUser(null)}>
                <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-between items-center border-b pb-3 flex-wrap gap-2 flex-wrap">
                    <h3 className="text-base font-black text-slate-800">تعديل المستخدم: {editingUser.username}</h3>
                    <button onClick={() => setEditingUser(null)} className="text-slate-400"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الكامل</label>
                      <input type="text" value={editingUser.full_name} onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })} className="w-full border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">اسم المستخدم (للدخول)</label>
                      <input type="text" value={editingUser.username} onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })} className="w-full border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold font-mono" dir="ltr" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">الدور</label>
                      <select value={editingUser.role} onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })} className="w-full border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold">
                        <option value="admin">مدير</option>
                        <option value="cashier">كاشير</option>
                        <option value="inventory">مخزن</option>
                        <option value="slaughter">جزار/إنتاج</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">كلمة المرور الجديدة <span className="text-slate-400 font-normal">(اتركها فارغة لعدم التغيير)</span></label>
                      <input type="text" value={editingUserPassword} onChange={(e) => setEditingUserPassword(e.target.value)} className="w-full border-2 border-amber-200 rounded-xl px-3 h-11 text-sm font-bold font-mono bg-amber-50" />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2 flex-wrap">
                    <button onClick={handleUpdateUser} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm">حفظ التعديلات</button>
                    <button onClick={() => { setEditingUser(null); setEditingUserPassword(''); }} className="bg-slate-100 text-slate-700 font-bold px-5 py-3 rounded-xl text-sm">إلغاء</button>
                  </div>
                </div>
              </div>
            )}

            {/* Change Password Modal */}
            {changingPasswordUser && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setChangingPasswordUser(null)}>
                <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-between items-center border-b pb-3 flex-wrap gap-2 flex-wrap">
                    <h3 className="text-base font-black text-slate-800">تغيير كلمة المرور</h3>
                    <button onClick={() => setChangingPasswordUser(null)} className="text-slate-400"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs font-bold text-amber-900">
                    المستخدم: <span className="font-mono">{changingPasswordUser.username}</span>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">كلمة المرور الجديدة</label>
                    <input type="text" value={newPasswordForUser} onChange={(e) => setNewPasswordForUser(e.target.value)} className="w-full border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold font-mono" />
                  </div>
                  <div className="flex gap-2 pt-2 flex-wrap">
                    <button onClick={handleChangeUserPassword} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-xl text-sm">تغيير كلمة المرور</button>
                    <button onClick={() => setChangingPasswordUser(null)} className="bg-slate-100 text-slate-700 font-bold px-5 py-3 rounded-xl text-sm">إلغاء</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'docs' && (
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-700 font-bold flex items-center gap-2 flex-wrap">
              <BookOpen className="w-4 h-4 text-slate-700" />
              <span>اضغط على أي بطاقة لفتح الشرح التفصيلي.</span>
            </div>

            {[
              { k: '1', t: 'البدء بالإعدادات الأساسية', d: 'قبل أي عملية: اضبط شجرة الأصناف (المنتجات التي تبيعها)، شجرة الخزائن (أماكن حفظ النقود)، مسارات التجهيز (كيف تُقطَّع الطيور)، والتكاليف اللوجستية. هذه هي الثوابت التي ستبني عليها كل العمليات.' },
              { k: '2', t: 'الأرصدة الافتتاحية للمشروع', d: 'عند بدء التشغيل الفعلي، افتح تبويب "الأرصدة الافتتاحية" وأدخل: نقدية الدرج الفعلية لكل خزينة، أرصدة العملاء القدامى، مستحقات الموردين، وبضاعة الثلاجة الحالية. اضغط "اعتماد وقفل الأرصدة" لتنطلق الدورة المحاسبية برصيد حقيقي.' },
              { k: '3', t: 'دورة أمر التوريد والإنتاج', d: 'في "الإنتاج": أدخل الوزن القائم، سعر البورصة، سعر التنفيذ، والمورد. أضف المصاريف اللوجستية. اختر مسار التجهيز لتظهر الحقول، وأدخل الأوزان المستخرجة. النظام يقارن الانحراف مع 83.5% ويُنبّهك إذا تجاوز 8%.' },
              { k: '4', t: 'المخازن والتبريد', d: 'يعرض رصيد كل صنف لحظياً مع مؤشرات الصلاحية. انقر على صنف لفتح بطاقة تتبعه: من أي دفعة أتى، لمن بيع، ومدة بقائه في التبريد. سجّل هالك الرطوبة من نفس الصفحة.' },
              { k: '5', t: 'المبيعات وإصدار الفواتير', d: 'أنشئ فاتورة متعددة البنود. اختر العميل مع اقتراح تلقائي وعرض مديونيته. حدد طريقة التسوية. الفاتورة تخصم المخزون وتُسجّل حركة الخزينة أو مديونية العميل في نفس اللحظة.' },
              { k: '6', t: 'الخزينة والحركات النقدية', d: 'أرصدة كل خزينة على حدة. سجّل المصروفات التشغيلية. سجل الحركات يعرض كل عملية بالتاريخ والجهة. لتسجيل تحصيل أو سداد، استخدم صفحات العملاء والموردين.' },
              { k: '7', t: 'العملاء والموردين وكشوف الحساب', d: 'انقر على أي اسم لفتح كشف حسابه الزمني. يعرض كل فاتورة وكل دفعة مع الرصيد التراكمي. اختر الخزينة عند تحصيل أي دفعة.' },
              { k: '8', t: 'التقارير وميزان المراجعة', d: 'ميزان مراجعة متزن تلقائياً، سجل عمليات موحد، قائمة أرباح وخسائر، ومعالج إقفال السنة. كل الأرقام مبنية على دالة SQL محاسبية دقيقة.' },
              { k: '9', t: 'الأرشفة لا الحذف', d: 'أي عنصر له حركات مسجّلة لا يُحذف نهائياً حفاظاً على الأثر المحاسبي. يُؤرشف ويختفي من القوائم لكن يبقى في السجلات التاريخية. يمكن استعادته من زر "إظهار المؤرشف" في رأس الصفحة.' }
            ].map((item) => (
              <div key={item.k} className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden">
                <button onClick={() => setExpandedDoc(expandedDoc === item.k ? null : item.k)} className="w-full text-right p-4 flex justify-between items-center hover:bg-slate-50 transition flex-wrap gap-2 flex-wrap">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="w-8 h-8 rounded-full bg-slate-900 text-white font-black text-xs flex items-center justify-center">{item.k}</span>
                    <span className="text-sm font-black text-slate-800">{item.t}</span>
                  </div>
                  {expandedDoc === item.k ? <ChevronDown className="w-5 h-5 text-slate-700" /> : <ChevronLeft className="w-5 h-5 text-slate-400" />}
                </button>
                {expandedDoc === item.k && (
                  <div className="p-4 pt-0 text-xs text-slate-600 leading-loose font-medium bg-slate-50 border-t">
                    {item.d}
                  </div>
                )}
              </div>
            ))}

            <div className="bg-slate-50 border-2 border-slate-200 p-5 rounded-3xl flex flex-wrap justify-between items-center gap-3 flex-wrap">
              <div>
                <h4 className="text-sm font-black text-slate-800">إعادة تشغيل الجولة الإرشادية</h4>
                <p className="text-[11px] text-slate-600 font-bold mt-1">تظهر الجولة تلقائياً أول مرة يفتح فيها المستخدم النظام على أي جهاز.</p>
              </div>
              <button onClick={() => { try { localStorage.removeItem('erp_tour_done'); sessionStorage.removeItem('erp_tour_done'); } catch(e) {} setTimeout(() => { window.location.href = '/dashboard'; }, 100); }} className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-2.5 rounded-xl text-xs">
                إعادة تشغيل الجولة
              </button>
            </div>
          </div>
        )}

      {showLockConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowLockConfirm(false)}>
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 text-amber-700 border-b pb-3 flex-wrap">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold">تأكيد اعتماد الأرصدة الافتتاحية</h3>
            </div>
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-xs font-bold text-amber-900 space-y-2">
              <p>سيتم:</p>
              <p>• حفظ كل الأرصدة في قاعدة البيانات</p>
              <p>• إنشاء قيود افتتاحية (خزائن + عملاء + موردين)</p>
              <p>• إدخال بضاعة الثلاجة في الدفعات (FIFO)</p>
              <p className="text-rose-700 pt-2">⚠️ لا يمكن التراجع بعد الاعتماد</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={approveAndLock} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-xl text-xs">تأكيد الاعتماد والقفل</button>
              <button onClick={() => setShowLockConfirm(false)} className="bg-slate-100 text-slate-700 font-bold px-4 py-3 rounded-xl text-xs">إلغاء</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
