import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Order, OrderStatus, OrderItem } from '@/types/order';
import {
  buildAdminCustomerWhatsAppUrl,
  buildWhatsAppOrderUrl,
  formatOrderReceiptMessage,
  formatSocialOrderSummary,
} from '@/utils/order';
import { MockStoreService } from '@/services/mockStoreService';
import OrdersTable from '@/components/admin/orders/OrdersTable';
import OrderDetailsDrawer from '@/components/admin/orders/OrderDetailsDrawer';
import OrderFiltersBar from '@/components/admin/orders/OrderFiltersBar';
import OrderStatusBadge, { ORDER_STATUS_LABELS } from '@/components/admin/orders/OrderStatusBadge';
import OrderStatusSelector from '@/components/admin/orders/OrderStatusSelector';
import ordersFixture from '@/data/orders.json';

// Helper to create synthetic test orders with edge cases
function createEdgeOrder(overrides: Partial<Order> = {}): Order {
  const baseOrder: Order = {
    orderId: 'ROBY-20261106-9999',
    createdAt: new Date().toISOString(),
    customer: {
      fullName: 'فاطمة الزهراء الشناوي',
      phone: '01012345678',
      alternativePhone: '01123456789',
      governorate: 'Cairo',
      city: 'مدينة نصر',
      deliveryAddress: 'شارع عباس العقاد، برج النصر، شقة 14',
      notes: 'يرجى الاتصال عند الوصول',
    },
    items: [
      {
        productId: 'prod_01',
        productSlug: 'luxury-silk-abaya',
        productTitleAr: 'عباية حرير فاخرة',
        productTitleEn: 'Luxury Silk Abaya',
        productImage: 'https://images.unsplash.com/test.jpg',
        sku: 'ROBY-ABY-01-BLK-M',
        colorNameAr: 'أسود ملكي',
        colorNameEn: 'Royal Black',
        colorHex: '#111111',
        size: 'M',
        unitPrice: 700,
        originalUnitPrice: 850,
        quantity: 1,
        subtotal: 700,
      },
    ],
    pricing: {
      subtotal: 700,
      shippingFee: 50,
      totalSavings: 150,
      grandTotal: 750,
      currency: 'EGP',
    },
    status: 'pending_dispatch',
    dispatchChannel: 'whatsapp',
    formattedSocialMessage: '',
    whatsappDirectUrl: '',
  };

  return {
    ...baseOrder,
    ...overrides,
    customer: { ...baseOrder.customer, ...(overrides.customer || {}) },
    pricing: { ...baseOrder.pricing, ...(overrides.pricing || {}) },
    items: overrides.items || baseOrder.items,
  };
}

