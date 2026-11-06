'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Sparkles,
  PlusCircle,
  Edit2,
  Trash2,
  ExternalLink,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Folder,
  ShoppingBag,
  ArrowRight,
  X,
  Layers,
} from 'lucide-react';
import { getStoreService } from '@/services/storeService';
import { PromotionalBanner, Category, Product } from '@/types/store';

// Luxury curated preset images for Egyptian fashion & home textiles
const PRESET_BANNER_IMAGES = [
  {
    name: 'أزياء وعبايات راقية',
    url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1600&q=80',
  },
  {
    name: 'مفروشات وقطن مصري',
    url: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1600&q=80',
  },
  {
    name: 'شتاء وخامات صوفية دافئة',
    url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=80',
  },
  {
    name: 'فساتين سهرة ومناسبات',
    url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1600&q=80',
  },
  {
    name: 'عطور ومنتجات عناية منزلية',
    url: 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=1600&q=80',
  },
];

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<PromotionalBanner[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<PromotionalBanner | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [titleAr, setTitleAr] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [subtitleAr, setSubtitleAr] = useState('');
  const [subtitleEn, setSubtitleEn] = useState('');
  const [badgeTextAr, setBadgeTextAr] = useState('');
  const [badgeTextEn, setBadgeTextEn] = useState('');
  const [buttonTextAr, setButtonTextAr] = useState('تسوقي الآن');
  const [buttonTextEn, setButtonTextEn] = useState('Shop Now');
  const [imageUrl, setImageUrl] = useState('');
  const [destinationType, setDestinationType] = useState<'category' | 'product' | 'custom'>('category');
  const [selectedCategorySlug, setSelectedCategorySlug] = useState('');
  const [selectedProductSlug, setSelectedProductSlug] = useState('');
  const [customTargetUrl, setCustomTargetUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [displayOrder, setDisplayOrder] = useState(1);

  // Load banners, categories, and products
  const loadData = useCallback(async () => {
    try {
      setError(null);
      const service = getStoreService();
      const [allBanners, cats, prodsRes] = await Promise.all([
        service.getAllBanners ? service.getAllBanners() : service.getPromotionalBanners(),
        service.getCategories(),
        service.getProducts({ pageSize: 100 }),
      ]);
      setBanners(allBanners);
      setCategories(cats);
      setProducts(prodsRes.data);
    } catch (err: any) {
      setError(err?.message || 'فشل في تحميل بيانات البانرات');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showToast = (message: string) => {
    setSuccessToast(message);
    setTimeout(() => {
      setSuccessToast(null);
    }, 4000);
  };

  const handleOpenAddModal = () => {
    setEditingBanner(null);
    setTitleAr('');
    setTitleEn('');
    setSubtitleAr('');
    setSubtitleEn('');
    setBadgeTextAr('عرض خاص');
    setBadgeTextEn('Special Offer');
    setButtonTextAr('تسوقي الآن');
    setButtonTextEn('Shop Now');
    setImageUrl(PRESET_BANNER_IMAGES[0].url);
    setDestinationType('category');
    setSelectedCategorySlug(categories[0]?.slug || '');
    setSelectedProductSlug(products[0]?.slug || '');
    setCustomTargetUrl('');
    setIsActive(true);
    setDisplayOrder(banners.length + 1);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (banner: PromotionalBanner) => {
    setEditingBanner(banner);
    setTitleAr(banner.titleAr);
    setTitleEn(banner.titleEn);
    setSubtitleAr(banner.subtitleAr || '');
    setSubtitleEn(banner.subtitleEn || '');
    setBadgeTextAr(banner.badgeTextAr || banner.tagAr || '');
    setBadgeTextEn(banner.badgeTextEn || '');
    setButtonTextAr(banner.buttonTextAr || banner.ctaTextAr || 'تسوقي الآن');
    setButtonTextEn(banner.buttonTextEn || 'Shop Now');
    setImageUrl(banner.imageUrl);
    setIsActive(banner.isActive);
    setDisplayOrder(banner.displayOrder || 1);

    if (banner.targetProductSlug || banner.targetProductId) {
      setDestinationType('product');
      setSelectedProductSlug(banner.targetProductSlug || banner.targetProductId || '');
      setSelectedCategorySlug('');
      setCustomTargetUrl('');
    } else if (banner.targetCategorySlug) {
      setDestinationType('category');
      setSelectedCategorySlug(banner.targetCategorySlug);
      setSelectedProductSlug('');
      setCustomTargetUrl('');
    } else if (banner.targetUrl) {
      setDestinationType('custom');
      setCustomTargetUrl(banner.targetUrl);
      setSelectedCategorySlug('');
      setSelectedProductSlug('');
    } else {
      setDestinationType('category');
      setSelectedCategorySlug(categories[0]?.slug || '');
    }

    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBanner(null);
  };

  const handleSubmitBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleAr.trim() || !imageUrl.trim()) {
      setError('يرجى كتابة عنوان العرض ورابط الصورة على الأقل');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const service = getStoreService();

      let targetCategorySlug: string | undefined = undefined;
      let targetProductSlug: string | undefined = undefined;
      let targetUrl: string | undefined = undefined;

      if (destinationType === 'category') {
        targetCategorySlug = selectedCategorySlug || categories[0]?.slug;
      } else if (destinationType === 'product') {
        targetProductSlug = selectedProductSlug || products[0]?.slug;
      } else {
        targetUrl = customTargetUrl.trim() || '/catalog';
      }

      const payload = {
        titleAr: titleAr.trim(),
        titleEn: titleEn.trim() || titleAr.trim(),
        subtitleAr: subtitleAr.trim(),
        subtitleEn: subtitleEn.trim(),
        badgeTextAr: badgeTextAr.trim() || undefined,
        badgeTextEn: badgeTextEn.trim() || undefined,
        buttonTextAr: buttonTextAr.trim() || 'تسوقي الآن',
        buttonTextEn: buttonTextEn.trim() || 'Shop Now',
        imageUrl: imageUrl.trim(),
        targetCategorySlug,
        targetProductSlug,
        targetUrl,
        isActive,
        displayOrder: Number(displayOrder) || 1,
      };

      if (editingBanner) {
        await service.updateBanner(editingBanner.id, payload);
        showToast('تم تحديث بيانات البانر وحفظه بنجاح ✨');
      } else {
        await service.createBanner(payload);
        showToast('تم إضافة البانر الترويجي الجديد بنجاح في الصفحة الرئيسية 🎉');
      }

      handleCloseModal();
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'فشل في حفظ البانر');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (banner: PromotionalBanner) => {
    try {
      const service = getStoreService();
      const updated = await service.updateBanner(banner.id, { isActive: !banner.isActive });
      setBanners((prev) => prev.map((b) => (b.id === banner.id ? updated : b)));
      showToast(updated.isActive ? 'تم تفعيل ظهور البانر في المتجر ✅' : 'تم تعطيل ظهور البانر مؤقتاً ⏸️');
    } catch (err: any) {
      setError(err?.message || 'فشل في تحديث حالة البانر');
    }
  };

  const handleDeleteBanner = async (bannerId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا البانر الترويجي نهائياً؟')) return;

    try {
      const service = getStoreService();
      await service.deleteBanner(bannerId);
      setBanners((prev) => prev.filter((b) => b.id !== bannerId));
      showToast('تم حذف البانر بنجاح من النظام 🗑️');
    } catch (err: any) {
      setError(err?.message || 'فشل في حذف البانر');
    }
  };

  const getDestinationLabel = (banner: PromotionalBanner) => {
    if (banner.targetProductSlug || banner.targetProductId) {
      const targetSlug = banner.targetProductSlug || banner.targetProductId;
      const matchedProd = products.find((p) => p.slug === targetSlug || p.id === targetSlug);
      return (
        <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg text-xs font-bold border border-emerald-200">
          <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
          <span>منتج: {matchedProd ? matchedProd.titleAr : targetSlug}</span>
        </span>
      );
    }
    if (banner.targetCategorySlug) {
      const matchedCat = categories.find((c) => c.slug === banner.targetCategorySlug);
      return (
        <span className="inline-flex items-center gap-1 text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-lg text-xs font-bold border border-indigo-200">
          <Folder className="w-3.5 h-3.5 text-indigo-600" />
          <span>قسم: {matchedCat ? matchedCat.nameAr : banner.targetCategorySlug}</span>
        </span>
      );
    }
    if (banner.targetUrl) {
      return (
        <span className="inline-flex items-center gap-1 text-charcoal-700 bg-charcoal-50 px-2.5 py-1 rounded-lg text-xs font-bold border border-charcoal-200">
          <ExternalLink className="w-3.5 h-3.5 text-charcoal-500" />
          <span className="truncate max-w-[150px]">{banner.targetUrl}</span>
        </span>
      );
    }
    return (
      <span className="text-xs text-charcoal-400">كاتالوج المتجر العام</span>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12" dir="rtl">
      {/* Toast Alert */}
      {successToast && (
        <div className="fixed top-6 start-1/2 -translate-x-1/2 z-50 bg-[#800020] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-[#D4AF37]/40 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-[#D4AF37]" />
          <span className="text-xs font-bold">{successToast}</span>
        </div>
      )}

      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-rose-100">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-serif text-charcoal-900">
              إدارة بانرات وعروض الصفحة الرئيسية
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#800020]/10 text-[#800020] border border-[#800020]/20">
              Hero Banners
            </span>
          </div>
          <p className="text-xs text-charcoal-500 mt-1">
            تحكم كامل في البانرات الدوارة (Carousel) المعروضة في واجهة المتجر للمتسوقين، مع تحديد الوجهة لكل إعلان (منتج أو قسم).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setIsRefreshing(true);
              loadData();
            }}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white border border-rose-200 text-xs font-bold text-charcoal-700 hover:bg-rose-50 transition-all shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#800020]' : ''}`} />
            <span>تحديث</span>
          </button>

          <Link
            href="/"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white border border-rose-200 text-xs font-bold text-charcoal-700 hover:bg-rose-50 transition-all shadow-2xs"
          >
            <Eye className="w-3.5 h-3.5 text-rose-700" />
            <span>معاينة المتجر</span>
          </Link>

          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#800020] hover:bg-[#600018] text-white text-xs font-bold shadow-md shadow-[#800020]/20 transition-all hover:scale-102 active:scale-98"
          >
            <PlusCircle className="w-4 h-4" />
            <span>إضافة بانر جديد</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between text-red-800 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-3xl p-5 border border-rose-100 space-y-4 animate-pulse">
              <div className="w-full h-48 bg-rose-100 rounded-2xl" />
              <div className="h-6 w-3/4 bg-rose-100 rounded-lg" />
              <div className="h-4 w-1/2 bg-rose-50 rounded-lg" />
            </div>
          ))}
        </div>
      ) : banners.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-rose-100 space-y-4 shadow-2xs">
          <div className="w-16 h-16 rounded-full bg-rose-50 text-[#800020] flex items-center justify-center mx-auto">
            <Sparkles className="w-8 h-8" />
          </div>
          <h2 className="text-base font-bold text-charcoal-900">لا توجد بانرات ترويجية حالياً</h2>
          <p className="text-xs text-charcoal-500 max-w-md mx-auto">
            أضيفي أول بانر ترويجي للواجهة الرئيسية لجذب الزبائن وتشجيعهم على تصفح المجموعات الجديدة.
          </p>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#800020] text-white text-xs font-bold shadow-md hover:bg-[#600018] transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>إضافة أول بانر</span>
          </button>
        </div>
      ) : (
        /* Banners Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {banners.map((banner) => (
            <div
              key={banner.id}
              className={`bg-white rounded-3xl border overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between ${
                banner.isActive ? 'border-rose-100' : 'border-charcoal-200 opacity-75 bg-charcoal-50/30'
              }`}
            >
              <div>
                {/* Visual Image Preview with badges */}
                <div className="relative h-48 w-full bg-charcoal-900">
                  <Image
                    src={banner.imageUrl}
                    alt={banner.titleAr}
                    fill
                    className="object-cover opacity-85"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950/80 via-transparent to-transparent" />

                  {/* Badge & Order */}
                  <div className="absolute top-3 start-3 flex items-center gap-2">
                    {(banner.badgeTextAr || banner.tagAr) && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#800020]/90 text-white text-[11px] font-bold shadow-xs">
                        <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                        <span>{banner.badgeTextAr || banner.tagAr}</span>
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-full bg-white/90 text-charcoal-800 text-[10px] font-black shadow-xs">
                      ترتيب #{banner.displayOrder}
                    </span>
                  </div>

                  {/* Active Status Badge */}
                  <div className="absolute top-3 end-3">
                    {banner.isActive ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/90 text-white text-[10px] font-bold backdrop-blur-xs">
                        <Eye className="w-3 h-3" />
                        <span>معروض بالمتجر</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-charcoal-700/90 text-white text-[10px] font-bold backdrop-blur-xs">
                        <EyeOff className="w-3 h-3" />
                        <span>معطل مؤقتاً</span>
                      </span>
                    )}
                  </div>

                  {/* Bottom title overlay */}
                  <div className="absolute bottom-3 start-4 end-4 text-white">
                    <h3 className="font-serif font-black text-lg text-white drop-shadow-md leading-tight line-clamp-1">
                      {banner.titleAr}
                    </h3>
                  </div>
                </div>

                {/* Banner Details Body */}
                <div className="p-5 space-y-3">
                  {banner.subtitleAr && (
                    <p className="text-xs text-charcoal-600 line-clamp-2 leading-relaxed">
                      {banner.subtitleAr}
                    </p>
                  )}

                  <div className="pt-2 border-t border-rose-50 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-charcoal-400">وجهة النقر:</span>
                      {getDestinationLabel(banner)}
                    </div>

                    <div className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
                      زر: {banner.buttonTextAr || banner.ctaTextAr || 'تسوقي الآن'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="p-4 bg-rose-50/30 border-t border-rose-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleToggleStatus(banner)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    banner.isActive
                      ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  {banner.isActive ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>إخفاء من المتجر</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>تفعيل بالمتجر</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(banner)}
                    className="p-2 rounded-xl bg-white hover:bg-rose-100 text-charcoal-700 border border-rose-200 transition-all"
                    title="تعديل البانر"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteBanner(banner.id)}
                    className="p-2 rounded-xl bg-white hover:bg-red-50 text-red-600 border border-red-200 transition-all"
                    title="حذف نهائي"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Banner Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-charcoal-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-rose-100 space-y-6 animate-scale-in">
            <div className="flex items-center justify-between pb-4 border-b border-rose-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#800020]/10 text-[#800020] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-[#800020]" />
                </div>
                <div>
                  <h2 className="text-base font-bold font-serif text-charcoal-900">
                    {editingBanner ? 'تعديل البانر الترويجي' : 'إضافة بانر رئيسي جديد'}
                  </h2>
                  <p className="text-[11px] text-charcoal-500">
                    حدد تفاصيل العرض والصورة ورابط الوجهة (القسم أو المنتج).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-1.5 rounded-full hover:bg-rose-100 text-charcoal-400 hover:text-charcoal-700 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitBanner} className="space-y-4">
              {/* Headlines */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-charcoal-700 mb-1">
                    العنوان الرئيسي (بالعربية) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={titleAr}
                    onChange={(e) => setTitleAr(e.target.value)}
                    placeholder="مثال: تألقي بأرقى العبايات والفساتين"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-rose-200 text-xs text-charcoal-800 focus:outline-none focus:ring-2 focus:ring-[#800020]/20 focus:border-[#800020]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-charcoal-700 mb-1">
                    العنوان بالإنجليزية (Title EN)
                  </label>
                  <input
                    type="text"
                    value={titleEn}
                    onChange={(e) => setTitleEn(e.target.value)}
                    placeholder="e.g. Discover Luxury Modest Fashion"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-rose-200 text-xs text-charcoal-800 focus:outline-none focus:ring-2 focus:ring-[#800020]/20 focus:border-[#800020]"
                  />
                </div>
              </div>

              {/* Subtitles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-charcoal-700 mb-1">
                    الوصف الترويجي (بالعربية)
                  </label>
                  <textarea
                    rows={2}
                    value={subtitleAr}
                    onChange={(e) => setSubtitleAr(e.target.value)}
                    placeholder="خصومات حصرية تبدأ من 25% على تشكيلة الموسم الجديدة بالكامل..."
                    className="w-full px-3.5 py-2 rounded-xl border border-rose-200 text-xs text-charcoal-800 focus:outline-none focus:ring-2 focus:ring-[#800020]/20 focus:border-[#800020]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-charcoal-700 mb-1">
                    الوصف بالإنجليزية (Subtitle EN)
                  </label>
                  <textarea
                    rows={2}
                    value={subtitleEn}
                    onChange={(e) => setSubtitleEn(e.target.value)}
                    placeholder="Exclusive seasonal discounts up to 25%..."
                    className="w-full px-3.5 py-2 rounded-xl border border-rose-200 text-xs text-charcoal-800 focus:outline-none focus:ring-2 focus:ring-[#800020]/20 focus:border-[#800020]"
                  />
                </div>
              </div>

              {/* Badge & Button Text */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-charcoal-700 mb-1">
                    شارة العرض (Badge Text)
                  </label>
                  <input
                    type="text"
                    value={badgeTextAr}
                    onChange={(e) => setBadgeTextAr(e.target.value)}
                    placeholder="مثال: عرض الموسم، خصم 30%"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-rose-200 text-xs text-charcoal-800 focus:outline-none focus:ring-2 focus:ring-[#800020]/20 focus:border-[#800020]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-charcoal-700 mb-1">
                    نص زر الإجراء (CTA Button)
                  </label>
                  <input
                    type="text"
                    value={buttonTextAr}
                    onChange={(e) => setButtonTextAr(e.target.value)}
                    placeholder="مثال: تسوقي العبايات الآن"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-rose-200 text-xs text-charcoal-800 focus:outline-none focus:ring-2 focus:ring-[#800020]/20 focus:border-[#800020]"
                  />
                </div>
              </div>

              {/* Image URL & Presets */}
              <div>
                <label className="block text-xs font-bold text-charcoal-700 mb-1">
                  رابط صورة البانر (Image URL) <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  required
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-rose-200 text-xs text-charcoal-800 focus:outline-none focus:ring-2 focus:ring-[#800020]/20 focus:border-[#800020]"
                />

                {/* Quick Presets Picker */}
                <div className="mt-2">
                  <div className="text-[11px] font-bold text-charcoal-400 mb-1.5">
                    أو اختاري صورة فاخرة من النماذج المقترحة:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_BANNER_IMAGES.map((preset) => (
                      <button
                        key={preset.url}
                        type="button"
                        onClick={() => setImageUrl(preset.url)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                          imageUrl === preset.url
                            ? 'bg-[#800020] text-white border-[#800020]'
                            : 'bg-rose-50/50 text-charcoal-700 border-rose-100 hover:bg-rose-100'
                        }`}
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Destination Selector (Category vs Product vs Custom) */}
              <div className="p-4 rounded-2xl bg-rose-50/40 border border-rose-100 space-y-3">
                <label className="block text-xs font-bold text-charcoal-800">
                  وجهة النقر على البانر (Click Destination):
                </label>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDestinationType('category')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                      destinationType === 'category'
                        ? 'bg-[#800020] text-white border-[#800020] shadow-xs'
                        : 'bg-white text-charcoal-700 border-rose-200 hover:bg-rose-50'
                    }`}
                  >
                    قسم / كاتجوري
                  </button>

                  <button
                    type="button"
                    onClick={() => setDestinationType('product')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                      destinationType === 'product'
                        ? 'bg-[#800020] text-white border-[#800020] shadow-xs'
                        : 'bg-white text-charcoal-700 border-rose-200 hover:bg-rose-50'
                    }`}
                  >
                    منتج محدد
                  </button>

                  <button
                    type="button"
                    onClick={() => setDestinationType('custom')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                      destinationType === 'custom'
                        ? 'bg-[#800020] text-white border-[#800020] shadow-xs'
                        : 'bg-white text-charcoal-700 border-rose-200 hover:bg-rose-50'
                    }`}
                  >
                    رابط مخصص
                  </button>
                </div>

                {destinationType === 'category' && (
                  <div>
                    <select
                      value={selectedCategorySlug}
                      onChange={(e) => setSelectedCategorySlug(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-rose-200 text-xs font-bold text-charcoal-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#800020]/20"
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.slug}>
                          {cat.nameAr} ({cat.slug})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {destinationType === 'product' && (
                  <div>
                    <select
                      value={selectedProductSlug}
                      onChange={(e) => setSelectedProductSlug(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-rose-200 text-xs font-bold text-charcoal-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#800020]/20"
                    >
                      {products.map((prod) => (
                        <option key={prod.id} value={prod.slug}>
                          {prod.titleAr} - {prod.discountPrice || prod.basePrice} ج.م
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {destinationType === 'custom' && (
                  <div>
                    <input
                      type="text"
                      value={customTargetUrl}
                      onChange={(e) => setCustomTargetUrl(e.target.value)}
                      placeholder="/catalog أو /offers أو https://..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-rose-200 text-xs text-charcoal-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#800020]/20"
                    />
                  </div>
                )}
              </div>

              {/* Order & Active Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-xs font-bold text-charcoal-700 mb-1">
                    ترتيب العرض (Display Order)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-rose-200 text-xs text-charcoal-800 focus:outline-none focus:ring-2 focus:ring-[#800020]/20"
                  />
                </div>

                <div className="pt-5 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="banner-is-active"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-[#800020] focus:ring-[#800020] accent-[#800020]"
                  />
                  <label htmlFor="banner-is-active" className="text-xs font-bold text-charcoal-800 cursor-pointer">
                    تفعيل وظهور البانر فوراً بالصفحة الرئيسية
                  </label>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="pt-4 border-t border-rose-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-5 py-2.5 rounded-xl border border-rose-200 text-xs font-bold text-charcoal-600 hover:bg-rose-50 transition-all"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-[#800020] hover:bg-[#600018] text-white text-xs font-bold shadow-md shadow-[#800020]/20 transition-all disabled:opacity-60"
                >
                  {isSubmitting ? 'جارٍ الحفظ...' : editingBanner ? 'حفظ التعديلات' : 'إضافة البانر الآن'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
