'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Shield, Building2, Users, Package, LogOut, Plus, X,
  AlertTriangle, RefreshCw, Pencil, Trash2, FlaskConical,
  KeyRound, EyeOff, Eye
} from 'lucide-react';

interface Tenant {
  id: number;
  name: string;
  business_type: string | null;
  owner_name: string | null;
  phone: string | null;
  city: string | null;
  slug: string | null;
  is_active: boolean;
  is_sandbox: boolean;
  is_read_only: boolean;
  created_at: string;
  users_count?: number;
  customers_count?: number;
  products_count?: number;
}

export default function MasterDashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'readonly'>('all');

  const [showCreate, setShowCreate] = useState(false);
  const [newTenant, setNewTenant] = useState({
    name: '', business_type: 'دواجن', owner_name: '', phone: '', city: '', slug: ''
  });
  const [busy, setBusy] = useState(false);

  const [editingTenant, setEditingTenant] = useState<any>(null);
  const [wipingTenant, setWipingTenant] = useState<any>(null);
  const [wipeConfirmText, setWipeConfirmText] = useState('');
  const [resetTenant, setResetTenant] = useState<any>(null);
  const [resetUsers, setResetUsers] = useState<any[]>([]);
  const [resetSelected, setResetSelected] = useState<number[]>([]);
  const [resetLoading, setResetLoading] = useState(false);

  const showToast = (msg: string, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data: tens } = await supabase
      .from('tenants')
      .select('*')
      .order('is_sandbox', { ascending: false })
      .order('created_at', { ascending: false });

    if (!tens) { setLoading(false); return; }

    const enriched = await Promise.all(tens.map(async (t: any) => {
      const { count: uc } = await supabase.from('system_users').select('*', { count: 'exact', head: true }).eq('tenant_id', t.id);
      const { count: cc } = await supabase.from('customers').select('*', { count: 'exact', head: true }).eq('tenant_id', t.id);
      const { count: pc } = await supabase.from('inventory').select('*', { count: 'exact', head: true }).eq('tenant_id', t.id);
      return { ...t, users_count: uc || 0, customers_count: cc || 0, products_count: pc || 0 };
    }));

    setTenants(enriched);
    setLoading(false);
  }

  const handleCreate = async () => {
    if (!newTenant.name.trim()) { showToast('اسم النشاط مطلوب', 'error'); return; }
    const slug = newTenant.slug.trim().toLowerCase();
    if (slug && !/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(slug)) {
      showToast('المعرّف: أحرف صغيرة وأرقام وشرطة (3-30)', 'error');
      return;
    }
    setBusy(true);
    const { error } = await supabase.from('tenants').insert([{
      name: newTenant.name.trim(),
      business_type: newTenant.business_type || 'دواجن',
      owner_name: newTenant.owner_name.trim() || null,
      phone: newTenant.phone.trim() || null,
      city: newTenant.city.trim() || null,
      slug: slug || null,
      is_sandbox: false,
      is_active: true,
      is_read_only: false,
    }]);
    setBusy(false);
    if (error) { showToast('خطأ: ' + error.message, 'error'); return; }
    showToast('تم إنشاء النشاط');
    setShowCreate(false);
    setNewTenant({ name: '', business_type: 'دواجن', owner_name: '', phone: '', city: '', slug: '' });
    load();
  };

  const handleEdit = async () => {
    if (!editingTenant) return;
    if (!editingTenant.name?.trim()) { showToast('اسم النشاط مطلوب', 'error'); return; }
    setBusy(true);
    const { error } = await supabase.from('tenants').update({
      name: editingTenant.name.trim(),
      business_type: editingTenant.business_type,
      owner_name: editingTenant.owner_name?.trim() || null,
      phone: editingTenant.phone?.trim() || null,
      city: editingTenant.city?.trim() || null,
    }).eq('id', editingTenant.id);
    setBusy(false);
    if (error) { showToast('خطأ: ' + error.message, 'error'); return; }
    showToast('تم حفظ التعديلات');
    setEditingTenant(null);
    load();
  };

  const toggleReadOnly = async (t: any) => {
    const newState = !t.is_read_only;
    const { error } = await supabase.from('tenants').update({ is_read_only: newState }).eq('id', t.id);
    if (error) { showToast('خطأ: ' + error.message, 'error'); return; }
    // سجل العملية
    try {
      await fetch('/api/audit/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'readonly_toggle',
          tenantId: t.id,
          entityType: 'tenant',
          entityId: t.id,
          details: { new_state: newState, tenant_name: t.name },
        }),
      });
    } catch (e) {}
    showToast(newState ? 'تم قفل النشاط (قراءة فقط)' : 'تم فتح النشاط للكتابة');
    load();
  };

  const openResetModal = async (t: any) => {
    setResetTenant(t);
    setResetSelected([]);
    setResetLoading(true);
    try {
      const res = await fetch('/api/master/tenants/' + t.id + '/reset-passwords');
      const data = await res.json();
      if (res.ok) setResetUsers(data.users || []);
    } catch (e) {}
    setResetLoading(false);
  };

  const handleResetPasswords = async () => {
    if (!resetTenant || resetSelected.length === 0) {
      showToast('اختر مستخدماً واحداً على الأقل', 'error');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/master/tenants/' + resetTenant.id + '/reset-passwords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: resetSelected }),
      });
      const data = await res.json();
      setBusy(false);
      if (!res.ok || !data.success) { showToast('خطأ: ' + (data.error || 'فشل'), 'error'); return; }
      showToast('تم تعيين كلمة المرور لـ ' + data.count + ' مستخدم');
      setResetTenant(null);
      setResetUsers([]);
      setResetSelected([]);
    } catch (err: any) {
      setBusy(false);
      showToast('خطأ: ' + err.message, 'error');
    }
  };

  const handleWipe = async () => {
    if (!wipingTenant) return;
    if (wipeConfirmText !== 'DELETE') { showToast('اكتب DELETE للتأكيد', 'error'); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/master/tenants/' + wipingTenant.id + '/wipe', { method: 'POST' });
      const data = await res.json();
      setBusy(false);
      if (!res.ok || !data.success) { showToast('خطأ: ' + (data.error || 'فشل'), 'error'); return; }
      showToast('تم مسح كل بيانات النشاط');
      setWipingTenant(null);
      setWipeConfirmText('');
      load();
    } catch (err: any) {
      setBusy(false);
      showToast('خطأ: ' + err.message, 'error');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/master/logout', { method: 'POST' });
    router.push('/master/login');
  };

  const filtered = tenants.filter(t => {
    if (filter === 'active') return !t.is_read_only;
    if (filter === 'readonly') return t.is_read_only;
    return true;
  });
  const sandbox = filtered.find(t => t.is_sandbox);
  const realTenants = filtered.filter(t => !t.is_sandbox);

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {toast && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl border text-sm font-bold ${toast.type === 'success' ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-rose-600 text-white border-rose-400'}`}>
          {toast.msg}
        </div>
      )}

      <header className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-xl"><Shield className="w-6 h-6" /></div>
            <div>
              <h1 className="text-lg font-black">لوحة Master</h1>
              <p className="text-[11px] text-slate-300 font-bold">إدارة كل الأنشطة التجارية</p>
            </div>
          </div>
          <button onClick={handleLogout} className="bg-rose-600 hover:bg-rose-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5">
            <LogOut className="w-3.5 h-3.5" /><span>خروج</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200">
            <div className="flex items-center gap-2 text-slate-400 mb-2"><Building2 className="w-4 h-4" /><span className="text-xs font-bold">إجمالي الأنشطة</span></div>
            <p className="text-3xl font-black font-mono text-slate-900">{realTenants.length}</p>
          </div>
          <div className="bg-white p-5 rounded-3xl border border-slate-200">
            <div className="flex items-center gap-2 text-slate-400 mb-2"><Users className="w-4 h-4" /><span className="text-xs font-bold">إجمالي المستخدمين</span></div>
            <p className="text-3xl font-black font-mono text-slate-900">{tenants.reduce((s, t) => s + (t.users_count || 0), 0)}</p>
          </div>
          <div className="bg-white p-5 rounded-3xl border border-slate-200">
            <div className="flex items-center gap-2 text-slate-400 mb-2"><Package className="w-4 h-4" /><span className="text-xs font-bold">إجمالي الأصناف</span></div>
            <p className="text-3xl font-black font-mono text-slate-900">{tenants.reduce((s, t) => s + (t.products_count || 0), 0)}</p>
          </div>
        </div>

        {sandbox && (
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 border-2 border-amber-300 rounded-3xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="bg-amber-200 p-3 rounded-2xl"><FlaskConical className="w-6 h-6 text-amber-800" /></div>
              <div className="flex-1">
                <h2 className="text-base font-black text-amber-900">{sandbox.name}</h2>
                <p className="text-xs font-bold text-amber-800 mt-1">حساب وهمي للتطوير — لا يؤثر على الأنشطة الحقيقية</p>
                <div className="flex flex-wrap gap-3 mt-3 text-[11px] font-bold text-amber-800">
                  <span>مستخدمون: <b className="font-mono">{sandbox.users_count}</b></span>
                  <span>عملاء: <b className="font-mono">{sandbox.customers_count}</b></span>
                  <span>أصناف: <b className="font-mono">{sandbox.products_count}</b></span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setEditingTenant({ ...sandbox })} className="bg-white hover:bg-amber-50 text-amber-800 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 border border-amber-300"><Pencil className="w-3.5 h-3.5" /><span>تعديل</span></button>
              <button onClick={() => toggleReadOnly(sandbox)} className="bg-white hover:bg-amber-50 text-amber-800 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 border border-amber-300">{sandbox.is_read_only ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}<span>{sandbox.is_read_only ? 'فتح الكتابة' : 'قفل (قراءة فقط)'}</span></button>
              <button onClick={() => openResetModal(sandbox)} className="bg-white hover:bg-amber-50 text-amber-800 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 border border-amber-300"><KeyRound className="w-3.5 h-3.5" /><span>إعادة تعيين كلمات المرور</span></button>
              <button onClick={() => { setWipingTenant(sandbox); setWipeConfirmText(''); }} className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5"><Trash2 className="w-3.5 h-3.5" /><span>مسح البيانات</span></button>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center flex-wrap gap-3">
          <h2 className="text-base font-black text-slate-900">الأنشطة ({realTenants.length})</h2>
          <div className="flex flex-wrap gap-2">
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
              {[{k:'all',l:'الكل'},{k:'active',l:'نشطة'},{k:'readonly',l:'قراءة فقط'}].map(f => (
                <button key={f.k} onClick={() => setFilter(f.k as any)} className={'px-3 py-1.5 rounded-lg text-xs font-bold transition ' + (filter === f.k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900')}>{f.l}</button>
              ))}
            </div>
            <button onClick={load} className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" />تحديث</button>
            <button onClick={() => setShowCreate(true)} className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" />نشاط جديد</button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400 font-bold text-sm">جاري التحميل...</div>
        ) : realTenants.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-slate-200">
            <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-500">لا توجد أنشطة</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {realTenants.map((t) => (
              <div key={t.id} className={'bg-white p-5 rounded-3xl border-2 transition space-y-3 ' + (t.is_read_only ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200 hover:border-slate-400')}>
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-black text-slate-900 truncate flex items-center gap-2">
                      {t.name}
                      {t.is_read_only && <span className="text-[9px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-bold">مقفل</span>}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-bold mt-0.5">{t.business_type || '—'}</p>
                  </div>
                  <span className="font-mono text-[10px] bg-slate-100 px-2 py-0.5 rounded-lg text-slate-600 shrink-0">#{t.id}</span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                  <div className="bg-slate-50 p-2 rounded-xl"><span className="text-slate-500 font-bold block">مستخدمون</span><span className="font-mono font-black text-slate-900">{t.users_count}</span></div>
                  <div className="bg-slate-50 p-2 rounded-xl"><span className="text-slate-500 font-bold block">عملاء</span><span className="font-mono font-black text-slate-900">{t.customers_count}</span></div>
                  <div className="bg-slate-50 p-2 rounded-xl"><span className="text-slate-500 font-bold block">أصناف</span><span className="font-mono font-black text-slate-900">{t.products_count}</span></div>
                </div>

                {t.owner_name && <div className="text-[11px] text-slate-600 font-bold truncate"><span className="text-slate-400">المالك: </span>{t.owner_name}</div>}
                {t.slug && <div className="text-[10px] text-blue-700 font-bold font-mono bg-blue-50 px-2 py-1 rounded-lg truncate" dir="ltr">/{t.slug}/login</div>}

                <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                  <button onClick={() => setEditingTenant({ ...t })} className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1"><Pencil className="w-3 h-3" /><span>تعديل</span></button>
                  <button onClick={() => toggleReadOnly(t)} className="bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1">{t.is_read_only ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}<span>{t.is_read_only ? 'فتح' : 'قفل'}</span></button>
                  <button onClick={() => openResetModal(t)} className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1"><KeyRound className="w-3 h-3" /><span>كلمات المرور</span></button>
                  <button onClick={() => { setWipingTenant(t); setWipeConfirmText(''); }} className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1"><Trash2 className="w-3 h-3" /><span>مسح</span></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !busy && setShowCreate(false)}>
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-black text-slate-800">إنشاء نشاط جديد</h3>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="block text-xs font-bold text-slate-700 mb-1">اسم النشاط *</label><input type="text" value={newTenant.name} onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })} className="w-full border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold" /></div>
              <div><label className="block text-xs font-bold text-slate-700 mb-1">نوع النشاط</label><select value={newTenant.business_type} onChange={(e) => setNewTenant({ ...newTenant, business_type: e.target.value })} className="w-full border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold"><option value="دواجن">دواجن</option><option value="لحوم">لحوم</option><option value="أسماك">أسماك</option><option value="مطعم">مطعم</option><option value="بقالة">بقالة</option><option value="أخرى">أخرى</option></select></div>
              <div><label className="block text-xs font-bold text-slate-700 mb-1">اسم المالك</label><input type="text" value={newTenant.owner_name} onChange={(e) => setNewTenant({ ...newTenant, owner_name: e.target.value })} className="w-full border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="block text-xs font-bold text-slate-700 mb-1">الهاتف</label><input type="text" value={newTenant.phone} onChange={(e) => setNewTenant({ ...newTenant, phone: e.target.value })} className="w-full border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold" /></div>
                <div><label className="block text-xs font-bold text-slate-700 mb-1">المدينة</label><input type="text" value={newTenant.city} onChange={(e) => setNewTenant({ ...newTenant, city: e.target.value })} className="w-full border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold" /></div>
              </div>
              <div><label className="block text-xs font-bold text-slate-700 mb-1">المعرّف الفريد (اتركه فارغاً → unknownbusiness)</label><div className="flex items-center gap-2"><span className="text-xs font-bold text-slate-500 font-mono">/</span><input type="text" value={newTenant.slug} onChange={(e) => setNewTenant({ ...newTenant, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} dir="ltr" className="flex-1 border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold font-mono" /><span className="text-xs font-bold text-slate-500 font-mono">/login</span></div></div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={handleCreate} disabled={busy} className="flex-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm">{busy ? '...' : 'إنشاء'}</button>
              <button onClick={() => setShowCreate(false)} disabled={busy} className="bg-slate-100 text-slate-700 font-bold px-5 py-3 rounded-xl text-sm">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {editingTenant && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !busy && setEditingTenant(null)}>
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-black text-slate-800">تعديل النشاط</h3>
              <button onClick={() => setEditingTenant(null)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="block text-xs font-bold text-slate-700 mb-1">اسم النشاط *</label><input type="text" value={editingTenant.name || ''} onChange={(e) => setEditingTenant({ ...editingTenant, name: e.target.value })} className="w-full border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold" /></div>
              <div><label className="block text-xs font-bold text-slate-700 mb-1">نوع النشاط</label><select value={editingTenant.business_type || 'دواجن'} onChange={(e) => setEditingTenant({ ...editingTenant, business_type: e.target.value })} className="w-full border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold"><option value="دواجن">دواجن</option><option value="لحوم">لحوم</option><option value="أسماك">أسماك</option><option value="مطعم">مطعم</option><option value="بقالة">بقالة</option><option value="أخرى">أخرى</option></select></div>
              <div><label className="block text-xs font-bold text-slate-700 mb-1">اسم المالك</label><input type="text" value={editingTenant.owner_name || ''} onChange={(e) => setEditingTenant({ ...editingTenant, owner_name: e.target.value })} className="w-full border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="block text-xs font-bold text-slate-700 mb-1">الهاتف</label><input type="text" value={editingTenant.phone || ''} onChange={(e) => setEditingTenant({ ...editingTenant, phone: e.target.value })} className="w-full border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold" /></div>
                <div><label className="block text-xs font-bold text-slate-700 mb-1">المدينة</label><input type="text" value={editingTenant.city || ''} onChange={(e) => setEditingTenant({ ...editingTenant, city: e.target.value })} className="w-full border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold" /></div>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={handleEdit} disabled={busy} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm">{busy ? '...' : 'حفظ'}</button>
              <button onClick={() => setEditingTenant(null)} disabled={busy} className="bg-slate-100 text-slate-700 font-bold px-5 py-3 rounded-xl text-sm">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {wipingTenant && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !busy && setWipingTenant(null)}>
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 text-rose-700 border-b pb-3">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-black">تأكيد مسح البيانات</h3>
            </div>
            <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl text-xs font-bold text-rose-900 space-y-2">
              <p>سيتم حذف كل بيانات النشاط "{wipingTenant.name}":</p>
              <ul className="list-disc pr-5 space-y-0.5">
                <li>الفواتير والمبيعات</li>
                <li>الإيصالات والحركات النقدية</li>
                <li>أوامر التوريد والدفعات</li>
                <li>العملاء والموردين</li>
                <li>الأصناف والمخزون</li>
                <li>الخزائن والإعدادات</li>
              </ul>
              <p className="pt-2 text-rose-700">النشاط نفسه سيبقى — البيانات فقط تُمسح.</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">اكتب <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-rose-700">DELETE</span> للتأكيد</label>
              <input type="text" value={wipeConfirmText} onChange={(e) => setWipeConfirmText(e.target.value)} dir="ltr" className="w-full border-2 border-rose-300 rounded-xl px-3 h-11 text-sm font-bold font-mono outline-none focus:border-rose-500" />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={handleWipe} disabled={busy || wipeConfirmText !== 'DELETE'} className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2"><Trash2 className="w-4 h-4" /><span>{busy ? '...' : 'تأكيد المسح'}</span></button>
              <button onClick={() => setWipingTenant(null)} disabled={busy} className="bg-slate-100 text-slate-700 font-bold px-5 py-3 rounded-xl text-sm">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {resetTenant && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !busy && setResetTenant(null)}>
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-indigo-700" />
                <h3 className="text-base font-black text-slate-800">إعادة تعيين كلمات المرور</h3>
              </div>
              <button onClick={() => setResetTenant(null)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-xl text-xs font-bold text-indigo-900">
              النشاط: <b>{resetTenant.name}</b>
            </div>
            <p className="text-xs font-bold text-slate-600">اختر المستخدمين — سيتم تعيين كلمة مرورهم إلى <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-indigo-700">123456</span></p>
            {resetLoading ? (
              <div className="text-center py-6 text-slate-400 font-bold text-sm">جاري التحميل...</div>
            ) : resetUsers.length === 0 ? (
              <div className="text-center py-6 text-slate-400 font-bold text-sm">لا يوجد مستخدمون</div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                <label className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg cursor-pointer text-xs font-bold">
                  <input type="checkbox" checked={resetSelected.length === resetUsers.length && resetUsers.length > 0} onChange={(e) => setResetSelected(e.target.checked ? resetUsers.map((u: any) => u.id) : [])} className="w-4 h-4 accent-indigo-600" />
                  <span>تحديد الكل ({resetUsers.length})</span>
                </label>
                {resetUsers.map((u: any) => (
                  <label key={u.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                    <input type="checkbox" checked={resetSelected.includes(u.id)} onChange={(e) => setResetSelected(prev => e.target.checked ? [...prev, u.id] : prev.filter(id => id !== u.id))} className="w-4 h-4 accent-indigo-600" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-black text-slate-800 truncate">{u.full_name || u.username}</div>
                      <div className="text-[10px] font-bold text-slate-500 font-mono">{u.username} • {u.role}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <button onClick={handleResetPasswords} disabled={busy || resetSelected.length === 0} className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2"><KeyRound className="w-4 h-4" /><span>{busy ? '...' : 'تعيين 123456 لـ ' + resetSelected.length}</span></button>
              <button onClick={() => setResetTenant(null)} disabled={busy} className="bg-slate-100 text-slate-700 font-bold px-5 py-3 rounded-xl text-sm">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
