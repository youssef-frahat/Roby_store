import { describe, it, expect } from 'vitest';
import {
  generateOrderId,
  formatOrderReceiptMessage,
  buildWhatsAppOrderUrl,
  formatSocialOrderSummary,
} from '../../src/utils/order';
import type { Order } from '../../src/types/order';

describe('Order Formatting & WhatsApp URL Generation (R4, AC 2 - Tiers 1 & 2)', () => {
  const mockOrder: Order = {
    orderId: 'ROBY-20261028-4821',
    createdAt: '2026-10-28T14:30:00.000Z',
    customer: {
      fullName: 'مريم محمود',
      phone: '01012345678',
      governorate: 'Cairo',
      city: 'مدينة نصر',
      deliveryAddress: '25 شارع النزهة، عمارة الأمل، شقة 12',
      notes: 'الاستلام مساءً من فضلك',
    },
    items: [
      {
        productId: 'prod_01',
        productSlug: 'luxury-silk-abaya',
        productTitleAr: 'عباية حرير فاخرة',
        productTitleEn: 'Luxury Silk Abaya',
        productImage: '/images/abaya-1.jpg',
        sku: 'ROBY-ABY-BLK-L',
        colorNameAr: 'أسود ملكي',
        colorNameEn: 'Royal Black',
        colorHex: '#1A1A1A',
        size: 'L',
        unitPrice: 700,
        originalUnitPrice: 850,
        quantity: 2,
        subtotal: 1400,
      },
    ],
    pricing: {
      subtotal: 1400,
      shippingFee: 50,
      totalSavings: 300,
      grandTotal: 1450,
      currency: 'EGP',
    },
    status: 'pending_dispatch',
    dispatchChannel: 'whatsapp',
    formattedSocialMessage: '',
    whatsappDirectUrl: '',
  };

  // ==========================================
  // TIER 1: FEATURE COVERAGE (HAPPY PATH)
  // ==========================================

  describe('Tier 1: Feature Coverage (>=5 test cases)', () => {
    it('TC-T1-RCP-01: generates deterministic order ID matching pattern ROBY-YYYYMMDD-XXXX', () => {
      const orderId = generateOrderId();
      expect(orderId).toMatch(/^ROBY-\d{8}-\d{4}$/);
    });

    it('TC-T1-RCP-02: formats structured receipt containing order reference and customer details', () => {
      const receipt = formatOrderReceiptMessage(mockOrder);

      expect(receipt).toContain('طلب جديد من متجر روبي - Roby Store');
      expect(receipt).toContain('#ROBY-20261028-4821');
      expect(receipt).toContain('مريم محمود');
      expect(receipt).toContain('01012345678');
      expect(receipt).toContain('Cairo');
      expect(receipt).toContain('مدينة نصر');
      expect(receipt).toContain('25 شارع النزهة');
    });

    it('TC-T1-RCP-03: formats itemized product details with variant color, size, and line subtotal', () => {
      const receipt = formatOrderReceiptMessage(mockOrder);

      expect(receipt).toContain('عباية حرير فاخرة');
      expect(receipt).toContain('المقاس: L');
      expect(receipt).toContain('اللون: أسود ملكي');
      expect(receipt).toContain('2 × 700 ج.م = *1400 ج.م*');
      expect(receipt).toContain('ROBY-ABY-BLK-L');
    });

    it('TC-T1-RCP-04: includes financial summary breakdown and savings line', () => {
      const receipt = formatOrderReceiptMessage(mockOrder);

      expect(receipt).toContain('إجمالي المنتجات: 1400 ج.م');
      expect(receipt).toContain('مصاريف الشحن (Cairo): 50 ج.م');
      expect(receipt).toContain('إجمالي التوفير في هذا الطلب:* 300 ج.م');
      expect(receipt).toContain('الإجمالي النهائي المطلوب دَفعه:* *1450 ج.م*');
    });

    it('TC-T1-WHA-01: builds valid WhatsApp URL with normalized phone and wa.me protocol', () => {
      const url = buildWhatsAppOrderUrl('01001234567', 'مرحبا');

      // Prepend country code 2 to local 010... number
      expect(url.startsWith('https://wa.me/201001234567?text=')).toBe(true);
      expect(url).toContain(encodeURIComponent('مرحبا'));
    });
  });

  // ==========================================
  // TIER 2: BOUNDARY & CORNER CASES (>=5 test cases)
  // ==========================================

  describe('Tier 2: Boundary & Corner Cases (>=5 test cases)', () => {
    it('TC-T2-WHA-01: percent-encodes Arabic text, emojis, and newlines safely', () => {
      const receipt = formatOrderReceiptMessage(mockOrder);
      const url = buildWhatsAppOrderUrl('201001234567', receipt);

      // Verify no raw unencoded newlines or spaces in the URL
      expect(url).not.toContain('\n');
      expect(url).not.toContain(' ');
      // Verify encoded characters are present
      expect(url).toContain('%0A'); // newline
      expect(url).toContain('%20'); // space
    });

    it('TC-T2-WHA-02: round-trip decoding restores original receipt text exactly', () => {
      const receipt = formatOrderReceiptMessage(mockOrder);
      const url = buildWhatsAppOrderUrl('201001234567', receipt);

      const encodedText = url.split('?text=')[1];
      const decodedText = decodeURIComponent(encodedText);

      expect(decodedText).toBe(receipt);
    });

    it('TC-T2-WHA-03: cleans special characters, spaces, dashes from merchant phone', () => {
      const dirtyPhones = [
        '+20 100 123 4567',
        '+20-100-123-4567',
        '00201001234567',
        '(+20) 100-123-4567',
      ];

      for (const dirty of dirtyPhones) {
        const url = buildWhatsAppOrderUrl(dirty, 'Test');
        expect(url.startsWith('https://wa.me/201001234567?text=')).toBe(true);
      }
    });

    it('TC-T2-WHA-04: omits savings line when totalSavings is 0', () => {
      const noSavingsOrder: Order = {
        ...mockOrder,
        pricing: {
          ...mockOrder.pricing,
          totalSavings: 0,
        },
      };

      const receipt = formatOrderReceiptMessage(noSavingsOrder);
      expect(receipt).not.toContain('إجمالي التوفير في هذا الطلب');
    });

    it('TC-T2-WHA-05: handles customer notes containing URL reserved characters (&, =, ?, #)', () => {
      const specialOrder: Order = {
        ...mockOrder,
        customer: {
          ...mockOrder.customer,
          notes: 'ملاحظة: السعر=1450 & التسليم? بعد 5م #هام',
        },
      };

      const receipt = formatOrderReceiptMessage(specialOrder);
      const url = buildWhatsAppOrderUrl('201001234567', receipt);

      // If & or = were not encoded, they would corrupt query parameters
      const urlParams = new URL(url).searchParams;
      const textParam = urlParams.get('text');

      expect(textParam).toBe(receipt);
      expect(textParam).toContain('السعر=1450 & التسليم? بعد 5م #هام');
    });

    it('TC-T2-WHA-06: formats plain-text social order summary for Instagram and Messenger', () => {
      const summary = formatSocialOrderSummary(mockOrder);

      expect(summary).toContain('#ROBY-20261028-4821');
      expect(summary).toContain('مريم محمود');
      expect(summary).toContain('1450');
    });
  });
});
