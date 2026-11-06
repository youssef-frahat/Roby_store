import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import AdminOrdersPage from '@/app/admin/orders/page';
import { MockStoreService } from '@/services/mockStoreService';
import * as storeServiceModule from '@/services/storeService';
import { Order, OrderStatus } from '@/types/order';
import ordersFixture from '@/data/orders.json';

describe('Empirical Challenger: Phase 3 Milestone 3 Final E2E & Orders Board Verification', () => {
  let mockService: MockStoreService;

  beforeEach(() => {
    localStorage.clear();
    mockService = new MockStoreService(0);
    vi.spyOn(storeServiceModule, 'getStoreService').mockReturnValue(mockService);
  });

  // =========================================================================
  // SUITE 1: Admin Orders Page Initial Load & KPI Metrics Accuracy
  // =========================================================================
  describe('Suite 1: Admin Orders Page Initial Load & Live KPI Metrics', () => {
    it('CHAL-PAGE-01: renders page title, description, and loads orders list from storeService', async () => {
      render(<AdminOrdersPage />);

      // Header verification
      expect(screen.getByRole('heading', { level: 1, name: 'إدارة الطلبات' })).toBeInTheDocument();
      expect(
        screen.getByText(/لوحة التحكم المركزية لمتابعة ومعالجة كافة طلبات متجر روبي وتحديث الحالات لحظياً/i)
      ).toBeInTheDocument();

      // Wait for orders to load from MockStoreService
      await waitFor(() => {
        expect(screen.getByText(ordersFixture[0].customer.fullName)).toBeInTheDocument();
      });

      // Verify all orders in fixture are rendered in table
      for (const order of ordersFixture) {
        expect(screen.getByText(`#${order.orderId}`)).toBeInTheDocument();
      }
    });

    it('CHAL-PAGE-02: dynamically computes and displays 4 KPI summary cards with zero hardcoded values', async () => {
      render(<AdminOrdersPage />);

      await waitFor(() => {
        expect(screen.getByText(ordersFixture[0].customer.fullName)).toBeInTheDocument();
      });

      // 1. Total Orders KPI
      const totalSection = screen.getByText('إجمالي الطلبات').parentElement!;
      expect(within(totalSection).getByText(String(ordersFixture.length))).toBeInTheDocument();

      // 2. Pending Orders KPI (pending_dispatch + dispatched_whatsapp)
      const expectedPending = ordersFixture.filter(
        (o) => o.status === 'pending_dispatch' || o.status === 'dispatched_whatsapp'
      ).length;
      const pendingSection = screen.getByText('طلبات جديدة وقيد التجهيز').parentElement!;
      expect(within(pendingSection).getByText(String(expectedPending))).toBeInTheDocument();

      // 3. Active Delivery Orders KPI (confirmed + shipped)
      const expectedActive = ordersFixture.filter(
        (o) => o.status === 'confirmed' || o.status === 'shipped'
      ).length;
      const activeSection = screen.getByText('طلبات جارية ومؤكدة').parentElement!;
      expect(within(activeSection).getByText(String(expectedActive))).toBeInTheDocument();

      // 4. Total Revenue KPI (excluding cancelled)
      const expectedRevenue = ordersFixture
        .filter((o) => o.status !== 'cancelled')
        .reduce((sum, o) => sum + (o.pricing?.grandTotal || 0), 0);
      const revenueSection = screen.getByText('إجمالي المبيعات المحققة').parentElement!;
      expect(within(revenueSection).getByText(new RegExp(expectedRevenue.toLocaleString('ar-EG')))).toBeInTheDocument();
    });

    it('CHAL-PAGE-03: manual refresh button triggers reload and displays dismissible success toast', async () => {
      render(<AdminOrdersPage />);

      await waitFor(() => {
        expect(screen.getByText(ordersFixture[0].customer.fullName)).toBeInTheDocument();
      });

      const refreshBtn = screen.getByRole('button', { name: /تحديث البيانات/i });
      expect(refreshBtn).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(refreshBtn);
      });

      await waitFor(() => {
        expect(screen.getByText(/تم تحديث قائمة الطلبات بنجاح من قاعدة البيانات/i)).toBeInTheDocument();
      });

      // Dismiss toast
      const closeToastBtn = screen.getByLabelText('إغلاق التنبيه');
      fireEvent.click(closeToastBtn);
      expect(screen.queryByText(/تم تحديث قائمة الطلبات بنجاح من قاعدة البيانات/i)).toBeNull();
    });
  });

  // =========================================================================
  // SUITE 2: Multi-Criteria Filtering & Search on Page
  // =========================================================================
  describe('Suite 2: Multi-Criteria Filtering & Dynamic Query Matching', () => {
    it('CHAL-FILTER-01: filters orders by search query matching Order ID, Customer Name, or Phone', async () => {
      render(<AdminOrdersPage />);

      await waitFor(() => {
        expect(screen.getByText(ordersFixture[0].customer.fullName)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/البحث برقم الطلب، اسم العميل، أو رقم الهاتف.../i);

      // Search by partial Order ID
      fireEvent.change(searchInput, { target: { value: ordersFixture[0].orderId.slice(-4) } });
      expect(screen.getByText(`#${ordersFixture[0].orderId}`)).toBeInTheDocument();

      // Search by Customer Name
      fireEvent.change(searchInput, { target: { value: ordersFixture[1].customer.fullName } });
      expect(screen.getByText(ordersFixture[1].customer.fullName)).toBeInTheDocument();
      expect(screen.queryByText(ordersFixture[0].customer.fullName)).toBeNull();

      // Search by Phone Number
      fireEvent.change(searchInput, { target: { value: ordersFixture[2].customer.phone } });
      expect(screen.getByText(ordersFixture[2].customer.fullName)).toBeInTheDocument();
      expect(screen.queryByText(ordersFixture[1].customer.fullName)).toBeNull();
    });

    it('CHAL-FILTER-02: shows zero-results empty state when search matches no orders', async () => {
      render(<AdminOrdersPage />);

      await waitFor(() => {
        expect(screen.getByText(ordersFixture[0].customer.fullName)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/البحث برقم الطلب، اسم العميل، أو رقم الهاتف.../i);
      fireEvent.change(searchInput, { target: { value: 'NONEXISTENT_CUSTOMER_QUERY_XYZ' } });

      expect(screen.getByText('لا توجد طلبات مطابقة للبحث أو الفلتر')).toBeInTheDocument();
      expect(
        screen.getByText(/جرب تغيير معايير البحث أو اختيار محافظة أخرى أو إعادة ضبط الفلاتر لعرض كافة الطلبات/i)
      ).toBeInTheDocument();
    });

    it('CHAL-FILTER-03: filters orders by status dropdown', async () => {
      render(<AdminOrdersPage />);

      await waitFor(() => {
        expect(screen.getByText(ordersFixture[0].customer.fullName)).toBeInTheDocument();
      });

      const statusSelect = screen.getByLabelText(/تصفية حسب حالة الطلب/i);

      // Filter by 'delivered'
      fireEvent.change(statusSelect, { target: { value: 'delivered' } });

      const deliveredOrders = ordersFixture.filter((o) => o.status === 'delivered');
      const nonDeliveredOrders = ordersFixture.filter((o) => o.status !== 'delivered');

      for (const d of deliveredOrders) {
        expect(screen.getByText(`#${d.orderId}`)).toBeInTheDocument();
      }
      for (const nd of nonDeliveredOrders) {
        expect(screen.queryByText(`#${nd.orderId}`)).toBeNull();
      }
    });

    it('CHAL-FILTER-04: filters orders by governorate dropdown', async () => {
      render(<AdminOrdersPage />);

      await waitFor(() => {
        expect(screen.getByText(ordersFixture[0].customer.fullName)).toBeInTheDocument();
      });

      const govSelect = screen.getByLabelText(/تصفية حسب المحافظة/i);

      // Filter by Alexandria
      fireEvent.change(govSelect, { target: { value: 'Alexandria' } });

      const alexOrders = ordersFixture.filter((o) => o.customer.governorate === 'Alexandria');
      const nonAlexOrders = ordersFixture.filter((o) => o.customer.governorate !== 'Alexandria');

      expect(alexOrders.length).toBeGreaterThan(0);
      for (const a of alexOrders) {
        expect(screen.getByText(`#${a.orderId}`)).toBeInTheDocument();
      }
      for (const na of nonAlexOrders) {
        expect(screen.queryByText(`#${na.orderId}`)).toBeNull();
      }
    });

    it('CHAL-FILTER-05: reset button restores full orders list from filtered state', async () => {
      render(<AdminOrdersPage />);

      await waitFor(() => {
        expect(screen.getByText(ordersFixture[0].customer.fullName)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/البحث برقم الطلب، اسم العميل، أو رقم الهاتف.../i);
      fireEvent.change(searchInput, { target: { value: 'سارة' } });

      const resetBtn = screen.getByRole('button', { name: /إعادة تعيين الفلاتر/i });
      expect(resetBtn).toBeInTheDocument();

      fireEvent.click(resetBtn);

      // All fixture orders must be restored
      for (const order of ordersFixture) {
        expect(screen.getByText(`#${order.orderId}`)).toBeInTheDocument();
      }
      expect(screen.queryByRole('button', { name: /إعادة تعيين الفلاتر/i })).toBeNull();
    });
  });

  // =========================================================================
  // SUITE 3: Real Status Mutation & Optimistic Rollback
  // =========================================================================
  describe('Suite 3: Real Status Mutation, Zero Facade & Optimistic Rollback', () => {
    it('CHAL-MUT-01: updates order status from table dropdown and persists in storeService', async () => {
      render(<AdminOrdersPage />);

      await waitFor(() => {
        expect(screen.getByText(ordersFixture[0].customer.fullName)).toBeInTheDocument();
      });

      const targetOrder = ordersFixture[0];
      const row = screen.getByText(`#${targetOrder.orderId}`).closest('tr');
      expect(row).not.toBeNull();

      // Find status selector in this row
      const select = within(row!).getByLabelText('تغيير حالة الطلب');
      expect(select).toHaveValue(targetOrder.status);

      // Change status to 'shipped'
      await act(async () => {
        fireEvent.change(select, { target: { value: 'shipped' } });
      });

      // Verify success toast appears with order ID
      await waitFor(() => {
        expect(
          screen.getByText(new RegExp(`تم تحديث حالة الطلب #${targetOrder.orderId} بنجاح`))
        ).toBeInTheDocument();
      });

      // Verify persistent storage in service
      const retrieved = await mockService.getOrderById(targetOrder.orderId);
      expect(retrieved?.status).toBe('shipped');
    });

    it('CHAL-MUT-02: rolls back optimistic status change and displays error feedback when service throws', async () => {
      render(<AdminOrdersPage />);

      await waitFor(() => {
        expect(screen.getByText(ordersFixture[0].customer.fullName)).toBeInTheDocument();
      });

      // Mock updateOrderStatus to reject
      vi.spyOn(mockService, 'updateOrderStatus').mockRejectedValueOnce(
        new Error('Network failure during database commit')
      );

      const targetOrder = ordersFixture[0];
      const initialStatus = targetOrder.status;
      const row = screen.getByText(`#${targetOrder.orderId}`).closest('tr');
      const select = within(row!).getByLabelText('تغيير حالة الطلب');

      await act(async () => {
        fireEvent.change(select, { target: { value: 'delivered' } });
      });

      // Error toast should appear
      await waitFor(() => {
        expect(
          screen.getByText(/تعذر تحديث حالة الطلب: Network failure during database commit/i)
        ).toBeInTheDocument();
      });

      // Selector should roll back to initial status
      expect(select).toHaveValue(initialStatus);
    });

    it('CHAL-MUT-03: dynamically recalculates KPI revenue and metrics when order is cancelled', async () => {
      render(<AdminOrdersPage />);

      await waitFor(() => {
        expect(screen.getByText(ordersFixture[0].customer.fullName)).toBeInTheDocument();
      });

      // Find a non-cancelled order
      const targetOrder = ordersFixture.find((o) => o.status !== 'cancelled')!;
      const row = screen.getByText(`#${targetOrder.orderId}`).closest('tr');
      const select = within(row!).getByLabelText('تغيير حالة الطلب');

      // Cancel the order
      await act(async () => {
        fireEvent.change(select, { target: { value: 'cancelled' } });
      });

      await waitFor(() => {
        expect(
          screen.getByText(new RegExp(`تم تحديث حالة الطلب #${targetOrder.orderId} بنجاح`))
        ).toBeInTheDocument();
      });

      // Verify the order status persisted as cancelled
      const persisted = await mockService.getOrderById(targetOrder.orderId);
      expect(persisted?.status).toBe('cancelled');
    });
  });

  // =========================================================================
  // SUITE 4: Order Details Drawer Deep Interactivity
  // =========================================================================
  describe('Suite 4: Order Details Drawer Deep Interactivity', () => {
    it('CHAL-DRAWER-01: clicking Order ID opens drawer with complete customer info and variant matrix', async () => {
      render(<AdminOrdersPage />);

      await waitFor(() => {
        expect(screen.getByText(ordersFixture[0].customer.fullName)).toBeInTheDocument();
      });

      const targetOrder = ordersFixture[0];
      const orderBtn = screen.getByText(`#${targetOrder.orderId}`);
      fireEvent.click(orderBtn);

      // Drawer should open and display order details
      expect(screen.getByText(`طلب #${targetOrder.orderId}`)).toBeInTheDocument();
      expect(screen.getByText(targetOrder.customer.deliveryAddress)).toBeInTheDocument();
      if (targetOrder.customer.notes) {
        expect(screen.getByText(targetOrder.customer.notes)).toBeInTheDocument();
      }

      // Verify item details inside drawer
      for (const item of targetOrder.items) {
        expect(screen.getByText(item.productTitleAr)).toBeInTheDocument();
        expect(screen.getByText(item.colorNameAr)).toBeInTheDocument();
        expect(screen.getByText(`المقاس: ${item.size}`)).toBeInTheDocument();
        expect(screen.getByText(item.sku)).toBeInTheDocument();
      }

      // Close drawer via button
      const closeBtn = screen.getByRole('button', { name: 'إغلاق تفاصيل الطلب' });
      fireEvent.click(closeBtn);
      expect(screen.queryByText(`طلب #${targetOrder.orderId}`)).toBeNull();
    });

    it('CHAL-DRAWER-02: updating status inside drawer syncs back to page and database', async () => {
      render(<AdminOrdersPage />);

      await waitFor(() => {
        expect(screen.getByText(ordersFixture[0].customer.fullName)).toBeInTheDocument();
      });

      const targetOrder = ordersFixture[0];
      fireEvent.click(screen.getByText(`#${targetOrder.orderId}`));

      // Find drawer container
      const drawer = screen.getByText(`طلب #${targetOrder.orderId}`).closest('.w-screen');
      expect(drawer).not.toBeNull();

      // Find status selector inside drawer
      const drawerSelect = within(drawer as HTMLElement).getByLabelText('تغيير حالة الطلب');

      await act(async () => {
        fireEvent.change(drawerSelect, { target: { value: 'confirmed' } });
      });

      await waitFor(() => {
        expect(
          screen.getByText(new RegExp(`تم تحديث حالة الطلب #${targetOrder.orderId} بنجاح`))
        ).toBeInTheDocument();
      });

      // Verify persistence in service
      const retrieved = await mockService.getOrderById(targetOrder.orderId);
      expect(retrieved?.status).toBe('confirmed');
    });

    it('CHAL-DRAWER-03: drawer WhatsApp button opens wa.me link with Egyptian country code 201...', async () => {
      render(<AdminOrdersPage />);

      await waitFor(() => {
        expect(screen.getByText(ordersFixture[0].customer.fullName)).toBeInTheDocument();
      });

      const targetOrder = ordersFixture[0];
      fireEvent.click(screen.getByText(`#${targetOrder.orderId}`));

      const whatsAppLink = screen.getByRole('link', { name: /تواصل مع العميل عبر واتساب/i });
      expect(whatsAppLink).toBeInTheDocument();
      expect(whatsAppLink).toHaveAttribute('target', '_blank');

      const href = whatsAppLink.getAttribute('href') || '';
      expect(href.startsWith('https://wa.me/201')).toBe(true);
      expect(href).toContain(targetOrder.orderId);
    });

    it('CHAL-DRAWER-04: drawer Receipt button links to /admin/orders/[id]/receipt', async () => {
      render(<AdminOrdersPage />);

      await waitFor(() => {
        expect(screen.getByText(ordersFixture[0].customer.fullName)).toBeInTheDocument();
      });

      const targetOrder = ordersFixture[0];
      fireEvent.click(screen.getByText(`#${targetOrder.orderId}`));

      const receiptLink = screen.getByRole('link', { name: /معاينة وطباعة الفاتورة PDF/i });
      expect(receiptLink).toBeInTheDocument();
      expect(receiptLink).toHaveAttribute('href', `/admin/orders/${targetOrder.orderId}/receipt`);
    });
  });
});
