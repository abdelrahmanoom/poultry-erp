import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ArrowLeft, ShieldCheck, Scale, Truck, TrendingUp } from 'lucide-react';

export const revalidate = 0;

export default async function HomePage() {
  const supabase = await createClient();
  
  const { data: latestPrice } = await supabase
    .from('market_prices')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const exchange = latestPrice?.exchange_price ? Number(latestPrice.exchange_price) : 85;

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
          <div>
            <span className="font-black text-base text-slate-900 block leading-tight">منظومة دواجن سنتر</span>
            <span className="text-[10px] text-blue-600 font-bold">التوريد المعتمد لقطاع المطاعم والفنادق</span>
          </div>
          <Link 
            href="/login" 
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow flex items-center gap-1.5"
          >
            <span>تسجيل دخول الموظفين</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      <section className="py-12 md:py-16 px-4 max-w-5xl mx-auto text-center space-y-4">
        <span className="bg-blue-100 text-blue-800 text-xs font-extrabold px-3 py-1 rounded-full inline-block">
          قطاع التوريدات الغذائية المتخصصة
        </span>
        <h1 className="text-2xl md:text-4xl font-black text-slate-900 leading-tight">
          تجهيز وتوريد مقطعات الدواجن الطازجة يوميا
        </h1>
        <p className="text-xs md:text-sm text-slate-600 max-w-2xl mx-auto font-medium leading-relaxed">
          نلبي احتياجات مطاعم المأكولات السريعة وسلاسل الشاورما والفنادق بأعلى مواصفات الجودة وتوزيع مبرد منتظم.
        </p>
      </section>

      <section className="max-w-6xl mx-auto px-4 w-full mb-10">
        <div className="bg-white rounded-3xl p-5 md:p-6 shadow-sm border border-slate-200 space-y-4">
          <div className="flex flex-wrap justify-between items-center border-b border-slate-100 pb-3 gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <h2 className="font-black text-sm text-slate-900">أسعار الجملة الاسترشادية للتوريد اليوم</h2>
            </div>
            <span className="text-xs font-bold text-slate-500 font-mono">
              سعر التنفيذ الأساسي: {exchange} ج / كجم
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              <span className="text-xs font-bold text-slate-500 block mb-1">بانيه فصوص طازج</span>
              <b className="text-lg font-black text-blue-900 font-mono">{(exchange * 2.8).toFixed(1)} ج</b>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              <span className="text-xs font-bold text-slate-500 block mb-1">شيش طاووق</span>
              <b className="text-lg font-black text-blue-900 font-mono">{(exchange * 2.45).toFixed(1)} ج</b>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              <span className="text-xs font-bold text-slate-500 block mb-1">وراك مخلية</span>
              <b className="text-lg font-black text-blue-900 font-mono">{(exchange + 5).toFixed(1)} ج</b>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              <span className="text-xs font-bold text-slate-500 block mb-1">شاورما صدور بالجلد</span>
              <b className="text-lg font-black text-blue-900 font-mono">{(exchange * 2.48).toFixed(1)} ج</b>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
          <Scale className="w-6 h-6 text-blue-600" />
          <h3 className="font-extrabold text-sm text-slate-900">تجهيز حسب المواصفات</h3>
          <p className="text-xs text-slate-500 leading-relaxed">تقطيع وتشفية وسحب عظم وسلخ جلد وفق معايير الشيف المعتمدة للمطعم.</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
          <Truck className="w-6 h-6 text-emerald-600" />
          <h3 className="font-extrabold text-sm text-slate-900">شحن مبرد في الموعد</h3>
          <p className="text-xs text-slate-500 leading-relaxed">سيارات نقل مجهزة تصل مبكرا لضمان تشغيل مطبخك دون تأخير.</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
          <ShieldCheck className="w-6 h-6 text-indigo-600" />
          <h3 className="font-extrabold text-sm text-slate-900">انضباط مالي ومحاسبي</h3>
          <p className="text-xs text-slate-500 leading-relaxed">إيصالات تسليم معتمدة وكشوف حسابات دورية وتسهيلات دفع للعملاء المنتظمين.</p>
        </div>
      </section>

      <footer className="mt-auto bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400 font-medium">
        جميع الحقوق محفوظة للمنظومة السحابية لتجهيز وتوريد الدواجن
      </footer>
    </div>
  );
}