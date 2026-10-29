import type { Metadata } from 'next';
import './globals.css';
import { StoreLayout } from '../components/common/StoreLayout';

export const metadata: Metadata = {
  title: 'Roby Store | متجر روبي - أزياء حريمي ومفروشات راقية',
  description:
    'متجر روبي ستور للأزياء النسائية الراقية والمفروشات المنزلية الفاخرة - تسوق واطلب مباشرة عبر واتساب',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen bg-rose-50/20 text-charcoal-900 antialiased">
        <StoreLayout>{children}</StoreLayout>
      </body>
    </html>
  );
}
