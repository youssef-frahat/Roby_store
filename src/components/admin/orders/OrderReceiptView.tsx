'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Printer,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  MessageCircle,
  HelpCircle,
  Sparkles,
  Phone,
  MapPin,
  Clock,
  CheckCircle2,
  Calendar,
  FileText,
  BadgeCheck,
} from 'lucide-react';
import { Order, OrderStatus } from '@/types/order';
import governoratesData from '@/data/governorates.json';

export interface OrderReceiptViewProps {
  order: Order;
  autoPrint?: boolean;
  backHref?: string;
  onBack?: () => void;
}

type LanguageMode = 'bilingual' | 'ar' | 'en';

const STATUS_CONFIG: Record<
  OrderStatus,
  { labelAr: string; labelEn: string; colorClass: string; printBadgeClass: string }
> = {
  pending_dispatch: {
    labelAr: 'قيد المعالجة',
    labelEn: 'Pending Dispatch',
    colorClass: 'bg-amber-50 text-amber-900 border-amber-300',
    printBadgeClass: 'border-amber-500 text-amber-900',
  },
  dispatched_whatsapp: {
    labelAr: 'مرسل عبر واتساب',
    labelEn: 'Dispatched via WhatsApp',
    colorClass: 'bg-emerald-50 text-emerald-900 border-emerald-300',
    printBadgeClass: 'border-emerald-600 text-emerald-900',
  },
  confirmed: {
    labelAr: 'مؤكد',
    labelEn: 'Confirmed',
    colorClass: 'bg-blue-50 text-blue-900 border-blue-300',
    printBadgeClass: 'border-blue-600 text-blue-900',
  },
  shipped: {
    labelAr: 'تم الشحن',
    labelEn: 'Shipped',
    colorClass: 'bg-indigo-50 text-indigo-900 border-indigo-300',
    printBadgeClass: 'border-indigo-600 text-indigo-900',
  },
  delivered: {
    labelAr: 'تم التسليم',
    labelEn: 'Delivered',
    colorClass: 'bg-emerald-100 text-emerald-950 border-emerald-400',
    printBadgeClass: 'border-emerald-700 text-emerald-950',
  },
  cancelled: {
    labelAr: 'ملغي',
    labelEn: 'Cancelled',
    colorClass: 'bg-red-50 text-red-900 border-red-300',
    printBadgeClass: 'border-red-600 text-red-900',
  },
};

