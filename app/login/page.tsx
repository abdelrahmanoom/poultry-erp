'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, AlertCircle, Eye, EyeOff, Boxes, Hash } from 'lucide-react';
import TenantLogo from '@/components/TenantLogo';

export default function LoginPage() {
  const [slug, setSlug] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  // قراءة slug من localStorage عند فتح الصفحة
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('last_tenant_slug');
    if (saved && !slug) setSlug(saved);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          slug: slug.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'اسم المستخدم أو كلمة المرور غير صحيحة');
        setLoading(false);
        return;
      }

      const storage = rememberMe ? localStorage : sessionStorage;
      const userSlug = data.user.tenant_slug || slug.trim() || '';
      storage.setItem('erp_user_display', JSON.stringify({
        username: data.user.username,
        full_name: data.user.full_name,
        role: data.user.role,
        tenant_id: data.user.tenant_id,
        tenant_name: data.user.tenant_name,
        tenant_slug: userSlug,
        is_read_only: data.user.is_read_only || false,
        must_change_password: data.user.must_change_password || false,
      }));

      // حفظ الـ slug للزيارة القادمة (للمتصفح + لنا)
      localStorage.setItem('last_tenant_slug', userSlug);

      // window.location.href → يخبر المتصفح أن الدخول نجح → يعرض "حفظ كلمة المرور"
      window.location.href = '/' + userSlug + '/dashboard';
    } catch (err: any) {
      setError('حدث خطأ أثناء الاتصال بالخادم');
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 md:p-8 shadow-2xl space-y-6">

        {/* الشعار والعنوان */}
        <div className="text-center space-y-3">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-3 rounded-2xl w-fit mx-auto shadow-lg shadow-blue-600/30">
            <TenantLogo size="lg" rounded={true} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">ثُلَاث</h1>
            <p className="text-xs text-slate-500 font-bold mt-1">أدخل بياناتك للوصول لنشاطك</p>
          </div>
        </div>

        {/* رسالة الخطأ */}
        {error && (
          <div className="bg-rose-50 border-2 border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} action="/api/auth/login" method="POST" autoComplete="on" className="space-y-4">

          {/* معرّف النشاط */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">معرّف النشاط</label>
            <div className="relative">
              <input
                type="text"
                name="tenant_slug"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="أدخل معرّف النشاط"
                autoComplete="off"
                className="w-full border-2 border-slate-200 rounded-xl px-3 pr-11 h-12 text-sm font-bold bg-slate-50 outline-none focus:border-blue-600 focus:bg-white transition"
              />
              <Hash className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* اسم المستخدم */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">اسم المستخدم</label>
            <div className="relative">
              <input
                type="text"
                name="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="أدخل اسم المستخدم"
                autoComplete="username"
                className="w-full border-2 border-slate-200 rounded-xl px-3 pr-11 h-12 text-sm font-bold bg-slate-50 outline-none focus:border-blue-600 focus:bg-white transition"
              />
              <User className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* كلمة المرور */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">كلمة المرور</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة المرور"
                autoComplete="current-password"
                className="w-full border-2 border-slate-200 rounded-xl pl-11 pr-11 h-12 text-sm font-bold bg-slate-50 outline-none focus:border-blue-600 focus:bg-white transition"
              />
              <Lock className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition"
                tabIndex={-1}
                aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* تذكرني */}
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-600">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 accent-blue-600"
            />
            <span>تذكرني على هذا الجهاز</span>
          </label>

          {/* زر الدخول */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black py-3.5 rounded-xl shadow-lg shadow-blue-600/20 transition text-sm h-12"
          >
            {loading ? 'جاري التحقق...' : 'دخول النظام'}
          </button>
        </form>
      </div>
    </div>
  );
}
