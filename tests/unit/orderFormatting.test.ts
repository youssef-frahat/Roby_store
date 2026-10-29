import { describe, it, expect } from 'vitest';
import {
  generateOrderId,
  formatOrderReceiptMessage,
  buildWhatsAppOrderUrl,
  formatSocialOrderSummary,
} from '../../src/utils/order';
import { Order } from '../../src/types/order';

describe('Order Formatting & Social Commerce WhatsApp Protocol', () => {
  it('generates consistent order ID matching pattern ROBY-YYYYMMDD-XXXX', () => {
    const id = generateOrderId();
    expect(id).toMatch(/^ROBY-\d{8}-\d{4}$/);
  });

  const sampleOrder: Order = {
    orderId: 'ROBY-20261028-1234',
    createdAt: '2026-10-28T12:00:00Z',
    customer: {
      fullName: 'مريم محمد علي',
      phone: '01123456789',
      alternativePhone: '01098765432',
      governorate: 'Giza',
      city: 'الدقي',
      deliveryAddress: 'شارع مصدق عمارة 10 شقة 5',
      notes: 'يرجى الاتصال قبل الوصول بنصف ساعة',
    },
    items: [
      {
        productId: 'prod_1',
        productSlug: 'slug-1',
        productTitleAr: 'طقم ملاية قطن مصري',
        productTitleEn: 'Egyptian Cotton Bedding',
        productImage: '',
        sku: 'ROBY-SHT-01-WHT-160',
        colorNameAr: 'أبيض لؤلؤي',
        colorNameEn: 'Pearl White',
        colorHex: '#fff',
        size: '160x200cm (كوين)',
        unitPrice: 690,
        originalUnitPrice: 850,
        quantity: 1,
        subtotal: 690,
      },
    ],
    pricing: {
      subtotal: 690,
      shippingFee: 50,
      totalSavings: 160,
      grandTotal: 740,
      currency: 'EGP',
    },
    status: 'dispatched_whatsapp',
    dispatchChannel: 'whatsapp',
    formattedSocialMessage: '',
    whatsappDirectUrl: '',
  };

  it('formats structured, itemized receipt message with all customer and financial details', () => {
    const receipt = formatOrderReceiptMessage(sampleOrder);

    expect(receipt).toContain('متجر روبي - Roby Store');
    expect(receipt).toContain('#ROBY-20261028-1234');
    expect(receipt).toContain('مريم محمد علي');
    expect(receipt).toContain('01123456789');
    expect(receipt).toContain('01098765432');
    expect(receipt).toContain('Giza');
    expect(receipt).toContain('الدقي');
    expect(receipt).toContain('شارع مصدق عمارة 10 شقة 5');
    expect(receipt).toContain('طقم ملاية قطن مصري');
    expect(receipt).toContain('المقاس: 160x200cm (كوين)');
    expect(receipt).toContain('اللون: أبيض لؤلؤي');
    expect(receipt).toContain('690 ج.م');
    expect(receipt).toContain('740 ج.م');
    expect(receipt).toContain('إجمالي التوفير في هذا الطلب:* 160 ج.م');
    expect(receipt).toContain('يرجى الاتصال قبل الوصول بنصف ساعة');
  });

  it('normalizes Egyptian phone numbers and builds valid wa.me URI-encoded URL', () => {
    const message = 'طلب جديد #123';
    // Case 1: Phone formatted as local Egyptian mobile starting with 01
    const url1 = buildWhatsAppOrderUrl('01001234567', message);
    expect(url1).toBe('https://wa.me/201001234567?text=%D8%B7%D9%84%D8%A8%20%D8%AC%D8%AF%D9%8A%D8%AF%20%23123');

    // Case 2: Phone with spaces or plus signs
    const url2 = buildWhatsAppOrderUrl('+20 100 123 4567', message);
    expect(url2).toBe('https://wa.me/201001234567?text=%D8%B7%D9%84%D8%A8%20%D8%AC%D8%AF%D9%8A%D8%AF%20%23123');
  });

  it('formats plain-text summary identical to receipt for social channels', () => {
    const receipt = formatOrderReceiptMessage(sampleOrder);
    const social = formatSocialOrderSummary(sampleOrder);
    expect(social).toBe(receipt);
  });
});
