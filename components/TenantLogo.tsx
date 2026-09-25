'use client';

import { Boxes } from 'lucide-react';

interface Props {
  logoUrl?: string | null;
  tenantName?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  rounded?: boolean;
}

const SIZES = {
  sm: { box: 'w-8 h-8', icon: 'w-4 h-4', p: 'p-1.5', text: 'text-xs' },
  md: { box: 'w-10 h-10', icon: 'w-5 h-5', p: 'p-2', text: 'text-sm' },
  lg: { box: 'w-14 h-14', icon: 'w-7 h-7', p: 'p-3', text: 'text-base' },
  xl: { box: 'w-20 h-20', icon: 'w-10 h-10', p: 'p-4', text: 'text-lg' },
};

export default function TenantLogo({
  logoUrl,
  tenantName,
  size = 'lg',
  className = '',
  rounded = true,
}: Props) {
  const s = SIZES[size];
  const radius = rounded ? 'rounded-2xl' : 'rounded-lg';

  // إذا وُجد شعار مرفوع → اعرضه
  if (logoUrl) {
    return (
      <div
        className={`${s.box} ${radius} overflow-hidden shadow-lg shadow-blue-600/20 bg-white flex items-center justify-center ${className}`}
      >
        <img
          src={logoUrl}
          alt={tenantName || 'شعار النشاط'}
          className="w-full h-full object-contain"
          onError={(e) => {
            // في حال فشل تحميل الصورة → أظهر الأيقونة
            (e.target as HTMLImageElement).style.display = 'none';
            const parent = (e.target as HTMLImageElement).parentElement;
            if (parent && !parent.querySelector('svg')) {
              parent.innerHTML = `<div class="bg-gradient-to-br from-blue-600 to-blue-700 w-full h-full flex items-center justify-center"><svg class="text-white ${s.icon}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-4.5-2.7a2 2 0 0 0-2.06 0L2.97 12.92Z"/></svg></div>`;
            }
          }}
        />
      </div>
    );
  }

  // fallback — الأيقونة الافتراضية
  return (
    <div
      className={`bg-gradient-to-br from-blue-600 to-blue-700 ${s.p} ${radius} w-fit shadow-lg shadow-blue-600/30 flex items-center justify-center ${className}`}
    >
      <Boxes className={`${s.icon} text-white`} />
    </div>
  );
}
