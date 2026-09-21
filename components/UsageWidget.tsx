'use client';

import { useEffect, useState } from 'react';
import { Activity, Database, Github, RefreshCw, Server, AlertTriangle } from 'lucide-react';

function fmtBytes(bytes: number) {
  if (!bytes || bytes < 1024) return '0 B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

function Bar({ pct }: { pct: number }) {
  const p = Math.max(0, Math.min(100, pct || 0));
  const color = p >= 80 ? 'bg-rose-500' : p >= 60 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
      <div className={`h-full ${color} transition-all`} style={{ width: p + '%' }} />
    </div>
  );
}

export default function UsageWidget() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/master/usage');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      setData(await res.json());
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="bg-white rounded-3xl border-2 border-slate-200 p-5 space-y-4">
      <div className="flex justify-between items-center border-b pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" />
          <h2 className="text-base font-black text-slate-900">استهلاك الموارد</h2>
        </div>
        <button onClick={load} disabled={loading} className="bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 disabled:opacity-50">
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          <span>تحديث</span>
        </button>
      </div>

      {loading && !data && (
        <div className="text-center py-6 text-slate-400 text-sm font-bold">جاري التحميل...</div>
      )}

      {error && (
        <div className="text-xs font-bold text-rose-700 bg-rose-50 p-2 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-black text-emerald-800">
              <Database className="w-4 h-4" />
              <span>Supabase</span>
            </div>
            {data.supabase?.error ? (
              <div className="text-[10px] font-bold text-rose-700">{data.supabase.error}</div>
            ) : data.supabase && (
              <>
                <div className="text-[10px] font-bold text-slate-700">
                  قاعدة البيانات: {fmtBytes(data.supabase.db_size_bytes)} / 500 MB
                </div>
                <Bar pct={(data.supabase.db_size_bytes / (500 * 1024 * 1024)) * 100} />
                <div className="text-[10px] font-bold text-slate-600">
                  الجداول: {data.supabase.tables_count} — الصفوف: {data.supabase.rows_total}
                </div>
                <div className="text-[10px] font-bold text-slate-600">
                  Egress (30ي): {data.supabase.api_total?.toLocaleString() || 0} طلب
                </div>
              </>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-black text-blue-800">
              <Server className="w-4 h-4" />
              <span>Vercel</span>
            </div>
            {data.vercel?.error ? (
              <div className="text-[10px] font-bold text-rose-700">{data.vercel.error}</div>
            ) : data.vercel && (
              <>
                <div className="text-[10px] font-bold text-slate-700">المشاريع: {data.vercel.projects_count}</div>
                <div className="text-[10px] font-bold text-slate-600">Bandwidth: 100 GB/شهر</div>
                <div className="text-[10px] font-bold text-slate-600">CPU: 4 ساعات/شهر</div>
                <div className="text-[10px] font-bold text-slate-600">Build: 6000 دقيقة/شهر</div>
                <div className="text-[9px] text-slate-500 leading-relaxed">
                  راقب الاستخدام: vercel.com/dashboard/usage
                </div>
              </>
            )}
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-black text-slate-800">
              <Github className="w-4 h-4" />
              <span>GitHub</span>
            </div>
            {data.github?.error ? (
              <div className="text-[10px] font-bold text-rose-700">{data.github.error}</div>
            ) : data.github && (
              <>
                <div className="text-[10px] font-bold text-slate-700 font-mono" dir="ltr">{data.github.repo_name}</div>
                <div className="text-[10px] font-bold text-slate-600">الحجم: {fmtBytes(data.github.size_bytes)}</div>
                <div className="text-[10px] font-bold text-slate-600">Actions (30ي): {data.github.actions_minutes_30d} / 2000 دقيقة</div>
                <Bar pct={(data.github.actions_minutes_30d / 2000) * 100} />
              </>
            )}
          </div>
        </div>
      )}

      {data?.fetched_at && (
        <div className="text-[9px] text-slate-400 font-bold text-center">
          آخر فحص: {new Date(data.fetched_at).toLocaleString('ar-EG')}
        </div>
      )}
    </div>
  );
}
