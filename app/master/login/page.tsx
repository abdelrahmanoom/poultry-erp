'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Shield, AlertCircle } from 'lucide-react';

export default function MasterLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('master@poultry.local');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/master/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'خطأ في الدخول');
        setLoading(false);
        return;
      }

      router.push('/master');
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="bg-slate-900 p-4 rounded-2xl w-fit mx-auto">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">لوحة Master</h1>
          <p className="text-xs text-slate-500 font-bold">إدارة كل الأعمال من مكان واحد</p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl flex items-center gap-2 text-xs font-bold text-rose-800">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">البريد الإلكتروني:</label>
            <div className="relative">
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl pr-10 pl-3 h-12 text-sm font-bold outline-none focus:border-slate-900"
                required
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">كلمة المرور:</label>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl pr-10 pl-3 h-12 text-sm font-bold outline-none focus:border-slate-900"
                placeholder="كلمة المرور"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-black py-3.5 rounded-xl text-sm transition"
          >
            {loading ? 'جاري التحقق...' : 'دخول إلى لوحة Master'}
          </button>
        </form>

        <p className="text-[10px] text-center text-slate-400 font-bold">
          كلمة المرور الافتراضية: Admin@2026 — غيّرها بعد الدخول
        </p>
      </div>
    </div>
  );
}