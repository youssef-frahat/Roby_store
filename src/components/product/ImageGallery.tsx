'use client';

import React, { useState } from 'react';
import Image from 'next/image';

interface ImageGalleryProps {
  images: string[];
  title: string;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({ images, title }) => {
  const [activeImage, setActiveImage] = useState(images[0] || '/images/placeholder.jpg');

  if (!images || images.length === 0) {
    return (
      <div className="w-full aspect-3/4 bg-rose-50 rounded-3xl flex items-center justify-center border border-rose-100">
        <span className="text-sm text-charcoal-400">لا توجد صور متاحة</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col-reverse md:flex-row gap-4">
      {/* Thumbnails list */}
      {images.length > 1 && (
        <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto max-h-[500px] scrollbar-none py-1">
          {images.map((img, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveImage(img)}
              className={`relative w-16 h-20 sm:w-20 sm:h-24 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                activeImage === img
                  ? 'border-rose-600 ring-2 ring-rose-300 scale-95'
                  : 'border-rose-100 opacity-70 hover:opacity-100'
              }`}
            >
              <Image src={img} alt={`${title} ${idx + 1}`} fill className="object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Main Large Image */}
      <div className="relative flex-1 aspect-3/4 rounded-3xl overflow-hidden bg-rose-50/40 border border-rose-100/80 shadow-md">
        <Image
          src={activeImage}
          alt={title}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover transition-all duration-300"
        />
      </div>
    </div>
  );
};
