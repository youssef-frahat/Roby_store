'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Sparkles, ShieldCheck, Truck, MessageCircle } from 'lucide-react';
import { getStoreService } from '../services/storeService';
import { Category, Product, PromotionalBanner } from '../types/store';
import { HeroBanner } from '../components/catalog/HeroBanner';
import { CategoryNav } from '../components/catalog/CategoryNav';
import { ProductCard } from '../components/catalog/ProductCard';
import { ProductCardSkeleton } from '../components/common/Skeleton';
import { ErrorCard } from '../components/common/ErrorCard';

export default function HomePage() {
  const [banners, setBanners] = useState<PromotionalBanner[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const service = getStoreService();

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [bannersData, categoriesData, featured, arrivals] = await Promise.all([
        service.getPromotionalBanners(),
        service.getCategories(),
        service.getFeaturedProducts(8),
        service.getNewArrivals(8),
      ]);
      setBanners(bannersData);
      setCategories(categoriesData);
      setFeaturedProducts(featured);
      setNewArrivals(arrivals);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحميل محتويات الصفحة الرئيسية');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="container mx-auto px-4 py-6 space-y-12">
      {/* 1. Hero Promotional Banner Carousel */}
      {isLoading ? (
        <div className="w-full h-72 sm:h-96 rounded-3xl bg-rose-100/60 animate-pulse my-4" />
      ) : error ? (
        <ErrorCard title="خطأ في تحميل العروض الترويجية" message={error} onRetry={loadData} />
      ) : (
        <HeroBanner banners={banners} />
      )}

      {/* 2. Value Props / Social Commerce Features */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
        <div className="bg-white rounded-2xl p-4 border border-rose-100/80 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-charcoal-900">طلب فوري بالواتساب</h4>
            <p className="text-[11px] text-charcoal-500">بدون بطاقات بنكية معقدة</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-rose-100/80 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-charcoal-900">شحن لـ 27 محافظة</h4>
            <p className="text-[11px] text-charcoal-500">توصيل سريع لباب بيتك</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-rose-100/80 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-charcoal-900">معاينة قبل الاستلام</h4>
            <p className="text-[11px] text-charcoal-500">حق الفحص والدفع كاش</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-rose-100/80 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-charcoal-900">خامات فاخرة ومضمونة</h4>
            <p className="text-[11px] text-charcoal-500">أقطان طبيعية وحرير راقٍ</p>
          </div>
        </div>
      </section>

      {/* 3. Category Quick Navigator */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold font-serif text-charcoal-900">
              تسوقي حسب القسم
            </h2>
            <p className="text-xs text-charcoal-500 mt-0.5">
              اختاري من بين أرقى تصاميم الأزياء الحريمية والمفروشات المنزلية
            </p>
          </div>
          <Link
            href="/catalog"
            className="text-xs font-bold text-rose-700 hover:text-rose-900 flex items-center gap-1"
          >
            <span>عرض الكتالوج</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </Link>
        </div>

        <CategoryNav
          categories={categories}
          onSelectCategory={(slug) => {
            if (slug) {
              window.location.href = `/catalog?category=${slug}`;
            } else {
              window.location.href = '/catalog';
            }
          }}
        />
      </section>

      {/* 4. Featured Products (المنتجات المميزة) */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-rose-100 pb-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs text-rose-600 font-bold mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>مختارات روبي الحصرية</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-serif text-charcoal-900">
              المنتجات الأكثر طلباً ومميزة
            </h2>
          </div>
          <Link
            href="/catalog?sortBy=featured"
            className="text-xs font-bold text-rose-700 hover:text-rose-900 flex items-center gap-1"
          >
            <span>مشاهدة الكل</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 4 }).map((_, idx) => (
              <ProductCardSkeleton key={idx} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* 5. New Arrivals (وصل حديثاً) */}
      <section className="space-y-6 pt-4">
        <div className="flex items-center justify-between border-b border-rose-100 pb-3">
          <div>
            <span className="text-xs text-rose-600 font-bold block mb-1">كولكشن جديد</span>
            <h2 className="text-xl sm:text-2xl font-bold font-serif text-charcoal-900">
              وصل حديثاً إلى روبي ستور
            </h2>
          </div>
          <Link
            href="/catalog?sortBy=newest"
            className="text-xs font-bold text-rose-700 hover:text-rose-900 flex items-center gap-1"
          >
            <span>مشاهدة الكل</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 4 }).map((_, idx) => (
              <ProductCardSkeleton key={idx} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {newArrivals.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* 6. Social Commerce Banner CTA */}
      <section className="bg-gradient-to-r from-rose-900 via-rose-800 to-rose-950 rounded-3xl p-8 sm:p-12 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 my-8">
        <div className="space-y-2 text-center md:text-start max-w-lg">
          <span className="text-xs text-rose-200 font-bold uppercase tracking-wider">
            تسوقي براحة تامة من المنزل
          </span>
          <h3 className="text-2xl sm:text-3xl font-bold font-serif">
            اختاري منتجاتك وسنرسل طلبك مباشرة للواتساب
          </h3>
          <p className="text-xs sm:text-sm text-rose-100/90 leading-relaxed">
            استمتعي بتجربة تسوق اجتماعية سهلة وسريعة مع إمكانية مراجعة المقاسات والألوان مع خدمة العملاء مباشرة.
          </p>
        </div>

        <Link
          href="/catalog"
          className="px-8 py-3.5 rounded-full bg-white text-rose-950 font-bold text-sm shadow-lg hover:bg-rose-50 hover:scale-105 active:scale-95 transition-all shrink-0"
        >
          ابدأي التسوق الآن
        </Link>
      </section>
    </div>
  );
}
