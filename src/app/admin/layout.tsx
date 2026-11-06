'use client';

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Settings,
  ExternalLink,
  LogOut,
  Menu,
  X,
  PlusCircle,
  Shield,
  Sparkles,
} from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Suppress admin shell on login page or receipt printout
  if (pathname === '/admin/login' || pathname.includes('/receipt')) {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch (err) {
      // ignore
    } finally {
      router.push('/admin/login');
      router.refresh();
    }
  };

  const navItems = [
    {
      title: 'لوحة التحكم',
      href: '/admin',
      icon: LayoutDashboard,
      active: pathname === '/admin',
    },
    {
      title: 'إدارة الطلبات',
      href: '/admin/orders',
      icon: ShoppingBag,
      active: pathname.startsWith('/admin/orders'),
    },
    {
      title: 'إدارة المنتجات',
      href: '/admin/products',
      icon: Package,
      active: pathname.startsWith('/admin/products'),
    },
    {
      title: 'بانرات العروض',
      href: '/admin/banners',
      icon: Sparkles,
      active: pathname.startsWith('/admin/banners'),
    },
    {
      title: 'إعدادات المتجر',
      href: '/admin/settings',
      icon: Settings,
      active: pathname.startsWith('/admin/settings'),
    },
  ];

  return (
    <div className="min-h-screen bg-rose-50/20 flex flex-col md:flex-row text-charcoal-900" dir="rtl">
      {/* Desktop Sidebar (RTL: right side) */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-l border-rose-100 min-h-screen shrink-0 sticky top-0 h-screen overflow-y-auto print:hidden">
        {/* Egyptian Luxury Admin Branding */}
        <div className="p-6 border-b border-rose-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-[#D4AF37] bg-[#800020] flex items-center justify-center text-white font-serif font-black text-lg shadow-sm">
            R
          </div>
          <div>
            <h2 className="font-serif font-black text-base text-[#800020] tracking-wider leading-tight">
              ROBY STORE
            </h2>
            <p className="text-[11px] text-[#D4A5A5] font-bold">
              لوحة التحكم المركزية
            </p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 space-y-1.5 flex-1">
          <div className="text-[10px] font-bold text-charcoal-400 px-3 py-1 mb-1 uppercase tracking-wider">
            القائمة الرئيسية
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-bold transition-all ${
                  item.active
                    ? 'bg-[#800020]/10 text-[#800020] border-r-4 border-[#800020] shadow-xs'
                    : 'text-charcoal-600 hover:bg-rose-50 hover:text-charcoal-900'
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    item.active ? 'text-[#800020]' : 'text-charcoal-400'
                  }`}
                />
                <span>{item.title}</span>
              </Link>
            );
          })}

          <div className="pt-4 mt-4 border-t border-rose-100">
            <div className="text-[10px] font-bold text-charcoal-400 px-3 py-1 mb-1 uppercase tracking-wider">
              روابط المتجر
            </div>

            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-medium text-charcoal-600 hover:bg-rose-50 hover:text-[#800020] transition-all"
            >
              <div className="flex items-center gap-3">
                <ExternalLink className="w-4 h-4 text-[#D4AF37]" />
                <span>عرض المتجر الحي</span>
              </div>
              <span className="text-[10px] bg-rose-100/70 text-[#800020] px-2 py-0.5 rounded-full font-bold">
                جديد
              </span>
            </Link>
          </div>
        </nav>

        {/* Sidebar Footer with Logout */}
        <div className="p-4 border-t border-rose-100">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-red-700 hover:bg-red-50 hover:text-red-900 transition-colors focus:outline-none"
          >
            <LogOut className="w-4 h-4 text-red-500" />
            <span>{isLoggingOut ? 'جارٍ تسجيل الخروج...' : 'تسجيل الخروج'}</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-charcoal-950/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          <div className="relative w-4/5 max-w-xs bg-white border-l border-rose-100 flex flex-col h-full shadow-2xl z-10">
            <div className="p-5 border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full border-2 border-[#D4AF37] bg-[#800020] flex items-center justify-center text-white font-serif font-black text-sm">
                  R
                </div>
                <div>
                  <h3 className="font-serif font-black text-sm text-[#800020]">
                    ROBY STORE
                  </h3>
                  <p className="text-[10px] text-[#D4A5A5] font-bold">
                    لوحة التحكم
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 rounded-lg text-charcoal-400 hover:text-charcoal-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-bold transition-all ${
                      item.active
                        ? 'bg-[#800020]/10 text-[#800020] border-r-4 border-[#800020]'
                        : 'text-charcoal-600 hover:bg-rose-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.title}</span>
                  </Link>
                );
              })}

              <div className="pt-4 mt-4 border-t border-rose-100">
                <Link
                  href="/"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-medium text-charcoal-600 hover:bg-rose-50"
                >
                  <ExternalLink className="w-4 h-4 text-[#D4AF37]" />
                  <span>عرض المتجر الحي</span>
                </Link>
              </div>
            </nav>

            <div className="p-4 border-t border-rose-100">
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-red-700 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4 text-red-500" />
                <span>تسجيل الخروج</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area with Top Bar */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-rose-100 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 shadow-xs print:hidden">
          {/* Mobile Hamburger Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-xl text-charcoal-600 hover:bg-rose-50 hover:text-[#800020] focus:outline-none"
              aria-label="فتح القائمة"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Live Store Pulse Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="hidden sm:inline">المتجر متصل ومتاح أونلاين</span>
              <span className="sm:hidden">متصل</span>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-3">
            {/* Quick Action Button: Add Product */}
            <Link
              href="/admin/products/new"
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-[#800020] hover:bg-[#5B0017] text-white text-xs font-bold shadow-xs hover:shadow-sm transition-all"
            >
              <PlusCircle className="w-4 h-4 text-[#D4AF37]" />
              <span>إضافة منتج جديد</span>
            </Link>

            {/* Admin Profile Badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-50/70 border border-rose-100 text-charcoal-700 text-xs font-bold">
              <div className="w-6 h-6 rounded-full bg-[#800020] text-[#D4AF37] flex items-center justify-center">
                <Shield className="w-3.5 h-3.5" />
              </div>
              <span>مدير المتجر</span>
            </div>

            {/* Header Logout button for quick access */}
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              title="تسجيل الخروج"
              className="p-2 rounded-xl text-charcoal-400 hover:text-red-600 hover:bg-red-50 transition-colors focus:outline-none"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
