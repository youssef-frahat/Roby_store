'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  X,
  Phone,
  MapPin,
  Calendar,
  MessageCircle,
  Printer,
  FileText,
  Sparkles,
  ExternalLink,
  Tag,
  CreditCard,
} from 'lucide-react';
import { Order, OrderStatus } from '@/types/order';
import { buildAdminCustomerWhatsAppUrl } from '@/utils/order';
import OrderStatusBadge from './OrderStatusBadge';
import OrderStatusSelector from './OrderStatusSelector';

interface OrderDetailsDrawerProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (orderId: string, newStatus: OrderStatus) => Promise<void> | void;
}

export default function OrderDetailsDrawer({
  order,
  isOpen,
  onClose,
  onStatusChange,
}: OrderDetailsDrawerProps) {
  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !order) return null;

  const totalItemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const whatsAppUrl = buildAdminCustomerWhatsAppUrl(order);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" dir="rtl">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-charcoal-950/50 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 end-0 max-w-full flex ps-6 sm:ps-10">
        <div className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col justify-between border-s border-rose-100 animate-slide-in">
          {/* Drawer Header */}
          <div className="p-5 sm:p-6 bg-rose-50/50 border-b border-rose-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#800020] text-[#D4AF37] flex items-center justify-center font-serif font-black text-sm shadow-xs">
                ROBY
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif font-black text-base text-charcoal-900 tracking-wide">
                    طلب #{order.orderId}
                  </h3>
                  <OrderStatusBadge status={order.status} />
                </div>
                <p className="text-[11px] text-charcoal-500 font-medium mt-0.5">
                  تم الإنشاء في:{' '}
                  {new Date(order.createdAt).toLocaleDateString('ar-EG', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-charcoal-400 hover:text-charcoal-700 hover:bg-rose-100/50 transition-colors focus:outline-none"
              aria-label="إغلاق تفاصيل الطلب"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            {/* 1. Quick Status Mutation & Action Buttons */}
            <div className="bg-white rounded-2xl p-4 border border-rose-100 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-rose-50">
                <span className="text-xs font-bold text-charcoal-700">
                  تحديث حالة هذا الطلب مباشرة:
                </span>
                <OrderStatusSelector
                  currentStatus={order.status}
                  onStatusChange={(newStatus) => onStatusChange(order.orderId, newStatus)}
                />
              </div>

              {/* Direct Actions: WhatsApp & Receipt */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <a
                  href={whatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs hover:shadow-sm transition-all text-center"
                >
                  <MessageCircle className="w-4 h-4 shrink-0" />
                  <span>تواصل مع العميل عبر واتساب</span>
                </a>

                <Link
                  href={`/admin/orders/${order.orderId}/receipt`}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-[#800020] border border-rose-200 text-xs font-bold transition-all text-center"
                >
                  <Printer className="w-4 h-4 shrink-0 text-[#800020]" />
                  <span>معاينة وطباعة الفاتورة PDF</span>
                </Link>
              </div>
            </div>

            {/* 2. Customer & Delivery Address Card */}
            <div className="bg-white rounded-2xl p-4 border border-rose-100 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#800020]">
                <MapPin className="w-4 h-4" />
                <span>بيانات العميل وعنوان التوصيل</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[11px] font-bold text-charcoal-400 block">اسم العميل:</span>
                  <span className="font-bold text-charcoal-900">{order.customer.fullName}</span>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-charcoal-400 block">رقم الهاتف:</span>
                  <a
                    href={`tel:${order.customer.phone}`}
                    className="font-bold text-[#800020] hover:underline inline-flex items-center gap-1"
                    dir="ltr"
                  >
                    <Phone className="w-3 h-3 text-[#800020]" />
                    <span>{order.customer.phone}</span>
                  </a>
                  {order.customer.alternativePhone && (
                    <span className="text-charcoal-500 ms-2 text-[11px]" dir="ltr">
                      (بديل: {order.customer.alternativePhone})
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-[11px] font-bold text-charcoal-400 block">المحافظة والمدينة:</span>
                  <span className="font-bold text-charcoal-900">
                    {order.customer.governorate} — {order.customer.city}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-charcoal-400 block">قناة الطلب:</span>
                  <span className="font-bold text-charcoal-900 uppercase">
                    {order.dispatchChannel}
                  </span>
                </div>

                <div className="sm:col-span-2">
                  <span className="text-[11px] font-bold text-charcoal-400 block">العنوان بالتفصيل:</span>
                  <span className="text-charcoal-800 font-medium">
                    {order.customer.deliveryAddress}
                  </span>
                </div>

                {order.customer.notes && (
                  <div className="sm:col-span-2 p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900">
                    <span className="text-[10px] font-bold uppercase tracking-wider block text-amber-700 mb-1">
                      ملاحظات خاصة من العميل:
                    </span>
                    <p className="text-xs font-medium">{order.customer.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Itemized Products List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#800020]">
                  المنتجات المطلوبة ({totalItemCount} قطع):
                </span>
                <span className="text-[11px] text-charcoal-400 font-bold">
                  {order.items.length} أصناف
                </span>
              </div>

              <div className="divide-y divide-rose-100 rounded-2xl border border-rose-100 bg-white overflow-hidden shadow-2xs">
                {order.items.map((item, idx) => (
                  <div key={`${item.productId}-${item.sku}-${idx}`} className="p-3.5 sm:p-4 flex items-center gap-3.5">
                    {/* Thumbnail */}
                    <div className="w-14 h-16 rounded-xl overflow-hidden bg-rose-50 border border-rose-100 shrink-0 relative">
                      {item.productImage ? (
                        <img
                          src={item.productImage}
                          alt={item.productTitleAr}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-rose-300">
                          <Tag className="w-5 h-5" />
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-bold text-charcoal-900 truncate">
                          {item.productTitleAr}
                        </h4>
                        <span className="text-xs font-bold font-serif text-[#800020] shrink-0">
                          {item.subtotal} ج.م
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-charcoal-500">
                        {/* Color Swatch */}
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-50 border border-rose-100">
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0"
                            style={{ backgroundColor: item.colorHex }}
                          />
                          <span className="font-bold text-charcoal-700">{item.colorNameAr}</span>
                        </div>

                        {/* Size */}
                        <span className="px-2 py-0.5 rounded-md bg-rose-50 border border-rose-100 font-bold text-charcoal-700">
                          المقاس: {item.size}
                        </span>

                        {/* SKU */}
                        <span className="font-mono text-[10px] text-charcoal-400">
                          {item.sku}
                        </span>
                      </div>

                      <div className="text-[11px] text-charcoal-600 font-medium">
                        الكمية: <strong className="text-charcoal-900">{item.quantity}</strong> × {item.unitPrice} ج.م
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Financial Summary Card */}
            <div className="bg-rose-50/40 rounded-2xl p-4 border border-rose-100 space-y-2.5 text-xs font-medium">
              <div className="flex items-center justify-between text-charcoal-600">
                <span>إجمالي المنتجات:</span>
                <span className="font-bold font-serif text-charcoal-900">
                  {order.pricing.subtotal} ج.م
                </span>
              </div>

              <div className="flex items-center justify-between text-charcoal-600">
                <span>مصاريف الشحن ({order.customer.governorate}):</span>
                <span className="font-bold font-serif text-charcoal-900">
                  {order.pricing.shippingFee} ج.م
                </span>
              </div>

              {order.pricing.totalSavings > 0 && (
                <div className="flex items-center justify-between text-emerald-700">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>إجمالي التوفير في هذا الطلب:</span>
                  </span>
                  <span className="font-bold font-serif">
                    - {order.pricing.totalSavings} ج.م
                  </span>
                </div>
              )}

              <div className="pt-2.5 border-t border-rose-200/60 flex items-center justify-between text-sm font-bold text-[#800020]">
                <span>الإجمالي النهائي المطلوب تحصيله:</span>
                <span className="text-lg font-serif font-black">
                  {order.pricing.grandTotal} ج.م
                </span>
              </div>
            </div>
          </div>

          {/* Drawer Footer */}
          <div className="p-4 sm:p-5 bg-white border-t border-rose-100 flex items-center justify-between shrink-0">
            <span className="text-xs text-charcoal-400 font-medium">
              معرف الطلب: <code className="font-mono text-charcoal-600">{order.orderId}</code>
            </span>

            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-charcoal-900 hover:bg-charcoal-800 text-white text-xs font-bold transition-colors"
            >
              إغلاق النافذة
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
