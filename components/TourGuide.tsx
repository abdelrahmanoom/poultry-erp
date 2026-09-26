'use client';

// ⚠️ تحذير: عند إضافة/تعديل ميزة → حدّث lib/features.md + /help أيضاً
// راجع DOCS.md للتفاصيل

import { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, X, LayoutDashboard, Scissors, Warehouse, ShoppingCart, Wallet, Users, Truck, FileText, Settings } from 'lucide-react';

export default function TourGuide() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const done = localStorage.getItem('erp_tour_done');
    if (!done) setVisible(true);
  }, []);

  const slides = [
    { icon: LayoutDashboard, title: 'مرحباً بك في ثُلَاث', text: 'هذه جولة سريعة تشرح أقسام النظام ومتى تستخدم كل واحد. تستغرق دقيقة واحدة. يمكنك تخطيها في أي وقت والعودة إليها لاحقاً من الإعدادات.' },
    { icon: Settings, title: 'الإعدادات: ابدأ من هنا', text: 'قبل أي عملية، اضبط: شجرة الأصناف، شجرة الخزائن، مسارات التجهيز، قواعد التنبيهات، ثم اعتمد الأرصدة الافتتاحية للمشروع (نقدية الدرج، ديون العملاء، مستحقات الموردين، بضاعة الثلاجة).' },
    { icon: Scissors, title: 'الإنتاج: أمر التوريد والتشفية', text: 'سجّل كل دفعة طيور قائمة (وزن، سعر بورصة، سعر تنفيذ، مصاريف لوجستية). اختر مسار التجهيز وأدخل الأوزان المستخرجة. النظام يقارن الانحراف تلقائياً مع المعيار (83.5%) ويرحّل المخزون والتكلفة إلى الخزينة أو حساب المورد.' },
    { icon: Scissors, title: '✨ شروة حرة — مرونة كاملة', text: 'افتراضياً، الصفحة تفتح على "شروة حرة" — كل الأصناف (11) ظاهرة بلا قيود. أدخل الأوزان الفعلية، ثم اضغط "حفظ كمسار جديد" لإنشاء قالب قابل لإعادة الاستخدام. أو اختر مساراً جاهزاً من القائمة (تجزئة، شاورما، صندوق). أضف صنفاً جديداً في أي وقت من الزر أعلى البطاقة.' },
    { icon: Warehouse, title: 'المخازن: أرصدة الثلاجة', text: 'اعرف رصيد كل صنف لحظياً. انقر على أي صنف لفتح بطاقة تتبعه: من أي دفعة أتى، لمن بيع، ومدة بقائه في التبريد. سجّل هالك الرطوبة من نفس الصفحة.' },
    { icon: ShoppingCart, title: 'المبيعات: الفواتير المجمعة', text: 'أنشئ فاتورة متعددة البنود لأي مطعم أو عميل. التسعير يُحسب آلياً من البورصة حسب معاملات الإعدادات. الفاتورة تخصم المخزون، تزيد الخزينة (نقدي)، أو ترحّل المديونية للعميل (آجل).' },
    { icon: Wallet, title: 'الخزينة: الحركات النقدية', text: 'أرصدة كل خزينة على حدة (رئيسية، بنك، عهدة). سجّل المصروفات التشغيلية والنثريات ببيان واضح. كل حركة تُرصّع تلقائياً في دفتر النقدية العام.' },
    { icon: Users, title: 'العملاء والموردين: كشوف الحساب', text: 'انقر على أي عميل لترى كشف حسابه الزمني الكامل: كل فاتورة، كل دفعة، والرصيد التراكمي. نفس المنطق للموردين مع سجل التوريدات والمدفوعات.' },
    { icon: FileText, title: 'التقارير: ميزان المراجعة والأرباح', text: 'ميزان مراجعة مزدوج متزن تلقائياً، سجل عمليات موحد، قائمة أرباح وخسائر حقيقية، ومعالج إقفال السنة المالية. كل الأرقام مبنية على دالة SQL محاسبية دقيقة.' },
    { icon: LayoutDashboard, title: 'ابدأ الآن', text: 'كل شيء جاهز. إذا احتجت مراجعة أي خطوة، ارجع لتبويب "دليل التشغيل" في الإعدادات، أو أعد تشغيل هذه الجولة من هناك.' }
  ];

  const handleFinish = () => {
    localStorage.setItem('erp_tour_done', 'true');
    setVisible(false);
  };

  const handleSkip = () => {
    localStorage.setItem('erp_tour_done', 'true');
    setVisible(false);
  };

  if (!visible) return null;

  const slide = slides[step];
  const Icon = slide.icon;
  const isLast = step === slides.length - 1;
  const isFirst = step === 0;

  return (
    <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-l from-blue-600 to-blue-800 p-6 text-white relative">
          <button onClick={handleSkip} className="absolute top-4 left-4 text-white/70 hover:text-white">
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
              <Icon className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-black">{slide.title}</h3>
              <span className="text-[11px] text-blue-100 font-bold">الخطوة {step + 1} من {slides.length}</span>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-700 leading-loose font-medium">{slide.text}</p>

          <div className="flex justify-center gap-1.5">
            {slides.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-blue-600' : 'w-1.5 bg-slate-300'}`}></span>
            ))}
          </div>

          <div className="flex justify-between items-center pt-2">
            <button onClick={handleSkip} className="text-xs font-bold text-slate-400 hover:text-slate-600">
              تخطي الجولة
            </button>
            <div className="flex gap-2">
              {!isFirst && (
                <button onClick={() => setStep(step - 1)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1">
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>السابق</span>
                </button>
              )}
              {!isLast ? (
                <button onClick={() => setStep(step + 1)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1 shadow">
                  <span>التالي</span>
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button onClick={handleFinish} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow">
                  ابدأ العمل الآن
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}