'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Phone, Mail, MapPin, MessageCircle, Instagram, Facebook } from 'lucide-react';
import { StoreSettings } from '../../types/store';

interface FooterProps {
  settings?: StoreSettings | null;
}

export const Footer: React.FC<FooterProps> = ({ settings }) => {
  const whatsappPhone = settings?.whatsappNumber || '201000000000';
  const cleanPhone = whatsappPhone.replace(/\D/g, '');

  return (
    <footer className="bg-charcoal-900 text-charcoal-100 border-t border-rose-950 pt-16 pb-10">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Col 1: Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-rose-400">
                <Image
                  src="/images/logo_roby_store.jpg"
                  alt="Roby Store"
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <h3 className="text-xl font-bold font-serif text-white tracking-wide">
                  ROBY STORE
                </h3>
                <p className="text-xs text-rose-300 font-medium">أزياء حريمي ومفروشات راقية</p>
              </div>
            </div>
            <p className="text-xs text-charcoal-300 leading-relaxed">
              وجهتكم الأولى لأرقى الأزياء الحريمية العصرية والمفروشات والمنسوجات المنزلية الفاخرة.
              نوفر تصاميم مميزة وخامات قطنية وحريرية فائقة الجودة مع توصيل سريع لجميع المحافظات.
            </p>
            {/* Social Links */}
            <div className="flex items-center gap-3 pt-2">
              <a
                href={`https://wa.me/${cleanPhone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-emerald-950 text-emerald-400 hover:bg-emerald-600 hover:text-white flex items-center justify-center transition-colors"
                aria-label="واتساب"
              >
                <MessageCircle className="w-5 h-5" />
              </a>
              {settings?.instagramUrl && (
                <a
                  href={settings.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-pink-950 text-pink-400 hover:bg-pink-600 hover:text-white flex items-center justify-center transition-colors"
                  aria-label="إنستغرام"
                >
                  <Instagram className="w-5 h-5" />
                </a>
              )}
              {settings?.facebookUrl && (
                <a
                  href={settings.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-blue-950 text-blue-400 hover:bg-blue-600 hover:text-white flex items-center justify-center transition-colors"
                  aria-label="فيسبوك"
                >
                  <Facebook className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>

          {/* Col 2: Categories */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-s-2 border-rose-500 ps-2.5">
              أقسام المتجر
            </h4>
            <ul className="space-y-2 text-xs text-charcoal-300">
              <li>
                <Link href="/catalog?category=womens-fashion" className="hover:text-rose-300 transition-colors">
                  الملابس الحريمي
                </Link>
              </li>
              <li>
                <Link href="/catalog?category=abayas" className="hover:text-rose-300 transition-colors">
                  العبايات والقفاطين
                </Link>
              </li>
              <li>
                <Link href="/catalog?category=pajamas-and-homewear" className="hover:text-rose-300 transition-colors">
                  البيجامات وملابس المنزل
                </Link>
              </li>
              <li>
                <Link href="/catalog?category=home-textiles" className="hover:text-rose-300 transition-colors">
                  المفروشات والمنسوجات
                </Link>
              </li>
              <li>
                <Link href="/catalog?category=bedsheets-and-linens" className="hover:text-rose-300 transition-colors">
                  أطقم السرير والملايات الفاخرة
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Customer Care & Social Ordering */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-s-2 border-rose-500 ps-2.5">
              خدمة العملاء والطلب
            </h4>
            <ul className="space-y-2.5 text-xs text-charcoal-300">
              <li className="flex items-center gap-2">
                <span className="text-rose-400">✓</span>
                <span>طلب مباشر بدون بطاقة بنكية عبر الواتساب</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-rose-400">✓</span>
                <span>معاينة المنتجات عند الاستلام والدفع كاش</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-rose-400">✓</span>
                <span>توصيل لـ 27 محافظة في مصر</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-rose-400">✓</span>
                <span>استبدال واسترجاع سهل وسريع</span>
              </li>
            </ul>
          </div>

          {/* Col 4: Contact Details */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-s-2 border-rose-500 ps-2.5">
              تواصل معنا
            </h4>
            <ul className="space-y-3 text-xs text-charcoal-300">
              <li className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-medium">الهاتف والواتساب:</p>
                  <p>{settings?.contactPhone || '01000000000'}</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-medium">البريد الإلكتروني:</p>
                  <p>{settings?.contactEmail || 'contact@robystore.com'}</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-medium">المقر:</p>
                  <p>{settings?.storeAddress || 'القاهرة، جمهورية مصر العربية'}</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-charcoal-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-charcoal-400">
          <p>© {new Date().getFullYear()} روبي ستور (Roby Store). جميع الحقوق محفوظة.</p>
          <div className="flex items-center gap-4">
            <Link href="/catalog" className="hover:text-rose-300">
              كتالوج المنتجات
            </Link>
            <span>•</span>
            <Link href="/admin/settings" className="hover:text-rose-300">
              إعدادات المتجر
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
