import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { Order } from '@/types/order';
import OrderReceiptView from '@/components/admin/orders/OrderReceiptView';
import OrderReceiptPage from '@/app/admin/orders/[id]/receipt/page';
import ordersFixture from '@/data/orders.json';
import { MockStoreService } from '@/services/mockStoreService';
import * as storeServiceModule from '@/services/storeService';

describe('Order Receipt & Printable PDF Invoice Suite (Milestone 2)', () => {
  const sampleOrder: Order = ordersFixture[0] as Order;

  const multiItemOrder: Order = {
    orderId: 'ROBY-20261106-7788',
    createdAt: '2026-11-06T12:00:00Z',
    customer: {
      fullName: 'هدى عبد الرحمن الألفي',
      phone: '01099887766',
      alternativePhone: '01233445566',
      governorate: 'Alexandria',
      city: 'سموحة',
      deliveryAddress: 'شارع فوزي معاذ، عمارة الأندلس، الدور الرابع، شقة 8',
      notes: 'التسليم بعد الظهر حصراً',
    },
    items: [
      {
        productId: 'prod_01',
        productSlug: 'luxury-silk-abaya',
        productTitleAr: 'عباية حرير فاخرة',
        productTitleEn: 'Luxury Silk Abaya',
        productImage: 'https://images.unsplash.com/test1.jpg',
        sku: 'ROBY-ABY-01-BLK-M',
        colorNameAr: 'أسود ملكي',
        colorNameEn: 'Royal Black',
        colorHex: '#111111',
        size: 'M',
        unitPrice: 700,
        originalUnitPrice: 850,
        quantity: 2,
        subtotal: 1400,
      },
      {
        productId: 'prod_bedsheet_01',
        productSlug: 'egyptian-cotton-bedsheet',
        productTitleAr: 'طقم ملايات قطن مصري ملكي',
        productTitleEn: 'Royal Egyptian Cotton Bedsheet',
        productImage: 'https://images.unsplash.com/test2.jpg',
        sku: 'ROBY-BED-01-ROS-Q',
        colorNameAr: 'وردي مغبر',
        colorNameEn: 'Dusty Rose',
        colorHex: '#D4A5A5',
        size: '160x200cm (كوين)',
        unitPrice: 850,
        originalUnitPrice: 850,
        quantity: 1,
        subtotal: 850,
      },
    ],
    pricing: {
      subtotal: 2250,
      shippingFee: 65,
      totalSavings: 300,
      grandTotal: 2315,
      currency: 'EGP',
    },
    status: 'confirmed',
    dispatchChannel: 'whatsapp',
    formattedSocialMessage: 'طلب جديد #ROBY-20261106-7788',
    whatsappDirectUrl: 'https://wa.me/201099887766',
  };

  const zeroSavingsOrder: Order = {
    ...sampleOrder,
    orderId: 'ROBY-20261106-1122',
    pricing: {
      subtotal: 900,
      shippingFee: 50,
      totalSavings: 0,
      grandTotal: 950,
      currency: 'EGP',
    },
    customer: {
      ...sampleOrder.customer,
      notes: undefined,
      alternativePhone: undefined,
    },
  };

  beforeEach(() => {
    window.print = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==============================================================
  // 1. RECEIPT RENDERING & CUSTOMER INFO
  // ==============================================================
  describe('1. Receipt Rendering & Customer Details', () => {
    it('renders the complete customer information accurately', () => {
      render(<OrderReceiptView order={multiItemOrder} />);

      // Customer Name
      expect(screen.getByTestId('receipt-customer-name')).toHaveTextContent(
        'هدى عبد الرحمن الألفي'
      );

      // Customer Primary & Alternative Phones
      expect(screen.getByTestId('receipt-customer-phone')).toHaveTextContent('01099887766');
      expect(screen.getByTestId('receipt-customer-alt-phone')).toHaveTextContent('01233445566');

      // Delivery Governorate & City
      expect(screen.getByTestId('receipt-governorate')).toHaveTextContent('الإسكندرية');
      expect(screen.getByTestId('receipt-city')).toHaveTextContent('سموحة');

      // Detailed Address
      expect(screen.getByTestId('receipt-delivery-address')).toHaveTextContent(
        'شارع فوزي معاذ، عمارة الأندلس، الدور الرابع، شقة 8'
      );

      // Customer Delivery Notes
      expect(screen.getByTestId('receipt-customer-notes')).toHaveTextContent(
        'التسليم بعد الظهر حصراً'
      );
    });

    it('renders order metadata badge and creation reference', () => {
      render(<OrderReceiptView order={multiItemOrder} />);

      expect(screen.getByTestId('receipt-order-id')).toHaveTextContent(
        '#ROBY-20261106-7788'
      );
      expect(screen.getByTestId('receipt-order-status')).toHaveTextContent('مؤكد');
    });

    it('handles orders without delivery notes or alternative phone gracefully', () => {
      render(<OrderReceiptView order={zeroSavingsOrder} />);

      expect(screen.queryByTestId('receipt-customer-notes')).toBeNull();
      expect(screen.queryByTestId('receipt-customer-alt-phone')).toBeNull();
      expect(screen.getByTestId('receipt-customer-phone')).toHaveTextContent(
        zeroSavingsOrder.customer.phone
      );
    });
  });

  // ==============================================================
  // 2. LINE ITEMS & VARIANT MATRIX
  // ==============================================================
  describe('2. Line Items & Variant Specifications', () => {
    it('renders all line items with bilingual names and SKUs', () => {
      render(<OrderReceiptView order={multiItemOrder} />);

      const table = screen.getByTestId('receipt-items-table');
      expect(table).toBeInTheDocument();

      // Check product titles
      expect(screen.getByText('عباية حرير فاخرة')).toBeInTheDocument();
      expect(screen.getByText('Luxury Silk Abaya')).toBeInTheDocument();
      expect(screen.getByText('طقم ملايات قطن مصري ملكي')).toBeInTheDocument();
      expect(screen.getByText('Royal Egyptian Cotton Bedsheet')).toBeInTheDocument();

      // Check SKUs
      expect(screen.getByText('SKU: ROBY-ABY-01-BLK-M')).toBeInTheDocument();
      expect(screen.getByText('SKU: ROBY-BED-01-ROS-Q')).toBeInTheDocument();
    });

    it('displays variant specs including color name, hex swatch, and size', () => {
      render(<OrderReceiptView order={multiItemOrder} />);

      // Color Names
      expect(screen.getByText('أسود ملكي')).toBeInTheDocument();
      expect(screen.getByText('وردي مغبر')).toBeInTheDocument();

      // Sizes
      expect(screen.getByText('M')).toBeInTheDocument();
      expect(screen.getByText('160x200cm (كوين)')).toBeInTheDocument();

      // Color Swatches with accurate background hex
      const swatches = screen.getAllByTestId('item-color-swatch');
      expect(swatches.length).toBe(2);
      expect(swatches[0]).toHaveStyle({ backgroundColor: '#111111' });
      expect(swatches[1]).toHaveStyle({ backgroundColor: '#D4A5A5' });
    });

    it('displays unit prices, quantities, and line subtotals accurately', () => {
      render(<OrderReceiptView order={multiItemOrder} />);

      // Item 1: 700 x 2 = 1400
      expect(screen.getByText('1400')).toBeInTheDocument();

      // Item 2: 850 x 1 = 850 (matches both unit price and line total)
      const elements850 = screen.getAllByText('850');
      expect(elements850.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ==============================================================
  // 3. FINANCIAL BREAKDOWN & SAVINGS
  // ==============================================================
  describe('3. Financial Breakdown & Calculation Accuracy', () => {
    it('renders subtotal, shipping fee, and grand total', () => {
      render(<OrderReceiptView order={multiItemOrder} />);

      expect(screen.getByTestId('receipt-subtotal')).toHaveTextContent('2250 ج.م');
      expect(screen.getByTestId('receipt-shipping-fee')).toHaveTextContent('65 ج.م');
      expect(screen.getByTestId('receipt-grand-total')).toHaveTextContent('2315');
    });

    it('conditionally displays savings when totalSavings > 0', () => {
      render(<OrderReceiptView order={multiItemOrder} />);

      const savingsEl = screen.getByTestId('receipt-total-savings');
      expect(savingsEl).toBeInTheDocument();
      expect(savingsEl).toHaveTextContent('- 300 ج.م');
    });

    it('omits savings row when totalSavings is 0', () => {
      render(<OrderReceiptView order={zeroSavingsOrder} />);

      expect(screen.queryByTestId('receipt-total-savings')).toBeNull();
      expect(screen.getByTestId('receipt-grand-total')).toHaveTextContent('950');
    });

    it('displays Cash on Delivery (COD) payment guidance', () => {
      render(<OrderReceiptView order={multiItemOrder} />);

      expect(screen.getAllByText(/الدفع عند الاستلام/i).length).toBeGreaterThan(0);
    });
  });

  // ==============================================================
  // 4. BRANDING, LEGAL POLICIES & BARCODE
  // ==============================================================
  describe('4. Egyptian Luxury Branding & Store Policies', () => {
    it('renders Roby Store brand monogram and luxury headers', () => {
      render(<OrderReceiptView order={multiItemOrder} />);

      expect(screen.getByText('متجر روبي')).toBeInTheDocument();
      expect(screen.getByText('ROBY STORE')).toBeInTheDocument();
      expect(screen.getByText(/أزياء حريمي ومفروشات راقية/i)).toBeInTheDocument();
      expect(screen.getByText(/Cairo, Egypt/i)).toBeInTheDocument();
    });

    it('renders customer inspection rights and 14-day return policies', () => {
      render(<OrderReceiptView order={multiItemOrder} />);

      expect(screen.getByText('حق المعاينة عند الاستلام')).toBeInTheDocument();
      expect(screen.getByText('سياسة الاسترجاع والاستبدال')).toBeInTheDocument();
      expect(screen.getByText('خدمة العملاء والدعم الفني')).toBeInTheDocument();
    });

    it('renders decorative barcode representing the order ID', () => {
      render(<OrderReceiptView order={multiItemOrder} />);

      expect(screen.getByText('*ROBY-20261106-7788*')).toBeInTheDocument();
    });
  });

  // ==============================================================
  // 5. PRINT TRIGGER & AUTO-PRINT
  // ==============================================================
  describe('5. Print Button & AutoPrint Query Handling', () => {
    it('triggers window.print() when the print button is clicked', () => {
      render(<OrderReceiptView order={multiItemOrder} />);

      const printBtn = screen.getByTestId('print-receipt-button');
      expect(printBtn).toBeInTheDocument();

      fireEvent.click(printBtn);
      expect(window.print).toHaveBeenCalledTimes(1);
    });

    it('does not trigger window.print() on mount when autoPrint is false', () => {
      vi.useFakeTimers();
      render(<OrderReceiptView order={multiItemOrder} autoPrint={false} />);

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(window.print).not.toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('automatically triggers window.print() after mount when autoPrint is true', () => {
      vi.useFakeTimers();
      render(<OrderReceiptView order={multiItemOrder} autoPrint={true} />);

      act(() => {
        vi.advanceTimersByTime(600);
      });

      expect(window.print).toHaveBeenCalledTimes(1);
      vi.useRealTimers();
    });
  });

  // ==============================================================
  // 6. LANGUAGE MODE SWITCHER
  // ==============================================================
  describe('6. Language Mode Selector', () => {
    it('switches to Arabic-only mode when Arabic button is clicked', () => {
      render(<OrderReceiptView order={multiItemOrder} />);

      const arBtn = screen.getByTitle('عرض عربي فقط');
      fireEvent.click(arBtn);

      // In Arabic mode, English subtitles are suppressed
      expect(screen.queryByText(/Customer & Shipping Information/i)).toBeNull();
    });

    it('switches to English-only mode when English button is clicked', () => {
      render(<OrderReceiptView order={multiItemOrder} />);

      const enBtn = screen.getByTitle('English only');
      fireEvent.click(enBtn);

      // English status label is shown
      expect(screen.getByText('Confirmed')).toBeInTheDocument();
    });
  });

  // ==============================================================
  // 7. DYNAMIC ROUTE & 404 ORDER NOT FOUND HANDLING
  // ==============================================================
  describe('7. Route Page & 404 Not Found Handling', () => {
    it('fetches and renders an existing order successfully in OrderReceiptPage', async () => {
      const mockService = new MockStoreService(0);
      vi.spyOn(storeServiceModule, 'getStoreService').mockReturnValue(mockService);

      render(<OrderReceiptPage params={{ id: sampleOrder.orderId }} />);

      await waitFor(() => {
        expect(screen.getByTestId('printable-order-receipt')).toBeInTheDocument();
      });

      expect(screen.getByTestId('receipt-order-id')).toHaveTextContent(sampleOrder.orderId);
      expect(screen.getByTestId('receipt-customer-name')).toHaveTextContent(
        sampleOrder.customer.fullName
      );
    });

    it('renders clean 404 message with back link when order does not exist', async () => {
      const mockService = new MockStoreService(0);
      vi.spyOn(storeServiceModule, 'getStoreService').mockReturnValue(mockService);

      render(<OrderReceiptPage params={{ id: 'ROBY-NONEXISTENT-9999' }} />);

      await waitFor(() => {
        expect(screen.getByTestId('order-receipt-not-found')).toBeInTheDocument();
      });

      expect(screen.getByText(/الطلب غير موجود/i)).toBeInTheDocument();
      expect(screen.getByText(/ROBY-NONEXISTENT-9999/)).toBeInTheDocument();

      const backLink = screen.getByRole('link', { name: /العودة لقائمة الطلبات/i });
      expect(backLink).toBeInTheDocument();
      expect(backLink).toHaveAttribute('href', '/admin/orders');
    });

    it('triggers autoPrint when searchParams.autoPrint === "true"', async () => {
      vi.useFakeTimers();
      const mockService = new MockStoreService(0);
      vi.spyOn(storeServiceModule, 'getStoreService').mockReturnValue(mockService);

      render(
        <OrderReceiptPage
          params={{ id: sampleOrder.orderId }}
          searchParams={{ autoPrint: 'true' }}
        />
      );

      // Wait for fetch to resolve
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      // Advance timer for auto-print
      act(() => {
        vi.advanceTimersByTime(600);
      });

      expect(window.print).toHaveBeenCalled();
      vi.useRealTimers();
    });
  });
});
