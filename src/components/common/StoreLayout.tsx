'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Header } from './Header';
import { Footer } from './Footer';
import { CartDrawer } from '../cart/CartDrawer';
import { getStoreService } from '../../services/storeService';
import { StoreSettings } from '../../types/store';

export const StoreLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [settings, setSettings] = useState<StoreSettings | null>(null);

  useEffect(() => {
    if (isAdmin) return;
    const service = getStoreService();
    service
      .getSettings()
      .then((s) => setSettings(s))
      .catch(() => {});
  }, [isAdmin]);

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-rose-50/20 text-charcoal-900">
      <Header
        settings={settings}
        onOpenCart={() => setIsCartOpen(true)}
      />
      <main className="flex-1">{children}</main>
      <Footer settings={settings} />
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        whatsappNumber={settings?.whatsappNumber}
        freeShippingThreshold={settings?.freeShippingThreshold}
        enableSocialOrdering={settings?.enableSocialOrdering}
      />
    </div>
  );
};
