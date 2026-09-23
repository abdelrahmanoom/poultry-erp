'use client';

import { useEffect, useState } from 'react';
import { Activity, Database, Github, RefreshCw, Server, AlertTriangle, TrendingUp } from 'lucide-react';

const GB = 1024 * 1024 * 1024;
const MB = 1024 * 1024;
const KB = 1024;

function fmtBytes(bytes: number) {
  if (!bytes || bytes < KB) return (bytes || 0) + ' B';
  if (bytes < MB) return (bytes / KB).toFixed(1) + ' KB';
  if (bytes < GB) return (bytes / MB).toFixed(2) + ' MB';
  return (bytes / GB).toFixed(2) + ' GB';
}

function barColor(pct: number) {
  if (pct >= 85) return 'bg-rose-500';
  if (pct >= 70) return 'bg-amber-500';
  if (pct >= 50) return 'bg-yellow-500';
  return 'bg-emerald-500';
}

function Bar({ pct, label }: { pct: number; label?: string }) {
  const p = Math.max(0, Math.min(100, pct || 0));
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-[10px] font-bold">
        <span className="text-slate-700">{label}</span>
        <span className={p >= 85 ? 'text-rose-600' : p >= 70 ? 'text-amber-600' : 'text-emerald-600'}>
          {p.toFixed(1)}%
        </span>
      </div>
      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full ${barColor(p)} transition-all`} style={{ width: p + '%' }} />
      </div>
    </div>
  );
}

function StatRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex justify-between items-center text-[10px] font-bold py-1 border-b border-slate-100 last:border-0">
      <span className="text-slate-600">{label}</span>
      <span className="text-slate-900 font-mono">
        {value}
        {sub && <span className="text-slate-400 mr-1 text-[9px]"> {sub}</span>}
      </span>
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

  const sb = data?.supabase;
  const vc = data?.vercel;
  const gh = data?.github;

  return (
    <div className="bg-white rounded-3xl border-2 border-slate-200 p-5 space-y-4">
      <div className="flex justify-between items-center border-b pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" />
          <h2 className="text-base font-black text-slate-900">استهلاك الموارد والحدود</h2>
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

          {/* ============ SUPABASE ============ */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-black text-emerald-800">
                <Database className="w-4 h-4" />
                <span>Supabase</span>
              </div>
              {sb?.plan && (
                <span className="text-[9px] bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded font-bold">
                  {sb.plan === 'free' ? 'مجاني' : sb.plan}
                </span>
              )}
            </div>

            {sb?.error ? (
              <div className="text-[10px] font-bold text-rose-700">{sb.error}</div>
            ) : sb && (
              <>
                <Bar
                  pct={(sb.db_size_bytes / sb.db_limit_bytes) * 100}
                  label={`قاعدة البيانات: ${fmtBytes(sb.db_size_bytes)} / ${fmtBytes(sb.db_limit_bytes)}`}
                />
                <Bar
                  pct={(sb.egress_estimated_bytes / sb.egress_limit_bytes) * 100}
                  label={`Egress (تقديري): ${fmtBytes(sb.egress_estimated_bytes)} / ${fmtBytes(sb.egress_limit_bytes)}`}
                />
                <Bar
                  pct={(sb.storage_bytes / sb.storage_limit_bytes) * 100}
                  label={`التخزين: ${fmtBytes(sb.storage_bytes)} / ${fmtBytes(sb.storage_limit_bytes)}`}
                />

                <div className="pt-2 border-t border-emerald-200 space-y-0.5">
                  <StatRow label="الجداول" value={String(sb.tables_count)} />
                  <StatRow label="الصفوف" value={sb.rows_total?.toLocaleString()} />
                  <StatRow label="طلبات API (30ي)" value={sb.api_total?.toLocaleString()} />
                  <StatRow label="المنطقة" value={sb.region || '—'} />
                </div>
              </>
            )}
          </div>

          {/* ============ VERCEL ============ */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-black text-blue-800">
                <Server className="w-4 h-4" />
                <span>Vercel</span>
              </div>
              {vc?.plan && (
                <span className="text-[9px] bg-blue-200 text-blue-900 px-1.5 py-0.5 rounded font-bold">
                  {vc.plan === 'hobby' ? 'Hobby' : vc.plan}
                </span>
              )}
            </div>

            {vc?.error ? (
              <div className="text-[10px] font-bold text-rose-700">{vc.error}</div>
            ) : vc && (
              <>
                <div className="bg-blue-100 border border-blue-300 rounded-lg p-2 text-[9px] font-bold text-blue-900 flex items-start gap-1.5">
                  <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                  <span>Vercel لا يوفر استخداماً فعلياً في API العام — راقب يدوياً من vercel.com/dashboard/usage</span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-1 text-[10px] font-black text-blue-900">
                    <TrendingUp className="w-3 h-3" />
                    <span>الحدود الشهرية</span>
                  </div>
                  <StatRow label="Bandwidth" value={`${vc.limits.bandwidth_gb} GB / شهر`} />
                  <StatRow label="CPU Hours" value={`${vc.limits.cpu_hours} ساعات / شهر`} />
                  <StatRow label="Function Invocations" value={`${(vc.limits.invocations / 1000000).toFixed(1)}M / شهر`} />
                  <StatRow label="Build Minutes" value={`${vc.limits.build_minutes.toLocaleString()} دقيقة / شهر`} />
                  <StatRow label="Image Optimizations" value={`${vc.limits.image_optimizations.toLocaleString()} / شهر`} />
                </div>

                <div className="pt-2 border-t border-blue-200">
                  <StatRow label="المشاريع" value={String(vc.projects_count)} />
                </div>
              </>
            )}
          </div>

          {/* ============ GITHUB ============ */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-black text-slate-800">
                <Github className="w-4 h-4" />
                <span>GitHub</span>
              </div>
              {gh?.plan && (
                <span className="text-[9px] bg-slate-200 text-slate-900 px-1.5 py-0.5 rounded font-bold">
                  {gh.plan === 'free' ? 'مجاني' : gh.plan}
                </span>
              )}
            </div>

            {gh?.error ? (
              <div className="text-[10px] font-bold text-rose-700">{gh.error}</div>
            ) : gh && (
              <>
                <div className="text-[9px] font-mono text-slate-600 truncate" dir="ltr">
                  {gh.repo_name}
                </div>

                <Bar
                  pct={(gh.size_bytes / gh.size_limit_bytes) * 100}
                  label={`حجم المستودع: ${fmtBytes(gh.size_bytes)} / ${fmtBytes(gh.size_limit_bytes)}`}
                />
                <Bar
                  pct={(gh.actions_minutes_30d / gh.actions_minutes_limit) * 100}
                  label={`Actions (30ي): ${gh.actions_minutes_30d} / ${gh.actions_minutes_limit} دقيقة`}
                />
                <Bar
                  pct={(gh.lfs_bytes / gh.lfs_limit_bytes) * 100}
                  label={`LFS: ${fmtBytes(gh.lfs_bytes)} / ${fmtBytes(gh.lfs_limit_bytes)}`}
                />
                <Bar
                  pct={(gh.packages_bytes / gh.packages_limit_bytes) * 100}
                  label={`Packages: ${fmtBytes(gh.packages_bytes)} / ${fmtBytes(gh.packages_limit_bytes)}`}
                />

                <div className="pt-2 border-t border-slate-200 space-y-0.5">
                  <StatRow label="Runs (30ي)" value={String(gh.runs_30d)} />
                  <StatRow label="الفرع" value={gh.default_branch || '—'} />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {data?.fetched_at && (
        <div className="text-[9px] text-slate-400 font-bold text-center pt-2 border-t">
          آخر فحص: {new Date(data.fetched_at).toLocaleString('ar-EG')}
        </div>
      )}
    </div>
  );
}
