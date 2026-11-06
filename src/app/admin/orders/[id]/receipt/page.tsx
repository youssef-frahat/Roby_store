'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useParams } from 'next/navigation';
import { ArrowRight, AlertCircle } from 'lucide-react';
import { getStoreService } from '@/services/storeService';
import { Order } from '@/types/order';
import OrderReceiptView from '@/components/admin/orders/OrderReceiptView';

export interface OrderReceiptPageProps {
  params: { id: string };
  searchParams?: { autoPrint?: string };
}

function OrderReceiptContent({ params, searchParams }: OrderReceiptPageProps) {
  const nextParams = useParams();
  const nextSearchParams = useSearchParams();

  // Support both page props and Next.js navigation hooks
  const orderId = params?.id || (nextParams?.id as string);
  const autoPrintQuery =
    searchParams?.autoPrint === 'true' ||
    nextSearchParams?.get('autoPrint') === 'true';

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchOrder() {
      if (!orderId) {
        setIsLoading(false);
        setError('معرف الطلب غير محدد');
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const service = getStoreService();
        const foundOrder = await service.getOrderById(orderId);

        if (!isMounted) return;

        if (!foundOrder) {
          setError(`لم يتم العثور على أي طلب مسجل بالمعرف #${orderId}`);
        } else {
          setOrder(foundOrder);
        }
      } catch (err: any) {
        if (!isMounted) return;
        setError(err?.message || 'حدث خطأ أثناء تحميل بيانات الطلب');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchOrder();

    return () => {
      isMounted = false;
    };
  }, [orderId]);

  if (isLoading) {
    return (
      <div
        dir="rtl"
        data-testid="order-receipt-loading"
        className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center p-6 text-center"
      >
        <div className="w-14 h-14 rounded-full border-4 border-rose-200 border-t-[#800020] animate-spin mb-4" />
        <h2 className="text-base font-bold text-charcoal-800">
          جارٍ إعداد وتجهيز الفاتورة...
        </h2>
        <p className="text-xs text-charcoal-500 mt-1">
          يتم جلب تفاصيل الطلب #{orderId} وحساب الإجماليات بدقة
        </p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div
        dir="rtl"
        data-testid="order-receipt-not-found"
        className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-6"
      >
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-rose-100 shadow-sm text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 border border-red-100 flex items-center justify-center mx-auto shadow-2xs">
            <AlertCircle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-lg font-serif font-black text-charcoal-900">
              الطلب غير موجود / Order Not Found
            </h1>
            <p className="text-xs text-charcoal-600 leading-relaxed">
              {error ||
                `لم يتم العثور على أي طلب مسجل بالمعرف #${orderId}. قد يكون المعرف غير صحيح أو تم حذف السجل.`}
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/admin/orders"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#800020] hover:bg-[#5B0017] text-white text-xs font-bold transition-all shadow-xs"
            >
              <ArrowRight className="w-4 h-4" />
              <span>العودة لقائمة الطلبات</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <OrderReceiptView order={order} autoPrint={autoPrintQuery} />;
}

export default function OrderReceiptPage(props: OrderReceiptPageProps) {
  return (
    <Suspense
      fallback={
        <div
          dir="rtl"
          className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center p-6 text-center"
        >
          <div className="w-14 h-14 rounded-full border-4 border-rose-200 border-t-[#800020] animate-spin mb-4" />
          <p className="text-xs text-charcoal-500 font-bold">جارٍ التحميل...</p>
        </div>
      }
    >
      <OrderReceiptContent {...props} />
    </Suspense>
  );
}
