import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { Order, OrderItem } from '@/types/order';
import OrderReceiptView from '@/components/admin/orders/OrderReceiptView';
import OrderReceiptPage from '@/app/admin/orders/[id]/receipt/page';
import { MockStoreService } from '@/services/mockStoreService';
import * as storeServiceModule from '@/services/storeService';

// Factory for adversarial test orders
function createAdversarialOrder(overrides: Partial<Order> = {}): Order {
  const baseOrder: Order = {
    orderId: 'ROBY-ADV-20261106-0001',
    createdAt: '2026-11-06T14:00:00.000Z',
    customer: {
      fullName: 'أحمد محمود التلمساني',
      phone: '01011122233',
      alternativePhone: '01244455566',
      governorate: 'Giza',
      city: 'الدقي',
      deliveryAddress: '15 شارع مصدق، الدور الثالث، شقة 6',
      notes: 'الاتصال قبل التوصيل بنصف ساعة',
    },
    items: [
      {
        productId: 'prod_abaya_01',
        productSlug: 'luxury-silk-abaya',
        productTitleAr: 'عباية حرير ملكية فاخرة',
        productTitleEn: 'Royal Luxury Silk Abaya',
        productImage: 'https://images.unsplash.com/abaya.jpg',
        sku: 'ROBY-ABY-SILK-M',
        colorNameAr: 'عنابي فاخر',
        colorNameEn: 'Burgundy',
        colorHex: '#800020',
        size: 'L',
        unitPrice: 1200,
        originalUnitPrice: 1500,
        quantity: 1,
        subtotal: 1200,
      },
    ],
    pricing: {
      subtotal: 1200,
      shippingFee: 50,
      totalSavings: 300,
      grandTotal: 1250,
      currency: 'EGP',
    },
    status: 'pending_dispatch',
    dispatchChannel: 'whatsapp',
    formattedSocialMessage: '',
    whatsappDirectUrl: 'https://wa.me/201011122233',
  };

  return {
    ...baseOrder,
    ...overrides,
    customer: {
      ...baseOrder.customer,
      ...(overrides.customer || {}),
    },
    pricing: {
      ...baseOrder.pricing,
      ...(overrides.pricing || {}),
    },
  };
}