export default function OrderReceiptView({
  order,
  autoPrint = false,
  backHref = '/admin/orders',
  onBack,
}: OrderReceiptViewProps) {
  const [langMode, setLangMode] = useState<LanguageMode>('bilingual');
  const [showTooltip, setShowTooltip] = useState(false);
  const [hasAutoPrinted, setHasAutoPrinted] = useState(false);

  // Auto-print triggered via URL parameter (?autoPrint=true)
  useEffect(() => {
    if (autoPrint && !hasAutoPrinted && typeof window !== 'undefined') {
      const timer = setTimeout(() => {
        setHasAutoPrinted(true);
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoPrint, hasAutoPrinted]);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  // Lookup Arabic and English governorate names
  const govInfo = governoratesData.find(
    (g) =>
      g.code.toLowerCase() === order.customer.governorate.toLowerCase() ||
      g.nameAr === order.customer.governorate ||
      g.nameEn.toLowerCase() === order.customer.governorate.toLowerCase()
  );

  const governorateNameAr = govInfo ? govInfo.nameAr : order.customer.governorate;
  const governorateNameEn = govInfo ? govInfo.nameEn : order.customer.governorate;

  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending_dispatch;

  // Format creation date
  const createdDate = new Date(order.createdAt);
  const dateStrAr = createdDate.toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const dateStrEn = createdDate.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const timeStrAr = createdDate.toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const timeStrEn = createdDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#FAF7F2] text-[#2B2D42] font-sans print:bg-white print:p-0 print:m-0"
    >
      {/* ============================================================== */}
      {/* 1. SCREEN-ONLY ACTION BAR & GUIDANCE (Hidden during printing) */}
      {/* ============================================================== */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-rose-100 shadow-2xs print:hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          {/* Back Button */}
          <div className="flex items-center gap-3">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-charcoal-700 hover:text-[#800020] hover:bg-rose-50 transition-colors"
                aria-label="العودة للطلبات"
              >
                <ArrowRight className="w-4 h-4" />
                <span>العودة للطلبات</span>
              </button>
            ) : (
              <Link
                href={backHref}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-charcoal-700 hover:text-[#800020] hover:bg-rose-50 transition-colors"
                aria-label="العودة للطلبات"
              >
                <ArrowRight className="w-4 h-4" />
                <span>العودة للطلبات</span>
              </Link>
            )}

            <div className="h-5 w-px bg-rose-200 hidden sm:block" />

            <div className="hidden sm:flex items-center gap-2 text-xs text-charcoal-500">
              <FileText className="w-4 h-4 text-[#800020]" />
              <span>فاتورة الطلب:</span>
              <span className="font-mono font-bold text-charcoal-900 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                {order.orderId}
              </span>
            </div>
          </div>

          {/* Action Buttons: Language toggle, PDF guide tooltip, Print Button */}
          <div className="flex items-center gap-2.5">
            {/* Language Mode Selector */}
            <div
              className="inline-flex items-center rounded-xl bg-rose-50/70 p-1 border border-rose-100 text-[11px] font-bold"
              role="group"
              aria-label="لغة عرض الفاتورة"
            >
              <button
                type="button"
                onClick={() => setLangMode('bilingual')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  langMode === 'bilingual'
                    ? 'bg-white text-[#800020] shadow-2xs font-black'
                    : 'text-charcoal-600 hover:text-charcoal-900'
                }`}
                title="عرض ثنائي اللغة (عربي / English)"
              >
                ثنائي اللغة
              </button>
              <button
                type="button"
                onClick={() => setLangMode('ar')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  langMode === 'ar'
                    ? 'bg-white text-[#800020] shadow-2xs font-black'
                    : 'text-charcoal-600 hover:text-charcoal-900'
                }`}
                title="عرض عربي فقط"
              >
                عربي
              </button>
              <button
                type="button"
                onClick={() => setLangMode('en')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  langMode === 'en'
                    ? 'bg-white text-[#800020] shadow-2xs font-black'
                    : 'text-charcoal-600 hover:text-charcoal-900'
                }`}
                title="English only"
              >
                English
              </button>
            </div>

            {/* Help / Tooltip Toggle for Save to PDF */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTooltip(!showTooltip)}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className="p-2 rounded-xl text-charcoal-500 hover:text-[#800020] hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-colors"
                title="إرشادات حفظ الفاتورة كـ PDF"
                aria-label="إرشادات حفظ الفاتورة كـ PDF"
              >
                <HelpCircle className="w-4 h-4" />
              </button>

              {showTooltip && (
                <div className="absolute left-0 sm:start-0 top-full mt-2 w-72 p-3.5 bg-charcoal-900 text-white text-xs rounded-2xl shadow-xl z-50 border border-charcoal-800 leading-relaxed animate-fade-in">
                  <div className="flex items-center gap-2 mb-1.5 text-amber-400 font-bold">
                    <Sparkles className="w-4 h-4 shrink-0" />
                    <span>كيفية الحفظ كـ PDF:</span>
                  </div>
                  <p className="text-charcoal-200 text-[11px]">
                    عند النقر على زر <strong className="text-white">طباعة الفاتورة</strong>،
                    اختر <strong className="text-amber-300">&quot;حفظ بتنسيق PDF&quot; (Save as PDF)</strong> من
                    خانة الوجهة (Destination) للحصول على مستند رسمي عالي الجودة بنقرة واحدة.
                  </p>
                </div>
              )}
            </div>

            {/* Print / Save as PDF Primary Button */}
            <button
              type="button"
              onClick={handlePrint}
              data-testid="print-receipt-button"
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#800020] hover:bg-[#5B0017] active:scale-[0.98] text-white text-xs font-bold shadow-xs hover:shadow-md transition-all"
              aria-label="طباعة الفاتورة / حفظ كـ PDF"
            >
              <Printer className="w-4 h-4 shrink-0 text-amber-300" />
              <span>طباعة الفاتورة / حفظ كـ PDF</span>
            </button>
          </div>
        </div>

        {/* Informative Guidance Banner on Screen */}
        <div className="bg-amber-50/70 border-t border-amber-100/80 px-4 py-1.5 text-[11px] text-amber-900 text-center flex items-center justify-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>
            مهيأة للطباعة القياسية A4 بجودة متجهة عالية — لا تظهر هذه الأزرار أو الإشعارات في الورقة المطبوعة.
          </span>
        </div>
      </header>

      {/* ============================================================== */}
      {/* 2. PRINTABLE RECEIPT CARD CONTAINER */}
      {/* ============================================================== */}
      <main className="max-w-4xl mx-auto px-4 py-6 sm:py-8 print:p-0 print:m-0 print:max-w-none">
        <article
          data-testid="printable-order-receipt"
          className="receipt-container bg-white rounded-3xl border border-rose-100/90 shadow-sm print:shadow-none print:border-none print:rounded-none overflow-hidden p-6 sm:p-10 print:p-0 space-y-6"
        >
          {/* ---------------------------------------------------------- */}
          {/* HEADER: STORE BRANDING & INVOICE METADATA */}
          {/* ---------------------------------------------------------- */}
          <header className="border-b-2 border-[#800020] pb-6 flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            {/* Brand Monogram & Store Details */}
            <div className="flex items-center gap-4">
              {/* Luxury Monogram */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#800020] border-2 border-[#D4AF37] flex flex-col items-center justify-center text-white shrink-0 shadow-xs print:border-[#D4AF37]">
                <span className="font-serif text-2xl sm:text-3xl font-black text-[#D4AF37] tracking-wider">
                  R
                </span>
                <span className="text-[8px] font-sans font-bold tracking-widest uppercase text-rose-100">
                  ROBY
                </span>
              </div>

              {/* Store Title & Contacts */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-serif font-black text-[#800020] tracking-tight">
                    متجر روبي
                  </h1>
                  <span className="text-charcoal-400 font-light">|</span>
                  <span className="text-lg sm:text-xl font-serif font-bold text-charcoal-800 tracking-wider">
                    ROBY STORE
                  </span>
                </div>

                <p className="text-xs text-[#D4AF37] font-semibold">
                  أزياء حريمي ومفروشات راقية • Luxury Women&apos;s Fashion &amp; Home Textiles
                </p>

                <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-[11px] text-charcoal-500 pt-0.5">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#800020] shrink-0" />
                    <span>القاهرة، جمهورية مصر العربية • Cairo, Egypt</span>
                  </span>
                  <span className="text-charcoal-300">•</span>
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span dir="ltr" className="font-mono font-medium">
                      +20 100 000 0000
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Invoice Meta & Order Badge */}
            <div className="flex flex-col items-start md:items-end space-y-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#800020] text-white">
                <FileText className="w-4 h-4 text-[#D4AF37]" />
                <span className="text-xs font-bold tracking-wide">
                  فاتورة مبيعات وسند استلام
                </span>
                <span className="text-[10px] text-rose-200 font-mono hidden sm:inline">
                  / SALES INVOICE
                </span>
              </div>

              {/* Order ID Reference */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs font-bold text-charcoal-500">كود الطلب:</span>
                <span
                  data-testid="receipt-order-id"
                  className="font-mono text-sm sm:text-base font-black text-[#800020] bg-rose-50 px-3 py-1 rounded-lg border border-rose-200/80 tracking-wider"
                >
                  #{order.orderId}
                </span>
              </div>

              {/* Date & Status */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-charcoal-600">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-charcoal-400" />
                  <span className="font-medium">
                    {langMode === 'en' ? `${dateStrEn} ${timeStrEn}` : `${dateStrAr} - ${timeStrAr}`}
                  </span>
                </div>

                <span className="text-charcoal-300">•</span>

                {/* Status Badge */}
                <span
                  data-testid="receipt-order-status"
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusConfig.colorClass}`}
                >
                  <Clock className="w-3 h-3 shrink-0" />
                  <span>
                    {langMode === 'en'
                      ? statusConfig.labelEn
                      : langMode === 'ar'
                      ? statusConfig.labelAr
                      : `${statusConfig.labelAr} / ${statusConfig.labelEn}`}
                  </span>
                </span>
              </div>
            </div>
          </header>

          {/* ---------------------------------------------------------- */}
          {/* CUSTOMER & DELIVERY ADDRESS INFORMATION */}
          {/* ---------------------------------------------------------- */}
          <section
            aria-labelledby="customer-info-heading"
            className="rounded-2xl border border-rose-100 bg-[#FAF7F2]/60 p-4 sm:p-5 print:bg-white print:border-charcoal-200 print:rounded-xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-rose-100/80 pb-2.5">
              <h2
                id="customer-info-heading"
                className="text-xs font-bold uppercase tracking-wider text-[#800020] flex items-center gap-2"
              >
                <BadgeCheck className="w-4 h-4 text-[#D4AF37]" />
                <span>بيانات العميل وعنوان الشحن</span>
                {langMode !== 'ar' && (
                  <span className="text-[10px] text-charcoal-400 font-sans font-normal">
                    / Customer &amp; Shipping Information
                  </span>
                )}
              </h2>

              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 print:border-charcoal-300">
                الدفع عند الاستلام (COD)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Customer Column */}
              <div className="space-y-2.5">
                <div>
                  <span className="text-[11px] text-charcoal-400 block mb-0.5 font-bold">
                    اسم العميل {langMode !== 'ar' && '• Customer Name'}:
                  </span>
                  <p
                    data-testid="receipt-customer-name"
                    className="font-bold text-sm text-charcoal-900"
                  >
                    {order.customer.fullName}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <span className="text-[11px] text-charcoal-400 block mb-0.5 font-bold">
                      رقم الهاتف {langMode !== 'ar' && '• Primary Phone'}:
                    </span>
                    <p
                      data-testid="receipt-customer-phone"
                      dir="ltr"
                      className="font-mono font-bold text-charcoal-800 inline-block bg-white px-2 py-0.5 rounded border border-rose-100 print:border-charcoal-200"
                    >
                      {order.customer.phone}
                    </p>
                  </div>

                  {order.customer.alternativePhone && (
                    <div>
                      <span className="text-[11px] text-charcoal-400 block mb-0.5 font-bold">
                        هاتف بديل {langMode !== 'ar' && '• Secondary'}:
                      </span>
                      <p
                        data-testid="receipt-customer-alt-phone"
                        dir="ltr"
                        className="font-mono font-medium text-charcoal-700 inline-block bg-white px-2 py-0.5 rounded border border-rose-100 print:border-charcoal-200"
                      >
                        {order.customer.alternativePhone}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Delivery Address Column */}
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[11px] text-charcoal-400 block mb-0.5 font-bold">
                      المحافظة {langMode !== 'ar' && '• Governorate'}:
                    </span>
                    <p
                      data-testid="receipt-governorate"
                      className="font-bold text-charcoal-900"
                    >
                      {langMode === 'en'
                        ? governorateNameEn
                        : langMode === 'ar'
                        ? governorateNameAr
                        : `${governorateNameAr} (${governorateNameEn})`}
                    </p>
                  </div>

                  <div>
                    <span className="text-[11px] text-charcoal-400 block mb-0.5 font-bold">
                      المدينة / الحي {langMode !== 'ar' && '• City'}:
                    </span>
                    <p data-testid="receipt-city" className="font-bold text-charcoal-900">
                      {order.customer.city}
                    </p>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-charcoal-400 block mb-0.5 font-bold">
                    العنوان بالتفصيل {langMode !== 'ar' && '• Detailed Address'}:
                  </span>
                  <p
                    data-testid="receipt-delivery-address"
                    className="font-medium text-charcoal-800 leading-relaxed bg-white/90 p-2 rounded-lg border border-rose-100 print:border-charcoal-200 print:p-1.5"
                  >
                    {order.customer.deliveryAddress}
                  </p>
                </div>

                {order.customer.notes && (
                  <div>
                    <span className="text-[11px] text-amber-700 block mb-0.5 font-bold">
                      ملاحظات خاصة بالتوصيل {langMode !== 'ar' && '• Delivery Notes'}:
                    </span>
                    <p
                      data-testid="receipt-customer-notes"
                      className="font-medium text-amber-950 bg-amber-50/70 p-2 rounded-lg border border-amber-200 text-xs leading-relaxed"
                    >
                      {order.customer.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ---------------------------------------------------------- */}
          {/* LINE ITEMS TABLE */}
          {/* ---------------------------------------------------------- */}
          <section aria-labelledby="order-items-heading" className="space-y-3">
            <div className="flex items-center justify-between">
              <h2
                id="order-items-heading"
                className="text-xs font-bold uppercase tracking-wider text-[#800020] flex items-center gap-2"
              >
                <span>المنتجات المطلوبة</span>
                {langMode !== 'ar' && (
                  <span className="text-[10px] text-charcoal-400 font-sans font-normal">
                    / Order Line Items ({order.items.length} items, {totalQuantity} pcs)
                  </span>
                )}
              </h2>
            </div>

            <div className="rounded-2xl border border-rose-100 overflow-hidden print:border-charcoal-300 print:rounded-none">
              <table
                data-testid="receipt-items-table"
                className="w-full text-right text-xs border-collapse"
              >
                <thead>
                  <tr className="bg-[#800020] text-white font-bold text-[11px] print:bg-charcoal-900">
                    <th scope="col" className="py-2.5 px-3 text-center w-10">
                      #
                    </th>
                    <th scope="col" className="py-2.5 px-4">
                      المنتج {langMode !== 'ar' && '• Product Description'}
                    </th>
                    <th scope="col" className="py-2.5 px-3">
                      المواصفات {langMode !== 'ar' && '• Variant'}
                    </th>
                    <th scope="col" className="py-2.5 px-3 text-center whitespace-nowrap">
                      السعر {langMode !== 'ar' && '• Price'}
                    </th>
                    <th scope="col" className="py-2.5 px-3 text-center whitespace-nowrap w-16">
                      الكمية {langMode !== 'ar' && '• Qty'}
                    </th>
                    <th scope="col" className="py-2.5 px-4 text-start sm:text-end whitespace-nowrap">
                      الإجمالي {langMode !== 'ar' && '• Total'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rose-100 bg-white print:divide-charcoal-200">
                  {order.items.map((item, idx) => (
                    <tr
                      key={`${item.productId}-${item.sku}-${idx}`}
                      className="hover:bg-rose-50/30 print:hover:bg-transparent avoid-break"
                    >
                      {/* Index */}
                      <td className="py-3 px-3 text-center text-charcoal-400 font-mono font-bold">
                        {idx + 1}
                      </td>

                      {/* Product Title & SKU */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <p className="font-bold text-charcoal-900 leading-snug">
                            {langMode === 'en'
                              ? item.productTitleEn || item.productTitleAr
                              : item.productTitleAr}
                          </p>
                          {langMode === 'bilingual' && item.productTitleEn && (
                            <p className="text-[11px] text-charcoal-500 font-sans">
                              {item.productTitleEn}
                            </p>
                          )}
                          <div className="flex items-center gap-2 pt-0.5">
                            <span className="font-mono text-[10px] text-charcoal-400 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 print:border-charcoal-200">
                              SKU: {item.sku}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Variant (Color Swatch + Size) */}
                      <td className="py-3 px-3">
                        <div className="flex flex-col gap-1 text-[11px]">
                          {/* Color */}
                          <div className="flex items-center gap-1.5">
                            <span
                              data-testid="item-color-swatch"
                              className="w-3 h-3 rounded-full border border-black/20 shrink-0 inline-block shadow-2xs"
                              style={{ backgroundColor: item.colorHex }}
                              title={item.colorNameAr}
                            />
                            <span className="font-bold text-charcoal-800">
                              {langMode === 'en'
                                ? item.colorNameEn || item.colorNameAr
                                : item.colorNameAr}
                            </span>
                          </div>

                          {/* Size */}
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-charcoal-400">المقاس:</span>
                            <span className="font-bold text-[#800020] bg-rose-50 px-1.5 py-0.2 rounded border border-rose-100 text-[10px]">
                              {item.size}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Unit Price */}
                      <td className="py-3 px-3 text-center whitespace-nowrap font-serif font-bold text-charcoal-800">
                        {item.unitPrice}{' '}
                        <span className="text-[10px] font-sans font-normal text-charcoal-500">
                          ج.م
                        </span>
                      </td>

                      {/* Quantity */}
                      <td className="py-3 px-3 text-center whitespace-nowrap font-bold text-charcoal-900">
                        <span className="inline-block px-2 py-0.5 bg-rose-50 rounded-md border border-rose-100 font-mono text-xs">
                          {item.quantity}
                        </span>
                      </td>

                      {/* Line Subtotal */}
                      <td className="py-3 px-4 text-start sm:text-end whitespace-nowrap font-serif font-black text-charcoal-950 text-sm">
                        {item.subtotal}{' '}
                        <span className="text-[10px] font-sans font-normal text-charcoal-500">
                          ج.م
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ---------------------------------------------------------- */}
          {/* FINANCIAL BREAKDOWN SUMMARY */}
          {/* ---------------------------------------------------------- */}
          <section
            aria-labelledby="financial-summary-heading"
            className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pt-2 avoid-break"
          >
            {/* Payment Confirmation & COD Terms Note */}
            <div className="flex-1 space-y-3 rounded-2xl border border-rose-100 bg-[#FAF7F2]/60 p-4 print:border-charcoal-200 print:bg-white text-xs">
              <div className="flex items-center gap-2 text-charcoal-800 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>شروط السداد والاستلام:</span>
              </div>
              <ul className="space-y-1.5 text-charcoal-600 text-[11px] leading-relaxed list-disc list-inside">
                <li>
                  طريقة الدفع: <strong>الدفع نقداً عند الاستلام (COD)</strong> لمندوب شركة الشحن.
                </li>
                <li>
                  المبلغ المطلوب سداده هو الإجمالي النهائي الموضح في هذه الفاتورة فقط بدون أي رسوم إضافية غير مدونة.
                </li>
                <li>
                  يُرجى الاحتفاظ بهذه الفاتورة وسند الاستلام كإثبات رسمي لشراء المنتجات.
                </li>
              </ul>
            </div>

            {/* Calculations Card */}
            <div className="w-full sm:w-80 rounded-2xl border-2 border-[#800020]/20 bg-rose-50/40 p-4 space-y-2.5 text-xs print:border-charcoal-400 print:bg-white print:rounded-xl">
              <h3 id="financial-summary-heading" className="sr-only">
                الملخص المالي
              </h3>

              {/* Subtotal */}
              <div className="flex items-center justify-between text-charcoal-600">
                <span>إجمالي المنتجات {langMode !== 'ar' && '(Subtotal)'}:</span>
                <span
                  data-testid="receipt-subtotal"
                  className="font-serif font-bold text-charcoal-900"
                >
                  {order.pricing.subtotal} ج.م
                </span>
              </div>

              {/* Shipping Fee */}
              <div className="flex items-center justify-between text-charcoal-600">
                <span>
                  مصاريف الشحن ({governorateNameAr}) {langMode !== 'ar' && '(Shipping)'}:
                </span>
                <span
                  data-testid="receipt-shipping-fee"
                  className="font-serif font-bold text-charcoal-900"
                >
                  {order.pricing.shippingFee} ج.م
                </span>
              </div>

              {/* Total Savings (if applicable) */}
              {order.pricing.totalSavings > 0 && (
                <div
                  data-testid="receipt-total-savings"
                  className="flex items-center justify-between text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200"
                >
                  <span className="flex items-center gap-1 font-bold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>إجمالي التوفير {langMode !== 'ar' && '(Savings)'}:</span>
                  </span>
                  <span className="font-serif font-bold">
                    - {order.pricing.totalSavings} ج.م
                  </span>
                </div>
              )}

              {/* Grand Total */}
              <div className="pt-2.5 border-t-2 border-[#800020] flex items-center justify-between text-[#800020] print:text-black">
                <div className="space-y-0.5">
                  <span className="font-black text-sm block">
                    الإجمالي النهائي المستحق
                  </span>
                  {langMode !== 'ar' && (
                    <span className="text-[10px] text-charcoal-500 font-sans block">
                      Grand Total Due (COD)
                    </span>
                  )}
                </div>
                <div className="text-start sm:text-end">
                  <span
                    data-testid="receipt-grand-total"
                    className="text-xl sm:text-2xl font-serif font-black tracking-tight"
                  >
                    {order.pricing.grandTotal}
                  </span>
                  <span className="text-xs font-sans font-bold mr-1">ج.م</span>
                </div>
              </div>
            </div>
          </section>

          {/* ---------------------------------------------------------- */}
          {/* LEGAL POLICY & INSPECTION GUARANTEE */}
          {/* ---------------------------------------------------------- */}
          <section
            aria-labelledby="policies-heading"
            className="pt-4 border-t border-rose-100 print:border-charcoal-300 space-y-4 avoid-break"
          >
            <h3 id="policies-heading" className="sr-only">
              سياسات الشحن والضمان
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
              {/* Inspection on Delivery Guarantee */}
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-rose-100 print:border-charcoal-200">
                <ShieldCheck className="w-4 h-4 text-[#800020] shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <h4 className="font-bold text-charcoal-900">حق المعاينة عند الاستلام</h4>
                  <p className="text-charcoal-500 leading-snug">
                    يحق للعميل فحص المنتج ومطابقته قبل دفع القيمة لمندوب شركة الشحن.
                  </p>
                </div>
              </div>

              {/* 14-Day Return Policy */}
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-rose-100 print:border-charcoal-200">
                <RotateCcw className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <h4 className="font-bold text-charcoal-900">سياسة الاسترجاع والاستبدال</h4>
                  <p className="text-charcoal-500 leading-snug">
                    متاح خلال 14 يوماً من تاريخ الاستلام للمنتجات غير المستخدمة في عبوتها الأصلية.
                  </p>
                </div>
              </div>

              {/* Customer Service WhatsApp */}
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-rose-100 print:border-charcoal-200">
                <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <h4 className="font-bold text-charcoal-900">خدمة العملاء والدعم الفني</h4>
                  <p className="text-charcoal-500 leading-snug">
                    متاح عبر واتساب يومياً من 10 ص حتى 10 م طوال أيام الأسبوع.
                  </p>
                </div>
              </div>
            </div>

            {/* Barcode representation & Signatures */}
            <div className="pt-4 border-t border-dashed border-rose-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-charcoal-500">
              {/* Decorative Vector-grade Barcode */}
              <div className="flex flex-col items-center space-y-1">
                <div
                  aria-label={`Barcode for order ${order.orderId}`}
                  className="flex items-center gap-[2px] h-8 px-2 bg-white"
                >
                  {[3, 1, 2, 1, 4, 2, 1, 3, 2, 1, 3, 4, 1, 2, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2].map(
                    (w, idx) => (
                      <span
                        key={idx}
                        className="bg-charcoal-900 h-full inline-block"
                        style={{ width: `${w}px` }}
                      />
                    )
                  )}
                </div>
                <span className="font-mono text-[10px] tracking-widest text-charcoal-600">
                  *{order.orderId}*
                </span>
              </div>

              {/* Signature / Stamp line */}
              <div className="flex items-center gap-8 text-[11px]">
                <div className="text-center space-y-3">
                  <span className="block text-charcoal-400">توقيع المستلم / Customer Sign</span>
                  <div className="w-28 border-b border-charcoal-300 mx-auto" />
                </div>

                <div className="text-center space-y-3">
                  <span className="block text-charcoal-400">ختم المتجر / Official Stamp</span>
                  <div className="w-24 h-10 border border-dashed border-[#800020]/40 rounded-lg flex items-center justify-center text-[9px] font-bold text-[#800020] mx-auto print:border-charcoal-400">
                    متجر روبي ستور
                  </div>
                </div>
              </div>
            </div>

            {/* Final Appreciation */}
            <p className="text-center text-[11px] text-charcoal-400 pt-2 font-medium">
              شكراً لاختيارك متجر روبي ستور • Thank you for choosing Roby Store
            </p>
          </section>
        </article>
      </main>

      {/* ============================================================== */}
      {/* 3. ROBUST EMBEDDED PRINT STYLES */}
      {/* ============================================================== */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 12mm 10mm 12mm;
          }
          html,
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .receipt-container {
            box-shadow: none !important;
            border: none !important;
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .avoid-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `,
        }}
      />
    </div>
  );
}
