'use client';

import React from 'react';
import { Filter, X, RotateCcw, Check } from 'lucide-react';
import { CategoryTreeItem, ProductFilterParams, VariantColor } from '../../types/store';

interface FilterSidebarProps {
  categoryTree: CategoryTreeItem[];
  filterParams: ProductFilterParams;
  onFilterChange: (newParams: Partial<ProductFilterParams>) => void;
  onReset: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

const AVAILABLE_COLORS: VariantColor[] = [
  { nameAr: 'أسود', nameEn: 'Black', hex: '#111111' },
  { nameAr: 'وردي', nameEn: 'Rose', hex: '#D4A5A5' },
  { nameAr: 'أبيض / سكري', nameEn: 'Cream', hex: '#F7EDE2' },
  { nameAr: 'بيج', nameEn: 'Beige', hex: '#E0D0B8' },
  { nameAr: 'أخضر زمردي', nameEn: 'Emerald', hex: '#0F5132' },
  { nameAr: 'كحلي', nameEn: 'Navy', hex: '#1B2A4A' },
  { nameAr: 'نبيتي / كشمير', nameEn: 'Burgundy', hex: '#800020' },
];

const AVAILABLE_SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL', 'Free Size', '160x200cm', '180x200cm', '200x220cm'];

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  categoryTree,
  filterParams,
  onFilterChange,
  onReset,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const selectedColors = filterParams.colors || [];
  const selectedSizes = filterParams.sizes || [];

  const handleToggleColor = (colorName: string) => {
    const exists = selectedColors.includes(colorName);
    const updated = exists
      ? selectedColors.filter((c) => c !== colorName)
      : [...selectedColors, colorName];
    onFilterChange({ colors: updated, page: 1 });
  };

  const handleToggleSize = (size: string) => {
    const exists = selectedSizes.includes(size);
    const updated = exists
      ? selectedSizes.filter((s) => s !== size)
      : [...selectedSizes, size];
    onFilterChange({ sizes: updated, page: 1 });
  };

