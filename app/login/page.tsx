'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Hash, ArrowLeft, Building2, AlertCircle, Clock } from 'lucide-react';
import TenantLogo from '@/components/TenantLogo';

export default function LoginGatewayPage() {
  const router = useRouter();
  const [slug, setSlug] = useState('');
  const [recentSlugs, setRecentSlugs] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // قراءة slug المحفوظ + قائمة المعارِف السابقة
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const saved = localStorage.getItem('last_tenant_slug');
    if (saved) setSlug(saved);

    try {
      const list = JSON.parse(localStorage.getItem('saved_tenant_slugs') || '[]');
      if (Array.isArray(list)) {
        setRecentSlugs(list.filter((s: any) => typeof s === 'string').slice(0, 5));
      }
    } catch {}
  }, []);

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSlug = slug.trim().toLowerCase();

    if (!cleanSlug) {
      setError('أدخل معرّف النشاط');
      return;
    }
    if (!/^[a-z0-9-]+$/.test(cleanSlug)) {
      setError('المعرّف يجب أن يحتوي على حروف إنجليزية وأرقام فقط');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // التحقق من وجود النشاط
      const res = await fetch('/api/tenants/by-slug/' + cleanSlug);
      if (!res.ok) {
        setError('النشاط غير موجود أو غير مفعّل');
        setLoading(false);
        return;
      }

      // حفظ الـ slug
      localStorage.setItem('last_tenant_slug', cleanSlug);

      // إضافة للقائمة
      let list: string[] = [];
      try {
        list = JSON.parse(localStorage.getItem('saved_tenant_slugs') || '[]');
        if (!Array.isArray(list)) list = [];
      } catch { list = []; }
      
      list = [cleanSlug, ...list.filter(s => s !== cleanSlug)].slice(0, 5);
      localStorage.setItem('saved_tenant_slugs', JSON.stringify(list));

      // التوجيه
      router.push('/' + cleanSlug + '/login');
    } catch (err) {
      setError('تعذّر الاتصال بالخادم');
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl space-y-6">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <TenantLogo size="lg" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">ثُلَاث</h1>
            <p className="text-xs text-slate-500 font-bold mt-1">منظومة إدارة الأنشطة التجارية</p>
          </div>
        </div>

        {/* Info */}
        <div className="bg-blue-50 border-2 border-blue-200 p-3 rounded-xl text-xs font-bold text-blue-900 flex items-start gap-2">
          <Building2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>أدخل معرّف نشاطك التجاري للوصول إلى لوحة التحكم</span>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-rose-50 border-2 border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleNext} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">معرّف النشاط</label>
            <div className="relative">
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="مثال: unknown"
                autoComplete="off"
                autoFocus
                dir="ltr"
                className="w-full border-2 border-slate-200 rounded-xl pl-11 pr-11 h-14 text-base font-bold bg-slate-50 outline-none focus:border-blue-600 focus:bg-white transition font-mono"
                style={{ textAlign: 'left' }}
              />
              <Hash className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-600/20 transition text-sm h-14 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>جاري التحقق...</span>
            ) : (
              <>
                <span>التالي</span>
                <ArrowLeft className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Recent slugs */}
        {recentSlugs.length > 0 && (
          <div className="pt-4 border-t border-slate-200">
            <p className="text-[10px] font-bold text-slate-500 mb-2 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>المعارِف المستخدمة سابقاً</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {recentSlugs.map(s => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setSlug(s)}
                  className="bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-700 font-mono text-xs font-bold px-3 py-1.5 rounded-lg transition"
                  dir="ltr"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="text-[10px] text-center text-slate-400 font-bold">
          إذا لم تكن تعرف معرّف نشاطك، تواصل مع مدير النظام
        </p>
      </div>
    </div>
  );
}
