'use client';

import { AlertTriangle, Phone } from 'lucide-react';

export default function ReadOnlyBanner() {
  return (
    <div className="bg-gradient-to-l from-amber-500 to-amber-400 border-b-2 border-amber-600 shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-white">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div>
            <p className="text-xs font-black">النشاط في وضع القراءة فقط</p>
            <p className="text-[10px] font-bold opacity-90 mt-0.5">
              لا يمكن إضافة أو تعديل أي بيانات. تواصل مع المزوّد لتفعيل الحساب.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-white text-[11px] font-bold bg-white/20 px-3 py-1.5 rounded-lg">
          <Phone className="w-3 h-3" />
          <span>تواصل مع المزوّد</span>
        </div>
      </div>
    </div>
  );
}
