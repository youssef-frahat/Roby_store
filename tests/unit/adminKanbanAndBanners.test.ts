import { describe, it, expect, beforeEach } from 'vitest';
import { MockStoreService } from '@/services/mockStoreService';
import {
  buildOrderStatusWhatsAppUrl,
  buildAdminCustomerWhatsAppUrl,
} from '@/utils/order';
import { Order, OrderStatus } from '@/types/order';

describe('Phase 4: Admin Kanban, WhatsApp Templates & Banners Unit Suite', () => {
  let service: MockStoreService;

  const sampleOrder: Order = {
    orderId: 'ROBY-20261106-9999',
    createdAt: new Date().toISOString(),
    customer: {
      fullName: 'هدى مصطفى',
      phone: '01012345678',
      governorate: 'Cairo',
      city: 'مدينة نصر',
      deliveryAddress: 'شارع عباس العقاد - عمارة 12',
    },
    items: [
      {
        productId: 'prod_abaya_crepe',
        productSlug: 'royal-crepe-silk-abaya',
        productTitleAr: 'عباية حرير كريب ملكي تطريز يدوي',
        productTitleEn: 'Hand-Embroidered Royal Silk Crepe Abaya',
        productImage: 'https://images.unsplash.com/photo-1',
        sku: 'ROBY-ABY-CRP-BLK-L',
        colorNameAr: 'أسود ملكي',
        colorNameEn: 'Royal Black',
        colorHex: '#1A1A1A',
        size: 'L',
        unitPrice: 1250,
        originalUnitPrice: 1450,
        quantity: 2,
        subtotal: 2500,
      },
    ],
    pricing: {
      subtotal: 2500,
      shippingFee: 50,
      totalSavings: 400,
      grandTotal: 2550,
      currency: 'EGP',
    },
    status: 'pending_dispatch',
    dispatchChannel: 'whatsapp',
    formattedSocialMessage: 'test message',
    whatsappDirectUrl: 'https://wa.me/201012345678',
  };

  beforeEach(() => {
    service = new MockStoreService(0);
  });

  describe('1. Tailored WhatsApp Status Notification URLs', () => {
    it('generates confirmed status WhatsApp URL with customer name and total', () => {
      const url = buildOrderStatusWhatsAppUrl(sampleOrder, 'confirmed');
      expect(url).toContain('https://wa.me/201012345678?text=');
      const decoded = decodeURIComponent(url);
      expect(decoded).toContain('هدى مصطفى');
      expect(decoded).toContain('تأكيد وتجهيز طلبكِ رقم: #ROBY-20261106-9999');
      expect(decoded).toContain('2550 ج.م');
    });

    it('generates shipped status WhatsApp URL with courier & governorate alert', () => {
      const url = buildOrderStatusWhatsAppUrl(sampleOrder, 'shipped');
      const decoded = decodeURIComponent(url);
      expect(decoded).toContain('مندوب التوصيل');
      expect(decoded).toContain('Cairo');
      expect(decoded).toContain('2550 ج.م');
    });

    it('generates delivered status WhatsApp URL with royal thank-you note', () => {
      const url = buildOrderStatusWhatsAppUrl(sampleOrder, 'delivered');
      const decoded = decodeURIComponent(url);
      expect(decoded).toContain('تم تسليم طلبكِ');
      expect(decoded).toContain('سعدنا جداً بخدمتكِ');
    });

    it('generates unified cancelled_or_returned status WhatsApp URL', () => {
      const url = buildOrderStatusWhatsAppUrl(sampleOrder, 'cancelled_or_returned');
      const decoded = decodeURIComponent(url);
      expect(decoded).toContain('ملغي / مرتجع');
      expect(decoded).toContain('#ROBY-20261106-9999');
    });
  });

  describe('2. Promotional Banners Service Mutations (CRUD & Storage)', () => {
    it('fetches initial active promotional banners', async () => {
      const banners = await service.getPromotionalBanners();
      expect(Array.isArray(banners)).toBe(true);
      expect(banners.length).toBeGreaterThanOrEqual(2);
      expect(banners.every((b) => b.isActive)).toBe(true);
    });

    it('creates a new promotional banner with custom category target', async () => {
      const newBanner = await service.createBanner({
        titleAr: 'عروض الجمعة البيضاء للأزياء',
        titleEn: 'White Friday Modest Fashion Offers',
        subtitleAr: 'أقوى التخفيضات حتى 50%',
        subtitleEn: 'Exclusive discounts up to 50%',
        badgeTextAr: 'عرض حصري',
        buttonTextAr: 'تسوقي الآن',
        buttonTextEn: 'Shop Now',
        imageUrl: 'https://images.unsplash.com/photo-banner-test',
        targetCategorySlug: 'abayas-and-kaftans',
        isActive: true,
        displayOrder: 3,
      });

      expect(newBanner.id).toBeDefined();
      expect(newBanner.titleAr).toBe('عروض الجمعة البيضاء للأزياء');
      expect(newBanner.targetCategorySlug).toBe('abayas-and-kaftans');

      const all = await service.getAllBanners();
      expect(all.some((b) => b.id === newBanner.id)).toBe(true);
    });

    it('updates existing banner status to inactive', async () => {
      const banners = await service.getAllBanners();
      const firstBanner = banners[0];

      const updated = await service.updateBanner(firstBanner.id, { isActive: false });
      expect(updated.isActive).toBe(false);

      const activeOnly = await service.getPromotionalBanners();
      expect(activeOnly.some((b) => b.id === firstBanner.id)).toBe(false);
    });

    it('deletes banner cleanly from data store', async () => {
      const banners = await service.getAllBanners();
      const bannerToDelete = banners[banners.length - 1];

      const success = await service.deleteBanner(bannerToDelete.id);
      expect(success).toBe(true);

      const remaining = await service.getAllBanners();
      expect(remaining.some((b) => b.id === bannerToDelete.id)).toBe(false);
    });
  });

  describe('3. Order Status Update for Unified Cancelled/Returned', () => {
    it('updates order status to cancelled_or_returned', async () => {
      const ordersRes = await service.getOrders({ pageSize: 1 });
      const firstOrder = ordersRes.data[0];

      const updated = await service.updateOrderStatus(
        firstOrder.orderId,
        'cancelled_or_returned'
      );

      expect(updated.status).toBe('cancelled_or_returned');

      const fetchedAgain = await service.getOrderById(firstOrder.orderId);
      expect(fetchedAgain?.status).toBe('cancelled_or_returned');
    });
  });
});
