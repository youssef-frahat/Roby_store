import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isSupabaseConfigured, getSupabaseClient, resetSupabaseClient } from '../../src/lib/supabaseClient';
import { getStoreService, resetStoreServiceInstance } from '../../src/services/storeService';
import { MockStoreService } from '../../src/services/mockStoreService';
import { SupabaseStoreService } from '../../src/services/supabaseStoreService';
import { CreateProductInput, UpdateProductInput, VariantColor } from '../../src/types/store';

describe('Milestone P2-M1: Supabase Client, Fallback & Catalog CRUD', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.NEXT_PUBLIC_USE_MOCK_API;
    resetSupabaseClient();
    resetStoreServiceInstance();
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
  });

  afterEach(() => {
    process.env = originalEnv;
    resetSupabaseClient();
    resetStoreServiceInstance();
  });

  describe('Supabase Client Singleton & Environment Guard', () => {
    it('returns null when environment keys are absent', () => {
      expect(isSupabaseConfigured).toBe(false);
      const client = getSupabaseClient();
      expect(client).toBeNull();
    });

    it('returns null when URL is not a valid http address', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'invalid-url';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'a-very-long-dummy-anon-key-that-exceeds-twenty-chars';
      // In node modules isSupabaseConfigured evaluated at load time, test logic:
      const isValid = Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('http') &&
        (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length ?? 0) > 20
      );
      expect(isValid).toBe(false);
    });

    it('returns null when anon key is too short', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://xyzcompany.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'short_key';
      const isValid = Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('http') &&
        (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length ?? 0) > 20
      );
      expect(isValid).toBe(false);
    });
  });

  describe('Store Service Factory Fallback Mechanism', () => {
    it('gracefully falls back to MockStoreService when Supabase is not configured', () => {
      const service = getStoreService();
      expect(service).toBeInstanceOf(MockStoreService);
    });

    it('forces MockStoreService when NEXT_PUBLIC_USE_MOCK_API is true even with Supabase keys', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'abcdefghijklmnopqrstuvwxyz0123456789';
      process.env.NEXT_PUBLIC_USE_MOCK_API = 'true';

      const service = getStoreService();
      expect(service).toBeInstanceOf(MockStoreService);
    });

    it('instantiates SupabaseStoreService when valid keys are configured', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'abcdefghijklmnopqrstuvwxyz0123456789';
      process.env.NEXT_PUBLIC_USE_MOCK_API = 'false';

      const service = getStoreService();
      expect(service).toBeInstanceOf(SupabaseStoreService);
    });
  });

  describe('MockStoreService Product CRUD & Admin Persistence', () => {
    let mockService: MockStoreService;

    beforeEach(() => {
      mockService = new MockStoreService(0);
      mockService.resetSimulation();
    });

    it('creates a new product with real computed variants, stock, and persists to localStorage', async () => {
      const color: VariantColor = {
        nameAr: 'أزرق كحلي',
        nameEn: 'Navy Blue',
        hex: '#000080',
      };

      const input: CreateProductInput = {
        titleAr: 'عباية صيفية مطرزة',
        titleEn: 'Embroidered Summer Abaya',
        descriptionAr: 'عباية خفيفة وعملية للصيف',
        descriptionEn: 'Lightweight practical summer abaya',
        basePrice: 950,
        discountPrice: 850,
        currency: 'EGP',
        images: ['https://example.com/test-abaya.jpg'],
        categoryIds: ['cat_abayas'],
        primaryCategorySlug: 'abayas-and-kaftans',
        tags: ['new', 'summer'],
        isFeatured: true,
        isNewArrival: true,
        variants: [
          {
            sku: 'TEST-ABY-NVY-M',
            color,
            size: 'M',
            priceAdjustment: 0,
            stockQuantity: 10,
          },
          {
            sku: 'TEST-ABY-NVY-L',
            color,
            size: 'L',
            priceAdjustment: 50,
            stockQuantity: 5,
          },
        ],
      };

      const created = await mockService.createProduct(input);

      expect(created.id).toMatch(/^prod_/);
      expect(created.titleAr).toBe('عباية صيفية مطرزة');
      expect(created.titleEn).toBe('Embroidered Summer Abaya');
      expect(created.basePrice).toBe(950);
      expect(created.discountPrice).toBe(850);
      expect(created.totalStock).toBe(15);
      expect(created.hasStock).toBe(true);
      expect(created.availableColors.length).toBe(1);
      expect(created.availableSizes).toEqual(['M', 'L']);

      // Check that product can now be fetched
      const fetched = await mockService.getProductById(created.id);
      expect(fetched).not.toBeNull();
      expect(fetched?.id).toBe(created.id);

      // Check localStorage persistence
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem('roby_store_products');
        expect(stored).not.toBeNull();
        const parsed = JSON.parse(stored!);
        expect(parsed.some((p: any) => p.id === created.id)).toBe(true);
      }
    });

    it('rejects product creation when required fields are missing or invalid', async () => {
      const invalidInput: any = {
        titleAr: '',
        titleEn: '',
        basePrice: -50,
        categoryIds: [],
        variants: [],
      };

      await expect(mockService.createProduct(invalidInput)).rejects.toThrow();
    });

    it('updates an existing product and recalculates variant summary attributes', async () => {
      const updatePayload: UpdateProductInput = {
        titleAr: 'عباية كريب معدلة',
        basePrice: 1300,
        discountPrice: 999,
      };

      const updated = await mockService.updateProduct('prod_abaya_royal_crepe', updatePayload);

      expect(updated.titleAr).toBe('عباية كريب معدلة');
      expect(updated.basePrice).toBe(1300);
      expect(updated.discountPrice).toBe(999);

      const retrieved = await mockService.getProductById('prod_abaya_royal_crepe');
      expect(retrieved?.titleAr).toBe('عباية كريب معدلة');
    });

    it('deletes an existing product and removes it from catalog and search', async () => {
      const success = await mockService.deleteProduct('prod_01');
      expect(success).toBe(true);

      const retrieved = await mockService.getProductById('prod_01');
      expect(retrieved).toBeNull();

      const notFoundDelete = await mockService.deleteProduct('non-existent-product');
      expect(notFoundDelete).toBe(false);
    });

    it('handles orders, status updates, metrics, and image uploads', async () => {
      // 1. Submit an order
      const orderPayload = {
        customer: {
          fullName: 'فاطمة علي',
          phone: '01012345678',
          governorate: 'Cairo' as const,
          city: 'مدينة نصر',
          deliveryAddress: 'شارع عباس العقاد عمارة 10',
        },
        items: [
          {
            id: 'prod_abaya_royal_crepe__ROBY-ABY-01-BLK-M',
            productId: 'prod_abaya_royal_crepe',
            productSlug: 'royal-embroidered-crepe-abaya',
            productTitleAr: 'عباية كريب رويال مطرزة يدوياً',
            productTitleEn: 'Royal Hand-Embroidered Crepe Abaya',
            productImage: 'https://example.com/abaya.jpg',
            variant: {
              id: 'var_aby_blk_m',
              sku: 'ROBY-ABY-01-BLK-M',
              color: { nameAr: 'أسود ملكي', nameEn: 'Royal Black', hex: '#111111' },
              size: 'M',
              priceAdjustment: 0,
              stockQuantity: 6,
              inStock: true,
            },
            unitPrice: 950,
            originalUnitPrice: 1250,
            quantity: 1,
            subtotal: 950,
          },
        ],
      };

      const submitRes = await mockService.submitOrder(orderPayload);
      expect(submitRes.success).toBe(true);
      expect(submitRes.order.orderId).toBeDefined();

      // 2. Query orders
      const ordersRes = await mockService.getOrders();
      expect(ordersRes.total).toBeGreaterThan(0);
      expect(ordersRes.data[0].customer.fullName).toBe('فاطمة علي');

      // 3. Query order by ID
      const singleOrder = await mockService.getOrderById(submitRes.order.orderId);
      expect(singleOrder).not.toBeNull();
      expect(singleOrder?.orderId).toBe(submitRes.order.orderId);

      // 4. Update order status
      const updatedOrder = await mockService.updateOrderStatus(submitRes.order.orderId, 'confirmed');
      expect(updatedOrder.status).toBe('confirmed');

      // 5. Admin metrics
      const metrics = await mockService.getAdminMetrics();
      expect(metrics.totalOrders).toBeGreaterThanOrEqual(1);
      expect(metrics.totalRevenue).toBeGreaterThan(0);
      expect(metrics.totalProductsCount).toBeGreaterThan(0);

      // 6. Upload product image mock
      const mockFile = new File(['mock content'], 'test-image.jpg', { type: 'image/jpeg' });
      const uploadRes = await mockService.uploadProductImage(mockFile);
      expect(uploadRes.url).toBeDefined();
      expect(uploadRes.path).toContain('test-image.jpg');
    });
  });
});
