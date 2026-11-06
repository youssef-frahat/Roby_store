'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Package,
  Layers,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  PlusCircle,
  Settings,
  ExternalLink,
  RefreshCw,
  Clock,
  Phone,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Truck,
  Sparkles,
} from 'lucide-react';
import { getStoreService } from '@/services/storeService';
import { Product, Category, ProductVariant, AdminMetrics } from '@/types/store';
import { Order, OrderStatus } from '@/types/order';
import { formatEGP } from '@/utils/pricing';

interface LowStockItem {
  productId: string;
  productSlug: string;
  productTitleAr: string;
  productImage?: string;
  variant: ProductVariant;
}

export default function AdminDashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadDashboardData = useCallback(async () => {
    try {
      setError(null);
      const service = getStoreService();

      const [prodsRes, cats, ordersRes, metricsRes] = await Promise.all([
        service.getProducts({ pageSize: 1000 }),
        service.getCategories(),
        service.getOrders({ pageSize: 50 }),
        service.getAdminMetrics ? service.getAdminMetrics().catch(() => null) : Promise.resolve(null),
      ]);

      setProducts(prodsRes.data || []);
      setCategories(cats || []);
      setOrders(ordersRes.data || []);
      if (metricsRes) {
        setMetrics(metricsRes);
      }
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء تحميل بيانات لوحة التحكم');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadDashboardData();
  };

  // Derive metrics live from store data and admin metrics (remediated from 50 cap)
  const totalProducts = metrics?.totalProductsCount ?? products.length;
  const activeCategories = categories.length;
  const totalOrders = metrics?.totalOrders ?? orders.length;

  const totalRevenue = metrics
    ? metrics.totalRevenue
    : orders
        .filter((o) => o.status !== 'cancelled')
        .reduce((sum, o) => sum + (o.pricing?.grandTotal || 0), 0);

  // Compute Out-of-Stock Variants & Low Stock Radar (stock <= 2)
  const lowStockItems: LowStockItem[] = [];
  let outOfStockVariantsCount = 0;

  products.forEach((product) => {
    if (product.variants && product.variants.length > 0) {
      product.variants.forEach((variant) => {
        const qty = variant.stockQuantity ?? 0;
        if (qty === 0) {
          outOfStockVariantsCount++;
        }
        if (qty <= 2) {
          lowStockItems.push({
            productId: product.id,
            productSlug: product.slug,
            productTitleAr: product.titleAr,
            productImage: product.images?.[0] || variant.variantImageUrl,
            variant,
          });
        }
      });
    }
  });

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'dispatched_whatsapp':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <MessageCircle className="w-3 h-3 text-emerald-600" />
            <span>مرسل عبر واتساب</span>
          </span>
        );
      case 'pending_dispatch':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>قيد المعالجة</span>
          </span>
        );
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
            <CheckCircle2 className="w-3 h-3 text-blue-600" />
            <span>مؤكد</span>
          </span>
        );
      case 'shipped':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
            <Truck className="w-3 h-3 text-indigo-600" />
            <span>تم الشحن</span>
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
            <span>تم التسليم</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-50 text-red-800 border border-red-200">
            <XCircle className="w-3 h-3 text-red-600" />
            <span>ملغي</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-charcoal-100 text-charcoal-700">
            {status}
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-12 h-12 rounded-full border-4 border-rose-200 border-t-[#800020] animate-spin mb-4" />
        <h2 className="text-base font-bold text-charcoal-800">
          جارٍ تحميل مؤشرات لوحة التحكم...
        </h2>
        <p className="text-xs text-charcoal-500 mt-1">
          يتم استدعاء بيانات المتجر والطلبات لحظياً
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-rose-100">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-serif text-charcoal-900">
              لوحة التحكم والإشراف العام
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#800020]/10 text-[#800020] border border-[#800020]/20">
              بيانات حية
            </span>
          </div>
          <p className="text-xs text-charcoal-500 mt-1">
            نظرة شاملة ومحدثة لحظياً على مبيعات، مخزون، وطلبات متجر روبي ستور.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-rose-200 text-charcoal-700 hover:text-[#800020] hover:bg-rose-50 text-xs font-bold shadow-2xs transition-all disabled:opacity-50"
            title="تحديث البيانات"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#800020]' : ''}`}
            />
            <span>تحديث</span>
          </button>

          <Link
            href="/admin/products/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#800020] hover:bg-[#5B0017] text-white text-xs font-bold shadow-xs transition-all"
          >
            <PlusCircle className="w-4 h-4 text-[#D4AF37]" />
            <span>إضافة منتج</span>
          </Link>

          <Link
            href="/admin/products"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-rose-200 text-charcoal-700 hover:text-[#800020] hover:bg-rose-50 text-xs font-bold shadow-2xs transition-all"
          >
            <Package className="w-3.5 h-3.5 text-[#800020]" />
            <span>إدارة المنتجات</span>
          </Link>

          <Link
            href="/admin/settings"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-rose-200 text-charcoal-700 hover:text-[#800020] hover:bg-rose-50 text-xs font-bold shadow-2xs transition-all"
          >
            <Settings className="w-3.5 h-3.5 text-charcoal-600" />
            <span>إعدادات المتجر</span>
          </Link>

          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FAF7F2] border border-[#D4AF37]/50 text-[#800020] hover:bg-rose-100/50 text-xs font-bold shadow-2xs transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>عرض المتجر</span>
          </Link>
        </div>
      </div>

      {/* Error Alert if any */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 5 Live KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Total Products */}
        <div className="bg-white rounded-3xl p-5 border border-rose-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-[#800020] flex items-center justify-center shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-charcoal-500">
              إجمالي المنتجات
            </div>
            <div className="text-2xl font-bold font-serif text-charcoal-900 mt-0.5">
              {totalProducts}
            </div>
            <div className="text-[10px] text-charcoal-400 font-medium mt-0.5">
              منتج نشط بالكتالوج
            </div>
          </div>
        </div>

        {/* KPI 2: Active Categories */}
        <div className="bg-white rounded-3xl p-5 border border-rose-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-charcoal-500">
              الأقسام والفئات
            </div>
            <div className="text-2xl font-bold font-serif text-charcoal-900 mt-0.5">
              {activeCategories}
            </div>
            <div className="text-[10px] text-charcoal-400 font-medium mt-0.5">
              فئة رئيسية وفرعية
            </div>
          </div>
        </div>

        {/* KPI 3: Total Orders */}
        <div className="bg-white rounded-3xl p-5 border border-rose-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-charcoal-500">
              إجمالي الطلبات
            </div>
            <div className="text-2xl font-bold font-serif text-charcoal-900 mt-0.5">
              {totalOrders}
            </div>
            <div className="text-[10px] text-charcoal-400 font-medium mt-0.5">
              طلب مسجل بالنظام
            </div>
          </div>
        </div>

        {/* KPI 4: Estimated Revenue */}
        <div className="bg-white rounded-3xl p-5 border border-rose-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-charcoal-500">
              المبيعات التقديرية
            </div>
            <div className="text-xl font-bold font-serif text-charcoal-900 mt-0.5">
              {formatEGP(totalRevenue)}
            </div>
            <div className="text-[10px] text-charcoal-400 font-medium mt-0.5">
              إجمالي قيمة الطلبات
            </div>
          </div>
        </div>

        {/* KPI 5: Out of Stock Variants */}
        <div className="bg-white rounded-3xl p-5 border border-rose-100 shadow-xs flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
              outOfStockVariantsCount > 0
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}
          >
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-charcoal-500">
              متغيرات نفدت
            </div>
            <div
              className={`text-2xl font-bold font-serif mt-0.5 ${
                outOfStockVariantsCount > 0 ? 'text-red-700' : 'text-charcoal-900'
              }`}
            >
              {outOfStockVariantsCount}
            </div>
            <div className="text-[10px] text-charcoal-400 font-medium mt-0.5">
              {outOfStockVariantsCount > 0 ? 'تحتاج لإعادة تموين' : 'المخزون متوفر بالكامل'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Orders & Low Stock Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Orders Activity Table (2 columns wide on lg) */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-rose-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-rose-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold font-serif text-charcoal-900">
                سجل الطلبات الأخير
              </h2>
              <p className="text-xs text-charcoal-500 mt-0.5">
                آخر العمليات والطلبات المستلمة عبر المتجر وواتساب
              </p>
            </div>
            <span className="text-xs font-bold text-charcoal-500 bg-rose-50 px-3 py-1 rounded-full border border-rose-100">
              {totalOrders > orders.length
                ? `عرض أحدث ${orders.length} من أصل ${totalOrders} طلب`
                : `${orders.length} طلب`}
            </span>
          </div>

          {orders.length === 0 ? (
            <div className="p-12 text-center flex-1 flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-300 flex items-center justify-center mb-3">
                <ShoppingCart className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-bold text-charcoal-700">
                لا توجد طلبات مسجلة بعد
              </h3>
              <p className="text-xs text-charcoal-400 mt-1 max-w-sm">
                عندما يكمل العملاء طلبات الشراء عبر المتجر أو الواتساب، ستظهر تفاصيلها وحالاتها هنا مباشرة.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-rose-50/50 text-charcoal-600 font-bold border-b border-rose-100">
                  <tr>
                    <th className="p-4">كود الطلب</th>
                    <th className="p-4">العميل</th>
                    <th className="p-4">المحافظة</th>
                    <th className="p-4">العناصر</th>
                    <th className="p-4">الإجمالي</th>
                    <th className="p-4">الحالة</th>
                    <th className="p-4 text-center">محادثة واتساب</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rose-50">
                  {orders.slice(0, 8).map((order) => {
                    const itemsCount =
                      order.items?.reduce((sum, i) => sum + i.quantity, 0) || 0;
                    return (
                      <tr
                        key={order.orderId}
                        className="hover:bg-rose-50/30 transition-colors"
                      >
                        <td className="p-4 font-mono font-bold text-[#800020]">
                          {order.orderId}
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-charcoal-900">
                            {order.customer?.fullName}
                          </div>
                          <div className="text-[11px] text-charcoal-500 font-mono mt-0.5">
                            {order.customer?.phone}
                          </div>
                        </td>
                        <td className="p-4 text-charcoal-700">
                          {order.customer?.governorate || '—'}
                        </td>
                        <td className="p-4 text-charcoal-700">
                          <span className="font-bold">{itemsCount}</span> قطع
                        </td>
                        <td className="p-4 font-bold text-charcoal-900 font-serif">
                          {formatEGP(order.pricing?.grandTotal || 0)}
                        </td>
                        <td className="p-4">{getStatusBadge(order.status)}</td>
                        <td className="p-4 text-center">
                          {order.whatsappDirectUrl ? (
                            <a
                              href={order.whatsappDirectUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200 transition-colors"
                              title="فتح المحادثة عبر واتساب"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                              <span>واتساب</span>
                            </a>
                          ) : (
                            <span className="text-charcoal-400 text-[11px]">
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Low-Stock Inventory Radar (1 column wide on lg) */}
        <div className="bg-white rounded-3xl border border-rose-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-rose-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold font-serif text-charcoal-900">
                رادار انخفاض المخزون
              </h2>
              <p className="text-xs text-charcoal-500 mt-0.5">
                المتغيرات ذات المخزون 2 أو أقل
              </p>
            </div>
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full border ${
                lowStockItems.length > 0
                  ? 'bg-red-50 text-red-800 border-red-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}
            >
              {lowStockItems.length} تنبيه
            </span>
          </div>

          <div className="p-4 flex-1 overflow-y-auto max-h-[460px] space-y-3">
            {lowStockItems.length === 0 ? (
              <div className="py-12 text-center text-charcoal-400">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                <h4 className="text-xs font-bold text-charcoal-700">
                  المخزون ممتاز ومستقر
                </h4>
                <p className="text-[11px] text-charcoal-400 mt-1">
                  لا توجد متغيرات منخفضة المخزون حالياً في الكتالوج.
                </p>
              </div>
            ) : (
              lowStockItems.slice(0, 10).map((item, index) => {
                const isZero = (item.variant.stockQuantity ?? 0) === 0;
                return (
                  <div
                    key={`${item.productId}-${item.variant.id || index}`}
                    className="p-3.5 rounded-2xl bg-rose-50/30 border border-rose-100 flex items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-charcoal-900 truncate">
                        {item.productTitleAr}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-charcoal-500">
                        {item.variant.sku && (
                          <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-rose-200 text-[10px]">
                            {item.variant.sku}
                          </span>
                        )}
                        <span>{item.variant.color?.nameAr || 'لون موحد'}</span>
                        <span>•</span>
                        <span>{item.variant.size}</span>
                      </div>
                    </div>

                    <div className="shrink-0 text-left">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          isZero
                            ? 'bg-red-100 text-red-800 border-red-200'
                            : 'bg-amber-100 text-amber-900 border-amber-300'
                        }`}
                      >
                        {isZero
                          ? 'نفد بالكامل (0)'
                          : `متبقي ${item.variant.stockQuantity} فقط`}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-4 bg-rose-50/50 border-t border-rose-100 text-center">
            <Link
              href="/admin/products"
              className="text-xs font-bold text-[#800020] hover:text-[#5B0017] transition-colors"
            >
              عرض وتعديل مخزون الكتالوج بالكامل ←
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
