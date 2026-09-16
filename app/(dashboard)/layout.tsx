'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, Scissors, Warehouse, ShoppingCart, Users, Truck, Wallet, FileText, Settings, LogOut, Menu, X
} from 'lucide-react';
import TourGuide from '@/components/TourGuide';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const sessionStr = localStorage.getItem('erp_user_session') || sessionStorage.getItem('erp_user_session');
    if (!sessionStr) {
      router.push('/login');
    } else {
      setUser(JSON.parse(sessionStr));
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('erp_user_session');
    sessionStorage.removeItem('erp_user_session');
    router.push('/login');
  };

  if (!user) return null;

  const navigation = [
    { name: 'الرئيسية', href: '/dashboard', icon: LayoutDashboard },
    { name: 'الإنتاج', href: '/production', icon: Scissors },
    { name: 'المخازن', href: '/inventory', icon: Warehouse },
    { name: 'المبيعات', href: '/sales', icon: ShoppingCart },
    { name: 'الخزينة', href: '/treasury', icon: Wallet },
    { name: 'العملاء', href: '/customers', icon: Users },
    { name: 'الموردين', href: '/suppliers', icon: Truck },
    { name: 'المركز المالي', href: '/finance', icon: FileText },
    { name: 'الإعدادات', href: '/settings', icon: Settings },
  ];

  return (
    <div dir="rtl" className="min-h-screen bg-slate-100 flex flex-col md:flex-row font-sans text-slate-800">
      <aside className="hidden md:flex w-64 bg-slate-900 text-slate-200 flex-col shrink-0 border-l border-slate-800 shadow-xl z-30">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <div>
            <span className="font-black text-sm text-white block">منظومة الإدارة المالية</span>
            <span className="text-[10px] text-emerald-400 font-bold">{user.full_name}</span>
          </div>
          <button onClick={handleLogout} title="تسجيل الخروج" className="text-slate-400 hover:text-rose-400 p-1">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
        <nav className="p-2 space-y-1 text-xs font-bold flex-1 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link key={item.name} href={item.href} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition ${isActive ? 'bg-blue-600 text-white font-extrabold shadow' : 'text-slate-300 hover:bg-slate-800'}`}>
                <Icon className="w-4 h-4" />
                <span className="text-xs">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <header className="md:hidden bg-slate-900 text-white p-3 flex justify-between items-center sticky top-0 z-30 shadow">
        <div className="flex items-center gap-2">
          <button onClick={() => setDrawerOpen(true)} className="p-1.5 rounded-lg bg-slate-800">
            <Menu className="w-5 h-5 text-slate-200" />
          </button>
          <span className="font-black text-xs">منظومة الإدارة</span>
        </div>
        <span className="text-[11px] text-emerald-400 font-bold">{user.full_name}</span>
      </header>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden flex justify-start" onClick={() => setDrawerOpen(false)}>
          <div className="w-64 bg-slate-900 h-full p-4 space-y-4 text-slate-200 overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <span className="font-black text-sm">القائمة الرئيسية</span>
              <button onClick={() => setDrawerOpen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <nav className="flex flex-col space-y-1.5 text-xs font-bold">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link key={item.name} href={item.href} onClick={() => setDrawerOpen(false)} className={`flex items-center gap-3 px-3 py-3 rounded-xl transition ${isActive ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-300'}`}>
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
            <button onClick={handleLogout} className="w-full bg-rose-900/40 text-rose-200 border border-rose-800 py-2.5 rounded-xl text-xs font-bold mt-4">تسجيل الخروج</button>
          </div>
        </div>
      )}

      <main className="flex-1 p-4 md:p-6 overflow-y-auto max-w-6xl w-full mx-auto pb-24 md:pb-6">
        {children}
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-800 text-slate-400 flex justify-around p-2 text-[10px] font-bold shadow-2xl">
        <Link href="/dashboard" className={`flex flex-col items-center gap-1 ${pathname === '/dashboard' ? 'text-blue-500 font-extrabold' : ''}`}><LayoutDashboard className="w-4 h-4" /><span>الرئيسية</span></Link>
        <Link href="/production" className={`flex flex-col items-center gap-1 ${pathname === '/production' ? 'text-blue-500 font-extrabold' : ''}`}><Scissors className="w-4 h-4" /><span>الإنتاج</span></Link>
        <Link href="/inventory" className={`flex flex-col items-center gap-1 ${pathname === '/inventory' ? 'text-blue-500 font-extrabold' : ''}`}><Warehouse className="w-4 h-4" /><span>المخازن</span></Link>
        <Link href="/sales" className={`flex flex-col items-center gap-1 ${pathname === '/sales' ? 'text-blue-500 font-extrabold' : ''}`}><ShoppingCart className="w-4 h-4" /><span>المبيعات</span></Link>
        <button onClick={() => setDrawerOpen(true)} className="flex flex-col items-center gap-1"><Menu className="w-4 h-4" /><span>المزيد</span></button>
      </nav>

      <TourGuide />
    </div>
  );
}