'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  BookOpen, PlayCircle, Shield, Package, Scissors, Warehouse,
  ShoppingCart, Wallet, Users, Truck, FileText, Settings, HelpCircle,
  TrendingUp, AlertTriangle, Building2, KeyRound, FlaskConical, Calculator,
  ChevronLeft, ExternalLink
} from 'lucide-react';

export default function HelpPage() {
  const [expanded, setExpanded] = useState<string | null>('start');

  const restartTour = () => {
    try {
      localStorage.removeItem('erp_tour_done');
      sessionStorage.removeItem('erp_tour_done');
    } catch (e) {}
    window.location.href = '/dashboard';
  };

  const sections = [
    {
      key: 'start',
      icon: BookOpen,
      title: 'البدء السريع',
      color: 'blue',
      settingsLink: null,
      content: [
        { num: '1', title: 'اضبط البيانات الأساسية', desc: 'قبل أي عملية: الأصناف، الخزائن، الموردين، العملاء، ومسارات التجهيز. هذه الثوابت التي تُبنى عليها كل العمليات.' },
        { num: '2', title: 'ادخل الأرصدة الافتتاحية', desc: 'عند بدء التشغيل: نقدية الدرج، مديونيات العملاء القدامى، مستحقات الموردين، وبضاعة الثلاجة. ثم اضغط "اعتماد وقفل".' },
        { num: '3', title: 'ابدأ دورة التشغيل', desc: 'أمر توريد → تقطيع → مخزون → بيع → تحصيل. كل خطوة مترابطة مع الباقي.' },
      ],
    },
    {
      key: 'business',
      icon: Building2,
      title: 'تفاصيل النشاط (الهوية)',
      color: 'slate',
      settingsLink: '/settings?tab=business&group=admin',
      content: [
        { num: '1', title: 'الاسم التجاري', desc: 'يظهر في القائمة الجانبية وأعلى كل صفحة. غيّره من هنا ليصبح اسم نشاطك الحقيقي بدل "منظومة الإدارة".' },
        { num: '2', title: 'المعرّف الفريد (Slug)', desc: 'يُستخدم لإنشاء رابط الدخول الخاص بك — مثل poultry-erp.com/اسم-نشاطك/login. لا يمكن تغييره بعد الحفظ.' },
        { num: '3', title: 'البيانات الرسمية', desc: 'السجل التجاري، الرقم الضريبي، العنوان — تظهر في الفواتير والتقارير المطبوعة.' },
      ],
    },
    {
      key: 'products',
      icon: Package,
      title: 'الأصناف والتسعير',
      color: 'emerald',
      settingsLink: '/settings?tab=products&group=basic',
      content: [
        { num: '1', title: 'إضافة صنف', desc: 'الكود يُولَّد تلقائياً (P-XXXX). أدخل: الاسم، طريقة التسعير (ضرب × / إضافة + / سعر ثابت)، والمعامل.' },
        { num: '2', title: 'معامل التوزيع', desc: 'يُستخدم لتوزيع تكلفة الدفعة على الأصناف عند الإنتاج. النسبة من إجمالي الدفعة (25%، 35%، … إلخ).' },
        { num: '3', title: 'الأرشفة بدل الحذف', desc: 'أي صنف له مبيعات سابقة = يُؤرشف (يختفي من القوائم، لكن تاريخه يبقى).' },
      ],
    },
    {
      key: 'treasuries',
      icon: Wallet,
      title: 'الخزائن والحركات النقدية',
      color: 'amber',
      settingsLink: '/settings?tab=treasuries&group=basic',
      content: [
        { num: '1', title: 'إنشاء خزينة', desc: 'كل خزينة لها كود (MAIN-CASH)، اسم، ونوع (نقدية / بنكية / عهدة). تُستخدم عند تسجيل أي إيصال.' },
        { num: '2', title: 'استلام ودفع', desc: 'من صفحة /treasury → "استلام نقدية" (من عميل) أو "دفع نقدية" (لمورد). كل إيصال يُربط بخزينة تلقائياً.' },
        { num: '3', title: 'إقفال الوردية', desc: 'في نهاية اليوم: أدخل النقدية الفعلية. النظام يحسب العجز/الزيادة تلقائياً.' },
      ],
    },
    {
      key: 'partners',
      icon: Users,
      title: 'العملاء والموردين',
      color: 'purple',
      settingsLink: '/settings?tab=customers&group=basic',
      content: [
        { num: '1', title: 'العملاء', desc: 'كل عميل: اسم، هاتف، سقف ائتمان، ورصيد (يُحدَّث تلقائياً من الفواتير والتحصيلات).' },
        { num: '2', title: 'الموردين', desc: 'كل مورد: اسم، هاتف، ورصيد (يُحدَّث من أوامر التوريد والمدفوعات).' },
        { num: '3', title: 'الأرشفة', desc: 'لا يمكن حذف عميل/مورد له حركات — يُؤرشف فقط. يعود بنقرة "استعادة".' },
      ],
    },
    {
      key: 'pathways',
      icon: Scissors,
      title: 'مسارات التجهيز',
      color: 'rose',
      settingsLink: '/settings?tab=pathways&group=operations',
      content: [
        { num: '1', title: 'ما هو المسار؟', desc: 'قائمة أصناف بنسبها المتوقعة من الوزن الحي. مثال: مسار التجزئة (بانيه 25% + وراك 35% + أجنحة 12.5% + …).' },
        { num: '2', title: 'النسب + الفاقد', desc: 'مجموع النسب + الفاقد = 100%. النظام يحسب الفاقد ويعرضه أسفل كل مسار.' },
        { num: '3', title: 'حفظ من التشغيل', desc: 'لا تحتاج لتعريف مسار مقدماً — من /production، ادخل الأوزان الفعلية، ثم اضغط "حفظ كمسار" لإنشاء واحد جديد.' },
      ],
    },
    {
      key: 'opening',
      icon: Calculator,
      title: 'الأرصدة الافتتاحية',
      color: 'indigo',
      settingsLink: '/settings?tab=opening&group=accounting',
      content: [
        { num: '1', title: '4 تبويبات', desc: 'خزائن / عملاء / موردين / بضاعة. املأ ما تحتاجه، اضغط "حفظ مسودة" لكل تبويب على حدة.' },
        { num: '2', title: 'بضاعة الثلاجة', desc: 'الكمية (كجم) + تكلفة الكيلو. النظام يحسب القيمة الإجمالية ويعرضها.' },
        { num: '3', title: 'الاعتماد النهائي', desc: 'بعد إدخال كل شيء → "اعتماد وقفل". لا يمكن التعديل بعدها. راجع البيانات قبل الاعتماد.' },
      ],
    },
    {
      key: 'users',
      icon: KeyRound,
      title: 'المستخدمون والصلاحيات',
      color: 'blue',
      settingsLink: '/settings?tab=users&group=admin',
      content: [
        { num: '1', title: '4 أدوار', desc: 'مدير (كل شيء) / كاشير (مبيعات + تحصيل) / مخزن (مخزون) / جزار (إنتاج فقط).' },
        { num: '2', title: 'إضافة مستخدم', desc: 'اسم المستخدم فريد داخل النشاط. كلمة المرور افتراضي 123456 — يجب تغييرها عند أول دخول.' },
        { num: '3', title: 'تعديل / إعادة تعيين', desc: 'المدير يستطيع: تعديل الاسم والدور، تغيير كلمة المرور، أو إعادة تعيينها لـ 123456.' },
      ],
    },
    {
      key: 'daily',
      icon: TrendingUp,
      title: 'الدورة اليومية',
      color: 'emerald',
      settingsLink: null,
      content: [
        { num: '1', title: 'توريد', desc: 'من /production: اختر المورد، أدخل الوزن الحي وسعر التنفيذ. النظام يحسب التكلفة الفعلية للكيلو + يولّد أوزان الأصناف.' },
        { num: '2', title: 'بيع', desc: 'من /sales: اختر العميل والأصناف. حوكمة الأسعار تنبّهك لو السعر خارج نطاق ±20% من المتوقع.' },
        { num: '3', title: 'تحصيل', desc: 'من /customers أو /treasury: استلام نقدية → تحديث رصيد العميل + إيصال قبض في الخزينة.' },
        { num: '4', title: 'تقارير', desc: 'من /finance: ميزان المراجعة، الأرباح والخسائر، كشف الحسابات، تحليل المبيعات.' },
      ],
    },
  ];

  const colorMap: any = {
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    rose: 'bg-rose-50 border-rose-200 text-rose-900',
    amber: 'bg-amber-50 border-amber-200 text-amber-900',
    purple: 'bg-purple-50 border-purple-200 text-purple-900',
    slate: 'bg-slate-50 border-slate-200 text-slate-900',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-900',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 flex flex-wrap justify-between items-center gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2 flex-wrap">
            <HelpCircle className="w-6 h-6 text-blue-600" />
            دليل التشغيل والمساعدة
          </h1>
          <p className="text-sm text-slate-500 font-bold mt-1">
            كل ما تحتاجه لتشغيل النظام خطوة بخطوة
          </p>
        </div>
        <button onClick={restartTour} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow flex-wrap">
          <PlayCircle className="w-4 h-4" />
          <span>إعادة الجولة الإرشادية</span>
        </button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-3xl border border-blue-200">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <BookOpen className="w-5 h-5 text-blue-700" />
            <h3 className="text-sm font-black text-blue-900">9 أقسام</h3>
          </div>
          <p className="text-xs text-blue-700 font-bold">اضغط على أي قسم لتوسيعه</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-5 rounded-3xl border border-emerald-200">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <TrendingUp className="w-5 h-5 text-emerald-700" />
            <h3 className="text-sm font-black text-emerald-900">دورة تشغيل كاملة</h3>
          </div>
          <p className="text-xs text-emerald-700 font-bold">من الشراء إلى التحصيل</p>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-5 rounded-3xl border border-amber-200">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Shield className="w-5 h-5 text-amber-700" />
            <h3 className="text-sm font-black text-amber-900">حوكمة محاسبية</h3>
          </div>
          <p className="text-xs text-amber-700 font-bold">لا حركة بدون طرف مسجل</p>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {sections.map(s => {
          const Icon = s.icon;
          const isOpen = expanded === s.key;
          return (
            <div key={s.key} className="bg-white rounded-3xl border-2 border-slate-200 overflow-hidden">
              <button
                onClick={() => setExpanded(isOpen ? null : s.key)}
                className="w-full p-5 flex items-center justify-between gap-3 hover:bg-slate-50 transition flex-wrap gap-2 flex-wrap"
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <div className={'p-2.5 rounded-xl border ' + colorMap[s.color]}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-black text-slate-800">{s.title}</span>
                </div>
                <span className={'text-2xl font-black transition-transform ' + (isOpen ? 'rotate-45' : '')}>+</span>
              </button>
              {isOpen && (
                <div className="px-5 pb-5 space-y-3 border-t border-slate-100 pt-4">
                  {s.content.map((c, i) => (
                    <div key={i} className="flex gap-3 items-start flex-wrap">
                      <div className={'shrink-0 w-8 h-8 rounded-full border flex items-center justify-center text-xs font-black ' + colorMap[s.color]}>
                        {c.num}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-xs font-black text-slate-800 mb-0.5">{c.title}</h4>
                        <p className="text-xs text-slate-600 font-bold leading-relaxed">{c.desc}</p>
                      </div>
                    </div>
                  ))}
                  {s.settingsLink && (
                    <Link href={s.settingsLink} className={'inline-flex items-center gap-1.5 mt-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition ' + colorMap[s.color] + ' hover:opacity-80'}>
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>فتح الإعدادات المتعلقة</span>
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer hint */}
      <div className="bg-slate-100 border border-slate-200 p-5 rounded-3xl">
        <div className="flex items-start gap-3 flex-wrap">
          <AlertTriangle className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-black text-slate-800 mb-1">هل تحتاج مساعدة إضافية؟</h4>
            <p className="text-xs text-slate-600 font-bold leading-relaxed">
              إذا واجهت مشكلة، تأكد من: الاتصال بالإنترنت، تسجيل الدخول، وأن كل الأطراف (عملاء/موردين) مسجلة في النظام قبل الحركات النقدية.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
