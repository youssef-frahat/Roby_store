'use client';

import React from 'react';
import {
  Clock,
  MessageCircle,
  CheckCircle2,
  Truck,
  XCircle,
} from 'lucide-react';
import { OrderStatus } from '@/types/order';

interface OrderStatusBadgeProps {
  status: OrderStatus;
  className?: string;
  showIcon?: boolean;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_dispatch: 'قيد المعالجة',
  dispatched_whatsapp: 'مرسل عبر واتساب',
  confirmed: 'مؤكد',
  shipped: 'تم الشحن',
  delivered: 'تم التسليم',
  cancelled: 'ملغي',
  cancelled_or_returned: 'ملغي أو مرتجع',
};

export default function OrderStatusBadge({
  status,
  className = '',
  showIcon = true,
}: OrderStatusBadgeProps) {
  switch (status) {
    case 'pending_dispatch':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 ${className}`}
        >
          {showIcon && <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
          <span>{ORDER_STATUS_LABELS.pending_dispatch}</span>
        </span>
      );

    case 'dispatched_whatsapp':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 ${className}`}
        >
          {showIcon && <MessageCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
          <span>{ORDER_STATUS_LABELS.dispatched_whatsapp}</span>
        </span>
      );

    case 'confirmed':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200 ${className}`}
        >
          {showIcon && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
          <span>{ORDER_STATUS_LABELS.confirmed}</span>
        </span>
      );

    case 'shipped':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 ${className}`}
        >
          {showIcon && <Truck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
          <span>{ORDER_STATUS_LABELS.shipped}</span>
        </span>
      );

    case 'delivered':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 ${className}`}
        >
          {showIcon && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />}
          <span>{ORDER_STATUS_LABELS.delivered}</span>
        </span>
      );

    case 'cancelled':
    case 'cancelled_or_returned':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-50 text-red-800 border border-red-200 ${className}`}
        >
          {showIcon && <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />}
          <span>{ORDER_STATUS_LABELS[status] || 'ملغي أو مرتجع'}</span>
        </span>
      );

    default:
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-charcoal-100 text-charcoal-700 ${className}`}
        >
          {status}
        </span>
      );
  }
}
