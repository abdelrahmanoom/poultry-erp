import Link from 'next/link';
import { ArrowLeft, Scale, TrendingUp, BarChart3, Package, Users, Wallet, Boxes, ShoppingCart } from 'lucide-react';

export const revalidate = 0;

export default async function HomePage() {
  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-800 flex flex-col font-sans">

      {/* Header */}
      <header className="bg-white/80 backdrop-blur border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-14 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <Boxes className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-sm text-slate-900">منظومة الدواجن</span>
          </div>
          <Link href="/login" className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5">
            <span>دخول النظام</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="px-4 pt-10 pb-8 text-center max-w-3xl mx-auto space-y-5">
        <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-extrabold px-3 py-1.5 rounded-full">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>نظام ERP متخصص لقطاع الدواجن</span>
        </div>

        <h1 className="text-2xl md:text-4xl font-black text-slate-900 leading-tight">
          إدارة كاملة لمحل الدواجن
          <span className="block text-blue-600 mt-1">من التوريد إلى التحصيل</span>
        </h1>

        <p className="text-sm md:text-base text-slate-600 font-medium leading-relaxed max-w-2xl mx-auto">
          منظومة محاسبية متكاملة تشمل الإنتاج والتقطيع، إدارة المخزون، المبيعات، الخزينة، والتقارير المالية الدقيقة.
        </p>

        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
          <Link href="/login" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-6 py-3 rounded-xl transition shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2">
            <span>ابدأ الآن</span>
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Hero Image */}
      <section className="px-4 pb-10 max-w-4xl mx-auto w-full">
        <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-200 bg-slate-100">
          <img
            src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80&auto=format&fit=crop"
            alt="لوحة تحكم ERP"
            className="w-full h-48 md:h-80 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent"></div>
          <div className="absolute bottom-4 right-4 text-white">
            <p className="text-[10px] font-bold opacity-90">نظام متكامل بمظهر عصري</p>
            <p className="text-base font-black">لوحة تحكم مباشرة</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 pb-12 max-w-6xl mx-auto w-full">
        <div className="text-center mb-6">
          <h2 className="text-lg md:text-2xl font-black text-slate-900">وحدات النظام</h2>
          <p className="text-xs text-slate-500 font-bold mt-1">كل ما تحتاجه لإدارة المحل في مكان واحد</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: BarChart3, color: 'blue', title: 'المحاسبة المالية', desc: 'ميزان مراجعة، قيود مزدوجة، أرباح وخسائر، وإقفال سنة.' },
            { icon: Package, color: 'emerald', title: 'المخزون والدفعات', desc: 'تتبع FIFO، صلاحية الطازج، وتسويات التبريد.' },
            { icon: ShoppingCart, color: 'rose', title: 'المبيعات والتحصيل', desc: 'فواتير متعددة البنود، آجل، جزئي، وحوكمة الأسعار.' },
            { icon: Scale, color: 'indigo', title: 'الإنتاج والتقطيع', desc: 'توزيع أوزان التشفية، حساب الفاقد، ومقارنة الفعلي بالمتوقع.' },
            { icon: Wallet, color: 'amber', title: 'الخزائن والحركات', desc: 'متعددة الخزائن، إيصالات قبض/صرف، وإقفال ورديات.' },
            { icon: Users, color: 'purple', title: 'العملاء والموردين', desc: 'كشوف حساب زمنية، أرصدة مباشرة، وتتبع التحصيلات.' },
          ].map((feature, i) => {
            const Icon = feature.icon;
            const colorMap: any = {
              blue: 'bg-blue-50 text-blue-600 border-blue-200',
              emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
              rose: 'bg-rose-50 text-rose-600 border-rose-200',
              indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200',
              amber: 'bg-amber-50 text-amber-600 border-amber-200',
              purple: 'bg-purple-50 text-purple-600 border-purple-200',
            };
            return (
              <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition space-y-2">
                <div className={'inline-flex p-2.5 rounded-xl border ' + colorMap[feature.color]}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-black text-sm text-slate-900">{feature.title}</h3>
                <p className="text-xs text-slate-500 font-bold leading-relaxed">{feature.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-slate-900 text-slate-400 py-6 px-4">
        <div className="max-w-6xl mx-auto text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <Boxes className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-white font-black text-sm">منظومة الدواجن</span>
          </div>
          <p className="text-[11px] font-bold">
            © {new Date().getFullYear()} جميع الحقوق محفوظة — منظومة ERP متخصصة لقطاع الدواجن
          </p>
        </div>
      </footer>
    </div>
  );
}
