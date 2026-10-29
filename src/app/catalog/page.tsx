'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Filter, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
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

  // State
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

  // Parse filters from URL
  const [filterParams, setFilterParams] = useState<ProductFilterParams>({
    categorySlug: searchParams.get('category') || undefined,
    searchQuery: searchParams.get('q') || undefined,
    minPrice: searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined,
    maxPrice: searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined,
    inStockOnly: searchParams.get('inStock') === 'true',
    sortBy: (searchParams.get('sortBy') as any) || 'featured',
    page: searchParams.get('page') ? Number(searchParams.get('page')) : 1,
    pageSize: 12,
  });

  const service = getStoreService();

  // Load category tree once
  useEffect(() => {
    service.getCategoryTree().then(setCategoryTree).catch(console.error);
  }, [service]);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await service.getProducts(filterParams);
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
  }, [service, filterParams]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleFilterChange = (newParams: Partial<ProductFilterParams>) => {
    setFilterParams((prev) => ({
      ...prev,
      ...newParams,
      page: newParams.page !== undefined ? newParams.page : 1,
    }));
  };

  const handleResetFilters = () => {
    setFilterParams({
      categorySlug: undefined,
      searchQuery: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      colors: [],
      sizes: [],
      inStockOnly: false,
      sortBy: 'featured',
      page: 1,
      pageSize: 12,
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Top Header & Breadcrumbs */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-rose-100 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-charcoal-900">
            {filterParams.categorySlug
              ? `قسم: ${filterParams.categorySlug}`
              : 'كتالوج المنتجات الكامل'}
          </h1>
          <p className="text-xs text-charcoal-500 mt-1">
            عرض {pagination.total} منتج متاح للتسوق والطلب الفوري عبر الواتساب
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
          </button>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 bg-white border border-rose-200 rounded-xl px-3 py-1.5 text-xs text-charcoal-800 shadow-2xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-rose-500" />
            <select
              value={filterParams.sortBy || 'featured'}
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

      {/* Main Layout: Sidebar + Grid */}
      <div className="flex gap-8 items-start">
        {/* Filter Sidebar (Desktop + Mobile Drawer) */}
        <FilterSidebar
          categoryTree={categoryTree}
          filterParams={filterParams}
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
    <Suspense fallback={<div className="container mx-auto p-12 text-center">جارٍ التحميل...</div>}>
      <CatalogContent />
    </Suspense>
  );
}
