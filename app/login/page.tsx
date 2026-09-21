'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'اسم المستخدم أو كلمة المرور غير صحيحة');
        setLoading(false);
        return;
      }

      // احفظ معلومات المستخدم للعرض السريع (لكن الحقيقة من الكوكي httpOnly)
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem('erp_user_display', JSON.stringify({
        username: data.user.username,
        full_name: data.user.full_name,
        role: data.user.role,
        tenant_name: data.user.tenant_name,
      }));

      router.push('/dashboard');
    } catch (err: any) {
      setError('حدث خطأ أثناء الاتصال بالخادم');
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 md:p-8 shadow-2xl border border-slate-800 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-black text-slate-900">دواجن سنتر</h1>
          <p className="text-xs text-slate-500 font-bold">تسجيل الدخول للمنظومة الإدارية</p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 text-xs font-bold">
          <div>
            <label className="block text-slate-700 mb-1.5">اسم المستخدم:</label>
            <div className="relative">
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="اسم المستخدم"
                autoComplete="username"
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-3 pr-10 text-sm font-bold bg-slate-50 outline-none focus:border-blue-600 transition h-12"
              />
              <User className="w-4 h-4 text-slate-400 absolute right-3 top-4" />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 mb-1.5">كلمة المرور:</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-3 pr-10 pl-10 text-sm font-bold bg-slate-50 outline-none focus:border-blue-600 transition font-mono h-12"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-4" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-3 text-slate-400 hover:text-slate-700" tabIndex={-1}>
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center text-xs text-slate-500">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span>تذكر هذا الجهاز</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black py-3.5 rounded-xl shadow-lg transition text-xs flex justify-center items-center gap-2 h-12"
          >
            {loading ? 'جاري التحقق...' : 'دخول المنظومة'}
          </button>
        </form>

        <p className="text-[10px] text-center text-slate-400 font-bold leading-relaxed">
          المستخدمون الحاليون: admin / slaughter / store / cashier
          <br />
          كلمة المرور الافتراضية: 123456 — غيّرها بعد الدخول
        </p>
      </div>
    </div>
  );
}