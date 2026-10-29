'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag, Search, Menu, X, Phone, Heart } from 'lucide-react';
import { useCartStore } from '../../store/useCartStore';
import { StoreSettings } from '../../types/store';

interface HeaderProps {
  settings?: StoreSettings | null;
  onOpenCart?: () => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  onOpenCart,
  searchQuery = '',
  onSearchChange,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const totalItemCount = useCartStore((state) => state.getItemCount());

  const whatsappPhone = settings?.whatsappNumber || '201000000000';
  const cleanPhone = whatsappPhone.replace(/\D/g, '');

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-rose-100 shadow-xs transition-all">
      {/* Top Banner / Announcement Bar */}
      <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-rose-950 text-white text-xs py-2 px-4 text-center font-medium">
        <div className="container mx-auto flex items-center justify-between">
          <span className="hidden sm:inline">
            ✨ مرحباً بكم في متجر روبي للأزياء والمفروشات الراقية
          </span>
          <span className="mx-auto sm:mx-0">
            شحن سريع لجميع محافظات جمهورية مصر العربية 🇪🇬
          </span>
          <a
            href={`https://wa.me/${cleanPhone}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex items-center gap-1 hover:text-rose-200 transition-colors"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>طلب فوري واتساب: {settings?.contactPhone || '01000000000'}</span>
          </a>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Mobile Menu Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 text-charcoal-700 hover:text-rose-700 focus:outline-hidden"
          aria-label="القائمة"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-11 h-11 rounded-full overflow-hidden border-2 border-rose-300 shadow-xs group-hover:scale-105 transition-transform">
            <Image
              src="/images/logo_roby_store.jpg"
              alt="Roby Store Logo"
              fill
              className="object-cover"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold font-serif tracking-wide text-rose-950 group-hover:text-rose-800 transition-colors">
              ROBY STORE
            </span>
            <span className="text-[11px] text-rose-600 font-medium -mt-1">
              أزياء حريمي ومفروشات راقية
            </span>
          </div>
        </Link>

        {/* Search Bar (Desktop) */}
        <div className="hidden lg:flex flex-1 max-w-md mx-6">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="ابحثي عن فساتين، بيجامات، أطقم سرير ومفروشات..."
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="w-full bg-rose-50/60 border border-rose-200 rounded-full py-2 ps-10 pe-4 text-sm text-charcoal-900 placeholder:text-rose-400 focus:outline-hidden focus:border-rose-400 focus:bg-white focus:ring-2 focus:ring-rose-200/50 transition-all"
            />
            <Search className="w-4 h-4 text-rose-500 absolute start-3.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Navigation Links (Desktop) */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-charcoal-700">
          <Link href="/" className="hover:text-rose-700 transition-colors">
            الرئيسية
          </Link>
          <Link href="/catalog" className="hover:text-rose-700 transition-colors">
            كل الكتالوج
          </Link>
          <Link href="/catalog?category=womens-fashion" className="hover:text-rose-700 transition-colors">
            الملابس الحريمي
          </Link>
          <Link href="/catalog?category=home-textiles" className="hover:text-rose-700 transition-colors">
            المفروشات المنزلية
          </Link>
          <Link href="/admin/settings" className="text-xs text-rose-500 hover:text-rose-800 border border-rose-200 rounded-md px-2 py-1">
            لوحة الإدارة
          </Link>
        </nav>

        {/* Action Icons */}
        <div className="flex items-center gap-3">
          {/* Cart Trigger */}
          <button
            type="button"
            onClick={onOpenCart}
            className="relative p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded-full transition-all focus:outline-hidden focus:ring-2 focus:ring-rose-300"
            aria-label="سلة المشتريات"
          >
            <ShoppingBag className="w-5 h-5" />
            {totalItemCount > 0 && (
              <span className="absolute -top-1 -end-1 bg-rose-600 text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-xs animate-scale-in">
                {totalItemCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-rose-100 px-4 py-4 space-y-3 animate-fade-in shadow-md">
          {/* Mobile Search */}
          <div className="relative mb-3">
            <input
              type="text"
              placeholder="ابحثي عن منتج..."
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="w-full bg-rose-50 border border-rose-200 rounded-lg py-2 ps-9 pe-3 text-sm text-charcoal-900"
            />
            <Search className="w-4 h-4 text-rose-500 absolute start-3 top-1/2 -translate-y-1/2" />
          </div>

          <div className="flex flex-col space-y-2 text-sm font-medium text-charcoal-700">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 hover:bg-rose-50 rounded-md"
            >
              الرئيسية
            </Link>
            <Link
              href="/catalog"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 hover:bg-rose-50 rounded-md"
            >
              جميع المنتجات
            </Link>
            <Link
              href="/catalog?category=womens-fashion"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 hover:bg-rose-50 rounded-md"
            >
              الملابس الحريمي
            </Link>
            <Link
              href="/catalog?category=home-textiles"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 hover:bg-rose-50 rounded-md"
            >
              المفروشات والمنسوجات
            </Link>
            <Link
              href="/admin/settings"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 text-rose-600 hover:bg-rose-50 rounded-md font-bold"
            >
              ⚙️ لوحة تحكم المتجر (Admin)
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
