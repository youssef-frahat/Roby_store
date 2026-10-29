import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorCardProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorCard: React.FC<ErrorCardProps> = ({
  title = 'تعذر تحميل البيانات',
  message = 'حدث خطأ غير متوقع أثناء جلب البيانات من الخادم. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.',
  onRetry,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6 bg-red-50/60 border border-red-200 rounded-2xl max-w-md mx-auto my-8">
      <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-3">
        <AlertCircle className="w-7 h-7" />
      </div>
      <h3 className="text-base font-bold text-red-950 mb-1">{title}</h3>
      <p className="text-xs text-red-700 mb-5 leading-relaxed">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 shadow-xs transition-all focus:outline-hidden"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>إعادة المحاولة</span>
        </button>
      )}
    </div>
  );
};
