'use client';

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { OrderStatus } from '@/types/order';
import { ORDER_STATUS_LABELS } from './OrderStatusBadge';

interface OrderStatusSelectorProps {
  currentStatus: OrderStatus;
  onStatusChange: (newStatus: OrderStatus) => Promise<void> | void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: 'pending_dispatch', label: ORDER_STATUS_LABELS.pending_dispatch },
  { value: 'dispatched_whatsapp', label: ORDER_STATUS_LABELS.dispatched_whatsapp },
  { value: 'confirmed', label: ORDER_STATUS_LABELS.confirmed },
  { value: 'shipped', label: ORDER_STATUS_LABELS.shipped },
  { value: 'delivered', label: ORDER_STATUS_LABELS.delivered },
  { value: 'cancelled_or_returned', label: ORDER_STATUS_LABELS.cancelled_or_returned },
  { value: 'cancelled', label: ORDER_STATUS_LABELS.cancelled },
];

export default function OrderStatusSelector({
  currentStatus,
  onStatusChange,
  disabled = false,
  size = 'md',
  className = '',
}: OrderStatusSelectorProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as OrderStatus;
    if (newStatus === currentStatus) return;

    try {
      setIsUpdating(true);
      await onStatusChange(newStatus);
    } finally {
      setIsUpdating(false);
    }
  };

  const sizeClasses =
    size === 'sm'
      ? 'text-xs py-1.5 pe-8 ps-2.5 rounded-xl'
      : 'text-xs py-2 pe-9 ps-3 rounded-2xl';

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <select
        value={currentStatus}
        onChange={handleChange}
        disabled={disabled || isUpdating}
        aria-label="تغيير حالة الطلب"
        className={`appearance-none bg-white border border-rose-200 text-charcoal-800 font-bold focus:outline-none focus:ring-2 focus:ring-[#800020]/20 focus:border-[#800020] transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 shadow-2xs ${sizeClasses}`}
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value} className="text-charcoal-900 font-medium">
            {opt.label}
          </option>
        ))}
      </select>

      <div className="absolute end-2.5 pointer-events-none text-charcoal-400">
        {isUpdating ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#800020]" />
        ) : (
          <svg
            className="w-3.5 h-3.5 text-charcoal-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </div>
    </div>
  );
}
