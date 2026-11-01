'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Filter, ArrowUpDown } from 'lucide-react';
import { getStoreService } from '../../services/storeService';
import {
  Product,
  CategoryTreeItem,
  ProductFilterParams,
  PaginatedResponse,
} from '../../types/store';
import { ProductCard } from '../../components/catalog/ProductCard';
import { FilterSidebar } from '../../components/catalog/FilterSidebar';
import { ProductCardSkeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorCard } from '../../components/common/ErrorCard';

function CatalogContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<Omit<PaginatedResponse<Product>, 'data'>>({
    total: 0,
    page: 1,
    pageSize: 12,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [categoryTree, setCategoryTree] = useState<CategoryTreeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Extract query values directly from URL searchParams
  const categoryParam = searchParams.get('category') || undefined;
  const searchParam = searchParams.get('q') || undefined;
  const minPriceParam = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined;
  const maxPriceParam = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined;
  const inStockParam = searchParams.get('inStock') === 'true';
  const sortByParam = (searchParams.get('sortBy') as any) || 'featured';
  const pageParam = searchParams.get('page') ? Number(searchParams.get('page')) : 1;

  // Single Source of Truth for filters derived directly from URL
  const currentFilters = React.useMemo<ProductFilterParams>(() => ({
    categorySlug: categoryParam,
    searchQuery: searchParam,
    minPrice: minPriceParam,
    maxPrice: maxPriceParam,
    inStockOnly: inStockParam,
    sortBy: sortByParam,
    page: pageParam,
    pageSize: 12,
  }), [categoryParam, searchParam, minPriceParam, maxPriceParam, inStockParam, sortByParam, pageParam]);

  const service = getStoreService();

  // Load category tree once
  useEffect(() => {
    service.getCategoryTree().then(setCategoryTree).catch(console.error);
  }, [service]);

  // Fetch products whenever URL filters change or on manual retry
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await service.getProducts(currentFilters);
      setProducts(res.data);
      setPagination({
        total: res.total,
        page: res.page,
        pageSize: res.pageSize,
        totalPages: res.totalPages,
        hasNextPage: res.hasNextPage,
        hasPrevPage: res.hasPrevPage,
      });
    } catch (err: any) {
      setError(err.message || 'تعذر تحميل المنتجات');
    } finally {
      setIsLoading(false);
    }
  }, [service, currentFilters]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Push new params to URL to maintain full navigation history
  const handleFilterChange = (newParams: Partial<ProductFilterParams>) => {
    const updated = {
      ...currentFilters,
      ...newParams,
      page: newParams.page !== undefined ? newParams.page : 1,
    };

    const query = new URLSearchParams();
    if (updated.categorySlug) query.set('category', updated.categorySlug);
    if (updated.searchQuery) query.set('q', updated.searchQuery);
    if (updated.minPrice !== undefined) query.set('minPrice', String(updated.minPrice));
    if (updated.maxPrice !== undefined) query.set('maxPrice', String(updated.maxPrice));
    if (updated.inStockOnly) query.set('inStock', 'true');
    if (updated.sortBy && updated.sortBy !== 'featured') query.set('sortBy', updated.sortBy);
    if (updated.page && updated.page > 1) query.set('page', String(updated.page));

    const queryString = query.toString();
    router.push(`/catalog${queryString ? `?${queryString}` : ''}`);
  };

  const handleResetFilters = () => {
    router.push('/catalog');
  };

  const QUICK_CATEGORIES = [
    { slug: undefined, name: 'جميع الموديلات' },
    { slug: 'abayas-and-kaftans', name: 'عبايات وقفاطين' },
    { slug: 'modest-dresses', name: 'فساتين محتشمة' },
    { slug: 'womens-fashion', name: 'ملابس حريمي' },
    { slug: 'bedding-and-sheets', name: 'أطقم سرير وملايات' },
    { slug: 'home-textiles', name: 'مفروشات ومنسوجات' },
  ];

  const isQuickActive = (itemSlug?: string) => {
    if (!itemSlug) return !categoryParam;
    if (!categoryParam) return false;
    if (categoryParam === itemSlug) return true;
    if (itemSlug.includes('abaya') && categoryParam.includes('abaya')) return true;
    if (itemSlug.includes('dress') && categoryParam.includes('dress')) return true;
    if (itemSlug.includes('bed') && categoryParam.includes('bed')) return true;
    return false;
  };

  // Find active category display name in Arabic
  const findCategoryNameAr = (slug?: string): string => {
    if (!slug) return 'كتالوج المنتجات الكامل';
    for (const root of categoryTree) {
      if (root.slug === slug || (slug.includes('fashion') && root.slug.includes('fashion')) || (slug.includes('textile') && root.slug.includes('textile'))) return root.nameAr;
      if (root.children) {
        for (const sub of root.children) {
          if (sub.slug === slug || (slug.includes('abaya') && sub.slug.includes('abaya')) || (slug.includes('dress') && sub.slug.includes('dress')) || (slug.includes('bed') && sub.slug.includes('bed'))) {
            return `${root.nameAr} - ${sub.nameAr}`;
          }
        }
      }
    }
    if (slug.includes('abaya')) return 'عبايات وقفاطين فاخرة';
    if (slug.includes('dress')) return 'فساتين محتشمة';
    if (slug.includes('bed')) return 'أطقم سرير وملايات قطن مصري';
    return slug;
  };

  const activeFiltersCount = [
    Boolean(categoryParam),
    Boolean(searchParam),
    minPriceParam !== undefined,
    maxPriceParam !== undefined,
    inStockParam,
  ].filter(Boolean).length;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Top Header & Breadcrumbs */}
      <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-rose-100 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-charcoal-900">
            {findCategoryNameAr(categoryParam)}
          </h1>
          <p className="text-xs text-charcoal-500 mt-1">
            عرض {pagination.total} منتج متوفر للطلب الفوري عبر الواتساب
          </p>
        </div>

        {/* Action Controls (Sort & Mobile Filter Trigger) */}
        <div className="flex items-center gap-3">
          {/* Mobile Filter Button */}
          <button
            type="button"
            onClick={() => setMobileFilterOpen(true)}
            className="lg:hidden flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-rose-200 text-xs font-bold text-charcoal-800 shadow-2xs"
          >
            <Filter className="w-4 h-4 text-rose-600" />
            <span>الفلاتر</span>
            {activeFiltersCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] flex items-center justify-center font-bold">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 bg-white border border-rose-200 rounded-xl px-3 py-1.5 text-xs text-charcoal-800 shadow-2xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-rose-500" />
            <select
              value={sortByParam}
              onChange={(e) => handleFilterChange({ sortBy: e.target.value as any })}
              className="bg-transparent border-none text-xs font-semibold text-charcoal-800 focus:outline-hidden cursor-pointer"
            >
              <option value="featured">المميزة أولاً</option>
              <option value="newest">أحدث المنتجات</option>
              <option value="price_asc">السعر: من الأقل للأعلى</option>
              <option value="price_desc">السعر: من الأعلى للأقل</option>
              <option value="rating">الأعلى تقييماً</option>
            </select>
          </div>
        </div>
      </div>

      {/* Quick Category Horizontal Navigation Carousel (1-Tap Experience) */}
      <div className="mb-6 flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
        {QUICK_CATEGORIES.map((cat, idx) => {
          const active = isQuickActive(cat.slug);
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleFilterChange({ categorySlug: cat.slug, page: 1 })}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-2xs shrink-0 flex items-center gap-1.5 ${
                active
                  ? 'bg-rose-700 text-white shadow-rose-200'
                  : 'bg-white text-charcoal-700 border border-rose-200/80 hover:bg-rose-50'
              }`}
            >
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* Main Layout: Sidebar + Grid */}
      <div className="flex gap-8 items-start">
        {/* Filter Sidebar (Desktop + Mobile Drawer) */}
        <FilterSidebar
          categoryTree={categoryTree}
          filterParams={currentFilters}
          onFilterChange={handleFilterChange}
          onReset={handleResetFilters}
          isOpenMobile={mobileFilterOpen}
          onCloseMobile={() => setMobileFilterOpen(false)}
        />

        {/* Catalog Main View */}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {Array.from({ length: 8 }).map((_, idx) => (
                <ProductCardSkeleton key={idx} />
              ))}
            </div>
          ) : error ? (
            <ErrorCard title="خطأ أثناء جلب الكتالوج" message={error} onRetry={fetchProducts} />
          ) : products.length === 0 ? (
            <EmptyState onReset={handleResetFilters} />
          ) : (
            <>
              {/* Product Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Pagination Controls */}
              {pagination.totalPages > 1 && (
                <div className="mt-12 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    disabled={!pagination.hasPrevPage}
                    onClick={() => handleFilterChange({ page: pagination.page - 1 })}
                    className="px-4 py-2 rounded-xl border border-rose-200 text-xs font-semibold bg-white hover:bg-rose-50 disabled:opacity-40 disabled:hover:bg-white"
                  >
                    السابق
                  </button>

                  {Array.from({ length: pagination.totalPages }).map((_, idx) => {
                    const pageNum = idx + 1;
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => handleFilterChange({ page: pageNum })}
                        className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${
                          pageNum === pagination.page
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-white border border-rose-200 text-charcoal-700 hover:bg-rose-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    disabled={!pagination.hasNextPage}
                    onClick={() => handleFilterChange({ page: pagination.page + 1 })}
                    className="px-4 py-2 rounded-xl border border-rose-200 text-xs font-semibold bg-white hover:bg-rose-50 disabled:opacity-40 disabled:hover:bg-white"
                  >
                    التالي
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CatalogPage() {
  return (
    <Suspense fallback={<div className="container mx-auto p-12 text-center text-rose-700">جارٍ تحميل الكتالوج...</div>}>
      <CatalogContent />
    </Suspense>
  );
}