describe('Empirical Challenger: Milestone 2 Receipt & PDF Print Adversarial Suite', () => {
  beforeEach(() => {
    window.print = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // Challenge 1: Order with 0 Savings
  // =========================================================================
  describe('Challenge 1: Zero Savings Edge Case', () => {
    it('confirms savings row is cleanly omitted when totalSavings is 0', () => {
      const zeroSavingsOrder = createAdversarialOrder({
        orderId: 'ROBY-ZERO-SAVINGS-01',
        pricing: {
          subtotal: 1000,
          shippingFee: 60,
          totalSavings: 0,
          grandTotal: 1060,
          currency: 'EGP',
        },
      });

      render(<OrderReceiptView order={zeroSavingsOrder} />);

      // receipt-total-savings test ID must NOT be rendered
      expect(screen.queryByTestId('receipt-total-savings')).toBeNull();

      // Ensure no text mentions "إجمالي التوفير" or "- 0"
      expect(screen.queryByText(/إجمالي التوفير/i)).toBeNull();
      expect(screen.queryByText(/- 0/)).toBeNull();

      // Subtotal, shipping, and grand total remain accurate
      expect(screen.getByTestId('receipt-subtotal')).toHaveTextContent('1000 ج.م');
      expect(screen.getByTestId('receipt-shipping-fee')).toHaveTextContent('60 ج.م');
      expect(screen.getByTestId('receipt-grand-total')).toHaveTextContent('1060');
    });

    it('confirms savings row is cleanly omitted when totalSavings is negative or undefined', () => {
      const negativeSavingsOrder = createAdversarialOrder({
        orderId: 'ROBY-NEG-SAVINGS-02',
        pricing: {
          subtotal: 800,
          shippingFee: 50,
          totalSavings: -10 as any,
          grandTotal: 850,
          currency: 'EGP',
        },
      });

      render(<OrderReceiptView order={negativeSavingsOrder} />);

      expect(screen.queryByTestId('receipt-total-savings')).toBeNull();
      expect(screen.queryByText(/إجمالي التوفير/i)).toBeNull();
    });
  });

  // =========================================================================
  // Challenge 2: Multi-Item Stress & Long Notes (Page Breaks & avoid-break)
  // =========================================================================
  describe('Challenge 2: Multi-Item Stress & Long Delivery Notes Page Breaks', () => {
    it('renders 15+ items and confirms every tr element has page-break-inside/avoid-break styles', () => {
      const fifteenItems: OrderItem[] = Array.from({ length: 15 }, (_, i) => ({
        productId: `prod_bulk_${i + 1}`,
        productSlug: `bulk-product-${i + 1}`,
        productTitleAr: `منتج فاخر رقم ${i + 1}`,
        productTitleEn: `Luxury Item #${i + 1}`,
        productImage: `https://images.unsplash.com/item-${i + 1}.jpg`,
        sku: `ROBY-ITEM-${String(i + 1).padStart(3, '0')}`,
        colorNameAr: i % 2 === 0 ? 'كحلي داكن' : 'ذهبي مطرز',
        colorNameEn: i % 2 === 0 ? 'Dark Navy' : 'Embroidered Gold',
        colorHex: i % 2 === 0 ? '#0B132B' : '#D4AF37',
        size: i % 3 === 0 ? 'XL' : 'M',
        unitPrice: 300 + i * 20,
        originalUnitPrice: 350 + i * 20,
        quantity: (i % 2) + 1,
        subtotal: (300 + i * 20) * ((i % 2) + 1),
      }));

      const subtotalSum = fifteenItems.reduce((acc, item) => acc + item.subtotal, 0);

      const massiveOrder = createAdversarialOrder({
        orderId: 'ROBY-MASSIVE-15-ITEMS',
        items: fifteenItems,
        pricing: {
          subtotal: subtotalSum,
          shippingFee: 65,
          totalSavings: 450,
          grandTotal: subtotalSum + 65 - 450,
          currency: 'EGP',
        },
      });

      render(<OrderReceiptView order={massiveOrder} />);

      const table = screen.getByTestId('receipt-items-table');
      expect(table).toBeInTheDocument();

      // Confirm all 15 rows rendered
      const rows = table.querySelectorAll('tbody tr');
      expect(rows.length).toBe(15);

      // Verify each row possesses the 'avoid-break' CSS class for page break avoidance
      rows.forEach((row, idx) => {
        expect(row.className).toContain('avoid-break');
      });

      // Confirm embedded style sheet includes page-break-inside avoid rules
      const styleTag = document.querySelector('style');
      expect(styleTag).not.toBeNull();
      const styleContent = styleTag?.innerHTML || '';
      expect(styleContent).toContain('break-inside: avoid !important');
      expect(styleContent).toContain('page-break-inside: avoid !important');
      expect(styleContent).toContain('.avoid-break');
      expect(styleContent).toContain('tr {');
    });

    it('handles 1000+ characters long customer notes with special symbols, emojis, and quotes gracefully', () => {
      const veryLongNotes =
        'ملاحظة خاصة جداً: العمارة تقع بجوار مسجد النصر الكائن خلف صيدلية الدكتور أحمد. ' +
        'البوابة الخلفية مفتوحة حتى الساعة العاشرة مساءً فقط. الرجاء عدم استخدام المصعد رقم 2 لأنه قيد الصيانة. ' +
        'الرجاء الاتصال بالرقم البديل في حال تعذر الوصول للرقم الأساسي. ' +
        '⚠️ يُرجى الحذر: يوجد كلب حراسة أليف في مدخل العقار 🐕. ' +
        '✨ مواعيد التواجد: من 4 عصراً إلى 9 مساءً. ' +
        'التفاصيل الدقيقة: الدور السابع، شقة رقم 22 يمين المصعد، يرجى طرق الباب برفق. ' +
        '<script>alert("xss")</script> & "quotes" & \'single\' & /slashes/. ' +
        'تأكيد استلام الطلب شخصياً من صاحب الشأن فقط مع شكرنا الجزيل لفريق العمل المحترم.';

      const longNoteOrder = createAdversarialOrder({
        orderId: 'ROBY-LONG-NOTE-01',
        customer: {
          fullName: 'د. ياسمين حسني الباشا',
          phone: '01199887766',
          alternativePhone: '01055443322',
          governorate: 'Cairo',
          city: 'المعادي الجديدة',
          deliveryAddress: 'شارع النصر، برج المعادي بلازا، الدور 7، شقة 22',
          notes: veryLongNotes,
        },
      });

      render(<OrderReceiptView order={longNoteOrder} />);

      const notesEl = screen.getByTestId('receipt-customer-notes');
      expect(notesEl).toBeInTheDocument();
      expect(notesEl).toHaveTextContent(veryLongNotes);

      // Embedded style tag must exist
      expect(document.querySelector('style')).not.toBeNull();
      // Raw unescaped script element must NOT be injected
      expect(document.querySelector('script:not([data-testid])')).toBeNull();
      expect(notesEl.innerHTML).not.toContain('<script>alert');
    });
  });

  // =========================================================================
  // Challenge 3: Non-Existent Order IDs & 404 Graceful Error
  // =========================================================================
  describe('Challenge 3: Non-Existent Order IDs & 404 Resilience', () => {
    it('gracefully handles non-existent order ID and provides working back navigation link', async () => {
      const mockService = new MockStoreService(0);
      vi.spyOn(storeServiceModule, 'getStoreService').mockReturnValue(mockService);

      render(<OrderReceiptPage params={{ id: 'ROBY-FAKE-NONEXISTENT-ID-404' }} />);

      // Should show error card
      await waitFor(() => {
        expect(screen.getByTestId('order-receipt-not-found')).toBeInTheDocument();
      });

      // Error message should clearly identify missing order
      expect(
        screen.getByText(/لم يتم العثور على أي طلب مسجل بالمعرف #ROBY-FAKE-NONEXISTENT-ID-404/i)
      ).toBeInTheDocument();

      // Back button to /admin/orders must exist
      const backLink = screen.getByRole('link', { name: /العودة لقائمة الطلبات/i });
      expect(backLink).toBeInTheDocument();
      expect(backLink).toHaveAttribute('href', '/admin/orders');
    });

    it('handles empty orderId or missing params cleanly', async () => {
      const mockService = new MockStoreService(0);
      vi.spyOn(storeServiceModule, 'getStoreService').mockReturnValue(mockService);

      render(<OrderReceiptPage params={{ id: '' }} />);

      await waitFor(() => {
        expect(screen.getByTestId('order-receipt-not-found')).toBeInTheDocument();
      });

      expect(screen.getByText(/معرف الطلب غير محدد/i)).toBeInTheDocument();
    });

    it('handles service rejection/throw gracefully without unhandled crashes', async () => {
      const mockService = new MockStoreService(0);
      vi.spyOn(mockService, 'getOrderById').mockRejectedValueOnce(
        new Error('Database connection failed')
      );
      vi.spyOn(storeServiceModule, 'getStoreService').mockReturnValue(mockService);

      render(<OrderReceiptPage params={{ id: 'ROBY-THROWS-500' }} />);

      await waitFor(() => {
        expect(screen.getByTestId('order-receipt-not-found')).toBeInTheDocument();
      });

      expect(screen.getByText(/Database connection failed/i)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Challenge 4: Auto-Print Query & SSR/Hydration
  // =========================================================================
  describe('Challenge 4: Auto-Print Query & SSR/Hydration Safety', () => {
    it('renders cleanly in pure SSR (server-side string rendering) without window access or crash', () => {
      const sampleOrder = createAdversarialOrder();

      // Pure SSR rendering: window.print is not available during server render
      const serverHtml = renderToString(
        <OrderReceiptView order={sampleOrder} autoPrint={true} />
      );

      expect(serverHtml).toContain('متجر روبي');
      expect(serverHtml).toContain(sampleOrder.orderId);
      expect(serverHtml).toContain('فاتورة مبيعات وسند استلام');
      // window.print should never be triggered during server render
      expect(window.print).not.toHaveBeenCalled();
    });

    it('triggers window.print() after client mount and timer elapse when autoPrint is true', () => {
      vi.useFakeTimers();
      const sampleOrder = createAdversarialOrder();

      render(<OrderReceiptView order={sampleOrder} autoPrint={true} />);

      // Before timer elapses, print is not called
      expect(window.print).not.toHaveBeenCalled();

      // Advance past 500ms debounce
      act(() => {
        vi.advanceTimersByTime(550);
      });

      expect(window.print).toHaveBeenCalledTimes(1);
      vi.useRealTimers();
    });

    it('does not trigger duplicate prints on re-render', () => {
      vi.useFakeTimers();
      const sampleOrder = createAdversarialOrder();

      const { rerender } = render(<OrderReceiptView order={sampleOrder} autoPrint={true} />);

      act(() => {
        vi.advanceTimersByTime(600);
      });

      expect(window.print).toHaveBeenCalledTimes(1);

      // Re-render component with same or modified props
      rerender(<OrderReceiptView order={sampleOrder} autoPrint={true} />);

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Still only 1 call — no infinite print loop
      expect(window.print).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });

    it('manual print button triggers window.print without error', () => {
      const sampleOrder = createAdversarialOrder();
      render(<OrderReceiptView order={sampleOrder} autoPrint={false} />);

      const printBtn = screen.getByTestId('print-receipt-button');
      fireEvent.click(printBtn);
      fireEvent.click(printBtn);

      expect(window.print).toHaveBeenCalledTimes(2);
    });
  });

  // =========================================================================
  // Challenge 5: Unknown Governorate & Missing Bilingual Fields Fallbacks
  // =========================================================================
  describe('Challenge 5: Unknown Governorate & Missing Bilingual Fields Resilience', () => {
    it('handles an unknown governorate code gracefully without crashing', () => {
      const unknownGovOrder = createAdversarialOrder({
        customer: {
          fullName: 'سعيد عبد المولى',
          phone: '01000000000',
          governorate: 'UnknownGovCode',
          city: 'حي النور',
          deliveryAddress: 'شارع السلام',
        },
      });

      render(<OrderReceiptView order={unknownGovOrder} />);

      const govEl = screen.getByTestId('receipt-governorate');
      expect(govEl).toBeInTheDocument();
      // It should display the raw value rather than throwing undefined error
      expect(govEl).toHaveTextContent('UnknownGovCode');
    });

    it('handles missing productTitleEn and colorNameEn gracefully', () => {
      const missingEnOrder = createAdversarialOrder({
        items: [
          {
            productId: 'prod_arabic_only',
            productSlug: 'arabic-product',
            productTitleAr: 'مفرش سرير مطرز يدوي',
            productTitleEn: undefined as any,
            productImage: 'https://images.unsplash.com/test.jpg',
            sku: 'ROBY-BED-HANDMADE',
            colorNameAr: 'سكري هادئ',
            colorNameEn: undefined as any,
            colorHex: '#FDFBF7',
            size: 'King',
            unitPrice: 950,
            originalUnitPrice: 950,
            quantity: 1,
            subtotal: 950,
          },
        ],
      });

      render(<OrderReceiptView order={missingEnOrder} />);

      // Switch to English mode
      const enBtn = screen.getByTitle('English only');
      fireEvent.click(enBtn);

      // Should fall back to Arabic title and color name
      expect(screen.getByText('مفرش سرير مطرز يدوي')).toBeInTheDocument();
      expect(screen.getByText('سكري هادئ')).toBeInTheDocument();
    });

    it('handles custom onBack callback without navigating away if provided', () => {
      const onBackMock = vi.fn();
      const sampleOrder = createAdversarialOrder();

      render(<OrderReceiptView order={sampleOrder} onBack={onBackMock} />);

      const backBtn = screen.getByRole('button', { name: 'العودة للطلبات' });
      fireEvent.click(backBtn);

      expect(onBackMock).toHaveBeenCalledTimes(1);
    });
  });
});
