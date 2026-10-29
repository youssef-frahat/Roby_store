'use client';

import React from 'react';
import Link from 'next/link';
import { Category } from '../../types/store';

interface CategoryNavProps {
  categories: Category[];
  activeSlug?: string;
  onSelectCategory?: (slug?: string) => void;
}

export const CategoryNav: React.FC<CategoryNavProps> = ({
  categories,
  activeSlug,
  onSelectCategory,
}) => {
  // Only root categories or primary categories for top pill navigation
  const primaryCategories = categories.filter((c) => c.level === 0 || !c.parentId);

  return (
    <div className="w-full overflow-x-auto scrollbar-none py-3">
      <div className="flex items-center gap-2 sm:gap-3 min-w-max px-1">
        {/* All Products pill */}
        <button
          type="button"
          onClick={() => onSelectCategory?.(undefined)}
          className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all shadow-2xs ${
            !activeSlug
              ? 'bg-rose-700 text-white shadow-rose-200'
              : 'bg-white hover:bg-rose-50 text-charcoal-700 border border-rose-200/80'
          }`}
        >
          كل المنتجات
        </button>

        {primaryCategories.map((cat) => {
          const isActive = activeSlug === cat.slug;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory?.(cat.slug)}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all shadow-2xs flex items-center gap-1.5 ${
                isActive
                  ? 'bg-rose-700 text-white shadow-rose-200'
                  : 'bg-white hover:bg-rose-50 text-charcoal-700 border border-rose-200/80'
              }`}
            >
              <span>{cat.nameAr}</span>
              {cat.productCount != null && cat.productCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-rose-900/40 text-rose-100' : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {cat.productCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
