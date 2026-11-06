'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Package,
  PlusCircle,
  Search,
  Filter,
  Edit3,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Star,
  Layers,
  ArrowUpDown,
  X,
} from 'lucide-react';
import { getStoreService } from '@/services/storeService';
import { Product, Category } from '@/types/store';
import { formatEGP } from '@/utils/pricing';

export default function AdminProductsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'out_of_stock'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc' | 'stock_asc'>('newest');

  // Deletion Confirmation Modal State
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadCatalogData = useCallback(async () => {
    try {
      setError(null);
      const service = getStoreService();
      const [prodsRes, cats] = await Promise.all([
        service.getProducts({ pageSize: 1000 }),
        service.getCategories(),
      ]);

      setProducts(prodsRes.data || []);
      setCategories(cats || []);
    } catch (err: any) {
      setError(err?.message || 'تعذر تحميل كتالوج المنتجات');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCatalogData();
  }, [loadCatalogData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadCatalogData();
  };

  // Real-time filtering across Arabic title, English title, and variant SKUs
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return products.filter((product) => {
      // 1. Text Search across Arabic title, English title, slug, and SKUs
      if (q) {
        const matchesTitleAr = product.titleAr?.toLowerCase().includes(q);
        const matchesTitleEn = product.titleEn?.toLowerCase().includes(q);
        const matchesSlug = product.slug?.toLowerCase().includes(q);
        const matchesSku = product.variants?.some((v) =>
          v.sku?.toLowerCase().includes(q)
        );
        const matchesTags = product.tags?.some((t) => t.toLowerCase().includes(q));

        if (!matchesTitleAr && !matchesTitleEn && !matchesSlug && !matchesSku && !matchesTags) {
          return false;
        }
      }

      // 2. Category Filter
      if (selectedCategory !== 'all') {
        const matchesCatId = product.categoryIds?.includes(selectedCategory);
        const matchesCatSlug = product.primaryCategorySlug === selectedCategory;
        if (!matchesCatId && !matchesCatSlug) {
          return false;
        }
      }

      // 3. Stock Status Filter
      if (stockFilter === 'in_stock') {
        if (!product.hasStock && (product.totalStock ?? 0) <= 0) return false;
      } else if (stockFilter === 'out_of_stock') {
        if (product.hasStock || (product.totalStock ?? 0) > 0) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
      if (sortBy === 'price_asc') {
        return (a.discountPrice || a.basePrice) - (b.discountPrice || b.basePrice);
      }
      if (sortBy === 'price_desc') {
        return (b.discountPrice || b.basePrice) - (a.discountPrice || a.basePrice);
      }
      if (sortBy === 'stock_asc') {
        return (a.totalStock ?? 0) - (b.totalStock ?? 0);
      }
      return 0;
    });
  }, [products, searchQuery, selectedCategory, stockFilter, sortBy]);

  // Execute Real Deletion with Confirmation
  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      const service = getStoreService();
      const success = await service.deleteProduct(productToDelete.id);

      if (success) {
        // Optimistically update list without full page reload
        setProducts((prev) => prev.filter((p) => p.id !== productToDelete.id));
        setFeedback({
          type: 'success',
          message: `تم حذف المنتج "${productToDelete.titleAr}" وجميع متغيراته من الكتالوج وقاعدة البيانات بنجاح.`,
        });
      } else {
        setFeedback({
          type: 'error',
          message: 'تعذر حذف المنتج، يرجى المحاولة لاحقاً.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'حدث خطأ أثناء محاولة حذف المنتج',
      });
    } finally {
      setIsDeleting(false);
      setProductToDelete(null);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  // Aggregate stats
  const totalInStock = products.filter((p) => p.hasStock || (p.totalStock ?? 0) > 0).length;
  const totalOutOfStock = products.length - totalInStock;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center" dir="rtl">
        <div className="w-12 h-12 rounded-full border-4 border-rose-200 border-t-[#800020] animate-spin mb-4" />
        <h2 className="text-base font-bold text-charcoal-800">
          جارٍ تحميل كتالوج المنتجات...
        </h2>
        <p className="text-xs text-charcoal-500 mt-1">
          يتم استدعاء بيانات المنتجات والمتغيرات والمخزون
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      {/* Top Header & Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-rose-100">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-serif text-charcoal-900">
              إدارة كتالوج المنتجات
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#800020]/10 text-[#800020] border border-[#800020]/20">
              {products.length} منتج مسجل
            </span>
          </div>
          <p className="text-xs text-charcoal-500 mt-1">
            إدارة الأسعار، المتغيرات، صور المعرض، وتوافر المخزون اللحظي للمتجر.
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
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#800020] hover:bg-[#5B0017] text-white text-xs font-bold shadow-xs transition-all"
          >
            <PlusCircle className="w-4 h-4 text-[#D4AF37]" />
            <span>إضافة منتج جديد</span>
          </Link>
        </div>
      </div>

      {/* Feedback Alerts */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="p-1 text-charcoal-400 hover:text-charcoal-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-rose-100 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-charcoal-500">إجمالي المنتجات</div>
            <div className="text-xl font-bold font-serif text-charcoal-900 mt-0.5">
              {products.length}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-[#800020] flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-rose-100 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-charcoal-500">متوفرة بالمخزون</div>
            <div className="text-xl font-bold font-serif text-emerald-700 mt-0.5">
              {totalInStock}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-rose-100 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-charcoal-500">نافدة من المخزون</div>
            <div className="text-xl font-bold font-serif text-red-700 mt-0.5">
              {totalOutOfStock}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-700 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters & Search Control Bar */}
      <div className="bg-white rounded-3xl p-5 border border-rose-100 shadow-2xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Input (5 cols) */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-charcoal-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="البحث بالاسم العربي، الإنجليزي، أو كود SKU..."
              className="w-full pl-4 pr-10 py-2.5 rounded-2xl border border-rose-200 focus:outline-none focus:border-[#800020] text-xs font-bold text-charcoal-900 placeholder:text-charcoal-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-charcoal-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Dropdown (3 cols) */}
          <div className="md:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-rose-200 focus:outline-none focus:border-[#800020] text-xs font-bold text-charcoal-800 bg-white"
            >
              <option value="all">جميع الأقسام والفئات</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nameAr} ({cat.slug})
                </option>
              ))}
            </select>
          </div>

          {/* Stock Filter (2 cols) */}
          <div className="md:col-span-2">
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as any)}
              className="w-full px-3 py-2.5 rounded-2xl border border-rose-200 focus:outline-none focus:border-[#800020] text-xs font-bold text-charcoal-800 bg-white"
            >
              <option value="all">كل حالات المخزون</option>
              <option value="in_stock">متوفر فقط</option>
              <option value="out_of_stock">نفد فقط</option>
            </select>
          </div>

          {/* Sort By (2 cols) */}
          <div className="md:col-span-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2.5 rounded-2xl border border-rose-200 focus:outline-none focus:border-[#800020] text-xs font-bold text-charcoal-800 bg-white"
            >
              <option value="newest">الأحدث أولاً</option>
              <option value="price_asc">السعر: من الأقل</option>
              <option value="price_desc">السعر: من الأعلى</option>
              <option value="stock_asc">المخزون: الأقل أولاً</option>
            </select>
          </div>
        </div>

        {/* Results summary & active filter indicators */}
        <div className="flex items-center justify-between text-xs text-charcoal-500 pt-1">
          <div>
            تم العثور على{' '}
            <span className="font-bold text-[#800020]">{filteredProducts.length}</span> من أصل{' '}
            {products.length} منتج
          </div>

          {(searchQuery || selectedCategory !== 'all' || stockFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setStockFilter('all');
              }}
              className="text-xs font-bold text-[#800020] hover:underline"
            >
              إعادة تعيين الفلاتر
            </button>
          )}
        </div>
      </div>

      {/* Dynamic Products Data Table */}
      <div className="bg-white rounded-3xl border border-rose-100 shadow-sm overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-300 flex items-center justify-center mb-3">
              <Package className="w-8 h-8" />
            </div>
            <h3 className="text-sm font-bold text-charcoal-700">
              لا توجد منتجات تطابق معايير البحث
            </h3>
            <p className="text-xs text-charcoal-400 mt-1 max-w-sm">
              جربي تعديل كلمات البحث، أو تغيير الفئة أو حالة المخزون المختارة.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-rose-50/50 text-charcoal-600 font-bold border-b border-rose-100">
                <tr>
                  <th className="p-4">الصورة</th>
                  <th className="p-4">بيانات المنتج</th>
                  <th className="p-4">القسم الرئيسي</th>
                  <th className="p-4">السعر (ج.م)</th>
                  <th className="p-4">المتغيرات والمخزون</th>
                  <th className="p-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-50">
                {filteredProducts.map((product) => {
                  const thumbnail = product.images?.[0];
                  const hasDiscount =
                    product.discountPrice !== undefined &&
                    product.discountPrice < product.basePrice;
                  const totalStock = product.totalStock ?? 0;
                  const isOutOfStock = totalStock === 0 || !product.hasStock;

                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-rose-50/30 transition-colors group"
                    >
                      {/* Image Thumbnail */}
                      <td className="p-4">
                        <div className="w-14 h-14 rounded-2xl overflow-hidden border border-rose-100 bg-rose-50/50 relative shrink-0">
                          {thumbnail ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={thumbnail}
                              alt={product.titleAr}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-rose-300">
                              <Package className="w-6 h-6" />
                            </div>
                          )}
                          {product.isFeatured && (
                            <span
                              className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-[#D4AF37] text-white flex items-center justify-center shadow-xs"
                              title="منتج مميز"
                            >
                              <Star className="w-2 h-2 fill-current" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Details (Arabic & English Titles, Slug) */}
                      <td className="p-4 max-w-xs">
                        <div className="font-bold text-charcoal-900 text-sm">
                          {product.titleAr}
                        </div>
                        <div className="text-[11px] text-charcoal-500 font-medium mt-0.5" dir="ltr">
                          {product.titleEn}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span
                            className="font-mono text-[10px] text-charcoal-500 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200"
                            dir="ltr"
                          >
                            /{product.slug}
                          </span>
                          {product.isNewArrival && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                              وصل حديثاً
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-white border border-rose-200 text-charcoal-700">
                          <Layers className="w-3 h-3 text-[#800020]" />
                          <span>
                            {product.categoryNameAr || product.primaryCategorySlug || 'عام'}
                          </span>
                        </span>
                      </td>

                      {/* Pricing */}
                      <td className="p-4">
                        {hasDiscount ? (
                          <div>
                            <div className="font-bold text-[#800020] text-sm font-serif">
                              {formatEGP(product.discountPrice!)}
                            </div>
                            <div className="text-[11px] text-charcoal-400 line-through">
                              {formatEGP(product.basePrice)}
                            </div>
                          </div>
                        ) : (
                          <div className="font-bold text-charcoal-900 text-sm font-serif">
                            {formatEGP(product.basePrice)}
                          </div>
                        )}
                      </td>

                      {/* Variants & Stock Status */}
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="text-[11px] text-charcoal-500 font-bold">
                            {product.variants?.length || 0} متغيرات
                          </div>
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              isOutOfStock
                                ? 'bg-red-50 text-red-800 border-red-200'
                                : totalStock <= 5
                                ? 'bg-amber-50 text-amber-900 border-amber-300'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}
                          >
                            {isOutOfStock
                              ? 'نفد من المخزون (0)'
                              : totalStock <= 5
                              ? `متبقي ${totalStock} فقط`
                              : `متوفر بالمخزون (${totalStock})`}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            href={`/products/${product.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-xl text-charcoal-500 hover:text-[#800020] hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all"
                            title="معاينة في المتجر"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>

                          <Link
                            href={`/admin/products/${product.id}/edit`}
                            className="p-2 rounded-xl text-[#800020] hover:bg-[#800020]/10 border border-transparent hover:border-[#800020]/20 transition-all"
                            title="تعديل بيانات المنتج"
                          >
                            <Edit3 className="w-4 h-4" />
                          </Link>

                          <button
                            type="button"
                            onClick={() => setProductToDelete(product)}
                            className="p-2 rounded-xl text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all"
                            title="حذف المنتج نهائياً"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-100 space-y-4 animate-scale-up"
            dir="rtl"
          >
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-base font-bold font-serif text-charcoal-900">
                تأكيد حذف المنتج نهائياً
              </h3>
              <p className="text-xs text-charcoal-600 leading-relaxed">
                هل أنت متأكد من رغبتك في حذف المنتج{' '}
                <span className="font-bold text-[#800020]">"{productToDelete.titleAr}"</span>؟
                سيتم إزالة هذا المنتج وجميع متغيراته المرتبطة ({productToDelete.variants?.length || 0} متغير)
                من المتجر وقاعدة البيانات فوراً.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteProduct}
                className="flex-1 py-2.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isDeleting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>{isDeleting ? 'جارٍ الحذف...' : 'حذف نهائي'}</span>
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setProductToDelete(null)}
                className="flex-1 py-2.5 rounded-2xl bg-white border border-rose-200 hover:bg-rose-50 text-charcoal-700 text-xs font-bold transition-colors"
              >
                إلغاء التراجع
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
