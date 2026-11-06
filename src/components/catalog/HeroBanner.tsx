'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { PromotionalBanner } from '../../types/store';

interface HeroBannerProps {
  banners: PromotionalBanner[];
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ banners }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [banners.length]);

  if (!banners || banners.length === 0) return null;

  const current = banners[currentIndex];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  const getDestinationUrl = () => {
    if (current.targetUrl) return current.targetUrl;
    if (current.targetProductSlug) return `/product/${current.targetProductSlug}`;
    if (current.targetProductId) return `/product/${current.targetProductId}`;
    if (current.targetCategorySlug) return `/catalog?category=${current.targetCategorySlug}`;
    return '/catalog';
  };

  const destinationUrl = getDestinationUrl();

  return (
    <div className="relative w-full overflow-hidden rounded-3xl bg-charcoal-900 shadow-md my-4">
      {/* Background Image Container */}
      <div className="relative h-72 sm:h-96 md:h-[420px] w-full">
        {current.imageUrl ? (
          <Image
            src={current.imageUrl}
            alt={current.titleAr}
            fill
            className="object-cover opacity-60 transition-opacity duration-1000"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-rose-950 via-rose-900 to-charcoal-950" />
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-charcoal-950/90 via-charcoal-900/60 to-transparent" />

        {/* Banner Content */}
        <div className="absolute inset-0 flex items-center">
          <div className="container mx-auto px-6 sm:px-12 max-w-2xl text-white space-y-4">
            {/* Tag Badge */}
            {(current.badgeTextAr || current.tagAr) && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/30 border border-rose-400/40 text-rose-200 text-xs font-semibold backdrop-blur-sm">
                <Sparkles className="w-3.5 h-3.5 text-rose-300" />
                <span>{current.badgeTextAr || current.tagAr}</span>
              </div>
            )}

            <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold font-serif leading-tight text-white drop-shadow-sm">
              {current.titleAr}
            </h1>

            {current.subtitleAr && (
              <p className="text-xs sm:text-sm md:text-base text-rose-100/90 leading-relaxed max-w-lg">
                {current.subtitleAr}
              </p>
            )}

            <div className="pt-2">
              <Link
                href={destinationUrl}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-rose-900/40 transition-all hover:scale-105 active:scale-95"
              >
                <span>{current.buttonTextAr || current.ctaTextAr || 'تسوقي الآن'}</span>
                <ChevronLeft className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Navigation Arrows */}
        {banners.length > 1 && (
          <div className="absolute bottom-4 end-6 flex items-center gap-2 z-10">
            <button
              type="button"
              onClick={handlePrev}
              className="p-2 rounded-full bg-white/20 hover:bg-white/40 text-white backdrop-blur-md transition-all"
              aria-label="السابق"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="p-2 rounded-full bg-white/20 hover:bg-white/40 text-white backdrop-blur-md transition-all"
              aria-label="التالي"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Dots */}
        {banners.length > 1 && (
          <div className="absolute bottom-4 start-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
            {banners.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentIndex ? 'w-6 bg-rose-400' : 'w-1.5 bg-white/40'
                }`}
                aria-label={`الشريحة ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
