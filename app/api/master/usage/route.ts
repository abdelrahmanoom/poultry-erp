import { NextResponse } from 'next/server';
import { getCurrentMaster } from '@/lib/master-auth';

const SUPABASE_REF = process.env.SUPABASE_PROJECT_REF || 'pumsvckcbvjbtxzfcrls';
const GITHUB_REPO = process.env.GITHUB_REPO || 'abdelrahmanoom/poultry-erp';

const GB = 1024 * 1024 * 1024;
const MB = 1024 * 1024;
const KB = 1024;

async function fetchSupabase() {
  const token = process.env.SUPABASE_TOKEN || process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) throw new Error('SUPABASE_TOKEN غير معرّف');
  const headers = { 'Authorization': 'Bearer ' + token };

  const projRes = await fetch(`https://api.supabase.com/v1/projects/${SUPABASE_REF}`, { headers });
  if (!projRes.ok) throw new Error('Project: HTTP ' + projRes.status);
  const project = await projRes.json();

  // DB Stats via RPC
  let dbStats: any = { db_size_bytes: 0, tables_count: 0, rows_total: 0 };
  try {
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const rpcRes = await fetch(`https://${SUPABASE_REF}.supabase.co/rest/v1/rpc/get_db_stats`, {
      method: 'POST',
      headers: { 'apikey': anonKey, 'Authorization': 'Bearer ' + anonKey, 'Content-Type': 'application/json' },
      body: '{}',
    });
    if (rpcRes.ok) dbStats = await rpcRes.json();
  } catch {}

  // API counts (last 30 days)
  let apiTotal = 0;
  try {
    const acRes = await fetch(
      `https://api.supabase.com/v1/projects/${SUPABASE_REF}/analytics/endpoints/usage.api-counts?interval=1day`,
      { headers }
    );
    if (acRes.ok) {
      const data = await acRes.json();
      (data.result || []).forEach((row: any) => {
        apiTotal += (row.total_rest_requests || 0) + (row.total_auth_requests || 0) + (row.total_storage_requests || 0);
      });
    }
  } catch {}

  // Egress تقديري: 8 KB لكل طلب (متوسط تقديري)
  const egressEstimated = apiTotal * 8 * KB;

  return {
    name: project.name,
    status: project.status,
    region: project.region,
    db_size_bytes: dbStats.db_size_bytes || 0,
    db_limit_bytes: 500 * MB,
    tables_count: dbStats.tables_count || 0,
    rows_total: dbStats.rows_total || 0,
    api_total: apiTotal,
    egress_estimated_bytes: egressEstimated,
    egress_limit_bytes: 5 * GB,
    storage_bytes: 0,
    storage_limit_bytes: 1 * GB,
    plan: 'free',
  };
}

async function fetchVercel() {
  const token = process.env.VERCEL_TOKEN;
  if (!token) throw new Error('VERCEL_TOKEN غير معرّف');
  const headers = { 'Authorization': 'Bearer ' + token };

  const projectsRes = await fetch('https://api.vercel.com/v9/projects', { headers });
  if (!projectsRes.ok) throw new Error('Vercel: HTTP ' + projectsRes.status);
  const data = await projectsRes.json();

  return {
    projects_count: data.projects?.length || 0,
    plan: 'hobby',
    limits: {
      bandwidth_gb: 100,
      cpu_hours: 4,
      invocations: 1_000_000,
      build_minutes: 6000,
      image_optimizations: 1000,
    },
    // Vercel API لا يوفر استخدام فعلي في الخطة المجانية
    usage: {
      bandwidth_gb: null,
      cpu_hours: null,
      invocations: null,
      build_minutes: null,
    },
  };
}

async function fetchGitHub() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN غير معرّف');
  const headers = {
    'Authorization': 'Bearer ' + token,
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'poultry-erp',
  };

  const repoRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}`, { headers });
  if (!repoRes.ok) throw new Error('GitHub: HTTP ' + repoRes.status);
  const repo = await repoRes.json();

  let minutes30d = 0, runs30d = 0;
  try {
    const runsRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/actions/runs?per_page=100`, { headers });
    if (runsRes.ok) {
      const runs = await runsRes.json();
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      (runs.workflow_runs || []).forEach((run: any) => {
        if (new Date(run.created_at).getTime() < cutoff) return;
        runs30d++;
        if (run.status === 'completed' && run.run_started_at && run.updated_at) {
          minutes30d += (new Date(run.updated_at).getTime() - new Date(run.run_started_at).getTime()) / 60000;
        }
      });
    }
  } catch {}

  return {
    repo_name: repo.full_name,
    size_bytes: repo.size * 1024,
    size_limit_bytes: 5 * GB,
    default_branch: repo.default_branch,
    runs_30d: runs30d,
    actions_minutes_30d: Math.round(minutes30d),
    actions_minutes_limit: 2000,
    plan: 'free',
    lfs_bytes: 0,
    lfs_limit_bytes: 1 * GB,
    packages_bytes: 0,
    packages_limit_bytes: 500 * MB,
  };
}

export async function GET() {
  const master = await getCurrentMaster();
  if (!master) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const [sb, vc, gh] = await Promise.allSettled([
    fetchSupabase(), fetchVercel(), fetchGitHub(),
  ]);

  return NextResponse.json({
    supabase: sb.status === 'fulfilled' ? sb.value : { error: (sb as any).reason?.message },
    vercel: vc.status === 'fulfilled' ? vc.value : { error: (vc as any).reason?.message },
    github: gh.status === 'fulfilled' ? gh.value : { error: (gh as any).reason?.message },
    fetched_at: new Date().toISOString(),
  });
}
