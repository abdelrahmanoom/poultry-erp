'use client';

import { useState, useRef, useEffect } from 'react';

interface Sug {
  id: number | string;
  label: string;
  sublabel?: string;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSelect?: (item: Sug) => void;
  suggestions: Sug[];
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
}

export default function Autocomplete({
  value,
  onChange,
  onSelect,
  suggestions,
  placeholder,
  className = '',
  required = false,
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const filtered = !value.trim()
    ? suggestions
    : suggestions.filter(s => s.label.toLowerCase().includes(value.toLowerCase()));

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const pick = (s: Sug) => {
    onChange(s.label);
    onSelect?.(s);
    setOpen(false);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' && value.trim()) setOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(i => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && filtered[highlight]) { e.preventDefault(); pick(filtered[highlight]); }
    if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKey}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        autoComplete="off"
        className={className}
      />
      {open && !disabled && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-slate-200 rounded-xl shadow-2xl max-h-56 overflow-y-auto z-[100]">
          {filtered.slice(0, 30).map((s, i) => (
            <div
              key={s.id}
              onMouseDown={(e) => { e.preventDefault(); pick(s); }}
              className={'px-3 py-2 cursor-pointer text-xs font-bold flex justify-between items-center border-b border-slate-100 last:border-0 ' +
                (i === highlight ? 'bg-blue-50 text-blue-900' : 'hover:bg-slate-50')}
            >
              <span>{s.label}</span>
              {s.sublabel && <span className="text-slate-400 font-mono text-[10px]">{s.sublabel}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}