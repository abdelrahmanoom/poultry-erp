'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Columns3, RotateCcw, Search, X, GripVertical, Filter, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx-js-style';

interface Column {
  key: string;
  label: string;
  accessor?: (row: any) => any;
  render?: (row: any, idx: number) => any;
  searchable?: boolean;
  defaultHidden?: boolean;
  exportValue?: (row: any) => any;
}

interface FilterOption {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  accessor: (row: any) => string;
}

interface DataTableProps {
  data: any[];
  columns: Column[];
  filename?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  rowActions?: ((row: any, idx: number) => any) | null;
  rowKey?: (row: any, idx: number) => string | number;
  rowClassName?: (row: any) => string;
  onRowClick?: (row: any) => void;
  rowHref?: (row: any) => string;
  storageKey?: string;
  filters?: FilterOption[];
  dateKey?: string;
  dateDefault?: 'today' | '7days' | '30days' | 'all';
}

export default function DataTable({
  data = [],
  columns = [],
  filename = 'export',
  searchPlaceholder = 'بحث...',
  emptyMessage = 'لا توجد بيانات',
  rowActions = null,
  rowKey = (row: any, idx: number) => idx,
  rowClassName = () => '',
  onRowClick,
  rowHref,
  storageKey = '',
  filters = [],
  dateKey,
  dateDefault = 'today'
}: DataTableProps) {
  const router = useRouter();
  const storageVis = storageKey ? 'dt_vis_' + storageKey : '';
  const storageOrder = storageKey ? 'dt_order_' + storageKey : '';

  const localDateStr = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  };
  const getDefaultFrom = () => {
    if (!dateKey) return '';
    const today = new Date();
    if (dateDefault === 'all') return '';
    if (dateDefault === 'today') return localDateStr(today);
    if (dateDefault === '7days') {
      const d = new Date(today);
      d.setDate(d.getDate() - 7);
      return localDateStr(d);
    }
    if (dateDefault === '30days') {
      const d = new Date(today);
      d.setDate(d.getDate() - 30);
      return localDateStr(d);
    }
    return '';
  };
  const getDefaultTo = () => {
    if (!dateKey) return '';
    if (dateDefault === 'all') return '';
    return localDateStr(new Date());
  };

  const [search, setSearch] = useState('');
  const [visibleCols, setVisibleCols] = useState<string[]>(() => {
    if (storageVis && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(storageVis);
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return columns.filter(c => !c.defaultHidden).map(c => c.key);
  });
  const [order, setOrder] = useState<string[]>(() => {
    if (storageOrder && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(storageOrder);
        if (saved) {
          const parsed = JSON.parse(saved);
          const valid = parsed.filter((k: string) => columns.some(c => c.key === k));
          const missing = columns.map(c => c.key).filter((k: string) => !valid.includes(k));
          return [...valid, ...missing];
        }
      } catch {}
    }
    return columns.map(c => c.key);
  });
  const [showColPanel, setShowColPanel] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [draggedCol, setDraggedCol] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState<string>(getDefaultFrom);
  const [dateTo, setDateTo] = useState<string>(getDefaultTo);
  const clearDateFilter = () => {
    setDateFrom('');
    setDateTo('');
  };

  useEffect(() => {
    if (storageVis && typeof window !== 'undefined') {
      localStorage.setItem(storageVis, JSON.stringify(visibleCols));
    }
  }, [visibleCols, storageVis]);

  useEffect(() => {
    if (storageOrder && typeof window !== 'undefined') {
      localStorage.setItem(storageOrder, JSON.stringify(order));
    }
  }, [order, storageOrder]);

  const filtered = useMemo(() => {
    let result = data;

    if (dateKey && (dateFrom || dateTo)) {
      result = result.filter(row => {
        const raw = row[dateKey];
        if (!raw) return false;
        const d = new Date(raw);
        if (dateFrom) {
          const from = new Date(dateFrom + 'T00:00:00');
          if (d < from) return false;
        }
        if (dateTo) {
          const to = new Date(dateTo + 'T23:59:59');
          if (d > to) return false;
        }
        return true;
      });
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(row =>
        columns.some(col => {
          if (!col.searchable) return false;
          const val = col.accessor ? col.accessor(row) : row[col.key];
          return String(val ?? '').toLowerCase().includes(q);
        })
      );
    }

    filters.forEach(f => {
      const v = filterValues[f.key];
      if (v && v !== '') {
        result = result.filter(row => f.accessor(row) === v);
      }
    });

    return result;
  }, [data, search, columns, filters, filterValues, dateKey, dateFrom, dateTo]);

  const finalColumns = useMemo(() => {
    return order
      .map(k => columns.find(c => c.key === k))
      .filter((c): c is Column => !!c && visibleCols.includes(c.key));
  }, [order, visibleCols, columns]);

  const toggleColumn = (key: string) => {
    setVisibleCols(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const handleDragStart = (key: string) => setDraggedCol(key);
  const handleDragOver = (e: any, key: string) => { e.preventDefault(); setDragOverCol(key); };
  const handleDrop = (e: any, targetKey: string) => {
    e.preventDefault();
    if (!draggedCol || draggedCol === targetKey) { setDraggedCol(null); setDragOverCol(null); return; }
    setOrder(prev => {
      const arr = [...prev];
      const fromIdx = arr.indexOf(draggedCol);
      const toIdx = arr.indexOf(targetKey);
      if (fromIdx < 0 || toIdx < 0) return prev;
      arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, draggedCol);
      return arr;
    });
    setDraggedCol(null);
    setDragOverCol(null);
  };

  const resetAll = () => {
    setSearch('');
    setFilterValues({});
    setVisibleCols(columns.filter(c => !c.defaultHidden).map(c => c.key));
    setOrder(columns.map(c => c.key));
    setDateFrom(getDefaultFrom());
    setDateTo(getDefaultTo());
  };

  const setQuickRange = (days: number | 'today' | 'all') => {
    const today = new Date();
    if (days === 'all') {
      setDateFrom(''); setDateTo('');
      return;
    }
    if (days === 'today') {
      const d = localDateStr(today);
      setDateFrom(d); setDateTo(d);
      return;
    }
    const from = new Date(today);
    from.setDate(from.getDate() - days);
    setDateFrom(localDateStr(from));
    setDateTo(localDateStr(today));
  };

  const activeFiltersCount = Object.values(filterValues).filter(v => v && v !== '').length;

  const formatCellValue = (v: any): any => {
    if (v === null || v === undefined) return '';
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)) {
      const d = new Date(v);
      if (isNaN(d.getTime())) return v;
      const pad = (n: number) => String(n).padStart(2, '0');
      return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    }
    if (v instanceof Date) {
      const pad = (n: number) => String(n).padStart(2, '0');
      return v.getFullYear() + '-' + pad(v.getMonth() + 1) + '-' + pad(v.getDate()) + ' ' + pad(v.getHours()) + ':' + pad(v.getMinutes());
    }
    return v;
  };

  const exportExcel = () => {
    const rows = filtered.map(row => {
      const obj: any = {};
      finalColumns.forEach(col => {
        let val: any;
        if (col.exportValue) {
          val = col.exportValue(row);
        } else if (col.accessor) {
          val = col.accessor(row);
        } else {
          val = row[col.key];
        }
        obj[col.label] = formatCellValue(val);
      });
      return obj;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = finalColumns.map(c => ({ wch: Math.max(c.label.length + 4, 15) }));

    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

    // ارتفاعات الصفوف
    const rowHeights: any[] = [{ hpt: 30 }];
    for (let r = 1; r <= range.e.r; r++) rowHeights.push({ hpt: 22 });
    worksheet['!rows'] = rowHeights;

    const borderThin = {
      top:    { style: 'thin', color: { rgb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
      left:   { style: 'thin', color: { rgb: 'CBD5E1' } },
      right:  { style: 'thin', color: { rgb: 'CBD5E1' } }
    };
    const borderHeader = {
      top:    { style: 'thin', color: { rgb: '0F172A' } },
      bottom: { style: 'thin', color: { rgb: '0F172A' } },
      left:   { style: 'thin', color: { rgb: '0F172A' } },
      right:  { style: 'thin', color: { rgb: '0F172A' } }
    };

    // تنسيق صف الرأس
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c });
      if (!worksheet[addr]) continue;
      worksheet[addr].s = {
        fill: { fgColor: { rgb: '1E293B' } },
        font: { color: { rgb: 'FFFFFF' }, bold: true, sz: 12 },
        alignment: { horizontal: 'center', vertical: 'center', readingOrder: 2 },
        border: borderHeader
      };
    }

    // تنسيق صفوف البيانات
    for (let r = 1; r <= range.e.r; r++) {
      const isEven = r % 2 === 0;
      for (let c = range.s.c; c <= range.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        if (!worksheet[addr]) continue;
        worksheet[addr].s = {
          fill: { fgColor: { rgb: isEven ? 'F1F5F9' : 'FFFFFF' } },
          font: { color: { rgb: '0F172A' }, sz: 11 },
          alignment: { horizontal: 'right', vertical: 'center', readingOrder: 2 },
          border: borderThin
        };
      }
    }

    const workbook = XLSX.utils.book_new();
    workbook.Workbook = { Views: [{ RTL: true }] };
    XLSX.utils.book_append_sheet(workbook, worksheet, 'البيانات');

    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, filename + '_' + date + '.xlsx');
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200">
        <div className="flex flex-wrap gap-2 items-center flex-1">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full border-2 border-slate-200 rounded-xl pr-10 pl-3 h-10 text-xs font-bold bg-white outline-none focus:border-blue-500"
            />
          </div>

          {dateKey && (
            <div className="flex items-center gap-1 bg-white border-2 border-slate-200 rounded-xl px-2 h-10">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="text-[11px] font-bold bg-transparent outline-none w-[110px] font-mono" />
              <span className="text-[10px] text-slate-400">إلى</span>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="text-[11px] font-bold bg-transparent outline-none w-[110px] font-mono" />
              <button onClick={clearDateFilter} className="text-slate-400 hover:text-rose-600"><X className="w-3.5 h-3.5" /></button>
            </div>
          )}
          {dateKey && (
            <div className="flex gap-1">
              <button onClick={() => setQuickRange('today')} className="text-[10px] font-bold px-2 h-10 rounded-xl bg-white border-2 border-slate-200 hover:bg-slate-100">اليوم</button>
              <button onClick={() => setQuickRange(7)} className="text-[10px] font-bold px-2 h-10 rounded-xl bg-white border-2 border-slate-200 hover:bg-slate-100">7 أيام</button>
              <button onClick={() => setQuickRange(30)} className="text-[10px] font-bold px-2 h-10 rounded-xl bg-white border-2 border-slate-200 hover:bg-slate-100">30 يوم</button>
              <button onClick={() => setQuickRange('all')} className="text-[10px] font-bold px-2 h-10 rounded-xl bg-white border-2 border-slate-200 hover:bg-slate-100">الكل</button>
            </div>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          {filters.length > 0 && (
            <button onClick={() => setShowFilters(!showFilters)} className={'font-bold px-3.5 h-10 rounded-xl text-xs flex items-center gap-1.5 ' + (activeFiltersCount > 0 ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-slate-600 hover:bg-slate-700 text-white')}>
              <Filter className="w-3.5 h-3.5" />
              <span>فلترة{activeFiltersCount > 0 ? ' (' + activeFiltersCount + ')' : ''}</span>
            </button>
          )}
          <button onClick={exportExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 h-10 rounded-xl text-xs flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" />
            <span>Excel</span>
          </button>
          <button onClick={() => setShowColPanel(!showColPanel)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 h-10 rounded-xl text-xs flex items-center gap-1.5">
            <Columns3 className="w-3.5 h-3.5" />
            <span>الأعمدة</span>
          </button>
          <button onClick={resetAll} className="bg-slate-700 hover:bg-slate-800 text-white font-bold px-3.5 h-10 rounded-xl text-xs flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" />
            <span>ضبط</span>
          </button>
        </div>
      </div>

      {showFilters && filters.length > 0 && (
        <div className="bg-amber-50 p-4 rounded-2xl border-2 border-amber-200">
          <div className="flex justify-between items-center border-b border-amber-200 pb-2 mb-3">
            <h4 className="text-xs font-bold text-amber-900">فلاتر متقدمة</h4>
            <button onClick={() => setShowFilters(false)} className="text-amber-700 hover:text-amber-900"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filters.map(f => (
              <div key={f.key}>
                <label className="block text-xs font-bold text-amber-900 mb-1">{f.label}</label>
                <select value={filterValues[f.key] || ''} onChange={e => setFilterValues({ ...filterValues, [f.key]: e.target.value })} className="w-full border-2 border-amber-300 rounded-xl px-3 bg-white h-10 text-xs font-bold">
                  <option value="">الكل</option>
                  {f.options.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {showColPanel && (
        <div className="bg-white p-4 rounded-2xl border-2 border-blue-200 space-y-2">
          <div className="flex justify-between items-center border-b pb-2">
            <h4 className="text-xs font-bold text-slate-700">اختيار الأعمدة وترتيبها (اسحب من اليمين للنقل)</h4>
            <button onClick={() => setShowColPanel(false)} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
          </div>
          <div className="space-y-1.5">
            {order.map(key => {
              const col = columns.find(c => c.key === key);
              if (!col) return null;
              const isDragging = draggedCol === key;
              const isOver = dragOverCol === key;
              return (
                <div key={key} draggable onDragStart={() => handleDragStart(key)} onDragOver={(e) => handleDragOver(e, key)} onDrop={(e) => handleDrop(e, key)} onDragEnd={() => { setDraggedCol(null); setDragOverCol(null); }} className={'flex items-center gap-2 p-2 bg-slate-50 rounded-xl border-2 transition ' + (isDragging ? 'opacity-40 border-blue-400' : isOver ? 'border-blue-500 bg-blue-50' : 'border-slate-200')}>
                  <GripVertical className="w-4 h-4 text-slate-400 cursor-grab" />
                  <input type="checkbox" checked={visibleCols.includes(key)} onChange={() => toggleColumn(key)} className="w-4 h-4 accent-blue-600" />
                  <span className="flex-1 text-xs font-bold text-slate-700">{col.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="overflow-x-auto border-2 border-slate-200 rounded-2xl">
        <table className="w-full text-right text-xs">
          <thead className="bg-slate-800 text-white font-bold">
            <tr>
              {finalColumns.map((col, i) => (
                <th key={col.key} className={'p-3 ' + (i === 0 ? 'rounded-r-xl' : '') + (i === finalColumns.length - 1 && !rowActions ? ' rounded-l-xl' : '')}>{col.label}</th>
              ))}
              {rowActions && <th className="p-3 rounded-l-xl text-center">إجراءات</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filtered.length === 0 ? (
              <tr><td colSpan={finalColumns.length + (rowActions ? 1 : 0)} className="p-6 text-center text-slate-400 font-sans">{emptyMessage}</td></tr>
            ) : (
              filtered.map((row, idx) => (
                <tr key={rowKey(row, idx)} onClick={(e) => { if (rowHref) { const h = rowHref(row); if (e.ctrlKey || e.metaKey || e.button === 1) { window.open(h, '_blank'); } else { router.push(h); } } else if (onRowClick) { onRowClick(row); } }} className={'transition ' + (rowHref || onRowClick ? 'cursor-pointer hover:bg-blue-50 ' : 'hover:bg-slate-50 ') + rowClassName(row)}>
                  {finalColumns.map(col => (
                    <td key={col.key} className="p-3">{col.render ? col.render(row, idx) : (col.accessor ? col.accessor(row) : row[col.key])}</td>
                  ))}
                  {rowActions && (<td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>{rowActions(row, idx)}</td>)}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
