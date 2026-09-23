'use client';

import { useState } from 'react';
import { Lock, AlertTriangle, CheckCircle, X } from 'lucide-react';

interface Props {
  forced?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
}

export default function PasswordChangeModal({ forced = false, onClose, onSuccess }: Props) {
  const [currentPassword, setCurrentPassword] = useState(forced ? '123456' : '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('كلمتا المرور الجديدتان غير متطابقتين');
      return;
    }
    if (currentPassword === newPassword) {
      setError('كلمة المرور الجديدة يجب أن تختلف عن الحالية');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      setLoading(false);

      if (!res.ok || !data.success) {
        setError(data.error || 'فشل تغيير كلمة المرور');
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
        if (!forced && onClose) onClose();
      }, 1200);
    } catch (err: any) {
      setLoading(false);
      setError('حدث خطأ في الاتصال');
    }
  };

  const handleClose = () => {
    if (forced) return;
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className={`p-6 text-white ${forced ? 'bg-gradient-to-l from-rose-600 to-rose-800' : 'bg-gradient-to-l from-blue-600 to-blue-800'}`}>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black">
                  {forced ? 'يجب تغيير كلمة المرور' : 'تغيير كلمة المرور'}
                </h3>
                <p className="text-[11px] font-bold opacity-90 mt-0.5">
                  {forced ? 'لأول مرة — استخدم كلمة قوية خاصة بك' : 'أدخل كلمة المرور الحالية والجديدة'}
                </p>
              </div>
            </div>
            {!forced && (
              <button onClick={handleClose} className="text-white/70 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {forced && (
          <div className="bg-amber-50 border-b-2 border-amber-200 p-3 flex items-start gap-2 text-xs font-bold text-amber-900">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>يجب تغيير كلمة المرور الافتراضية قبل استخدام النظام</span>
          </div>
        )}

        {success ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h4 className="text-base font-black text-slate-800">تم تغيير كلمة المرور بنجاح</h4>
            <p className="text-xs text-slate-500 font-bold">جارٍ إعادة التحميل...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="bg-rose-50 border-2 border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-bold">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">كلمة المرور الحالية:</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold bg-slate-50 focus:border-blue-500 outline-none"
                required
                autoComplete="current-password"
              />
              {forced && (
                <p className="text-[10px] text-slate-500 font-bold mt-1">
                  ملاحظة: كلمة المرور الافتراضية هي <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">123456</span> — إذا كانت مختلفة، عدّلها
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">كلمة المرور الجديدة:</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold bg-slate-50 focus:border-blue-500 outline-none"
                required
                minLength={8}
                autoComplete="new-password"
              />
              <p className="text-[10px] text-slate-500 font-bold mt-1">8 أحرف على الأقل</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">تأكيد كلمة المرور الجديدة:</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl px-3 h-11 text-sm font-bold bg-slate-50 focus:border-blue-500 outline-none"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full font-black py-3 rounded-xl text-sm text-white transition disabled:opacity-50 ${forced ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {loading ? 'جاري الحفظ...' : 'حفظ كلمة المرور'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