  const content = (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-rose-100 pb-3">
        <div className="flex items-center gap-2 text-charcoal-900 font-bold">
          <Filter className="w-4 h-4 text-rose-600" />
          <span>تصفية المنتجات</span>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1"
        >
          <RotateCcw className="w-3 h-3" />
          <span>إعادة ضبط</span>
        </button>
      </div>

      {/* 1. Category Tree */}
      <div>
        <h4 className="text-xs font-bold text-charcoal-800 uppercase tracking-wider mb-2.5">
          الأقسام والتصنيفات
        </h4>
        <div className="space-y-1.5 text-xs">
          <button
            type="button"
            onClick={() => onFilterChange({ categorySlug: undefined, page: 1 })}
            className={`w-full text-start px-2 py-1.5 rounded-lg transition-colors ${
              !filterParams.categorySlug
                ? 'bg-rose-100 text-rose-900 font-bold'
                : 'text-charcoal-700 hover:bg-rose-50'
            }`}
          >
            جميع الأقسام
          </button>
          {categoryTree.map((cat) => (
            <div key={cat.id} className="space-y-1">
              <button
                type="button"
                onClick={() => onFilterChange({ categorySlug: cat.slug, page: 1 })}
                className={`w-full text-start px-2 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                  filterParams.categorySlug === cat.slug
                    ? 'bg-rose-100 text-rose-900 font-bold'
                    : 'text-charcoal-800 hover:bg-rose-50 font-medium'
                }`}
              >
                <span>{cat.nameAr}</span>
                {cat.productCount != null && (
                  <span className="text-[10px] text-charcoal-400">({cat.productCount})</span>
                )}
              </button>

              {/* Subcategories */}
              {cat.children && cat.children.length > 0 && (
                <div className="ps-3 border-s border-rose-200/60 ms-2 space-y-1">
                  {cat.children.map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => onFilterChange({ categorySlug: sub.slug, page: 1 })}
                      className={`w-full text-start px-2 py-1 rounded-md text-[11px] flex items-center justify-between transition-colors ${
                        filterParams.categorySlug === sub.slug
                          ? 'bg-rose-100 text-rose-900 font-bold'
                          : 'text-charcoal-600 hover:bg-rose-50'
                      }`}
                    >
                      <span>{sub.nameAr}</span>
                      {sub.productCount != null && (
                        <span className="text-[10px] text-charcoal-400">({sub.productCount})</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 2. Price Range */}
      <div className="border-t border-rose-100 pt-4">
        <h4 className="text-xs font-bold text-charcoal-800 uppercase tracking-wider mb-2.5">
          نطاق السعر (ج.م)
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-charcoal-500 block mb-1">من:</label>
            <input
              type="number"
              placeholder="0"
              value={filterParams.minPrice ?? ''}
              onChange={(e) =>
                onFilterChange({
                  minPrice: e.target.value ? Number(e.target.value) : undefined,
                  page: 1,
                })
              }
              className="w-full bg-rose-50/50 border border-rose-200 rounded-lg p-2 text-xs text-charcoal-900"
            />
          </div>
          <div>
            <label className="text-[10px] text-charcoal-500 block mb-1">إلى:</label>
            <input
              type="number"
              placeholder="5000"
              value={filterParams.maxPrice ?? ''}
              onChange={(e) =>
                onFilterChange({
                  maxPrice: e.target.value ? Number(e.target.value) : undefined,
                  page: 1,
                })
              }
              className="w-full bg-rose-50/50 border border-rose-200 rounded-lg p-2 text-xs text-charcoal-900"
            />
          </div>
        </div>
      </div>

      {/* 3. Available Colors */}
      <div className="border-t border-rose-100 pt-4">
        <h4 className="text-xs font-bold text-charcoal-800 uppercase tracking-wider mb-2.5">
          الألوان
        </h4>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_COLORS.map((c) => {
            const isSelected = selectedColors.includes(c.nameAr);
            return (
              <button
                key={c.nameEn}
                type="button"
                onClick={() => handleToggleColor(c.nameAr)}
                title={c.nameAr}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] border transition-all ${
                  isSelected
                    ? 'border-rose-600 bg-rose-50 text-rose-900 font-bold ring-1 ring-rose-400'
                    : 'border-rose-200 bg-white text-charcoal-700 hover:bg-rose-50'
                }`}
              >
                <span
                  className="w-3 h-3 rounded-full border border-gray-300 shadow-2xs"
                  style={{ backgroundColor: c.hex }}
                />
                <span>{c.nameAr}</span>
                {isSelected && <Check className="w-3 h-3 text-rose-600" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Sizes */}
      <div className="border-t border-rose-100 pt-4">
        <h4 className="text-xs font-bold text-charcoal-800 uppercase tracking-wider mb-2.5">
          المقاسات
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {AVAILABLE_SIZES.map((size) => {
            const isSelected = selectedSizes.includes(size);
            return (
              <button
                key={size}
                type="button"
                onClick={() => handleToggleSize(size)}
                className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
                  isSelected
                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                    : 'bg-white text-charcoal-700 border-rose-200 hover:bg-rose-50'
                }`}
              >
                {size}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. In-Stock Only */}
      <div className="border-t border-rose-100 pt-4">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={!!filterParams.inStockOnly}
            onChange={(e) => onFilterChange({ inStockOnly: e.target.checked, page: 1 })}
            className="w-4 h-4 rounded-sm text-rose-600 border-rose-300 focus:ring-rose-500"
          />
          <span className="text-xs font-semibold text-charcoal-800">
            عرض المنتجات المتوفرة فقط بالمخزون
          </span>
        </label>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 bg-white rounded-3xl p-5 border border-rose-100 shadow-xs h-fit sticky top-24">
        {content}
      </aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-charcoal-900/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          {/* Drawer Panel */}
          <div className="relative ms-auto w-full max-w-xs bg-white h-full shadow-2xl p-6 overflow-y-auto z-10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="font-bold text-charcoal-900">الفلاتر</span>
                <button
                  type="button"
                  onClick={onCloseMobile}
                  className="p-1.5 text-charcoal-500 hover:text-charcoal-900"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {content}
            </div>
            <div className="pt-6 border-t border-rose-100">
              <button
                type="button"
                onClick={onCloseMobile}
                className="w-full py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-md hover:bg-rose-700"
              >
                عرض النتائج
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
