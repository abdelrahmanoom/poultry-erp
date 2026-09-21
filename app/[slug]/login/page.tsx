'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Lock, User, AlertCircle, Eye, EyeOff, Boxes, Building2 } from 'lucide-react';

export default function SlugLoginPage() {
  const router = useRouter();
  const params = useParams();
  const slug = String(params.slug || '');

  const [username, setUsername] = useState(process.env.NEXT_PUBLIC_DEV_USERNAME || '');
  const [password, setPassword] = useState(process.env.NEXT_PUBLIC_DEV_PASSWORD || '');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [tenantName, setTenantName] = useState<string>('');

  // جلب اسم النشاط من slug
  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data } = await supabase
          .from('tenants')
          .select('name, is_active')
          .eq('slug', slug)
          .eq('is_active', true)
          .maybeSingle();
        if (data) setTenantName(data.name);
        else setError('النشاط غير موجود أو غير مفعّل');
      } catch (e) {}
    })();
  }, [slug]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, slug }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'اسم المستخدم أو كلمة المرور غير صحيحة');
        setLoading(false);
        return;
      }

      const storage = rememberMe ? localStorage : sessionStorage;
      const userSlug = data.user.tenant_slug || slug;
      storage.setItem('erp_user_display', JSON.stringify({
        username: data.user.username,
        full_name: data.user.full_name,
        role: data.user.role,
        tenant_name: data.user.tenant_name,
        tenant_slug: userSlug,
        is_read_only: data.user.is_read_only || false,
      }));

      router.push('/' + userSlug + '/dashboard');
    } catch (err: any) {
      setError('حدث خطأ أثناء الاتصال بالخادم');
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 md:p-8 shadow-2xl space-y-6">

        <div className="text-center space-y-3">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-3 rounded-2xl w-fit mx-auto shadow-lg shadow-blue-600/30">
            <Boxes className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">
              {tenantName || 'جاري التحميل...'}
            </h1>
            <p className="text-xs text-slate-500 font-bold mt-1 flex items-center justify-center gap-1">
              <Building2 className="w-3.5 h-3.5" />
              <span className="font-mono">{slug}</span>
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border-2 border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">اسم المستخدم</label>
            <div className="relative">
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                className="w-full border-2 border-slate-200 rounded-xl px-3 pr-11 h-12 text-sm font-bold bg-slate-50 outline-none focus:border-blue-600 focus:bg-white transition"
              />
              <User className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">كلمة المرور</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full border-2 border-slate-200 rounded-xl pl-11 pr-11 h-12 text-sm font-bold bg-slate-50 outline-none focus:border-blue-600 focus:bg-white transition"
              />
              <Lock className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-600">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 accent-blue-600"
            />
            <span>تذكرني على هذا الجهاز</span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black py-3.5 rounded-xl shadow-lg shadow-blue-600/20 transition text-sm h-12"
          >
            {loading ? 'جاري التحقق...' : 'دخول النظام'}
          </button>
        </form>

        <p className="text-[10px] text-center text-slate-400 font-bold">
          رابط الدخول الخاص بنشاطك
        </p>
      </div>
    </div>
  );
}
