import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={`animate-pulse bg-rose-100/60 rounded-md ${className}`}
      aria-hidden="true"
    />
  );
};

export const ProductCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl border border-rose-100/80 overflow-hidden shadow-xs p-3 space-y-3">
      <Skeleton className="w-full aspect-3/4 rounded-xl" />
      <div className="space-y-2 pt-1">
        <Skeleton className="w-1/3 h-3" />
        <Skeleton className="w-4/5 h-4" />
        <Skeleton className="w-1/2 h-4" />
      </div>
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="w-20 h-5" />
        <Skeleton className="w-10 h-10 rounded-full" />
      </div>
    </div>
  );
};

export const CategoryPillSkeleton: React.FC = () => {
  return <Skeleton className="w-28 h-10 rounded-full" />;
};
