'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag, Search, Menu, X, Phone, Heart, Globe } from 'lucide-react';
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
  const [currentLang, setCurrentLang] = React.useState<'ar' | 'en'>('ar');

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLang = (window.localStorage.getItem('roby_store_lang') as 'ar' | 'en') || 'ar';
      setCurrentLang(savedLang);
      document.documentElement.dir = savedLang === 'en' ? 'ltr' : 'rtl';
      document.documentElement.lang = savedLang;
    }
  }, []);

  const toggleLanguage = () => {
    const nextLang = currentLang === 'ar' ? 'en' : 'ar';
    setCurrentLang(nextLang);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('roby_store_lang', nextLang);
      document.documentElement.dir = nextLang === 'en' ? 'ltr' : 'rtl';
      document.documentElement.lang = nextLang;
    }
  };

  const rawWhatsapp = settings?.whatsappNumber || '201000000000';
  let cleanPhone = rawWhatsapp.replace(/\D/g, '');
  if (cleanPhone.startsWith('0020')) {
    cleanPhone = cleanPhone.slice(2);
  } else if (cleanPhone.startsWith('01') && cleanPhone.length === 11) {
    cleanPhone = `2${cleanPhone}`;
  }
  const defaultTemplate = settings?.whatsappMessageTemplate;
  const whatsappUrl = defaultTemplate
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(defaultTemplate)}`
    : `https://wa.me/${cleanPhone}`;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-rose-100 shadow-xs transition-all">
      {/* Top Banner / Announcement Bar */}
      <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-rose-950 text-white text-xs py-2 px-4 text-center font-medium">
        <div className="container mx-auto flex items-center justify-between">
          <span className="hidden sm:inline">
            ✨ مرحباً بكم في {settings?.storeName || 'متجر روبي للأزياء والمفروشات الراقية'}
          </span>
          <span className="mx-auto sm:mx-0">
            شحن سريع لجميع محافظات جمهورية مصر العربية 🇪🇬
          </span>
          <a
            href={whatsappUrl}
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
              {settings?.storeNameEn || 'ROBY STORE'}
            </span>
            <span className="text-[11px] text-rose-600 font-medium -mt-1">
              {settings?.tagline || 'أزياء حريمي ومفروشات راقية'}
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
            {currentLang === 'ar' ? 'الرئيسية' : 'Home'}
          </Link>
          <Link href="/catalog" className="hover:text-rose-700 transition-colors">
            {currentLang === 'ar' ? 'كل الكتالوج' : 'All Catalog'}
          </Link>
          <Link href="/catalog?category=abayas-and-kaftans" className="hover:text-rose-700 transition-colors">
            {currentLang === 'ar' ? 'العبايات' : 'Abayas'}
          </Link>
          <Link href="/catalog?category=womens-fashion" className="hover:text-rose-700 transition-colors">
            {currentLang === 'ar' ? 'الملابس الحريمي' : "Women's Fashion"}
          </Link>
          <Link href="/catalog?category=home-textiles" className="hover:text-rose-700 transition-colors">
            {currentLang === 'ar' ? 'المفروشات المنزلية' : 'Home Textiles'}
          </Link>
        </nav>

        {/* Action Icons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language Switcher (AR ⇄ EN) */}
          <button
            type="button"
            onClick={toggleLanguage}
            title={currentLang === 'ar' ? 'Switch to English' : 'التحويل للغة العربية'}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 text-xs font-black transition-all shadow-2xs hover:scale-105 active:scale-95"
            aria-label="تغيير لغة المتجر"
          >
            <Globe className="w-3.5 h-3.5 text-rose-700" />
            <span>{currentLang === 'ar' ? 'English' : 'عربي'}</span>
          </button>

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
              {currentLang === 'ar' ? 'الرئيسية' : 'Home'}
            </Link>
            <Link
              href="/catalog"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 hover:bg-rose-50 rounded-md"
            >
              {currentLang === 'ar' ? 'جميع المنتجات' : 'All Products'}
            </Link>
            <Link
              href="/catalog?category=abayas-and-kaftans"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 hover:bg-rose-50 rounded-md text-rose-700 font-semibold"
            >
              {currentLang === 'ar' ? 'العبايات والقفاطين' : 'Abayas & Kaftans'}
            </Link>
            <Link
              href="/catalog?category=womens-fashion"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 hover:bg-rose-50 rounded-md"
            >
              {currentLang === 'ar' ? 'الملابس الحريمي' : "Women's Fashion"}
            </Link>
            <Link
              href="/catalog?category=home-textiles"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 hover:bg-rose-50 rounded-md"
            >
              {currentLang === 'ar' ? 'المفروشات والمنسوجات' : 'Home Bedding & Textiles'}
            </Link>
          </div>

          <div className="pt-3 border-t border-rose-100 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                toggleLanguage();
                setMobileMenuOpen(false);
              }}
              className="flex items-center justify-center gap-2 py-2 px-4 bg-rose-50 hover:bg-rose-100 text-rose-900 rounded-xl text-xs font-black border border-rose-200 transition-colors"
            >
              <Globe className="w-4 h-4 text-rose-700" />
              <span>{currentLang === 'ar' ? 'تغيير اللغة إلى English' : 'Switch Language to العربية'}</span>
            </button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Phone className="w-4 h-4" />
              <span>تواصل واتساب: {settings?.contactPhone || '01000000000'}</span>
            </a>
          </div>
        </div>
      )}
    </header>
  );
};
