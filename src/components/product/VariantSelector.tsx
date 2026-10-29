'use client';

import React from 'react';
import { Check, AlertCircle } from 'lucide-react';
import { Product, ProductVariant } from '../../types/store';

interface VariantSelectorProps {
  product: Product;
  selectedVariant: ProductVariant;
  onSelectVariant: (variant: ProductVariant) => void;
}

export const VariantSelector: React.FC<VariantSelectorProps> = ({
  product,
  selectedVariant,
  onSelectVariant,
}) => {
  // 1. Unique Colors available in product variants
  const uniqueColors = Array.from(
    new Map(product.variants.map((v) => [v.color.nameEn, v.color])).values()
  );

  // 2. Sizes available for currently selected color
  const variantsForSelectedColor = product.variants.filter(
    (v) => v.color.nameEn === selectedVariant.color.nameEn
  );

  // Handle color change: pick the first available size in the new color
  const handleColorChange = (colorNameEn: string) => {
    const colorVariants = product.variants.filter((v) => v.color.nameEn === colorNameEn);
    // Prefer an in-stock variant if possible
    const preferredVariant =
      colorVariants.find((v) => v.inStock && v.stockQuantity > 0) || colorVariants[0];
    if (preferredVariant) {
      onSelectVariant(preferredVariant);
    }
  };

  // Handle size change within current color
  const handleSizeChange = (size: string) => {
    const matched = variantsForSelectedColor.find((v) => v.size === size);
    if (matched) {
      onSelectVariant(matched);
    }
  };

  const isLowStock = selectedVariant.inStock && selectedVariant.stockQuantity <= 3;

  return (
    <div className="space-y-5">
      {/* 1. Color Selector */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-charcoal-900 flex items-center gap-1.5">
            <span>اللون:</span>
            <span className="text-rose-700 font-semibold">{selectedVariant.color.nameAr}</span>
          </label>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {uniqueColors.map((color) => {
            const isSelected = selectedVariant.color.nameEn === color.nameEn;
            const hasStockInColor = product.variants.some(
              (v) => v.color.nameEn === color.nameEn && v.inStock
            );

            return (
              <button
                key={color.nameEn}
                type="button"
                onClick={() => handleColorChange(color.nameEn)}
                className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs transition-all ${
                  isSelected
                    ? 'border-rose-600 bg-rose-50/70 text-rose-950 font-bold ring-2 ring-rose-400/40 shadow-xs'
                    : 'border-rose-200 bg-white text-charcoal-700 hover:border-rose-400'
                } ${!hasStockInColor ? 'opacity-50' : ''}`}
                aria-label={color.nameAr}
              >
                <span
                  className="w-4 h-4 rounded-full border border-gray-300 shadow-2xs shrink-0 flex items-center justify-center"
                  style={{ backgroundColor: color.hex }}
                >
                  {isSelected && <Check className="w-2.5 h-2.5 text-white drop-shadow-xs" />}
                </span>
                <span>{color.nameAr}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Size Selector */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-charcoal-900 flex items-center gap-1.5">
            <span>المقاس:</span>
            <span className="text-rose-700 font-semibold">{selectedVariant.size}</span>
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          {variantsForSelectedColor.map((variant) => {
            const isSelected = selectedVariant.id === variant.id;
            const isOutOfStock = !variant.inStock || variant.stockQuantity <= 0;

            return (
              <button
                key={variant.id}
                type="button"
                disabled={isOutOfStock}
                onClick={() => handleSizeChange(variant.size)}
                className={`min-w-12 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center relative ${
                  isSelected
                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs ring-2 ring-rose-300'
                    : isOutOfStock
                    ? 'bg-gray-100 text-gray-400 border-gray-200 line-through cursor-not-allowed opacity-60'
                    : 'bg-white text-charcoal-800 border-rose-200 hover:border-rose-500 hover:bg-rose-50'
                }`}
              >
                <span>{variant.size}</span>
                {variant.priceAdjustment > 0 && (
                  <span
                    className={`text-[9px] -mt-0.5 ${
                      isSelected ? 'text-rose-100' : 'text-rose-600'
                    }`}
                  >
                    +{variant.priceAdjustment} ج.م
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Stock Status Badge */}
      <div className="pt-1">
        {selectedVariant.inStock && selectedVariant.stockQuantity > 0 ? (
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-800">
              متوفر في المخزون
            </span>
            {isLowStock && (
              <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                متبقي {selectedVariant.stockQuantity} فقط!
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-red-600 text-xs font-bold">
            <AlertCircle className="w-4 h-4" />
            <span>هذا المقاس واللون غير متوفر حالياً بالمخزون</span>
          </div>
        )}
      </div>
    </div>
  );
};
