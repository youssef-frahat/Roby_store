'use client';

import React from 'react';
import { Search, X, RotateCcw, Filter } from 'lucide-react';
import { OrderStatus } from '@/types/order';
import { EgyptianGovernorate } from '@/types/store';
import governoratesData from '@/data/governorates.json';
import { ORDER_STATUS_LABELS } from './OrderStatusBadge';

interface OrderFiltersBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: OrderStatus | 'all';
  onStatusChange: (status: OrderStatus | 'all') => void;
  governorateFilter: string | 'all';
  onGovernorateChange: (gov: string | 'all') => void;
  totalFilteredCount: number;
  totalOrdersCount: number;
  onResetFilters: () => void;
}

export default function OrderFiltersBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  governorateFilter,
  onGovernorateChange,
  totalFilteredCount,
  totalOrdersCount,
  onResetFilters,
}: OrderFiltersBarProps) {
  const isFiltered =
    Boolean(searchQuery.trim()) ||
    statusFilter !== 'all' ||
    governorateFilter !== 'all';

  return (
    <div className="bg-white rounded-3xl p-5 border border-rose-100 shadow-2xs space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
        {/* Search Query Input */}
        <div className="md:col-span-5 relative">
          <div className="absolute inset-y-0 start-3.5 flex items-center pointer-events-none text-charcoal-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="البحث برقم الطلب، اسم العميل، أو رقم الهاتف..."
            className="w-full ps-10 pe-9 py-2.5 rounded-2xl border border-rose-200 text-xs font-medium text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:ring-2 focus:ring-[#800020]/20 focus:border-[#800020] transition-all bg-white"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute inset-y-0 end-3 flex items-center text-charcoal-400 hover:text-charcoal-600 focus:outline-none"
              aria-label="مسح البحث"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Dropdown Filter */}
        <div className="md:col-span-4 relative">
          <div className="absolute inset-y-0 start-3.5 flex items-center pointer-events-none text-charcoal-400">
            <Filter className="w-3.5 h-3.5" />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value as OrderStatus | 'all')}
            className="w-full ps-9 pe-8 py-2.5 rounded-2xl border border-rose-200 text-xs font-bold text-charcoal-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#800020]/20 focus:border-[#800020] transition-all cursor-pointer appearance-none"
            aria-label="تصفية حسب حالة الطلب"
          >
            <option value="all">جميع حالات الطلب (الكل)</option>
            <option value="pending_dispatch">{ORDER_STATUS_LABELS.pending_dispatch}</option>
            <option value="dispatched_whatsapp">{ORDER_STATUS_LABELS.dispatched_whatsapp}</option>
            <option value="confirmed">{ORDER_STATUS_LABELS.confirmed}</option>
            <option value="shipped">{ORDER_STATUS_LABELS.shipped}</option>
            <option value="delivered">{ORDER_STATUS_LABELS.delivered}</option>
            <option value="cancelled">{ORDER_STATUS_LABELS.cancelled}</option>
          </select>
          <div className="absolute inset-y-0 end-3 flex items-center pointer-events-none text-charcoal-400">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Governorate Dropdown Filter */}
        <div className="md:col-span-3 relative">
          <select
            value={governorateFilter}
            onChange={(e) => onGovernorateChange(e.target.value)}
            className="w-full px-3.5 pe-8 py-2.5 rounded-2xl border border-rose-200 text-xs font-bold text-charcoal-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#800020]/20 focus:border-[#800020] transition-all cursor-pointer appearance-none"
            aria-label="تصفية حسب المحافظة"
          >
            <option value="all">جميع المحافظات (27)</option>
            {governoratesData.map((gov) => (
              <option key={gov.code} value={gov.code}>
                {gov.nameAr} ({gov.nameEn})
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 end-3 flex items-center pointer-events-none text-charcoal-400">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Sub-bar: Results summary and reset button */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-rose-50 text-xs font-medium text-charcoal-600">
        <div className="flex items-center gap-2">
          <span>
            عرض <strong className="font-bold text-charcoal-900">{totalFilteredCount}</strong> من أصل{' '}
            <strong className="font-bold text-charcoal-900">{totalOrdersCount}</strong> طلب
          </span>
          {isFiltered && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#800020]/10 text-[#800020]">
              تم تطبيق الفلترة
            </span>
          )}
        </div>

        {isFiltered && (
          <button
            onClick={onResetFilters}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold text-[#800020] hover:bg-rose-50 transition-colors focus:outline-none"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>إعادة تعيين الفلاتر</span>
          </button>
        )}
      </div>
    </div>
  );
}
