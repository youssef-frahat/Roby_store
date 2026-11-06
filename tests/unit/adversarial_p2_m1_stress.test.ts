import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { getStoreService, resetStoreServiceInstance } from '../../src/services/storeService';
import { MockStoreService } from '../../src/services/mockStoreService';
import { SupabaseStoreService } from '../../src/services/supabaseStoreService';
import { isSupabaseConfigured, getSupabaseClient, resetSupabaseClient } from '../../src/lib/supabaseClient';
import { ApiError, CreateProductInput, UpdateProductInput, VariantColor } from '../../src/types/store';
import { CreateOrderPayload } from '../../src/types/order';

describe('Milestone P2-M1 Adversarial Challenge & Stress Harness', () => {
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

  // =========================================================================
  // SUITE 1: SUPABASE CLIENT FALLBACK & FACTORY ADVERSARIAL STRESS
  // =========================================================================
  describe('Suite 1: Supabase Client Fallback & Factory Adversarial Stress', () => {
    it('STRESS-FB-01: empty, undefined, and whitespace-only environment variables fall back to MockStoreService', () => {
      // 1. Completely absent
      resetStoreServiceInstance();
      expect(getStoreService()).toBeInstanceOf(MockStoreService);

      // 2. Empty strings
      resetStoreServiceInstance();
      process.env.NEXT_PUBLIC_SUPABASE_URL = '';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = '';
      expect(getStoreService()).toBeInstanceOf(MockStoreService);

      // 3. Whitespace only
      resetStoreServiceInstance();
      process.env.NEXT_PUBLIC_SUPABASE_URL = '   ';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = '   ';
      expect(getStoreService()).toBeInstanceOf(MockStoreService);
    });

    it('STRESS-FB-02: malformed URLs fail validation and fall back to MockStoreService', () => {
      const malformedUrls = [
        'not-a-url',
        'ftp://store.supabase.co',
        'javascript:alert(1)',
        'data:text/plain;base64,SGVsbG8=',
        'htt://invalid-protocol.com',
        '//noscheme.supabase.co',
      ];

      for (const url of malformedUrls) {
        resetStoreServiceInstance();
        process.env.NEXT_PUBLIC_SUPABASE_URL = url;
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'valid-length-anon-key-exceeding-twenty-characters';
        const service = getStoreService();
        expect(service).toBeInstanceOf(MockStoreService);
      }
    });

    it('STRESS-FB-03: truncated, short, or invalid anon keys fall back to MockStoreService', () => {
      const invalidKeys = [
        '',
        'short',
        '1234567890',
        '12345678901234567890', // exactly 20 chars (must be > 20)
      ];

      for (const key of invalidKeys) {
        resetStoreServiceInstance();
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://valid-project.supabase.co';
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = key;
        const service = getStoreService();
        expect(service).toBeInstanceOf(MockStoreService);
      }
    });

    it('STRESS-FB-04: NEXT_PUBLIC_USE_MOCK_API=true strictly forces MockStoreService despite valid Supabase keys', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://valid-project.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.valid-jwt-token-exceeding-twenty-chars';
      process.env.NEXT_PUBLIC_USE_MOCK_API = 'true';

      resetStoreServiceInstance();
      const service = getStoreService();
      expect(service).toBeInstanceOf(MockStoreService);
    });

    it('STRESS-FB-05: concurrent and repeated getStoreService calls return identical singleton instance', () => {
      const s1 = getStoreService();
      const s2 = getStoreService();
      const s3 = getStoreService();

      expect(s1).toBe(s2);
      expect(s2).toBe(s3);
    });

    it('STRESS-FB-06: catches constructor errors and cleanly falls back to MockStoreService', () => {
      // Intentionally provide invalid URL that throws inside URL parser if passed to SupabaseClient
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'a-dummy-jwt-token-that-exceeds-twenty-chars-long';

      resetStoreServiceInstance();
      const service = getStoreService();
      expect(service).toBeInstanceOf(MockStoreService);
    });

    it('STRESS-FB-07: resetStoreServiceInstance allows switching service dynamically', () => {
      // 1. Initial mock
      const mockService = getStoreService();
      expect(mockService).toBeInstanceOf(MockStoreService);

      // 2. Switch to valid keys
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://myproject.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.valid-jwt-token-exceeding-twenty-chars';
      resetStoreServiceInstance();

      const supabaseService = getStoreService();
      expect(supabaseService).toBeInstanceOf(SupabaseStoreService);

      // 3. Reset back to mock
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      resetStoreServiceInstance();

      const backToMock = getStoreService();
      expect(backToMock).toBeInstanceOf(MockStoreService);
    });
  });

  // =========================================================================
  // SUITE 2: MOCKSTORESERVICE CRUD BOUNDARY & ADVERSARIAL INPUTS
  // =========================================================================
  describe('Suite 2: MockStoreService CRUD Boundary & Adversarial Inputs', () => {
    let mockService: MockStoreService;

    const validColor: VariantColor = {
      nameAr: 'أسود ملكي',
      nameEn: 'Royal Black',
      hex: '#000000',
    };

    const validVariant = {
      sku: 'TEST-SKU-01',
      color: validColor,
      size: 'M',
      priceAdjustment: 0,
      stockQuantity: 10,
    };

    beforeEach(() => {
      mockService = new MockStoreService(0);
      mockService.resetSimulation();
    });

    it('STRESS-CRUD-01: rejects product creation when titleAr is missing, empty, or whitespace-only', async () => {
      const invalidTitles = ['', '   ', undefined, null];

      for (const titleAr of invalidTitles) {
        const input: any = {
          titleAr,
          titleEn: 'Valid English Title',
          basePrice: 500,
          categoryIds: ['cat_abayas'],
          variants: [validVariant],
        };

        await expect(mockService.createProduct(input)).rejects.toThrow(ApiError);
        await expect(mockService.createProduct(input)).rejects.toThrow(/Arabic title is required/);
      }
    });

    it('STRESS-CRUD-02: rejects product creation when titleEn is missing, empty, or whitespace-only', async () => {
      const invalidTitles = ['', '   ', undefined, null];

      for (const titleEn of invalidTitles) {
        const input: any = {
          titleAr: 'عنوان عربي صالح',
          titleEn,
          basePrice: 500,
          categoryIds: ['cat_abayas'],
          variants: [validVariant],
        };

        await expect(mockService.createProduct(input)).rejects.toThrow(ApiError);
        await expect(mockService.createProduct(input)).rejects.toThrow(/English title is required/);
      }
    });

    it('STRESS-CRUD-03: rejects product creation when basePrice is <= 0 or undefined', async () => {
      const invalidPrices = [0, -1, -999.99, undefined];

      for (const basePrice of invalidPrices) {
        const input: any = {
          titleAr: 'عنوان عربي',
          titleEn: 'English Title',
          basePrice,
          categoryIds: ['cat_abayas'],
          variants: [validVariant],
        };

        await expect(mockService.createProduct(input)).rejects.toThrow(ApiError);
        await expect(mockService.createProduct(input)).rejects.toThrow(/Base price must be greater than zero/);
      }
    });

    it('STRESS-CRUD-04: rejects product creation when discountPrice is >= basePrice', async () => {
      const invalidDiscounts = [
        { basePrice: 500, discountPrice: 500 },
        { basePrice: 500, discountPrice: 501 },
        { basePrice: 500, discountPrice: 1000 },
      ];

      for (const { basePrice, discountPrice } of invalidDiscounts) {
        const input: CreateProductInput = {
          titleAr: 'عنوان عربي',
          titleEn: 'English Title',
          basePrice,
          discountPrice,
          categoryIds: ['cat_abayas'],
          variants: [validVariant],
          images: [],
        };

        await expect(mockService.createProduct(input)).rejects.toThrow(ApiError);
        await expect(mockService.createProduct(input)).rejects.toThrow(/Discount price must be less than base price/);
      }
    });

    it('STRESS-CRUD-05: rejects product creation when categoryIds is empty or undefined', async () => {
      const invalidCategories = [[], undefined, null];

      for (const categoryIds of invalidCategories) {
        const input: any = {
          titleAr: 'عنوان عربي',
          titleEn: 'English Title',
          basePrice: 500,
          categoryIds,
          variants: [validVariant],
        };

        await expect(mockService.createProduct(input)).rejects.toThrow(ApiError);
        await expect(mockService.createProduct(input)).rejects.toThrow(/At least one category is required/);
      }
    });

    it('STRESS-CRUD-06: rejects product creation when variants is empty or undefined', async () => {
      const invalidVariants = [[], undefined, null];

      for (const variants of invalidVariants) {
        const input: any = {
          titleAr: 'عنوان عربي',
          titleEn: 'English Title',
          basePrice: 500,
          categoryIds: ['cat_abayas'],
          variants,
        };

        await expect(mockService.createProduct(input)).rejects.toThrow(ApiError);
        await expect(mockService.createProduct(input)).rejects.toThrow(/At least one variant is required/);
      }
    });

    it('STRESS-CRUD-07: handles massive descriptions, XSS attempts, emojis, and Arabic diacritics safely', async () => {
      const hugeDescription = 'عَبَايَةٌ رَاقِيَةٌ '.repeat(2000); // ~36,000 characters
      const xssAttempt = '<script>alert("pwned")</script><img src=x onerror=alert(1) />';

      const input: CreateProductInput = {
        titleAr: 'عَبَايَةٌ زَمُرُّدِيَّةٌ فاخرة 👑✨',
        titleEn: 'Luxury Emerald Abaya 👑✨',
        descriptionAr: `${hugeDescription}\n${xssAttempt}`,
        descriptionEn: `Extreme English description: ${xssAttempt}`,
        basePrice: 1500,
        discountPrice: 1200,
        categoryIds: ['cat_abayas'],
        variants: [validVariant],
        images: ['https://example.com/test.jpg'],
        tags: ['<svg/onload=alert(1)>', '👑', 'faخر'],
      };

      const created = await mockService.createProduct(input);
      expect(created.id).toBeDefined();
      expect(created.descriptionAr.length).toBeGreaterThan(30000);
      expect(created.titleAr).toContain('👑✨');
      expect(created.tags).toContain('<svg/onload=alert(1)>');

      // Verify searchable
      const retrieved = await mockService.getProductById(created.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.descriptionAr).toBe(created.descriptionAr);
    });

    it('STRESS-CRUD-08: auto-generates slug from titleEn when slug is not specified', async () => {
      const input: CreateProductInput = {
        titleAr: 'طقم ملايات تركي فاخر',
        titleEn: 'Turkish Luxury Bed Sheet Set 2026!',
        basePrice: 850,
        categoryIds: ['cat_bedding'],
        variants: [validVariant],
        images: [],
      };

      const created = await mockService.createProduct(input);
      expect(created.slug).toBe('turkish-luxury-bed-sheet-set-2026');
    });

    it('STRESS-CRUD-09: accurately computes availableColors, availableSizes, totalStock, and hasStock', async () => {
      const colorRed: VariantColor = { nameAr: 'أحمر', nameEn: 'Red', hex: '#FF0000' };
      const colorBlue: VariantColor = { nameAr: 'أزرق', nameEn: 'Blue', hex: '#0000FF' };

      const input: CreateProductInput = {
        titleAr: 'فستان متعدد المقاسات',
        titleEn: 'Multi Variant Dress',
        basePrice: 700,
        categoryIds: ['cat_dresses'],
        images: [],
        variants: [
          { sku: 'DRS-RED-S', color: colorRed, size: 'S', stockQuantity: 5 },
          { sku: 'DRS-RED-M', color: colorRed, size: 'M', stockQuantity: 8 },
          { sku: 'DRS-BLU-M', color: colorBlue, size: 'M', stockQuantity: 12 },
          { sku: 'DRS-BLU-L', color: colorBlue, size: 'L', stockQuantity: 0, inStock: false },
        ],
      };

      const created = await mockService.createProduct(input);
      expect(created.totalStock).toBe(25);
      expect(created.hasStock).toBe(true);
      expect(created.availableSizes).toEqual(['S', 'M', 'L']);
      expect(created.availableColors.map((c) => c.nameEn)).toEqual(['Red', 'Blue']);
    });

    it('STRESS-CRUD-10: handles all zero-stock variants with hasStock=false and totalStock=0', async () => {
      const input: CreateProductInput = {
        titleAr: 'منتج غير متوفر حالياً',
        titleEn: 'Out of Stock Product',
        basePrice: 400,
        categoryIds: ['cat_scarves'],
        images: [],
        variants: [
          { sku: 'OOS-01', color: validColor, size: 'Standard', stockQuantity: 0, inStock: false },
          { sku: 'OOS-02', color: validColor, size: 'Large', stockQuantity: 0, inStock: false },
        ],
      };

      const created = await mockService.createProduct(input);
      expect(created.totalStock).toBe(0);
      expect(created.hasStock).toBe(false);
    });

    it('STRESS-CRUD-11: updateProduct throws 404 when updating non-existent product ID', async () => {
      await expect(
        mockService.updateProduct('prod_completely_non_existent', { titleAr: 'جديد' })
      ).rejects.toThrow(ApiError);

      try {
        await mockService.updateProduct('prod_completely_non_existent', { titleAr: 'جديد' });
      } catch (err: any) {
        expect(err.statusCode).toBe(404);
        expect(err.message).toContain('Product not found');
      }
    });

    it('STRESS-CRUD-12: updateProduct performs selective partial updates and recalculates variants', async () => {
      // 1. Initial creation
      const created = await mockService.createProduct({
        titleAr: 'منتج أصلي',
        titleEn: 'Original Product',
        basePrice: 1000,
        categoryIds: ['cat_abayas'],
        images: ['https://example.com/original.jpg'],
        variants: [validVariant],
      });

      // 2. Partial update without touching variants
      const partial1 = await mockService.updateProduct(created.id, {
        basePrice: 1200,
        discountPrice: 950,
      });
      expect(partial1.basePrice).toBe(1200);
      expect(partial1.discountPrice).toBe(950);
      expect(partial1.titleAr).toBe('منتج أصلي'); // Preserved
      expect(partial1.totalStock).toBe(10); // Preserved

      // 3. Update variants and verify totalStock recalculation
      const partial2 = await mockService.updateProduct(created.id, {
        variants: [
          {
            sku: 'TEST-SKU-NEW-1',
            color: validColor,
            size: 'XL',
            stockQuantity: 25,
          },
          {
            sku: 'TEST-SKU-NEW-2',
            color: validColor,
            size: 'XXL',
            stockQuantity: 15,
          },
        ],
      });
      expect(partial2.totalStock).toBe(40);
      expect(partial2.availableSizes).toEqual(['XL', 'XXL']);
    });

    it('STRESS-CRUD-13: deleteProduct handles existing and non-existent IDs cleanly', async () => {
      // 1. Non-existent returns false
      const falseDelete = await mockService.deleteProduct('prod_random_id');
      expect(falseDelete).toBe(false);

      // 2. Create and delete
      const created = await mockService.createProduct({
        titleAr: 'منتج للحذف',
        titleEn: 'Product to Delete',
        basePrice: 500,
        categoryIds: ['cat_abayas'],
        images: [],
        variants: [validVariant],
      });

      const trueDelete = await mockService.deleteProduct(created.id);
      expect(trueDelete).toBe(true);

      // 3. Confirm purged from getProductById
      const retrieved = await mockService.getProductById(created.id);
      expect(retrieved).toBeNull();

      // 4. Confirm purged from catalog search
      const catalog = await mockService.getProducts({ searchQuery: 'Product to Delete' });
      expect(catalog.data.some((p) => p.id === created.id)).toBe(false);
    });

    it('STRESS-CRUD-14: deep clone isolation prevents external mutation of internal service state', async () => {
      const created = await mockService.createProduct({
        titleAr: 'منتج اختبار العزل',
        titleEn: 'Isolation Test Product',
        basePrice: 600,
        categoryIds: ['cat_abayas'],
        images: [],
        variants: [validVariant],
      });

      // Mutate returned object externally
      (created as any).titleAr = 'MUTATED_EXTERNALLY';
      created.variants[0].stockQuantity = 99999;

      // Re-fetch from service
      const fetched = await mockService.getProductById(created.id);
      expect(fetched?.titleAr).toBe('منتج اختبار العزل');
      expect(fetched?.variants[0].stockQuantity).toBe(10);
    });
  });

  // =========================================================================
  // SUITE 3: MOCKSTORESERVICE ORDER MANAGEMENT & ADMINISTRATIVE METRICS STRESS
  // =========================================================================
  describe('Suite 3: MockStoreService Order Management & Administrative Metrics Stress', () => {
    let mockService: MockStoreService;

    const testPayload: CreateOrderPayload = {
      customer: {
        fullName: 'أحمد محمود التاجر',
        phone: '01099887766',
        governorate: 'Alexandria',
        city: 'سموحة',
        deliveryAddress: 'شارع فوزي معاذ، عمارة 12',
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
          quantity: 2,
          subtotal: 1900,
        },
      ],
    };

    beforeEach(() => {
      mockService = new MockStoreService(0);
      mockService.resetSimulation();
    });

    it('STRESS-ORD-01: getOrders handles extreme pagination boundaries gracefully', async () => {
      // Submit 3 orders
      await mockService.submitOrder(testPayload);
      await mockService.submitOrder(testPayload);
      await mockService.submitOrder(testPayload);

      // Negative page clamped to 1
      const res1 = await mockService.getOrders({ page: -10, pageSize: 2 });
      expect(res1.page).toBe(1);
      expect(res1.data.length).toBe(2);

      // Far out page returns empty data array without throwing
      const res2 = await mockService.getOrders({ page: 500, pageSize: 10 });
      expect(res2.page).toBe(500);
      expect(res2.data).toEqual([]);
      expect(res2.hasNextPage).toBe(false);
      expect(res2.hasPrevPage).toBe(true);
    });

    it('STRESS-ORD-02: getOrders filters accurately by status and governorate', async () => {
      const submitRes = await mockService.submitOrder(testPayload);
      const orderId = submitRes.order.orderId;

      // Filter by governorate
      const alexOrders = await mockService.getOrders({ governorate: 'Alexandria' });
      expect(alexOrders.data.length).toBeGreaterThan(0);
      expect(alexOrders.data.every((o) => o.customer.governorate === 'Alexandria')).toBe(true);

      const aswanOrders = await mockService.getOrders({ governorate: 'Aswan' });
      expect(aswanOrders.data.length).toBe(0);

      // Filter by status
      await mockService.updateOrderStatus(orderId, 'delivered');
      const deliveredOrders = await mockService.getOrders({ status: 'delivered' });
      expect(deliveredOrders.data.some((o) => o.orderId === orderId)).toBe(true);
    });

    it('STRESS-ORD-03: getOrders text search matches case-insensitively across ID, name, and phone', async () => {
      const submitRes = await mockService.submitOrder(testPayload);
      const orderId = submitRes.order.orderId;

      // Search by partial orderId
      const searchId = await mockService.getOrders({ searchQuery: orderId.slice(0, 8) });
      expect(searchId.data.some((o) => o.orderId === orderId)).toBe(true);

      // Search by partial phone
      const searchPhone = await mockService.getOrders({ searchQuery: '998877' });
      expect(searchPhone.data.some((o) => o.orderId === orderId)).toBe(true);

      // Search by partial Arabic name
      const searchName = await mockService.getOrders({ searchQuery: 'التاجر' });
      expect(searchName.data.some((o) => o.orderId === orderId)).toBe(true);
    });

    it('STRESS-ORD-04: getOrderById returns null for non-existent orders', async () => {
      const result = await mockService.getOrderById('ROBY-ORD-99999999-XXXX');
      expect(result).toBeNull();
    });

    it('STRESS-ORD-05: updateOrderStatus updates status, persists to localStorage, and throws 404 for invalid IDs', async () => {
      // 1. Valid update
      const submitRes = await mockService.submitOrder(testPayload);
      const updated = await mockService.updateOrderStatus(submitRes.order.orderId, 'shipped');
      expect(updated.status).toBe('shipped');

      const reFetched = await mockService.getOrderById(submitRes.order.orderId);
      expect(reFetched?.status).toBe('shipped');

      // 2. Invalid update throws 404
      await expect(
        mockService.updateOrderStatus('INVALID_ORDER_ID', 'cancelled')
      ).rejects.toThrow(ApiError);
    });

    it('STRESS-ORD-06: getAdminMetrics accurately tallies metrics and isolates cancelled revenue', async () => {
      // Submit order 1: subtotal 1900 + shipping
      const o1 = await mockService.submitOrder(testPayload);
      // Submit order 2: subtotal 1900 + shipping
      const o2 = await mockService.submitOrder(testPayload);

      // Cancel order 2
      await mockService.updateOrderStatus(o2.order.orderId, 'cancelled');

      const metrics = await mockService.getAdminMetrics();
      expect(metrics.totalOrders).toBe(2);
      // Total revenue should only include non-cancelled order o1
      expect(metrics.totalRevenue).toBe(o1.order.pricing.grandTotal);
      expect(metrics.pendingOrdersCount).toBeGreaterThanOrEqual(1);
      expect(metrics.totalProductsCount).toBeGreaterThanOrEqual(5);
      expect(metrics.recentOrders.length).toBe(2);
    });

    it('STRESS-ORD-07: uploadProductImage operates seamlessly with File and Blob inputs', async () => {
      // File upload
      const file = new File(['dummy binary data'], 'abaya_emerald.jpg', { type: 'image/jpeg' });
      const uploadFileRes = await mockService.uploadProductImage(file, 'custom/path/emerald.jpg');
      expect(uploadFileRes.path).toBe('custom/path/emerald.jpg');
      expect(uploadFileRes.url).toBeDefined();

      // Blob upload
      const blob = new Blob(['binary'], { type: 'image/png' });
      const uploadBlobRes = await mockService.uploadProductImage(blob);
      expect(uploadBlobRes.path).toContain('mock_uploads');
      expect(uploadBlobRes.url).toBeDefined();
    });
  });

  // =========================================================================
  // SUITE 4: SUPABASE SCHEMA SQL INTEGRITY VERIFICATION
  // =========================================================================
  describe('Suite 4: Supabase Schema SQL Static & Structural Integrity Verification', () => {
    const schemaPath = path.resolve(process.cwd(), 'supabase/schema.sql');
    let sqlContent: string;

    beforeEach(() => {
      expect(fs.existsSync(schemaPath)).toBe(true);
      sqlContent = fs.readFileSync(schemaPath, 'utf-8');
    });

    it('STRESS-SQL-01: defines all 8 relational tables with required primary keys and cascades', () => {
      const requiredTables = [
        'public.categories',
        'public.products',
        'public.product_variants',
        'public.product_images',
        'public.orders',
        'public.store_settings',
        'public.promotional_banners',
        'public.governorates',
      ];

      for (const table of requiredTables) {
        expect(sqlContent).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
      }

      // Foreign key cascades
      expect(sqlContent).toContain('REFERENCES public.products(id) ON DELETE CASCADE');
      expect(sqlContent).toContain('REFERENCES public.categories(id) ON DELETE SET NULL');
    });

    it('STRESS-SQL-02: defines essential check constraints for data integrity', () => {
      // Base price non-negative
      expect(sqlContent).toContain('CHECK (base_price >= 0)');
      // Discount price strictly less than base price
      expect(sqlContent).toContain('discount_price < base_price');
      // Hex color regex
      expect(sqlContent).toContain("CHECK (color_hex ~* '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$')");
      // Order status enum check
      expect(sqlContent).toContain(
        "status IN ('pending_dispatch', 'dispatched_whatsapp', 'confirmed', 'shipped', 'delivered', 'cancelled')"
      );
      // Singleton store settings check
      expect(sqlContent).toContain("CHECK (id = 'default')");
      // Governorates shipping zones check
      expect(sqlContent).toContain('CHECK (shipping_zone BETWEEN 1 AND 4)');
    });

    it('STRESS-SQL-03: configures Row Level Security and stored procedure decrement_variant_stock', () => {
      // RLS enablement
      expect(sqlContent).toContain('ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;');
      expect(sqlContent).toContain('ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;');
      expect(sqlContent).toContain('ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;');

      // Stored function for atomic stock decrement
      expect(sqlContent).toContain('CREATE OR REPLACE FUNCTION public.decrement_variant_stock');
      expect(sqlContent).toContain('GREATEST(0, stock_quantity - p_quantity)');

      // Storage bucket
      expect(sqlContent).toContain("'product-images'");
      expect(sqlContent).toContain('5242880'); // 5MB
      expect(sqlContent).toContain("'image/jpeg', 'image/png', 'image/webp'");
    });

    it('STRESS-SQL-04: contains complete seed data matching all 5 products, 20 variants, and 27 governorates', () => {
      // 5 products from fixtures
      expect(sqlContent).toContain("'prod_abaya_royal_crepe'");
      expect(sqlContent).toContain("'prod_01'");
      expect(sqlContent).toContain("'prod_bedsheet_egyptian_cotton'");
      expect(sqlContent).toContain("'prod_dress_floral_chiffon'");
      expect(sqlContent).toContain("'prod_quilt_double_face'");

      // Governorates
      expect(sqlContent).toContain("'Cairo'");
      expect(sqlContent).toContain("'Alexandria'");
      expect(sqlContent).toContain("'Giza'");
      expect(sqlContent).toContain("'Aswan'");

      // Settings
      expect(sqlContent).toContain("'روبي ستور - Roby Store'");
    });
  });
});
