'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Sparkles, ShieldCheck, Truck, MessageCircle } from 'lucide-react';
import { getStoreService } from '../services/storeService';
import { Category, Product, PromotionalBanner } from '../types/store';
import { HeroBanner } from '../components/catalog/HeroBanner';
import { ProductCard } from '../components/catalog/ProductCard';
import { ProductCardSkeleton } from '../components/common/Skeleton';
import { ErrorCard } from '../components/common/ErrorCard';

export default function HomePage() {
  const [banners, setBanners] = useState<PromotionalBanner[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [displayProducts, setDisplayProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const service = getStoreService();

  // Load initial banners and categories
  useEffect(() => {
    async function loadMeta() {
      try {
        const [bannersData, categoriesData] = await Promise.all([
          service.getPromotionalBanners(),
          service.getCategories(),
        ]);
        setBanners(bannersData);
        setCategories(categoriesData);
      } catch (err: any) {
        setError(err.message || 'حدث خطأ أثناء تحميل البيانات');
      } finally {
        setIsLoadingInitial(false);
      }
    }
    loadMeta();
  }, [service]);

  // Load products based on active category tab
  useEffect(() => {
    async function loadCategoryProducts() {
      setIsLoadingProducts(true);
      try {
        const params = activeTab === 'all' ? { pageSize: 12 } : { categorySlug: activeTab, pageSize: 12 };
        const res = await service.getProducts(params);
        setDisplayProducts(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingProducts(false);
      }
    }
    loadCategoryProducts();
  }, [activeTab, service]);

  const primaryCategories = categories.filter((c) => c.level === 0 || !c.parentId);

  return (
    <div className="container mx-auto px-4 py-4 space-y-10">
      {/* 1. Hero Promotional Banner Carousel */}
      {isLoadingInitial ? (
        <div className="w-full h-64 sm:h-80 md:h-96 rounded-3xl bg-rose-100/60 animate-pulse my-2" />
      ) : error ? (
        <ErrorCard title="خطأ في تحميل العروض" message={error} onRetry={() => window.location.reload()} />
      ) : (
        <HeroBanner banners={banners} />
      )}

      {/* 2. Value Props Bar (Clean & Compact) */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-1 text-charcoal-800">
        <div className="bg-white rounded-2xl p-3 border border-rose-100 flex items-center gap-2.5 shadow-2xs">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <MessageCircle className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold">طلب بالواتساب</h4>
            <p className="text-[10px] text-charcoal-400">بنقرة واحدة بدون بطاقات</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3 border border-rose-100 flex items-center gap-2.5 shadow-2xs">
          <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold">شحن لـ 27 محافظة</h4>
            <p className="text-[10px] text-charcoal-400">توصيل لباب بيتك</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3 border border-rose-100 flex items-center gap-2.5 shadow-2xs">
          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold">معاينة عند الاستلام</h4>
            <p className="text-[10px] text-charcoal-400">فحص قبل الدفع كاش</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3 border border-rose-100 flex items-center gap-2.5 shadow-2xs">
          <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold">خامات مضمونة</h4>
            <p className="text-[10px] text-charcoal-400">أقطان وحرير فاخر</p>
          </div>
        </div>
      </section>

      {/* 3. Direct Shopping Section: Category Tabs & Live Product Grid */}
      <section className="space-y-6 pt-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-rose-100 pb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold font-serif text-charcoal-900">
              تسوقي مباشرة من الكتالوج
            </h2>
            <p className="text-xs text-charcoal-500 mt-1">
              اختاري الموديل والمقاس واطلبي مباشرة عبر الواتساب
            </p>
          </div>

          <Link
            href="/catalog"
            className="text-xs font-bold text-rose-700 hover:text-rose-900 flex items-center gap-1 shrink-0"
          >
            <span>فتح الكتالوج الكامل والفلترة</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Live Category Filter Tabs on Homepage */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all shadow-2xs shrink-0 ${
              activeTab === 'all'
                ? 'bg-rose-700 text-white shadow-rose-200'
                : 'bg-white text-charcoal-700 border border-rose-200 hover:bg-rose-50'
            }`}
          >
            جميع الموديلات
          </button>

          {primaryCategories.map((cat) => {
            const isActive = activeTab === cat.slug;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveTab(cat.slug)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all shadow-2xs shrink-0 flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-rose-700 text-white shadow-rose-200'
                    : 'bg-white text-charcoal-700 border border-rose-200 hover:bg-rose-50'
                }`}
              >
                <span>{cat.nameAr}</span>
                {cat.productCount != null && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      isActive ? 'bg-rose-900/60 text-white' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {cat.productCount}
                  </span>
                )}
              </button>
            );
          })}

          {/* Direct Subcategory shortcuts */}
          <button
            type="button"
            onClick={() => setActiveTab('abayas-and-kaftans')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all shadow-2xs shrink-0 ${
              activeTab === 'abayas-and-kaftans'
                ? 'bg-rose-600 text-white'
                : 'bg-white text-charcoal-600 border border-rose-100 hover:bg-rose-50'
            }`}
          >
            عبايات وقفاطين
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bedding-and-sheets')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all shadow-2xs shrink-0 ${
              activeTab === 'bedding-and-sheets'
                ? 'bg-rose-600 text-white'
                : 'bg-white text-charcoal-600 border border-rose-100 hover:bg-rose-50'
            }`}
          >
            ملايات وأطقم سرير
          </button>
        </div>

        {/* Live Product Grid */}
        {isLoadingProducts ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 8 }).map((_, idx) => (
              <ProductCardSkeleton key={idx} />
            ))}
          </div>
        ) : displayProducts.length === 0 ? (
          <div className="py-12 text-center text-xs text-charcoal-500 bg-white rounded-2xl border border-rose-100">
            لا توجد منتجات متوفرة في هذا القسم حالياً.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {displayProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* 4. Bottom Quick Link to Catalog */}
      <section className="text-center pt-4 pb-6">
        <Link
          href="/catalog"
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-rose-700 hover:bg-rose-800 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all"
        >
          <span>تصفحي كل الكتالوج والفلترة الذكية</span>
          <ArrowLeft className="w-4 h-4" />
        </Link>
      </section>
    </div>
  );
}
