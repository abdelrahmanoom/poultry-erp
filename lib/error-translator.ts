/**
 * مُترجم أخطاء Supabase/PostgreSQL → عربي
 * يُستخدم في كل catch blocks
 */

const ERROR_MAP: Array<{ pattern: RegExp; message: string }> = [
  // RLS / Permissions
  { pattern: /row-level security/i, message: 'صلاحية غير كافية للقيام بهذه العملية' },
  { pattern: /permission denied/i, message: 'صلاحية مرفوضة' },
  { pattern: /new row violates/i, message: 'لا يمكن تنفيذ العملية — تحقق من البيانات' },

  // Constraints
  { pattern: /duplicate key/i, message: 'هذا السجل موجود مسبقاً' },
  { pattern: /unique constraint/i, message: 'القيمة مكررة — استخدم قيمة مختلفة' },
  { pattern: /foreign key/i, message: 'لا يمكن — السجل مرتبط بسجلات أخرى' },
  { pattern: /check constraint.*balance/i, message: 'الرصيد لا يمكن أن يكون سالباً' },
  { pattern: /check constraint.*stock/i, message: 'المخزون لا يمكن أن يكون سالباً' },
  { pattern: /check constraint/i, message: 'قيمة غير صحيحة — تحقق من البيانات' },
  { pattern: /not-null constraint/i, message: 'حقل مطلوب مفقود' },

  // Data types
  { pattern: /invalid input syntax/i, message: 'صيغة البيانات غير صحيحة' },
  { pattern: /value too long/i, message: 'النص طويل جداً' },

  // Auth
  { pattern: /jwt expired/i, message: 'انتهت الجلسة — سجّل الدخول مجدداً' },
  { pattern: /invalid.*jwt/i, message: 'جلسة غير صحيحة' },
  { pattern: /not authenticated/i, message: 'يجب تسجيل الدخول' },

  // Network
  { pattern: /fetch failed/i, message: 'تعذّر الاتصال بالخادم — تحقق من الإنترنت' },
  { pattern: /network/i, message: 'مشكلة في الشبكة' },
  { pattern: /timeout/i, message: 'انتهت مهلة الاتصال' },

  // Function/DB
  { pattern: /function.*does not exist/i, message: 'خطأ تقني — تواصل مع الدعم' },
  { pattern: /relation.*does not exist/i, message: 'خطأ تقني — تواصل مع الدعم' },
  { pattern: /column.*does not exist/i, message: 'خطأ تقني — تواصل مع الدعم' },
  { pattern: /الكمية المطلوبة/i, message: '' }, // عربي بالفعل — نحفظه

  // Business logic (our own)
  { pattern: /الكمية المطلوبة.*أكبر من المتاح/i, message: '' },
];

export function translateError(err: any): string {
  if (!err) return 'حدث خطأ غير متوقع';

  const msg = err.message || err.error_description || String(err);

  // إذا كانت عربية بالفعل → احفظها
  if (/[\u0600-\u06FF]/.test(msg)) return msg;

  // ابحث عن مطابقة
  for (const { pattern, message } of ERROR_MAP) {
    if (pattern.test(msg) && message) return message;
  }

  // غير معروف → رسالة عامة + نص الخطأ للتشخيص
  return 'حدث خطأ: ' + msg.substring(0, 100);
}

/**
 * استخدام مختصر — يُعيد دائماً نصاً عربياً
 */
export function arError(err: any): string {
  return translateError(err);
}
