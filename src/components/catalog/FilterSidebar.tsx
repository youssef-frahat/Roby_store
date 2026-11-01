'use client';

import React from 'react';
import { Filter, RotateCcw, Check, Sparkles } from 'lucide-react';
import { CategoryTreeItem, ProductFilterParams } from '../../types/store';

interface FilterSidebarProps {
  categoryTree: CategoryTreeItem[];
  filterParams: ProductFilterParams;
  onFilterChange: (newParams: Partial<ProductFilterParams>) => void;
  onReset: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

const QUICK_PRICE_TIERS = [
  { label: 'الكل', min: undefined, max: undefined },
  { label: 'أقل من 500 ج.م', min: undefined, max: 500 },
  { label: '500 - 1000 ج.م', min: 500, max: 1000 },
  { label: 'أكثر من 1000 ج.م', min: 1000, max: undefined },
];

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  categoryTree,
  filterParams,
  onFilterChange,
  onReset,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const currentCategorySlug = filterParams.categorySlug;

  const content = (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-rose-100 pb-3">
        <div className="flex items-center gap-2 text-charcoal-900 font-bold">
          <Filter className="w-4 h-4 text-rose-600" />
          <span>تصفية الكتالوج</span>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>إعادة ضبط</span>
        </button>
      </div>

      {/* 1. Category Tree Navigation */}
      <div>
        <h4 className="text-xs font-bold text-charcoal-800 uppercase tracking-wider mb-2.5">
          الأقسام والتصنيفات
        </h4>
        <div className="space-y-1.5 text-xs">
          {/* All categories button */}
          <button
            type="button"
            onClick={() => onFilterChange({ categorySlug: undefined, page: 1 })}
            className={`w-full text-start px-3 py-2 rounded-xl transition-all flex items-center justify-between ${
              !currentCategorySlug
                ? 'bg-rose-700 text-white font-bold shadow-xs'
                : 'text-charcoal-700 hover:bg-rose-50'
            }`}
          >
            <span>جميع المنتجات</span>
            {!currentCategorySlug && <Check className="w-3.5 h-3.5 text-white" />}
          </button>

          {/* Root Categories & Subcategories */}
          {categoryTree.map((cat) => {
            const isRootActive = currentCategorySlug === cat.slug;
            const hasActiveChild = cat.children?.some((sub) => sub.slug === currentCategorySlug);

            return (
              <div key={cat.id} className="space-y-1 pt-1">
                <button
                  type="button"
                  onClick={() => onFilterChange({ categorySlug: cat.slug, page: 1 })}
                  className={`w-full text-start px-3 py-2 rounded-xl flex items-center justify-between transition-all ${
                    isRootActive
                      ? 'bg-rose-700 text-white font-bold shadow-xs'
                      : hasActiveChild
                      ? 'bg-rose-100/70 text-rose-950 font-bold'
                      : 'text-charcoal-800 hover:bg-rose-50 font-medium'
                  }`}
                >
                  <span>{cat.nameAr}</span>
                  {cat.productCount != null && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        isRootActive
                          ? 'bg-rose-900/60 text-white'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {cat.productCount}
                    </span>
                  )}
                </button>

                {/* Subcategories (Indent) */}
                {cat.children && cat.children.length > 0 && (
                  <div className="ps-3 border-s-2 border-rose-200/80 ms-3 space-y-1 pt-0.5">
                    {cat.children.map((sub) => {
                      const isSubActive = currentCategorySlug === sub.slug;
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => onFilterChange({ categorySlug: sub.slug, page: 1 })}
                          className={`w-full text-start px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-all ${
                            isSubActive
                              ? 'bg-rose-600 text-white font-bold shadow-2xs'
                              : 'text-charcoal-600 hover:bg-rose-50 hover:text-charcoal-900'
                          }`}
                        >
                          <span>{sub.nameAr}</span>
                          {sub.productCount != null && (
                            <span
                              className={`text-[10px] ${
                                isSubActive ? 'text-rose-100' : 'text-charcoal-400'
                              }`}
                            >
                              ({sub.productCount})
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Fast Price Filter Chips (UX Improved) */}
      <div className="border-t border-rose-100 pt-4">
        <h4 className="text-xs font-bold text-charcoal-800 uppercase tracking-wider mb-2.5">
          السعر (ج.م)
        </h4>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {QUICK_PRICE_TIERS.map((tier, idx) => {
            const isSelected =
              filterParams.minPrice === tier.min && filterParams.maxPrice === tier.max;
            return (
              <button
                key={idx}
                type="button"
                onClick={() =>
                  onFilterChange({
                    minPrice: tier.min,
                    maxPrice: tier.max,
                    page: 1,
                  })
                }
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                  isSelected
                    ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                    : 'bg-white text-charcoal-700 border-rose-200 hover:bg-rose-50'
                }`}
              >
                {tier.label}
              </button>
            );
          })}
        </div>

        {/* Custom Min / Max Inputs */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div>
            <label className="text-[10px] text-charcoal-500 block mb-1">الحد الأدنى:</label>
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
              className="w-full bg-rose-50/40 border border-rose-200 rounded-lg p-2 text-xs text-charcoal-900 focus:bg-white"
            />
          </div>
          <div>
            <label className="text-[10px] text-charcoal-500 block mb-1">الحد الأقصى:</label>
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
              className="w-full bg-rose-50/40 border border-rose-200 rounded-lg p-2 text-xs text-charcoal-900 focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* 3. In-Stock Only Toggle */}
      <div className="border-t border-rose-100 pt-4">
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={!!filterParams.inStockOnly}
            onChange={(e) => onFilterChange({ inStockOnly: e.target.checked, page: 1 })}
            className="w-4 h-4 rounded-sm text-rose-600 border-rose-300 focus:ring-rose-500"
          />
          <span className="text-xs font-semibold text-charcoal-800">
            عرض الموديلات المتوفرة فقط في المخزون
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
          <div
            className="fixed inset-0 bg-charcoal-900/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative ms-auto w-full max-w-xs bg-white h-full shadow-2xl p-6 overflow-y-auto z-10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-rose-100 pb-3">
                <span className="font-bold text-charcoal-900 text-sm">تصفية المنتجات</span>
                <button
                  type="button"
                  onClick={onCloseMobile}
                  className="p-1.5 text-charcoal-500 hover:text-charcoal-900"
                >
                  ✕
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
                تطبيق الفلاتر وعرض النتائج
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
