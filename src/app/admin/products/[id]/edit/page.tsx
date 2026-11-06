'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Edit3, AlertCircle, Package } from 'lucide-react';
import ProductForm from '@/components/admin/ProductForm';
import { getStoreService } from '@/services/storeService';
import { Product, Category } from '@/types/store';

export default function AdminEditProductPage({ params }: { params: { id: string } }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setError(null);
        const service = getStoreService();
        const [cats, prod] = await Promise.all([
          service.getCategories(),
          // Try lookup by ID first, then fallback to lookup by slug
          service.getProductById(params.id).then((p) => {
            if (p) return p;
            return service.getProductBySlug(params.id);
          }),
        ]);

        setCategories(cats || []);
        if (!prod) {
          setError(`تعذر العثور على المنتج المطلوب (${params.id}). قد يكون تم حذفه.`);
        } else {
          setProduct(prod);
        }
      } catch (err: any) {
        setError(err?.message || 'حدث خطأ أثناء تحميل بيانات المنتج للتعديل');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center" dir="rtl">
        <div className="w-12 h-12 rounded-full border-4 border-rose-200 border-t-[#800020] animate-spin mb-4" />
        <h2 className="text-base font-bold text-charcoal-800">
          جارٍ تحميل بيانات المنتج...
        </h2>
        <p className="text-xs text-charcoal-500 mt-1">يتم استرجاع المتغيرات والتسعير من الكتالوج</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4" dir="rtl">
        <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold font-serif text-charcoal-900">
          المنتج غير موجود
        </h2>
        <p className="text-xs text-charcoal-500">
          {error || 'لم نتمكن من الوصول لبيانات المنتج المطلوب.'}
        </p>
        <div className="pt-2">
          <Link
            href="/admin/products"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#800020] text-white text-xs font-bold hover:bg-[#5B0017] transition-all shadow-xs"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة لقائمة المنتجات</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in" dir="rtl">
      {/* Header & Breadcrumb */}
      <div className="pb-4 border-b border-rose-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-charcoal-400 mb-1">
            <Link href="/admin" className="hover:text-[#800020] transition-colors">
              لوحة التحكم
            </Link>
            <span>/</span>
            <Link href="/admin/products" className="hover:text-[#800020] transition-colors">
              المنتجات
            </Link>
            <span>/</span>
            <span className="text-[#800020]">تعديل: {product.titleAr}</span>
          </div>
          <h1 className="text-2xl font-bold font-serif text-charcoal-900 flex items-center gap-2">
            <Edit3 className="w-6 h-6 text-[#800020]" />
            <span>تعديل بيانات المنتج: {product.titleAr}</span>
          </h1>
          <p className="text-xs text-charcoal-500 mt-0.5">
            تحديث الأسعار، الأوصاف، الصور، وتعديل كميات المخزون لمصفوفة المتغيرات.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            href={`/products/${product.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FAF7F2] border border-[#D4AF37]/40 text-[#800020] hover:bg-rose-100/50 text-xs font-bold shadow-2xs transition-all"
          >
            <span>معاينة في المتجر</span>
          </Link>

          <Link
            href="/admin/products"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-rose-200 text-charcoal-700 hover:text-[#800020] hover:bg-rose-50 text-xs font-bold shadow-2xs transition-all"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة للمنتجات</span>
          </Link>
        </div>
      </div>

      {/* Unified Product Form in edit mode */}
      <ProductForm mode="edit" initialData={product} categories={categories} />
    </div>
  );
}
