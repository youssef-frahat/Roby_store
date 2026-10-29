import React from 'react';
import { PackageSearch, RefreshCw } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  resetActionText?: string;
  onReset?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'لا توجد منتجات مطابقة',
  description = 'لم نتمكن من العثور على أي منتج يطابق معايير البحث أو الفلترة المحددة. جربي تعديل الفلاتر أو إزالة كلمات البحث.',
  resetActionText = 'إعادة ضبط الفلاتر',
  onReset,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4 bg-rose-50/40 border border-dashed border-rose-200 rounded-3xl max-w-lg mx-auto my-8">
      <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-4 shadow-xs">
        <PackageSearch className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-bold text-charcoal-900 mb-2 font-serif">{title}</h3>
      <p className="text-sm text-charcoal-500 mb-6 max-w-sm leading-relaxed">{description}</p>
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-rose-600 text-white text-sm font-medium hover:bg-rose-700 shadow-sm transition-all focus:outline-hidden focus:ring-2 focus:ring-rose-400"
        >
          <RefreshCw className="w-4 h-4" />
          <span>{resetActionText}</span>
        </button>
      )}
    </div>
  );
};
