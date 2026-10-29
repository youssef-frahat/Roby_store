'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag, Eye } from 'lucide-react';
import { Product } from '../../types/store';

interface ProductCardProps {
  product: Product;
  onQuickView?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onQuickView }) => {
  const hasDiscount = product.discountPrice != null && product.discountPrice < product.basePrice;
  const effectivePrice = hasDiscount ? product.discountPrice! : product.basePrice;
  const discountPercent = hasDiscount
    ? Math.round(((product.basePrice - product.discountPrice!) / product.basePrice) * 100)
    : 0;

  const mainImage = product.images?.[0] || '/images/placeholder.jpg';

  return (
    <div className="group relative bg-white rounded-2xl border border-rose-100 overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col h-full">
      {/* Image Container */}
      <div className="relative w-full aspect-3/4 bg-rose-50/50 overflow-hidden">
        <Link href={`/products/${product.slug}`} className="block w-full h-full">
          <Image
            src={mainImage}
            alt={product.titleAr}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </Link>

        {/* Badges Overlay */}
        <div className="absolute top-2.5 start-2.5 flex flex-col gap-1.5 z-10">
          {hasDiscount && (
            <span className="px-2.5 py-1 rounded-full bg-rose-600 text-white text-[11px] font-bold shadow-xs">
              خصم {discountPercent}%
            </span>
          )}
          {product.isNewArrival && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-semibold shadow-xs">
              جديد
            </span>
          )}
        </div>

        {/* Stock Badge */}
        {!product.hasStock && (
          <div className="absolute inset-0 bg-charcoal-900/60 backdrop-blur-xs flex items-center justify-center z-10">
            <span className="px-3 py-1.5 rounded-full bg-charcoal-800 text-white text-xs font-bold border border-white/20">
              نفد من المخزون
            </span>
          </div>
        )}

        {/* Quick View Button */}
        <div className="absolute bottom-2.5 inset-x-2.5 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
          <Link
            href={`/products/${product.slug}`}
            className="flex-1 py-2 px-3 rounded-xl bg-white/95 backdrop-blur-xs text-charcoal-800 hover:bg-rose-600 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition-all"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>عرض التفاصيل</span>
          </Link>
        </div>
      </div>

      {/* Product Details */}
      <div className="p-3.5 flex flex-col flex-1 justify-between gap-2">
        <div>
          {/* Category */}
          <span className="text-[11px] text-rose-500 font-medium block mb-1">
            {product.categoryNameAr || product.primaryCategorySlug}
          </span>

          {/* Title */}
          <Link href={`/products/${product.slug}`}>
            <h3 className="text-xs sm:text-sm font-semibold text-charcoal-900 group-hover:text-rose-700 transition-colors line-clamp-2 leading-snug">
              {product.titleAr}
            </h3>
          </Link>
        </div>

        {/* Colors Swatches Preview */}
        {product.availableColors && product.availableColors.length > 0 && (
          <div className="flex items-center gap-1 py-1">
            {product.availableColors.slice(0, 5).map((color, idx) => (
              <span
                key={idx}
                title={color.nameAr}
                className="w-3 h-3 rounded-full border border-gray-300 shadow-2xs"
                style={{ backgroundColor: color.hex }}
              />
            ))}
            {product.availableColors.length > 5 && (
              <span className="text-[10px] text-charcoal-400 font-medium">
                +{product.availableColors.length - 5}
              </span>
            )}
          </div>
        )}

        {/* Pricing & Cart Action */}
        <div className="flex items-center justify-between pt-1 border-t border-rose-50 mt-auto">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm sm:text-base font-bold text-rose-900">
                {effectivePrice.toLocaleString('ar-EG')} ج.م
              </span>
              {hasDiscount && (
                <span className="text-[11px] text-charcoal-400 line-through">
                  {product.basePrice.toLocaleString('ar-EG')}
                </span>
              )}
            </div>
          </div>

          <Link
            href={`/products/${product.slug}`}
            className="p-2 rounded-full bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white transition-all shadow-2xs"
            aria-label="تحديد المقاس والطلب"
          >
            <ShoppingBag className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};
