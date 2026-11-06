import { describe, it, expect, beforeEach, vi } from 'vitest';
import ordersFixture from '@/data/orders.json';
import { Order, OrderStatus } from '@/types/order';
import { buildAdminCustomerWhatsAppUrl } from '@/utils/order';
import { MockStoreService } from '@/services/mockStoreService';
import fs from 'fs';
import path from 'path';

describe('Admin Orders Management & State Persistence Suite (Milestone 1)', () => {
  let service: MockStoreService;

  beforeEach(() => {
    localStorage.clear();
    service = new MockStoreService(0);
  });

  describe('1. Egyptian Orders Fixture Integrity (src/data/orders.json)', () => {
    it('contains between 6 and 8 realistic Egyptian orders', () => {
      expect(ordersFixture.length).toBeGreaterThanOrEqual(6);
      expect(ordersFixture.length).toBeLessThanOrEqual(8);
    });

    it('validates all orders conform to the Order interface contract', () => {
      for (const order of ordersFixture as Order[]) {
        expect(order.orderId).toMatch(/^ROBY-\d{8}-\d{4}$/);
        expect(new Date(order.createdAt).getTime()).not.toBeNaN();

        // Customer Details
        expect(order.customer).toBeDefined();
        expect(order.customer.fullName.trim().length).toBeGreaterThanOrEqual(3);
        expect(order.customer.phone).toMatch(/^01[0125]\d{8}$/);
        expect(order.customer.governorate).toBeDefined();
        expect(order.customer.city.trim().length).toBeGreaterThan(0);
        expect(order.customer.deliveryAddress.trim().length).toBeGreaterThan(0);

        // Items
        expect(order.items.length).toBeGreaterThan(0);
        for (const item of order.items) {
          expect(item.productId).toBeDefined();
          expect(item.sku).toBeDefined();
          expect(item.colorNameAr).toBeDefined();
          expect(item.size).toBeDefined();
          expect(item.quantity).toBeGreaterThan(0);
          expect(item.unitPrice).toBeGreaterThan(0);
          expect(item.subtotal).toBe(item.unitPrice * item.quantity);
        }

        // Pricing Breakdown
        expect(order.pricing).toBeDefined();
        expect(order.pricing.subtotal).toBeGreaterThan(0);
        expect(order.pricing.shippingFee).toBeGreaterThanOrEqual(0);
        expect(order.pricing.grandTotal).toBe(order.pricing.subtotal + order.pricing.shippingFee);
        expect(order.pricing.currency).toBe('EGP');
      }
    });

    it('includes orders across Cairo, Giza, Alexandria, and Mansoura (Dakahlia)', () => {
      const governorates = new Set(ordersFixture.map((o) => o.customer.governorate));
      expect(governorates.has('Cairo')).toBe(true);
      expect(governorates.has('Giza')).toBe(true);
      expect(governorates.has('Alexandria')).toBe(true);
      expect(governorates.has('Dakahlia')).toBe(true);
    });

    it('represents diverse order statuses including pending, confirmed, shipped, delivered, cancelled', () => {
      const statuses = new Set(ordersFixture.map((o) => o.status));
      expect(statuses.has('pending_dispatch')).toBe(true);
      expect(statuses.has('confirmed')).toBe(true);
      expect(statuses.has('shipped')).toBe(true);
      expect(statuses.has('delivered')).toBe(true);
      expect(statuses.has('cancelled')).toBe(true);
    });
  });

  describe('2. Admin-to-Customer WhatsApp URL Generator', () => {
    it('normalizes local Egyptian mobile number (01...) to international format (201...) in WhatsApp Click-to-Chat URL', () => {
      const sampleOrder = ordersFixture[0] as Order;
      const url = buildAdminCustomerWhatsAppUrl(sampleOrder);

      expect(url).toBeDefined();
      expect(url.startsWith('https://wa.me/201')).toBe(true);
      // Customer phone is "01012345678" -> should become "201012345678"
      expect(url).toContain('https://wa.me/201012345678?text=');
    });

    it('encodes order ID, customer name, items count, and grand total in the WhatsApp message text', () => {
      const sampleOrder = ordersFixture[0] as Order;
      const url = buildAdminCustomerWhatsAppUrl(sampleOrder);
      const urlObj = new URL(url);
      const decodedText = decodeURIComponent(urlObj.searchParams.get('text') || '');

      expect(decodedText).toContain(sampleOrder.customer.fullName);
      expect(decodedText).toContain(sampleOrder.orderId);
      expect(decodedText).toContain(String(sampleOrder.pricing.grandTotal));
      expect(decodedText).toContain(sampleOrder.customer.governorate);
      expect(decodedText).toContain('متجر روبي ستور (ROBY STORE)');
    });
  });

  describe('3. MockStoreService Orders Auto-Seeding & Persistence', () => {
    it('auto-seeds orders from orders.json when localStorage is empty', async () => {
      const res = await service.getOrders({ pageSize: 50 });
      expect(res.total).toBe(ordersFixture.length);
      expect(res.data.length).toBe(ordersFixture.length);
    });

    it('correctly filters orders by status', async () => {
      const confirmedRes = await service.getOrders({ status: 'confirmed' });
      expect(confirmedRes.total).toBeGreaterThan(0);
      expect(confirmedRes.data.every((o) => o.status === 'confirmed')).toBe(true);

      const deliveredRes = await service.getOrders({ status: 'delivered' });
      expect(deliveredRes.total).toBeGreaterThan(0);
      expect(deliveredRes.data.every((o) => o.status === 'delivered')).toBe(true);
    });

    it('correctly filters orders by governorate', async () => {
      const cairoRes = await service.getOrders({ governorate: 'Cairo' });
      expect(cairoRes.total).toBeGreaterThan(0);
      expect(cairoRes.data.every((o) => o.customer.governorate === 'Cairo')).toBe(true);

      const alexRes = await service.getOrders({ governorate: 'Alexandria' });
      expect(alexRes.total).toBeGreaterThan(0);
      expect(alexRes.data.every((o) => o.customer.governorate === 'Alexandria')).toBe(true);
    });

    it('updates order status in memory and persists to localStorage', async () => {
      const targetOrderId = ordersFixture[0].orderId;
      const newStatus: OrderStatus = 'delivered';

      const updated = await service.updateOrderStatus(targetOrderId, newStatus);
      expect(updated.orderId).toBe(targetOrderId);
      expect(updated.status).toBe(newStatus);

      // Verify retrieval returns updated status
      const retrieved = await service.getOrderById(targetOrderId);
      expect(retrieved?.status).toBe(newStatus);

      // Verify localStorage persistence
      const savedRaw = localStorage.getItem('roby_store_orders');
      expect(savedRaw).not.toBeNull();
      const savedOrders: Order[] = JSON.parse(savedRaw!);
      const savedOrder = savedOrders.find((o) => o.orderId === targetOrderId);
      expect(savedOrder?.status).toBe(newStatus);
    });

    it('throws ApiError 404 when attempting to update status of non-existent order', async () => {
      await expect(service.updateOrderStatus('ROBY-99999999-0000', 'delivered')).rejects.toThrow(
        'Order not found'
      );
    });

    it('calculates admin metrics accurately from seeded orders', async () => {
      const metrics = await service.getAdminMetrics();
      expect(metrics.totalOrders).toBe(ordersFixture.length);
      expect(metrics.totalRevenue).toBeGreaterThan(0);
    });
  });

  describe('4. Admin Layout Navigation Integration', () => {
    it('contains /admin/orders in navItems with ShoppingBag icon in src/app/admin/layout.tsx', () => {
      const layoutPath = path.resolve(process.cwd(), 'src/app/admin/layout.tsx');
      const content = fs.readFileSync(layoutPath, 'utf8');

      expect(content).toContain('/admin/orders');
      expect(content).toContain('إدارة الطلبات');
      expect(content).toContain('ShoppingBag');
    });
  });
});
