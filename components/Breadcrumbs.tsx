'use client';

import Link from 'next/link';
import { ChevronLeft, Home } from 'lucide-react';

interface Item { label: string; href?: string; }

export default function Breadcrumbs({ items }: { items: Item[] }) {
  return (
    <nav className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-4 flex-wrap">
      <Link href="/dashboard" className="flex items-center gap-1 hover:text-blue-600 transition">
        <Home className="w-3.5 h-3.5" />
        الرئيسية
      </Link>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-2">
          <ChevronLeft className="w-3.5 h-3.5 text-slate-300" />
          {item.href ? (
            <Link href={item.href} className="hover:text-blue-600 transition">{item.label}</Link>
          ) : (
            <span className="text-slate-900">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}