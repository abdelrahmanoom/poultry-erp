'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Shield, Building2, Users, Package, LogOut, Plus, X,
  AlertTriangle, RefreshCw, ChevronLeft
} from 'lucide-react';

interface Tenant {
  id: number;
  name: string;
  business_type: string | null;
  owner_name: string | null;
  phone: string | null;
  city: string | null;
  is_active: boolean;
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
  const [showCreate, setShowCreate] = useState(false);
  const [newTenant, setNewTenant] = useState({
    name: '',
    business_type: 'دواجن',
    owner_name: '',
    phone: '',
    city: '',
  });
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const showToast = (msg: string, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);

    const { data: tens } = await supabase.from('tenants').select('*').order('created_at', { ascending: false });
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
    setBusy(true);

    const { data, error } = await supabase.from('tenants').insert([{
      name: newTenant.name.trim(),
      business_type: newTenant.business_type || 'دواجن',
      owner_name: newTenant.owner_name.trim() || null,
      phone: newTenant.phone.trim() || null,
      city: newTenant.city.trim() || null,
      is_active: true,
    }]).select().single();

    setBusy(false);

    if (error) {
      showToast('خطأ: ' + error.message, 'error');
      return;
    }

    showToast('تم إنشاء النشاط بنجاح');
    setShowCreate(false);
    setNewTenant({ name: '', business_type: 'دواجن', owner_name: '', phone: '', city: '' });
    load();
  };

  const handleLogout = async () => {
    await fetch('/api/master/logout', { method: 'POST' });
    router.push('/master/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {toast && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-2xl border text-sm font-bold ${toast.type === 'success' ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-rose-600 text-white border-rose-400'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-xl">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-black">لوحة Master</h1>
              <p className="text-[11px] text-slate-300 font-bold">إدارة كل الأنشطة التجارية</p>
            </div>
          </div>
          <button onClick={handleLogout} className="bg-rose-600 hover:bg-rose-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5">
            <LogOut className="w-3.5 h-3.5" />
            <span>خروج</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200">
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              <Building2 className="w-4 h-4" />
              <span className="text-xs font-bold">إجمالي الأنشطة</span>
            </div>
            <p className="text-3xl font-black font-mono text-slate-900">{tenants.length}</p>
          </div>
          <div className="bg-white p-5 rounded-3xl border border-slate-200">
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              <Users className="w-4 h-4" />
              <span className="text-xs font-bold">إجمالي المستخدمين</span>
            </div>
            <p className="text-3xl font-black font-mono text-slate-900">
              {tenants.reduce((s, t) => s + (t.users_count || 0), 0)}
            </p>
          </div>
          <div className="bg-white p-5 rounded-3xl border border-slate-200">
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              <Package className="w-4 h-4" />
              <span className="text-xs font-bold">إجمالي الأصناف</span>
            </div>
            <p className="text-3xl font-black font-mono text-slate-900">
              {tenants.reduce((s, t) => s + (t.products_count || 0), 0)}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center">
          <h2 className="text-base font-black text-slate-900">الأنشطة ({tenants.length})</h2>
          <div className="flex gap-2">
            <button onClick={load} className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              تحديث
            </button>
            <button onClick={() => setShowCreate(true)} className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              نشاط جديد
            </button>
          </div>
        </div>

        {/* Tenants List */}
        {loading ? (
          <div className="text-center py-12 text-slate-400 font-bold text-sm">جاري التحميل...</div>
        ) : tenants.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-slate-200">
            <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-500">لا توجد أنشطة بعد</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tenants.map((t) => (
              <div key={t.id} className="bg-white p-5 rounded-3xl border-2 border-slate-200 hover:border-slate-400 transition space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-base font-black text-slate-900">{t.name}</h3>
                    <p className="text-[11px] text-slate-500 font-bold mt-0.5">{t.business_type || '—'}</p>
                  </div>
                  <span className="font-mono text-[10px] bg-slate-100 px-2 py-0.5 rounded-lg text-slate-600">
                    #{t.id}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <span className="text-slate-500 font-bold block">مستخدمون</span>
                    <span className="font-mono font-black text-slate-900">{t.users_count}</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <span className="text-slate-500 font-bold block">عملاء</span>
                    <span className="font-mono font-black text-slate-900">{t.customers_count}</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <span className="text-slate-500 font-bold block">أصناف</span>
                    <span className="font-mono font-black text-slate-900">{t.products_count}</span>
                  </div>
                </div>

                {t.owner_name && (
                  <div className="text-[11px] text-slate-600 font-bold">
                    <span className="text-slate-400">المالك: </span>{t.owner_name}
                  </div>
                )}

                <button className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1">
                  <ChevronLeft className="w-3.5 h-3.5" />
                  تفاصيل (قريباً)
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !busy && setShowCreate(false)}>
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-black text-slate-800">إنشاء نشاط جديد</h3>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم النشاط *</label>
                <input type="text" value={newTenant.name} onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })} placeholder="مثال: دواجن النور" className="w-full border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">نوع النشاط</label>
                <select value={newTenant.business_type} onChange={(e) => setNewTenant({ ...newTenant, business_type: e.target.value })} className="w-full border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold">
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
                <input type="text" value={newTenant.owner_name} onChange={(e) => setNewTenant({ ...newTenant, owner_name: e.target.value })} className="w-full border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الهاتف</label>
                  <input type="text" value={newTenant.phone} onChange={(e) => setNewTenant({ ...newTenant, phone: e.target.value })} className="w-full border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المدينة</label>
                  <input type="text" value={newTenant.city} onChange={(e) => setNewTenant({ ...newTenant, city: e.target.value })} className="w-full border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold" />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={handleCreate} disabled={busy} className="flex-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm">
                {busy ? 'جاري الإنشاء...' : 'إنشاء النشاط'}
              </button>
              <button onClick={() => setShowCreate(false)} disabled={busy} className="bg-slate-100 text-slate-700 font-bold px-5 py-3 rounded-xl text-sm">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}