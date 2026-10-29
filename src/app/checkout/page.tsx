'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  MessageCircle,
  Copy,
  Check,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  Truck,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { useCartStore } from '../../store/useCartStore';
import { getStoreService } from '../../services/storeService';
import { GovernorateInfo, StoreSettings } from '../../types/store';
import { CustomerDetails, Order } from '../../types/order';
import { CheckoutForm } from '../../components/checkout/CheckoutForm';
import { calculateCartSummary } from '../../utils/pricing';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, clearCart } = useCartStore();

  const [governorates, setGovernorates] = useState<GovernorateInfo[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [whatsappUrl, setWhatsappUrl] = useState<string>('');

  // Customer form state
  const [customer, setCustomer] = useState<CustomerDetails>({
    fullName: '',
    phone: '',
    alternativePhone: '',
    governorate: 'Cairo',
    city: '',
    deliveryAddress: '',
    notes: '',
  });

  const service = getStoreService();

  useEffect(() => {
    async function loadInitial() {
      try {
        const [govs, storeSettings] = await Promise.all([
          service.getGovernorates(),
          service.getSettings(),
        ]);
        setGovernorates(govs);
        setSettings(storeSettings);
      } catch (err) {
        console.error('Failed to load checkout settings', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadInitial();
  }, [service]);

  // Dynamic pricing calculation
  const summary = calculateCartSummary(items, customer.governorate, governorates);

  const handleSubmitOrder = async () => {
    if (items.length === 0) return;
    setIsSubmitting(true);

    try {
      const res = await service.submitOrder({
        customer,
        items,
        dispatchChannel: 'whatsapp',
      });

      if (res.success && res.order) {
        setCompletedOrder(res.order);
        setWhatsappUrl(res.whatsappUrl || '');
        // Clear cart
        clearCart();
        // Automatically open WhatsApp in new tab
        if (res.whatsappUrl) {
          window.open(res.whatsappUrl, '_blank');
        }
      }
    } catch (err: any) {
      alert('حدث خطأ أثناء تجهيز الطلب: ' + (err.message || 'يرجى المحاولة مجدداً'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopySummary = () => {
    if (!completedOrder?.formattedSocialMessage) return;
    navigator.clipboard.writeText(completedOrder.formattedSocialMessage);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3000);
  };

  // If order completed, show success screen
  if (completedOrder) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-2xl text-center space-y-6">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-md animate-scale-in">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">
            رقم الطلب: #{completedOrder.orderId}
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-charcoal-900">
            تم تسجيل طلبك بنجاح! 🎉
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-600 max-w-md mx-auto leading-relaxed">
            تم تجهيز تفاصيل طلبك المشفرة. إذا لم تفتح نافذة الواتساب تلقائياً، يرجى الضغط على الزر أدناه لإرسال الرسالة إلى خدمة العملاء فوراً لتأكيد التوصيل.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="p-6 rounded-3xl bg-white border border-rose-100 shadow-sm space-y-4 max-w-md mx-auto">
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
            >
              <MessageCircle className="w-5 h-5" />
              <span>إرسال تفاصيل الطلب عبر الواتساب</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          )}

          <button
            type="button"
            onClick={handleCopySummary}
            className="w-full py-2.5 px-4 rounded-xl border border-rose-200 text-charcoal-700 hover:bg-rose-50 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
          >
            {isCopied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">تم نسخ تفاصيل الطلب بنجاح!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-rose-600" />
                <span>نسخ ملخص الطلب لـ إنستغرام أو ماسنجر</span>
              </>
            )}
          </button>
        </div>

        <div className="pt-4">
          <Link
            href="/catalog"
            className="inline-flex items-center gap-1.5 text-xs text-rose-700 hover:text-rose-900 font-bold"
          >
            <span>متابعة التسوق في المتجر</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  // Empty Cart View
  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20 text-center max-w-md space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center mx-auto">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold font-serif text-charcoal-900">سلة المشتريات فارغة</h2>
        <p className="text-xs text-charcoal-500 leading-relaxed">
          لا يمكنك الانتقال لصفحة إتمام الطلب بدون وجود منتجات في السلة.
        </p>
        <Link
          href="/catalog"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-rose-600 text-white text-xs font-bold shadow-md hover:bg-rose-700"
        >
          <span>تصفح الكتالوج الآن</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/catalog"
          className="text-xs text-rose-700 hover:text-rose-900 font-semibold flex items-center gap-1 mb-2"
        >
          <ArrowRight className="w-3.5 h-3.5" />
          <span>العودة للتسوق</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold font-serif text-charcoal-900">
          تأكيد الطلب والشحن (Social Checkout)
        </h1>
        <p className="text-xs text-charcoal-500 mt-1">
          أدخلي بيانات الشحن وسنقوم فوراً بإنشاء رسالة طلب منسقة وإرسالها عبر الواتساب.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Col (Form): 7 cols */}
        <div className="lg:col-span-7">
          <CheckoutForm
            customer={customer}
            governorates={governorates}
            onChange={(updated) => setCustomer((prev) => ({ ...prev, ...updated }))}
            onSubmit={handleSubmitOrder}
            isSubmitting={isSubmitting}
          />
        </div>

        {/* Right Col (Order Summary): 5 cols */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-rose-100 shadow-xs space-y-5 sticky top-24">
          <h3 className="text-base font-bold text-charcoal-900 font-serif border-b border-rose-100 pb-3">
            ملخص السلة والمنتجات ({summary.totalItemCount} قطع)
          </h3>

          {/* Items Preview */}
          <div className="space-y-3 max-h-60 overflow-y-auto scrollbar-none pe-1">
            {items.map((item) => (
              <div key={item.id} className="flex gap-3 text-xs">
                <div className="relative w-14 h-16 rounded-xl overflow-hidden bg-rose-50 shrink-0">
                  <Image
                    src={item.productImage || '/images/placeholder.jpg'}
                    alt={item.productTitleAr}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-charcoal-900 truncate">
                    {item.productTitleAr}
                  </h4>
                  <p className="text-[11px] text-charcoal-500 mt-0.5">
                    اللون: {item.variant.color.nameAr} | المقاس: {item.variant.size}
                  </p>
                  <p className="text-[11px] text-charcoal-700 mt-1">
                    {item.quantity} × {item.unitPrice} ج.م ={' '}
                    <span className="font-bold text-rose-950">{item.subtotal} ج.م</span>
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Financial Breakdown */}
          <div className="border-t border-rose-100 pt-4 space-y-2 text-xs">
            <div className="flex items-center justify-between text-charcoal-600">
              <span>المجموع الفرعي:</span>
              <span className="font-semibold">{summary.subtotal.toLocaleString('ar-EG')} ج.م</span>
            </div>

            <div className="flex items-center justify-between text-charcoal-600">
              <span>
                مصاريف الشحن ({customer.governorate}):
              </span>
              <span className="font-semibold">{summary.shippingFee.toLocaleString('ar-EG')} ج.م</span>
            </div>

            {summary.totalSavings > 0 && (
              <div className="flex items-center justify-between text-emerald-700 font-semibold">
                <span>إجمالي التوفير في هذا الطلب:</span>
                <span>- {summary.totalSavings.toLocaleString('ar-EG')} ج.م</span>
              </div>
            )}

            <div className="flex items-center justify-between text-base font-bold text-rose-950 pt-3 border-t border-rose-200">
              <span>الإجمالي النهائي المطلوب دفعه:</span>
              <span className="text-xl font-extrabold font-serif text-rose-900">
                {summary.grandTotal.toLocaleString('ar-EG')} ج.م
              </span>
            </div>
            <p className="text-[11px] text-charcoal-400 text-center pt-1">
              * الدفع عند الاستلام نقداً بعد فحص ومعاينة المنتج.
            </p>
          </div>

          {/* Badges */}
          <div className="pt-2 border-t border-rose-100 space-y-2 text-[11px] text-charcoal-600">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>معاينة وفحص المنتج قبل سداد أي مبالغ لمندوب الشحن</span>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-rose-600 shrink-0" />
              <span>توصيل سريع حتى باب المنزل بجميع محافظات مصر</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
