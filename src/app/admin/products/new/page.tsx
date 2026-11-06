'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, PlusCircle, AlertCircle } from 'lucide-react';
import ProductForm from '@/components/admin/ProductForm';
import { getStoreService } from '@/services/storeService';
import { Category } from '@/types/store';

export default function AdminNewProductPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setError(null);
        const service = getStoreService();
        const cats = await service.getCategories();
        setCategories(cats || []);
      } catch (err: any) {
        setError(err?.message || 'تعذر تحميل أقسام المتجر');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center" dir="rtl">
        <div className="w-12 h-12 rounded-full border-4 border-rose-200 border-t-[#800020] animate-spin mb-4" />
        <h2 className="text-base font-bold text-charcoal-800">
          جارٍ تهيئة نموذج إضافة المنتج...
        </h2>
        <p className="text-xs text-charcoal-500 mt-1">يتم استدعاء أقسام وفئات المتجر</p>
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
            <span className="text-[#800020]">إضافة منتج جديد</span>
          </div>
          <h1 className="text-2xl font-bold font-serif text-charcoal-900 flex items-center gap-2">
            <PlusCircle className="w-6 h-6 text-[#800020]" />
            <span>إضافة منتج جديد إلى الكتالوج</span>
          </h1>
          <p className="text-xs text-charcoal-500 mt-0.5">
            أدخلي تفاصيل المنتج، الأسعار، الصور، ومصفوفة المتغيرات بدقة للإدراج الفوري في المتجر.
          </p>
        </div>

        <Link
          href="/admin/products"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-rose-200 text-charcoal-700 hover:text-[#800020] hover:bg-rose-50 text-xs font-bold shadow-2xs transition-all self-start sm:self-auto"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة للمنتجات</span>
        </Link>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Unified Product Form in create mode */}
      <ProductForm mode="create" categories={categories} />
    </div>
  );
}
