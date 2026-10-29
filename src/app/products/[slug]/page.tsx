'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShoppingBag,
  MessageCircle,
  ShieldCheck,
  Truck,
  RotateCcw,
  Check,
  Plus,
  Minus,
  Sparkles,
  ChevronLeft,
} from 'lucide-react';
import { getStoreService } from '../../../services/storeService';
import { Product, ProductVariant, StoreSettings } from '../../../types/store';
import { useCartStore } from '../../../store/useCartStore';
import { ImageGallery } from '../../../components/product/ImageGallery';
import { VariantSelector } from '../../../components/product/VariantSelector';
import { ProductCard } from '../../../components/catalog/ProductCard';
import { Skeleton } from '../../../components/common/Skeleton';
import { ErrorCard } from '../../../components/common/ErrorCard';
import { buildWhatsAppOrderUrl } from '../../../utils/order';

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdded, setIsAdded] = useState(false);

  const addItemToCart = useCartStore((state) => state.addItem);
  const service = getStoreService();

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const [prod, storeSettings] = await Promise.all([
          service.getProductBySlug(slug),
          service.getSettings(),
        ]);

        if (!prod) {
          setError('عذراً، هذا المنتج غير موجود أو تم إيقاف عرضه مؤقتاً.');
          return;
        }

        setProduct(prod);
        setSettings(storeSettings);

        // Default variant: first in-stock variant or first variant
        const defaultVar =
          prod.variants.find((v) => v.inStock && v.stockQuantity > 0) || prod.variants[0];
        setSelectedVariant(defaultVar || null);

        // Related products
        const related = await service.getRelatedProducts(prod.id, 4);
        setRelatedProducts(related);
      } catch (err: any) {
        setError(err.message || 'حدث خطأ أثناء تحميل بيانات المنتج');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [slug, service]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <Skeleton className="w-full aspect-3/4 rounded-3xl" />
          <div className="space-y-4">
            <Skeleton className="w-1/3 h-4" />
            <Skeleton className="w-3/4 h-8" />
            <Skeleton className="w-1/2 h-6" />
            <Skeleton className="w-full h-32" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product || !selectedVariant) {
    return (
      <div className="container mx-auto px-4 py-16">
        <ErrorCard
          title="تعذر عرض المنتج"
          message={error || 'المنتج غير موجود'}
          onRetry={() => window.location.reload()}
        />
        <div className="text-center mt-6">
          <Link
            href="/catalog"
            className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-rose-600 text-white text-xs font-bold"
          >
            <span>العودة لكتالوج المنتجات</span>
            <ChevronLeft className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  // Calculate pricing
  const baseEffectivePrice = product.discountPrice ?? product.basePrice;
  const currentUnitPrice = baseEffectivePrice + (selectedVariant.priceAdjustment || 0);
  const originalUnitPrice = product.basePrice + (selectedVariant.priceAdjustment || 0);
  const hasDiscount = currentUnitPrice < originalUnitPrice;

  const handleAddToCart = () => {
    if (!selectedVariant.inStock || selectedVariant.stockQuantity <= 0) return;
    addItemToCart(product, selectedVariant, quantity);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2500);
  };

  const handleDirectWhatsAppOrder = () => {
    const whatsappNumber = settings?.whatsappNumber || '201000000000';
    const message =
      `🛍️ *طلب فوري من روبي ستور*\n\n` +
      `• *المنتج:* ${product.titleAr}\n` +
      `• *اللون:* ${selectedVariant.color.nameAr}\n` +
      `• *المقاس:* ${selectedVariant.size}\n` +
      `• *كود الموديل (SKU):* ${selectedVariant.sku}\n` +
      `• *الكمية:* ${quantity}\n` +
      `• *السعر الإجمالي:* ${(currentUnitPrice * quantity).toLocaleString('ar-EG')} ج.م\n\n` +
      `أود تأكيد طلب هذا الموديل معكم، يرجى تزويدي بخيارات التوصيل المتاحة. شكراً لكم!`;

    const url = buildWhatsAppOrderUrl(whatsappNumber, message);
    window.open(url, '_blank');
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-16">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-charcoal-500">
        <Link href="/" className="hover:text-rose-700">
          الرئيسية
        </Link>
        <span>/</span>
        <Link href="/catalog" className="hover:text-rose-700">
          الكتالوج
        </Link>
        <span>/</span>
        <span className="text-rose-800 font-semibold truncate max-w-xs">{product.titleAr}</span>
      </nav>

      {/* Main Product Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 xl:gap-14 items-start">
        {/* Gallery */}
        <ImageGallery images={product.images} title={product.titleAr} />

        {/* Product Details & Actions */}
        <div className="space-y-6">
          <div>
            <span className="text-xs font-bold text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
              {product.categoryNameAr}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold font-serif text-charcoal-900 mt-2.5 leading-snug">
              {product.titleAr}
            </h1>
            <p className="text-xs text-charcoal-400 font-mono mt-1">كود الموديل: {selectedVariant.sku}</p>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3 p-4 rounded-2xl bg-rose-50/50 border border-rose-100">
            <span className="text-2xl sm:text-3xl font-extrabold text-rose-950 font-serif">
              {currentUnitPrice.toLocaleString('ar-EG')} ج.م
            </span>
            {hasDiscount && (
              <span className="text-sm text-charcoal-400 line-through">
                {originalUnitPrice.toLocaleString('ar-EG')} ج.م
              </span>
            )}
            {hasDiscount && (
              <span className="text-xs font-bold text-white bg-rose-600 px-2.5 py-0.5 rounded-full shadow-2xs">
                وفرتي {(originalUnitPrice - currentUnitPrice).toLocaleString('ar-EG')} ج.م
              </span>
            )}
          </div>

          {/* Variant Selector */}
          <VariantSelector
            product={product}
            selectedVariant={selectedVariant}
            onSelectVariant={(v) => {
              setSelectedVariant(v);
              setQuantity(1);
            }}
          />

          {/* Quantity Picker & Add to Cart */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold text-charcoal-800">الكمية:</span>
              <div className="flex items-center border border-rose-200 rounded-xl bg-white shadow-2xs">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  className="p-2 text-charcoal-600 hover:text-rose-700 disabled:opacity-30"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-4 text-sm font-bold text-charcoal-900">{quantity}</span>
                <button
                  type="button"
                  onClick={() =>
                    setQuantity((q) => Math.min(selectedVariant.stockQuantity || 99, q + 1))
                  }
                  disabled={quantity >= selectedVariant.stockQuantity}
                  className="p-2 text-charcoal-600 hover:text-rose-700 disabled:opacity-30"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!selectedVariant.inStock || selectedVariant.stockQuantity <= 0}
                className={`w-full py-3.5 px-6 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all ${
                  isAdded
                    ? 'bg-emerald-600 text-white'
                    : selectedVariant.inStock
                    ? 'bg-rose-900 hover:bg-rose-800 text-white hover:shadow-lg'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isAdded ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>تمت الإضافة للسلة!</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    <span>إضافة إلى السلة</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDirectWhatsAppOrder}
                className="w-full py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
              >
                <MessageCircle className="w-4 h-4 text-white" />
                <span>طلب فوري عبر الواتساب</span>
              </button>
            </div>
          </div>

          {/* Social Guarantee Badges */}
          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-rose-100 text-center text-[11px] text-charcoal-600">
            <div className="p-2.5 rounded-xl bg-rose-50/50 flex flex-col items-center gap-1">
              <Truck className="w-4 h-4 text-rose-600" />
              <span className="font-semibold">شحن لكل مصر</span>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-50/50 flex flex-col items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold">فحص عند الاستلام</span>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-50/50 flex flex-col items-center gap-1">
              <RotateCcw className="w-4 h-4 text-amber-600" />
              <span className="font-semibold">استبدال سهل</span>
            </div>
          </div>

          {/* Description */}
          <div className="border-t border-rose-100 pt-5 space-y-3">
            <h3 className="text-sm font-bold text-charcoal-900 font-serif">تفاصيل ومواصفات الموديل</h3>
            <p className="text-xs text-charcoal-600 leading-relaxed whitespace-pre-line">
              {product.descriptionAr}
            </p>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="space-y-6 pt-10 border-t border-rose-100">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-rose-600 font-bold block mb-1">قد يعجبكِ أيضاً</span>
              <h2 className="text-xl font-bold font-serif text-charcoal-900">منتجات ذات صلة</h2>
            </div>
            <Link
              href="/catalog"
              className="text-xs font-bold text-rose-700 hover:text-rose-900 flex items-center gap-1"
            >
              <span>مشاهدة الكل</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