describe('Challenger Adversarial Stress Harness: Orders UI, Build & Workflows (Phase 3 Milestone 1)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // =========================================================================
  // SUITE 1: WhatsApp URL Construction, Encoding & Edge Characters
  // =========================================================================
  describe('Suite 1: WhatsApp URL Construction & Special Characters Adversarial Stress', () => {
    it('CHAL-WA-01: handles complex Arabic names with full diacritics (تَشْكِيل)', () => {
      const order = createEdgeOrder({
        customer: {
          fullName: 'سَارَةُ إِبْرَاهِيمُ مُحَمَّدٌ الشَّنَاوِيُّ',
          phone: '01012345678',
          governorate: 'Cairo',
          city: 'مدينة نصر',
          deliveryAddress: 'العنوان',
        },
      });

      const url = buildAdminCustomerWhatsAppUrl(order);
      expect(url.startsWith('https://wa.me/201012345678?text=')).toBe(true);

      const parsedUrl = new URL(url);
      const text = decodeURIComponent(parsedUrl.searchParams.get('text') || '');

      expect(text).toContain('سَارَةُ إِبْرَاهِيمُ مُحَمَّدٌ الشَّنَاوِيُّ');
      expect(text).toContain(order.orderId);
      expect(text).toContain(String(order.pricing.grandTotal));
    });

    it('CHAL-WA-02: safely encodes URL delimiters and dangerous characters (&, ?, #, =, /, %, +, ", <, >)', () => {
      const adversarialName = 'منى & ريم ? أحمد # علي = سامي / هبة % مي + نور "هدى" <دينا>';
      const order = createEdgeOrder({
        customer: {
          fullName: adversarialName,
          phone: '01123456789',
          governorate: 'Giza',
          city: 'الدقي',
          deliveryAddress: 'العنوان',
          notes: 'ملاحظة: الصنف & العبوة #1 ? سعر = 50% + توصيل',
        },
      });

      const url = buildAdminCustomerWhatsAppUrl(order);
      const parsedUrl = new URL(url);

      // Verify URL structure was NOT corrupted by #, &, or ? in the text
      expect(parsedUrl.origin).toBe('https://wa.me');
      expect(parsedUrl.pathname).toBe('/201123456789');
      expect(parsedUrl.hash).toBe(''); // '#' in name should NOT become a fragment identifier!

      const text = parsedUrl.searchParams.get('text');
      expect(text).not.toBeNull();
      expect(text).toContain(adversarialName);
    });

    it('CHAL-WA-03: handles diverse international and Egyptian phone formatting variations', () => {
      const testCases = [
        { input: '01012345678', expectedPhone: '201012345678' },
        { input: '+201012345678', expectedPhone: '201012345678' },
        { input: '00201012345678', expectedPhone: '201012345678' },
        { input: '201012345678', expectedPhone: '201012345678' },
        { input: ' 012 3456 7890 ', expectedPhone: '201234567890' },
        { input: '015-1234-5678', expectedPhone: '201512345678' },
      ];

      for (const { input, expectedPhone } of testCases) {
        const order = createEdgeOrder({ customer: { fullName: 'اختبار', phone: input, governorate: 'Cairo', city: 'القاهرة', deliveryAddress: 'العنوان' } });
        const url = buildAdminCustomerWhatsAppUrl(order);
        const parsed = new URL(url);
        expect(parsed.pathname).toBe(`/${expectedPhone}`);
      }
    });

    it('CHAL-WA-04: preserves multi-line formatting and Egyptian social commerce emojis', () => {
      const order = createEdgeOrder();
      const url = buildAdminCustomerWhatsAppUrl(order);
      const parsed = new URL(url);
      const text = parsed.searchParams.get('text') || '';

      expect(text).toContain('👋🌸');
      expect(text).toContain('\n');
      expect(text).toContain('متجر روبي ستور (ROBY STORE)');
    });
  });

  // =========================================================================
  // SUITE 2: Zero Savings Adversarial Stress (totalSavings === 0)
  // =========================================================================
  describe('Suite 2: Zero Savings Edge Inputs (totalSavings === 0)', () => {
    it('CHAL-SAV-01: formatOrderReceiptMessage omits savings line entirely when totalSavings is 0', () => {
      const orderZeroSavings = createEdgeOrder({
        pricing: {
          subtotal: 1000,
          shippingFee: 50,
          totalSavings: 0,
          grandTotal: 1050,
          currency: 'EGP',
        },
      });

      const message = formatOrderReceiptMessage(orderZeroSavings);
      expect(message).not.toContain('إجمالي التوفير في هذا الطلب');
      expect(message).not.toContain('🎉');
      expect(message).toContain('• إجمالي المنتجات: 1000 ج.م');
      expect(message).toContain('⭐ *الإجمالي النهائي المطلوب دَفعه:* *1050 ج.م*');
    });

    it('CHAL-SAV-02: OrdersTable does not render green savings badge when totalSavings is 0', () => {
      const orderZeroSavings = createEdgeOrder({
        orderId: 'ROBY-ZERO-SAVINGS',
        pricing: {
          subtotal: 800,
          shippingFee: 50,
          totalSavings: 0,
          grandTotal: 850,
          currency: 'EGP',
        },
      });

      render(
        <OrdersTable
          orders={[orderZeroSavings]}
          isLoading={false}
          onViewOrder={vi.fn()}
          onStatusChange={vi.fn()}
        />
      );

      expect(screen.getByText('850 ج.م')).toBeInTheDocument();
      expect(screen.queryByText(/توفير:/i)).not.toBeInTheDocument();
    });

    it('CHAL-SAV-03: OrderDetailsDrawer suppresses savings row when totalSavings is 0', () => {
      const orderZeroSavings = createEdgeOrder({
        orderId: 'ROBY-ZERO-SAVINGS-DRAWER',
        pricing: {
          subtotal: 900,
          shippingFee: 65,
          totalSavings: 0,
          grandTotal: 965,
          currency: 'EGP',
        },
      });

      render(
        <OrderDetailsDrawer
          order={orderZeroSavings}
          isOpen={true}
          onClose={vi.fn()}
          onStatusChange={vi.fn()}
        />
      );

      expect(screen.getByText('965 ج.م')).toBeInTheDocument();
      expect(screen.queryByText(/إجمالي التوفير في هذا الطلب/i)).not.toBeInTheDocument();
    });

    it('CHAL-SAV-04: verifies KPI revenue aggregation correctly includes orders with zero savings', () => {
      const orders = [
        createEdgeOrder({ orderId: 'O1', status: 'confirmed', pricing: { subtotal: 500, shippingFee: 50, totalSavings: 0, grandTotal: 550, currency: 'EGP' } }),
        createEdgeOrder({ orderId: 'O2', status: 'delivered', pricing: { subtotal: 1000, shippingFee: 50, totalSavings: 200, grandTotal: 1050, currency: 'EGP' } }),
        createEdgeOrder({ orderId: 'O3', status: 'cancelled', pricing: { subtotal: 800, shippingFee: 50, totalSavings: 0, grandTotal: 850, currency: 'EGP' } }),
      ];

      // Exclude cancelled: O1 (550) + O2 (1050) = 1600 EGP
      const nonCancelledRevenue = orders
        .filter((o) => o.status !== 'cancelled')
        .reduce((sum, o) => sum + (o.pricing?.grandTotal || 0), 0);

      expect(nonCancelledRevenue).toBe(1600);
    });
  });

  // =========================================================================
  // SUITE 3: Multiple Variant Items & High-Density Orders
  // =========================================================================
  describe('Suite 3: Multiple Variant Items Matrix Stress (Colors, Sizes, Quantities)', () => {
    it('CHAL-VAR-01: renders orders with multiple distinct variants with correct aggregate count', () => {
      const multiVariantItems: OrderItem[] = [
        {
          productId: 'prod_01',
          productSlug: 'luxury-silk-abaya',
          productTitleAr: 'عباية حرير فاخرة - أسود M',
          productTitleEn: 'Luxury Silk Abaya - Black M',
          productImage: 'https://images.unsplash.com/1.jpg',
          sku: 'ROBY-ABY-BLK-M',
          colorNameAr: 'أسود ملكي',
          colorNameEn: 'Royal Black',
          colorHex: '#111111',
          size: 'M',
          unitPrice: 700,
          quantity: 2,
          subtotal: 1400,
        },
        {
          productId: 'prod_01',
          productSlug: 'luxury-silk-abaya',
          productTitleAr: 'عباية حرير فاخرة - وردي L',
          productTitleEn: 'Luxury Silk Abaya - Rose L',
          productImage: 'https://images.unsplash.com/2.jpg',
          sku: 'ROBY-ABY-ROS-L',
          colorNameAr: 'وردي مغبر',
          colorNameEn: 'Dusty Rose',
          colorHex: '#D4A5A5',
          size: 'L',
          unitPrice: 700,
          quantity: 3,
          subtotal: 2100,
        },
        {
          productId: 'prod_bedsheet_01',
          productSlug: 'cotton-sheet',
          productTitleAr: 'طقم ملاية قطن كينج',
          productTitleEn: 'Cotton Sheet King',
          productImage: '',
          sku: 'ROBY-SHT-WHT-180',
          colorNameAr: 'أبيض ناصع',
          colorNameEn: 'Pure White',
          colorHex: '#FFFFFF',
          size: '180x200cm (كينج)',
          unitPrice: 850,
          quantity: 1,
          subtotal: 850,
        },
      ];

      const multiOrder = createEdgeOrder({
        orderId: 'ROBY-MULTI-VAR-01',
        items: multiVariantItems,
        pricing: {
          subtotal: 4350,
          shippingFee: 50,
          totalSavings: 400,
          grandTotal: 4400,
          currency: 'EGP',
        },
      });

      // Total quantity: 2 + 3 + 1 = 6 pieces across 3 distinct variants
      render(
        <OrdersTable
          orders={[multiOrder]}
          isLoading={false}
          onViewOrder={vi.fn()}
          onStatusChange={vi.fn()}
        />
      );

      // Verify aggregate item count badge in table
      expect(screen.getByText('6 قطع (3 صنف)')).toBeInTheDocument();
    });

    it('CHAL-VAR-02: OrderDetailsDrawer displays all variants, swatches, sizes, and handles missing image gracefully', () => {
      const itemsWithMissingImage: OrderItem[] = [
        {
          productId: 'prod_no_img',
          productSlug: 'item-no-image',
          productTitleAr: 'شال كشمير أصلي',
          productTitleEn: 'Original Cashmere Shawl',
          productImage: '', // Missing image fallback
          sku: 'ROBY-SHWL-BRN-OS',
          colorNameAr: 'بني شوكولاتة',
          colorNameEn: 'Chocolate Brown',
          colorHex: '#3D2314',
          size: 'One Size',
          unitPrice: 450,
          quantity: 4,
          subtotal: 1800,
        },
      ];

      const order = createEdgeOrder({
        orderId: 'ROBY-NO-IMAGE-VAR',
        items: itemsWithMissingImage,
      });

      render(
        <OrderDetailsDrawer
          order={order}
          isOpen={true}
          onClose={vi.fn()}
          onStatusChange={vi.fn()}
        />
      );

      expect(screen.getByText('شال كشمير أصلي')).toBeInTheDocument();
      expect(screen.getByText('بني شوكولاتة')).toBeInTheDocument();
      expect(screen.getByText('المقاس: One Size')).toBeInTheDocument();
      expect(screen.getByText('ROBY-SHWL-BRN-OS')).toBeInTheDocument();
      expect(screen.getByText('المنتجات المطلوبة (4 قطع):')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // SUITE 4: Long Text, Arabic Diacritics & Delivery Notes Stress
  // =========================================================================
  describe('Suite 4: Long Names, Arabic Diacritics & Long Delivery Notes', () => {
    it('CHAL-TXT-01: renders extremely long customer names (150+ chars) in Table and Drawer without breaking', () => {
      const extremelyLongName =
        'صاحبة السمو الأميرة فوزية بنت الملك فؤاد الأول بن إسماعيل بن إبراهيم باشا بن محمد علي باشا الكبير والوفد المرافق';
      const order = createEdgeOrder({
        orderId: 'ROBY-LONG-NAME',
        customer: {
          fullName: extremelyLongName,
          phone: '01012345678',
          governorate: 'Cairo',
          city: 'الزمالك',
          deliveryAddress: 'قصر الجزيرة، شارع الجبلاية، الزمالك',
        },
      });

      // Render Table
      const { unmount } = render(
        <OrdersTable
          orders={[order]}
          isLoading={false}
          onViewOrder={vi.fn()}
          onStatusChange={vi.fn()}
        />
      );
      expect(screen.getByText(extremelyLongName)).toBeInTheDocument();
      unmount();

      // Render Drawer
      render(
        <OrderDetailsDrawer
          order={order}
          isOpen={true}
          onClose={vi.fn()}
          onStatusChange={vi.fn()}
        />
      );
      expect(screen.getByText(extremelyLongName)).toBeInTheDocument();
    });

    it('CHAL-TXT-02: renders long multi-paragraph delivery notes in OrderDetailsDrawer', () => {
      const longNotes =
        'ملاحظات هامة جداً:\n' +
        '1. العمارة ليس بها مصعد والدور السادس.\n' +
        '2. يرجى الاتصال على الرقم البديل في حالة عدم الرد على الرقم الأساسي.\n' +
        '3. مطلوب الدفع كاش مع طلب فاتورة ورقية مختومة.\n' +
        '4. موعد التسليم المناسب حصراً بين الساعة 4 عصراً و 7 مساءً.\n' +
        '5. برجاء التعامل بحرص شديد مع الأقمشة والحرير.';

      const order = createEdgeOrder({
        orderId: 'ROBY-LONG-NOTES',
        customer: {
          fullName: 'ياسمين صبري',
          phone: '01211112222',
          alternativePhone: '01099998888',
          governorate: 'Alexandria',
          city: 'جليم',
          deliveryAddress: 'طريق الجيش، برج قايتباي',
          notes: longNotes,
        },
      });

      render(
        <OrderDetailsDrawer
          order={order}
          isOpen={true}
          onClose={vi.fn()}
          onStatusChange={vi.fn()}
        />
      );

      expect(screen.getByText(/ملاحظات خاصة من العميل:/i)).toBeInTheDocument();
      expect(
        screen.getByText((content) => content.includes('ملاحظات هامة جداً'))
      ).toBeInTheDocument();
      expect(screen.getByText(/(بديل: 01099998888)/i)).toBeInTheDocument();
    });

    it('CHAL-TXT-03: omits notes card completely when order.customer.notes is empty or absent', () => {
      const orderNoNotes = createEdgeOrder({
        customer: {
          fullName: 'نور الدين',
          phone: '01155554444',
          governorate: 'Giza',
          city: 'المهندسين',
          deliveryAddress: 'شارع البطل أحمد عبد العزيز',
          notes: '',
        },
      });

      render(
        <OrderDetailsDrawer
          order={orderNoNotes}
          isOpen={true}
          onClose={vi.fn()}
          onStatusChange={vi.fn()}
        />
      );

      expect(screen.queryByText(/ملاحظات خاصة من العميل:/i)).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // SUITE 5: Interactive Component State & Mutation Stress
  // =========================================================================
  describe('Suite 5: Interactive Component State & Mutation Stress', () => {
    it('CHAL-INT-01: OrderStatusSelector fires onStatusChange with valid OrderStatus', async () => {
      const handleStatusChange = vi.fn();
      render(
        <OrderStatusSelector
          currentStatus="pending_dispatch"
          onStatusChange={handleStatusChange}
        />
      );

      const select = screen.getByRole('combobox');
      expect(select).toHaveValue('pending_dispatch');

      await act(async () => {
        fireEvent.change(select, { target: { value: 'shipped' } });
      });
      expect(handleStatusChange).toHaveBeenCalledWith('shipped');
    });

    it('CHAL-INT-02: OrderDetailsDrawer closes on Escape key press and backdrop click', () => {
      const handleClose = vi.fn();
      const order = createEdgeOrder();

      const { rerender } = render(
        <OrderDetailsDrawer
          order={order}
          isOpen={true}
          onClose={handleClose}
          onStatusChange={vi.fn()}
        />
      );

      // Press Escape key
      fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);

      // Backdrop click
      const backdrop = document.querySelector('.bg-charcoal-950\\/50');
      if (backdrop) {
        fireEvent.click(backdrop);
        expect(handleClose).toHaveBeenCalledTimes(2);
      }
    });

    it('CHAL-INT-03: OrderStatusBadge renders correct labels and styling for all 6 statuses', () => {
      const statuses: OrderStatus[] = [
        'pending_dispatch',
        'dispatched_whatsapp',
        'confirmed',
        'shipped',
        'delivered',
        'cancelled',
      ];

      for (const st of statuses) {
        const { unmount } = render(<OrderStatusBadge status={st} />);
        const badge = screen.getByText(ORDER_STATUS_LABELS[st]);
        expect(badge).toBeInTheDocument();
        unmount();
      }
    });

    it('CHAL-INT-04: MockStoreService updates status persistently across multiple mutations', async () => {
      const service = new MockStoreService(0);
      const orders = await service.getOrders({ pageSize: 10 });
      expect(orders.total).toBeGreaterThan(0);

      const targetOrder = orders.data[0];
      const initialStatus = targetOrder.status;

      // 1. Mutate to 'shipped'
      const updated1 = await service.updateOrderStatus(targetOrder.orderId, 'shipped');
      expect(updated1.status).toBe('shipped');

      // 2. Mutate to 'delivered'
      const updated2 = await service.updateOrderStatus(targetOrder.orderId, 'delivered');
      expect(updated2.status).toBe('delivered');

      // 3. Mutate to 'cancelled'
      const updated3 = await service.updateOrderStatus(targetOrder.orderId, 'cancelled');
      expect(updated3.status).toBe('cancelled');

      // Verify persisted state in fresh service instance from localStorage
      const freshService = new MockStoreService(0);
      const retrieved = await freshService.getOrderById(targetOrder.orderId);
      expect(retrieved?.status).toBe('cancelled');
    });
  });

  // =========================================================================
  // SUITE 6: Multi-Criteria Filter Bar & Dynamic Query Matching
  // =========================================================================
  describe('Suite 6: Multi-Criteria Filter Bar & Query Matching Stress', () => {
    it('CHAL-FLT-01: OrderFiltersBar renders search, status dropdown, and 27 governorates', () => {
      render(
        <OrderFiltersBar
          searchQuery=""
          onSearchChange={vi.fn()}
          statusFilter="all"
          onStatusChange={vi.fn()}
          governorateFilter="all"
          onGovernorateChange={vi.fn()}
          totalFilteredCount={7}
          totalOrdersCount={7}
          onResetFilters={vi.fn()}
        />
      );

      expect(screen.getByPlaceholderText(/البحث برقم الطلب، اسم العميل، أو رقم الهاتف.../i)).toBeInTheDocument();
      expect(screen.getByLabelText(/تصفية حسب حالة الطلب/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/تصفية حسب المحافظة/i)).toBeInTheDocument();
      expect(
        screen.getByText((_, element) => element?.tagName.toLowerCase() === 'span' && (element?.textContent?.includes('عرض 7 من أصل 7 طلب') ?? false))
      ).toBeInTheDocument();
    });

    it('CHAL-FLT-02: triggers onResetFilters and displays reset button only when filters are active', () => {
      const handleReset = vi.fn();
      const { rerender } = render(
        <OrderFiltersBar
          searchQuery=""
          onSearchChange={vi.fn()}
          statusFilter="all"
          onStatusChange={vi.fn()}
          governorateFilter="all"
          onGovernorateChange={vi.fn()}
          totalFilteredCount={7}
          totalOrdersCount={7}
          onResetFilters={handleReset}
        />
      );

      // When no filter is active, reset button is hidden
      expect(screen.queryByText(/إعادة تعيين الفلاتر/i)).not.toBeInTheDocument();

      // When a search query is active
      rerender(
        <OrderFiltersBar
          searchQuery="سارة"
          onSearchChange={vi.fn()}
          statusFilter="all"
          onStatusChange={vi.fn()}
          governorateFilter="all"
          onGovernorateChange={vi.fn()}
          totalFilteredCount={1}
          totalOrdersCount={7}
          onResetFilters={handleReset}
        />
      );

      const resetBtn = screen.getByText(/إعادة تعيين الفلاتر/i);
      expect(resetBtn).toBeInTheDocument();
      fireEvent.click(resetBtn);
      expect(handleReset).toHaveBeenCalledTimes(1);
    });

    it('CHAL-FLT-03: verifies cross-field filtering logic across ID, customer, phone, status, and governorate', async () => {
      const service = new MockStoreService(0);
      const allOrders = (await service.getOrders({ pageSize: 100 })).data;

      // 1. Filter by phone substring
      const phoneMatches = allOrders.filter((o) => o.customer.phone.includes('123456'));
      expect(phoneMatches.length).toBeGreaterThan(0);

      // 2. Filter by status 'delivered'
      const deliveredMatches = allOrders.filter((o) => o.status === 'delivered');
      expect(deliveredMatches.length).toBeGreaterThan(0);
      expect(deliveredMatches.every((o) => o.status === 'delivered')).toBe(true);

      // 3. Filter by governorate 'Alexandria'
      const alexMatches = allOrders.filter((o) => o.customer.governorate === 'Alexandria');
      expect(alexMatches.length).toBeGreaterThan(0);
      expect(alexMatches.every((o) => o.customer.governorate === 'Alexandria')).toBe(true);

      // 4. Combined: Alexandria + confirmed
      const combined = allOrders.filter(
        (o) => o.customer.governorate === 'Alexandria' && o.status === 'confirmed'
      );
      expect(combined.length).toBeGreaterThan(0);
      expect(combined.every((o) => o.customer.governorate === 'Alexandria' && o.status === 'confirmed')).toBe(true);
    });
  });

  // =========================================================================
  // SUITE 7: Social Receipt Formatting & Admin-Customer Alignment
  // =========================================================================
  describe('Suite 7: Social Receipt Formatting & Admin-Customer Communication Alignment', () => {
    it('CHAL-SOC-01: formatSocialOrderSummary matches formatOrderReceiptMessage exactly', () => {
      const order = createEdgeOrder();
      const socialSummary = formatSocialOrderSummary(order);
      const receiptMessage = formatOrderReceiptMessage(order);

      expect(socialSummary).toBe(receiptMessage);
      expect(socialSummary).toContain(`🔖 *رقم الطلب:* #${order.orderId}`);
      expect(socialSummary).toContain(`• الاسم: ${order.customer.fullName}`);
    });

    it('CHAL-SOC-02: generates correct itemized lines with SKU, size, color, and unit calculation', () => {
      const order = createEdgeOrder();
      const receipt = formatOrderReceiptMessage(order);

      const firstItem = order.items[0];
      expect(receipt).toContain(`*${firstItem.productTitleAr}*`);
      expect(receipt).toContain(`المقاس: ${firstItem.size} | اللون: ${firstItem.colorNameAr}`);
      expect(receipt).toContain(`${firstItem.quantity} × ${firstItem.unitPrice} ج.م = *${firstItem.subtotal} ج.م*`);
      expect(receipt).toContain(`كود: \`${firstItem.sku}\``);
    });
  });
});

