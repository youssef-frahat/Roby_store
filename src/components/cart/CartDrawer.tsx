'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { X, ShoppingBag, Plus, Minus, Trash2, ArrowLeft, MessageCircle } from 'lucide-react';
import { useCartStore } from '../../store/useCartStore';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  whatsappNumber?: string;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  whatsappNumber = '201000000000',
}) => {
  const {
    items,
    getItemCount,
    removeItem,
    updateQuantity,
    clearCart,
    getSubtotal,
    getTotalDiscount,
    getGrandTotal,
  } = useCartStore();

  if (!isOpen) return null;

  const totalItemCount = getItemCount();
  const summary = {
    subtotal: getSubtotal(),
    totalSavings: getTotalDiscount(),
    grandTotal: getGrandTotal(),
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-charcoal-950/60 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 end-0 max-w-full flex ps-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between animate-slide-in">
          {/* Header */}
          <div className="p-5 border-b border-rose-100 flex items-center justify-between bg-rose-50/50">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-rose-100 text-rose-700 rounded-full">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-charcoal-900 font-serif">سلة المشتريات</h3>
                <p className="text-xs text-rose-600 font-medium">({totalItemCount} قطع في السلة)</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-charcoal-400 hover:text-charcoal-700 rounded-full hover:bg-rose-100/60 transition-colors"
              aria-label="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 px-4 space-y-3">
                <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-400 flex items-center justify-center">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h4 className="text-base font-bold text-charcoal-800">السلة فارغة حالياً</h4>
                <p className="text-xs text-charcoal-500 max-w-xs leading-relaxed">
                  لم تقومي بإضافة أي منتجات للسلة بعد. استكشفي أحدث فساتين ومفروشات روبي ستور الآن!
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-2 px-6 py-2.5 rounded-full bg-rose-600 text-white text-xs font-bold shadow-md hover:bg-rose-700"
                >
                  تصفح المنتجات الآن
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 p-3 rounded-2xl border border-rose-100 bg-rose-50/20 shadow-2xs"
                >
                  {/* Thumbnail */}
                  <div className="relative w-20 h-24 rounded-xl overflow-hidden bg-rose-100 shrink-0">
                    <Image
                      src={item.productImage || '/images/placeholder.jpg'}
                      alt={item.productTitleAr}
                      fill
                      className="object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs sm:text-sm font-semibold text-charcoal-900 truncate">
                          {item.productTitleAr}
                        </h4>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="text-charcoal-400 hover:text-red-600 p-1 transition-colors"
                          title="حذف من السلة"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Variant Badges */}
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-charcoal-600">
                        <span className="flex items-center gap-1">
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-gray-300"
                            style={{ backgroundColor: item.variant.color.hex }}
                          />
                          <span>{item.variant.color.nameAr}</span>
                        </span>
                        <span>•</span>
                        <span>المقاس: {item.variant.size}</span>
                      </div>
                    </div>

                    {/* Price & Quantity Controls */}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-rose-100/60">
                      <div className="flex items-center border border-rose-200 rounded-lg bg-white">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-1 text-charcoal-600 hover:text-rose-700 hover:bg-rose-50"
                          aria-label="إنقاص"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 text-xs font-bold text-charcoal-900">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={item.quantity >= (item.variant.stockQuantity || 99)}
                          className="p-1 text-charcoal-600 hover:text-rose-700 hover:bg-rose-50 disabled:opacity-40"
                          aria-label="زيادة"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="text-end">
                        <span className="text-xs sm:text-sm font-bold text-rose-950">
                          {item.subtotal.toLocaleString('ar-EG')} ج.م
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer & Checkout */}
          {items.length > 0 && (
            <div className="p-5 border-t border-rose-100 bg-rose-50/40 space-y-3">
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-charcoal-600">
                  <span>المجموع الفرعي:</span>
                  <span className="font-semibold">{summary.subtotal.toLocaleString('ar-EG')} ج.م</span>
                </div>
                {summary.totalSavings > 0 && (
                  <div className="flex items-center justify-between text-emerald-700 font-semibold">
                    <span>إجمالي الخصم والتوفير:</span>
                    <span>- {summary.totalSavings.toLocaleString('ar-EG')} ج.م</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-charcoal-500 text-[11px]">
                  <span>مصاريف الشحن:</span>
                  <span>تُحسب تلقائياً حسب المحافظة في الخطوة التالية</span>
                </div>
                <div className="flex items-center justify-between text-sm sm:text-base font-bold text-rose-950 pt-2 border-t border-rose-200">
                  <span>الإجمالي:</span>
                  <span>{summary.grandTotal.toLocaleString('ar-EG')} ج.م</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                <Link
                  href="/checkout"
                  onClick={onClose}
                  className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-300" />
                  <span>تأكيد الطلب عبر الواتساب</span>
                  <ArrowLeft className="w-4 h-4" />
                </Link>

                <button
                  type="button"
                  onClick={clearCart}
                  className="w-full py-2 text-[11px] text-charcoal-400 hover:text-red-600 text-center transition-colors"
                >
                  إفراغ السلة
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
