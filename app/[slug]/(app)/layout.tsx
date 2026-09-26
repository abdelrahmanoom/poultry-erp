'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, Scissors, Warehouse, ShoppingCart, Users, Truck,
  Wallet, FileText, Settings, LogOut, Menu, X, HelpCircle
} from 'lucide-react';
import TourGuide from '@/components/TourGuide';
import { createClient } from '@/lib/supabase/client';
import PasswordChangeModal from '@/components/PasswordChangeModal';
import ReadOnlyBanner from '@/components/ReadOnlyBanner';
import TenantLogo from '@/components/TenantLogo';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [slug, setSlug] = useState('');
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [fromMaster, setFromMaster] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const router = useRouter();
  const supabase = createClient();
  const pathname = usePathname();
  const params = useParams();

  useEffect(() => {
    const sessionStr =
      localStorage.getItem('erp_user_display') ||
      sessionStorage.getItem('erp_user_display') ||
      localStorage.getItem('erp_user_session') ||
      sessionStorage.getItem('erp_user_session');

    if (!sessionStr) {
      router.push('/login');
      return;
    }

    try {
      const parsed = JSON.parse(sessionStr);
      setUser(parsed);
      // جلب شعار النشاط
      (async () => {
        try {
          const tid = parsed.tenant_id;
          if (tid) {
            const { data } = await supabase.from('tenants').select('logo_url').eq('id', tid).maybeSingle();
            if (data?.logo_url) setLogoUrl(data.logo_url);
          }
        } catch (e) {}
      })();

      // slug: من params → user → cookie
      const urlSlug = params?.slug ? String(params.slug) : '';
      const userSlug = parsed.tenant_slug || '';
      const cookieSlug = document.cookie.match(/tenant_slug=([^;]+)/)?.[1] || '';
      setSlug(urlSlug || userSlug || cookieSlug);

      // وضع القراءة فقط
      setIsReadOnly(parsed.is_read_only === true);

      // فحص كلمة المرور الإلزامية
      if (parsed.must_change_password === true) {
        setShowPasswordModal(true);
      }

      // هل جاء من Master؟
      if (document.cookie.includes('from_master=1')) {
        setFromMaster(true);
      }
    } catch (e) {}
  }, [router, params]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}

    localStorage.removeItem('erp_user_display');
    localStorage.removeItem('erp_user_session');
    sessionStorage.removeItem('erp_user_display');
    sessionStorage.removeItem('erp_user_session');

    window.location.href = '/login';
  };

  const navigation = [
    { name: 'الرئيسية', href: '/dashboard', icon: LayoutDashboard },
    { name: 'الإنتاج', href: '/production', icon: Scissors },
    { name: 'المخازن', href: '/inventory', icon: Warehouse },
    { name: 'المبيعات', href: '/sales', icon: ShoppingCart },
    { name: 'الخزينة', href: '/treasury', icon: Wallet },
    { name: 'العملاء', href: '/customers', icon: Users },
    { name: 'الموردين', href: '/suppliers', icon: Truck },
    { name: 'المركز المالي', href: '/finance', icon: FileText },
    { name: 'الإعدادات', href: '/settings?tab=business&group=admin', icon: Settings },
  ];

  // رابط مع slug (بدون redirect)
  const withSlug = (href: string) => slug ? '/' + slug + href : href;

  // فحص رابط نشط
  const isActive = (href: string) => {
    const cleanHref = href.split('?')[0];
    return pathname === cleanHref || pathname === withSlug(cleanHref);
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-100 flex flex-col md:flex-row font-sans text-slate-800">

      {/* Sidebar — desktop */}
      <aside className="hidden md:flex w-64 bg-slate-900 text-slate-200 flex-col shrink-0 border-l border-slate-800 shadow-xl z-30">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center flex-wrap gap-2 flex-wrap">
          <div>
            <span className="font-black text-sm text-white block">{user?.tenant_name || 'منظومة الإدارة'}</span>
            <span className="text-[10px] text-emerald-400 font-bold">{user?.full_name || ''}</span>
          </div>
          <button onClick={handleLogout} title="تسجيل الخروج" className="text-slate-400 hover:text-rose-400 p-1">
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <nav className="p-2 space-y-1 text-xs font-bold flex-1 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link key={item.name} href={withSlug(item.href)} className={'w-full flex items-center gap-3 px-3 py-3 rounded-xl transition ' + (active ? 'bg-blue-600 text-white font-extrabold shadow' : 'text-slate-300 hover:bg-slate-800')}>
                <Icon className="w-4 h-4" />
                <span className="text-xs">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {fromMaster && (
          <a href="/master" className="block m-3 p-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black flex items-center gap-2 transition flex-wrap">
            <span>← عودة للماستر</span>
          </a>
        )}

        <div className="p-3 border-t border-slate-800">
          <Link href={withSlug('/help')} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800 hover:text-emerald-400 transition flex-wrap">
            <HelpCircle className="w-4 h-4" />
            <span>المساعدة والدليل</span>
          </Link>
        </div>
      </aside>

      {/* Header — mobile */}
      <header className="md:hidden bg-slate-900 text-white p-3 flex justify-between items-center sticky top-0 z-40 shadow flex-wrap gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setDrawerOpen(true)} className="p-1.5 rounded-lg bg-slate-800">
            <Menu className="w-5 h-5 text-slate-200" />
          </button>
          <span className="font-black text-xs">{user?.tenant_name || 'منظومة الإدارة'}</span>
        </div>
        <span className="text-[11px] text-emerald-400 font-bold">{user?.full_name || ''}</span>
      </header>

      {/* Drawer — mobile */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden flex justify-start" onClick={() => setDrawerOpen(false)}>
          <div className="w-64 bg-slate-900 h-full p-4 space-y-4 text-slate-200 overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 flex-wrap gap-2 flex-wrap">
              <span className="font-black text-sm">القائمة الرئيسية</span>
              <button onClick={() => setDrawerOpen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <nav className="flex flex-col space-y-1.5 text-xs font-bold">
              {navigation.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link key={item.name} href={withSlug(item.href)} onClick={() => setDrawerOpen(false)} className={'flex items-center gap-3 px-3 py-3 rounded-xl transition ' + (active ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-300')}>
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
            {fromMaster && (
              <a href="/master" className="block w-full text-center bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black py-3 mt-2">← عودة للماستر</a>
            )}
            <Link href={withSlug('/help')} onClick={() => setDrawerOpen(false)} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800 hover:text-emerald-400 transition flex-wrap">
              <HelpCircle className="w-4 h-4" />
              <span>المساعدة والدليل</span>
            </Link>
            <button onClick={handleLogout} className="w-full bg-rose-900/40 text-rose-200 border border-rose-800 py-2.5 rounded-xl text-xs font-bold mt-4">تسجيل الخروج</button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {isReadOnly && <ReadOnlyBanner />}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto max-w-6xl w-full mx-auto pb-24 md:pb-6">
          {children}
        </main>
      </div>

      {/* Bottom nav — mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-800 text-slate-400 flex justify-around p-2 text-[10px] font-bold shadow-2xl">
        <Link href={withSlug('/dashboard')} className={'flex flex-col items-center gap-1 ' + (isActive('/dashboard') ? 'text-blue-500 font-extrabold' : '')}><LayoutDashboard className="w-4 h-4" /><span>الرئيسية</span></Link>
        <Link href={withSlug('/production')} className={'flex flex-col items-center gap-1 ' + (isActive('/production') ? 'text-blue-500 font-extrabold' : '')}><Scissors className="w-4 h-4" /><span>الإنتاج</span></Link>
        <Link href={withSlug('/inventory')} className={'flex flex-col items-center gap-1 ' + (isActive('/inventory') ? 'text-blue-500 font-extrabold' : '')}><Warehouse className="w-4 h-4" /><span>المخازن</span></Link>
        <Link href={withSlug('/sales')} className={'flex flex-col items-center gap-1 ' + (isActive('/sales') ? 'text-blue-500 font-extrabold' : '')}><ShoppingCart className="w-4 h-4" /><span>المبيعات</span></Link>
        <button onClick={() => setDrawerOpen(true)} className="flex flex-col items-center gap-1 flex-wrap"><Menu className="w-4 h-4" /><span>المزيد</span></button>
      </nav>

      <TourGuide />
      {showPasswordModal && (
        <PasswordChangeModal
          forced={true}
          onSuccess={() => {
            localStorage.removeItem('erp_user_display');
            sessionStorage.removeItem('erp_user_display');
            window.location.href = '/login';
          }}
        />
      )}
    </div>
  );
}
