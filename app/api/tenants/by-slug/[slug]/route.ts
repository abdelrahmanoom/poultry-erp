import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const supabaseAdmin = createAdminClient();

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!slug) {
    return NextResponse.json({ error: 'slug مطلوب' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('tenants')
    .select('name, is_active')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'النشاط غير موجود' }, { status: 404 });
  }

  return NextResponse.json({ name: data.name });
}
