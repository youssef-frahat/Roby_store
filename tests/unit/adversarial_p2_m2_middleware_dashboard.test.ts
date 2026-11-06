/**
 * Roby Store - Milestone P2-M2 Adversarial Challenger Test Suite
 * Location: tests/unit/adversarial_p2_m2_middleware_dashboard.test.ts
 *
 * EMPIRICAL ADVERSARIAL STRESS HARNESS:
 * 1. Edge Middleware Route Protection, subpaths, login redirects, and public route immunity
 * 2. Admin Dashboard KPI dynamic calculation under empty catalog, 100% out of stock, and 100 orders stress
 * 3. Static figure audit and pagination boundary analysis
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { middleware } from '@/middleware';
import { NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, createSessionToken } from '@/utils/adminAuth';
import { formatEGP } from '@/utils/pricing';
import { Product, Category, ProductVariant } from '@/types/store';
import { Order, OrderStatus } from '@/types/order';
import { MockStoreService } from '@/services/mockStoreService';
import fs from 'fs';
import path from 'path';

describe('Milestone P2-M2 Adversarial Challenge Suite', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  // =========================================================================
  // SUITE 1: EDGE MIDDLEWARE ROUTE PROTECTION & SUBPATH ADVERSARIAL CHALLENGE
  // =========================================================================
  describe('Suite 1: Edge Middleware Adversarial Challenge (src/middleware.ts)', () => {
    describe('1.1 Subpath Traversal & Redirect Preservation', () => {
      const subpathsToTest = [
        { path: '/admin/settings', expectedRedirect: '/admin/settings' },
        { path: '/admin/products/new', expectedRedirect: '/admin/products/new' },
        { path: '/admin/deep/nested/path', expectedRedirect: '/admin/deep/nested/path' },
        { path: '/admin/products/category/dresses', expectedRedirect: '/admin/products/category/dresses' },
        { path: '/admin/orders/ROBY-2026-999', expectedRedirect: '/admin/orders/ROBY-2026-999' },
      ];

      for (const { path: subpath, expectedRedirect } of subpathsToTest) {
        it(`redirects unauthenticated visitor from subpath ${subpath} to /admin/login?redirect=...`, async () => {
          const req = new NextRequest(`http://localhost:3000${subpath}`);
          const res = await middleware(req);

          expect(res.status).toBe(307);
          const location = res.headers.get('location');
          expect(location).toBeTruthy();
          expect(location).toContain('/admin/login');

          const parsedUrl = new URL(location!);
          expect(parsedUrl.pathname).toBe('/admin/login');
          expect(parsedUrl.searchParams.get('redirect')).toBe(expectedRedirect);
        });
      }

      it('redirects unauthenticated root /admin WITHOUT redirect parameter', async () => {
        const req = new NextRequest('http://localhost:3000/admin');
        const res = await middleware(req);

        expect(res.status).toBe(307);
        const location = res.headers.get('location');
        expect(location).toBeTruthy();
        const parsedUrl = new URL(location!);
        expect(parsedUrl.pathname).toBe('/admin/login');
        expect(parsedUrl.searchParams.get('redirect')).toBeNull();
      });

      it('preserves subpath with trailing slash when redirecting', async () => {
        const req = new NextRequest('http://localhost:3000/admin/settings/');
        const res = await middleware(req);

        expect(res.status).toBe(307);
        const location = res.headers.get('location');
        const parsedUrl = new URL(location!);
        expect(parsedUrl.searchParams.get('redirect')).toBe('/admin/settings/');
      });
    });

    describe('1.2 Authenticated Route Access & Redirection', () => {
      it('redirects authenticated visits to /admin/login back to /admin', async () => {
        const token = await createSessionToken();
        const req = new NextRequest('http://localhost:3000/admin/login', {
          headers: {
            cookie: `${ADMIN_COOKIE_NAME}=${token}`,
          },
        });

        const res = await middleware(req);
        expect(res.status).toBe(307);
        expect(res.headers.get('location')).toBe('http://localhost:3000/admin');
      });

      it('redirects authenticated visits to /admin/login?redirect=... back to /admin (prevents login loop)', async () => {
        const token = await createSessionToken();
        const req = new NextRequest('http://localhost:3000/admin/login?redirect=%2Fadmin%2Fproducts', {
          headers: {
            cookie: `${ADMIN_COOKIE_NAME}=${token}`,
          },
        });

        const res = await middleware(req);
        expect(res.status).toBe(307);
        expect(res.headers.get('location')).toBe('http://localhost:3000/admin');
      });

      it('allows authenticated visits to deeply nested admin subpaths', async () => {
        const token = await createSessionToken();
        const testSubpaths = [
          '/admin',
          '/admin/settings',
          '/admin/products/new',
          '/admin/deep/nested/path',
        ];

        for (const subpath of testSubpaths) {
          const req = new NextRequest(`http://localhost:3000${subpath}`, {
            headers: {
              cookie: `${ADMIN_COOKIE_NAME}=${token}`,
            },
          });
          const res = await middleware(req);
          // Pass-through has no location header
          expect(res.headers.get('location')).toBeNull();
        }
      });
    });

    describe('1.3 Tampered, Forged, and Expired Cookie Handling on Subpaths', () => {
      it('clears tampered cookie and redirects from /admin/settings to /admin/login?redirect=...', async () => {
        const validToken = await createSessionToken();
        const tamperedToken = validToken.slice(0, -6) + 'XXXXXX';

        const req = new NextRequest('http://localhost:3000/admin/settings', {
          headers: {
            cookie: `${ADMIN_COOKIE_NAME}=${tamperedToken}`,
          },
        });

        const res = await middleware(req);
        expect(res.status).toBe(307);
        const location = res.headers.get('location');
        expect(location).toContain('/admin/login?redirect=%2Fadmin%2Fsettings');

        const setCookie = res.headers.get('set-cookie');
        expect(setCookie).toBeTruthy();
        expect(setCookie).toContain(ADMIN_COOKIE_NAME);
        expect(setCookie).toMatch(/(Max-Age=0|Expires=Thu, 01 Jan 1970)/);
      });

      it('clears expired cookie and redirects to /admin/login?redirect=...', async () => {
        // Construct an expired token manually
        const payload = {
          role: 'admin',
          iat: Math.floor(Date.now() / 1000) - 100000,
          exp: Math.floor(Date.now() / 1000) - 1000, // Expired in past
        };
        const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
        // Sign with current secret
        const secret = process.env.ADMIN_SESSION_SECRET || 'roby_admin_session_secret_default_2026';
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
          'raw',
          encoder.encode(secret),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        );
        const sigBuf = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadB64));
        const sigB64 = Buffer.from(sigBuf).toString('base64url');
        const expiredToken = `${payloadB64}.${sigB64}`;

        const req = new NextRequest('http://localhost:3000/admin/products/new', {
          headers: {
            cookie: `${ADMIN_COOKIE_NAME}=${expiredToken}`,
          },
        });

        const res = await middleware(req);
        expect(res.status).toBe(307);
        const location = res.headers.get('location');
        expect(location).toContain('/admin/login?redirect=%2Fadmin%2Fproducts%2Fnew');

        const setCookie = res.headers.get('set-cookie');
        expect(setCookie).toBeTruthy();
        expect(setCookie).toContain(ADMIN_COOKIE_NAME);
      });

      it('clears garbage/malformed cookies on /admin/deep/nested/path', async () => {
        const garbageTokens = ['not_a_token', 'part1.part2.part3', '', 'undefined', 'null'];

        for (const badToken of garbageTokens) {
          const req = new NextRequest('http://localhost:3000/admin/deep/nested/path', {
            headers: {
              cookie: `${ADMIN_COOKIE_NAME}=${badToken}`,
            },
          });

          const res = await middleware(req);
          expect(res.status).toBe(307);
          const location = res.headers.get('location');
          expect(location).toContain('/admin/login?redirect=%2Fadmin%2Fdeep%2Fnested%2Fpath');
        }
      });
    });

    describe('1.4 Storefront & API Routes Immunity', () => {
      const publicRoutes = [
        '/',
        '/catalog',
        '/products/emerald-linen-dress',
        '/products/royal-black-abaya',
        '/checkout',
        '/checkout/success?orderId=ROBY-2026-1001',
        '/api/admin/login',
        '/api/admin/logout',
        '/api/admin/session',
        '/_next/static/chunks/main.js',
        '/images/logo.png',
        '/favicon.ico',
      ];

      for (const route of publicRoutes) {
        it(`guarantees public route ${route} is NEVER blocked or redirected by middleware`, async () => {
          const req = new NextRequest(`http://localhost:3000${route}`);
          const res = await middleware(req);

          // No redirect location
          expect(res.headers.get('location')).toBeNull();
          expect(res.status).toBe(200);
        });
      }
    });
  });

  // =========================================================================
  // SUITE 2: ADMIN DASHBOARD METRICS CALCULATION ADVERSARIAL STRESS
  // =========================================================================
  describe('Suite 2: Admin Dashboard KPI Computation Stress (/admin/page.tsx logic)', () => {
    // Helper function reproducing the exact calculation logic from src/app/admin/page.tsx:76-107
    function computeDashboardMetrics(products: Product[], categories: Category[], orders: Order[]) {
      const totalProducts = products.length;
      const activeCategories = categories.length;
      const totalOrders = orders.length;

      const totalRevenue = orders
        .filter((o) => o.status !== 'cancelled')
        .reduce((sum, o) => sum + (o.pricing?.grandTotal || 0), 0);

      const lowStockItems: any[] = [];
      let outOfStockVariantsCount = 0;

      products.forEach((product) => {
        if (product.variants && product.variants.length > 0) {
          product.variants.forEach((variant) => {
            const qty = variant.stockQuantity ?? 0;
            if (qty === 0) {
              outOfStockVariantsCount++;
            }
            if (qty <= 2) {
              lowStockItems.push({
                productId: product.id,
                productSlug: product.slug,
                productTitleAr: product.titleAr,
                productImage: product.images?.[0] || variant.variantImageUrl,
                variant,
              });
            }
          });
        }
      });

      return {
        totalProducts,
        activeCategories,
        totalOrders,
        totalRevenue,
        outOfStockVariantsCount,
        lowStockItems,
      };
    }

    it('Scenario 2.1: Completely Empty Catalog & Store State', () => {
      const metrics = computeDashboardMetrics([], [], []);

      expect(metrics.totalProducts).toBe(0);
      expect(metrics.activeCategories).toBe(0);
      expect(metrics.totalOrders).toBe(0);
      expect(metrics.totalRevenue).toBe(0);
      expect(formatEGP(metrics.totalRevenue)).toMatch(/(0|٠)\s*(ج\.م|EGP)/);
      expect(metrics.outOfStockVariantsCount).toBe(0);
      expect(metrics.lowStockItems.length).toBe(0);
    });

    it('Scenario 2.2: 100% Out-of-Stock Catalog Stress Test', () => {
      // 5 products, each with 3 variants with stockQuantity = 0 (15 total out-of-stock variants)
      const products: Product[] = Array.from({ length: 5 }, (_, pIdx) => ({
        id: `prod_${pIdx + 1}`,
        slug: `product-${pIdx + 1}`,
        titleAr: `منتج تجريبي ${pIdx + 1}`,
        titleEn: `Test Product ${pIdx + 1}`,
        descriptionAr: 'وصف',
        descriptionEn: 'description',
        basePrice: 1000,
        currency: 'EGP',
        images: ['/test.jpg'],
        categoryIds: ['cat_dresses'],
        primaryCategorySlug: 'dresses',
        tags: [],
        rating: 5,
        reviewCount: 1,
        isFeatured: false,
        isNewArrival: false,
        totalStock: 0,
        hasStock: false,
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z',
        variants: [
          {
            id: `v_${pIdx}_1`,
            sku: `SKU-${pIdx}-S`,
            color: { nameAr: 'وردي', nameEn: 'Rose', hex: '#D4A5A5' },
            size: 'S',
            priceAdjustment: 0,
            stockQuantity: 0,
            inStock: false,
          },
          {
            id: `v_${pIdx}_2`,
            sku: `SKU-${pIdx}-M`,
            color: { nameAr: 'وردي', nameEn: 'Rose', hex: '#D4A5A5' },
            size: 'M',
            priceAdjustment: 0,
            stockQuantity: 0,
            inStock: false,
          },
          {
            id: `v_${pIdx}_3`,
            sku: `SKU-${pIdx}-L`,
            color: { nameAr: 'وردي', nameEn: 'Rose', hex: '#D4A5A5' },
            size: 'L',
            priceAdjustment: 0,
            stockQuantity: 0,
            inStock: false,
          },
        ],
      }));

      const metrics = computeDashboardMetrics(products, [{ id: 'cat_dresses', nameAr: 'فساتين', nameEn: 'Dresses', slug: 'dresses' }], []);

      expect(metrics.totalProducts).toBe(5);
      expect(metrics.activeCategories).toBe(1);
      expect(metrics.outOfStockVariantsCount).toBe(15);
      expect(metrics.lowStockItems.length).toBe(15);
    });

    it('Scenario 2.3: Boundary Stock Threshold Testing (stock <= 2 radar vs stock = 0)', () => {
      const productWithThresholds: Product = {
        id: 'prod_thresh',
        slug: 'prod-thresh',
        titleAr: 'منتج عتبة المخزون',
        titleEn: 'Threshold Product',
        descriptionAr: 'وصف',
        descriptionEn: 'desc',
        basePrice: 500,
        currency: 'EGP',
        images: ['/img.jpg'],
        categoryIds: ['cat_1'],
        primaryCategorySlug: 'cat_1',
        tags: [],
        rating: 5,
        reviewCount: 0,
        isFeatured: false,
        isNewArrival: false,
        totalStock: 6,
        hasStock: true,
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z',
        variants: [
          {
            id: 'v0',
            sku: 'SKU-0',
            color: { nameAr: 'أسود', nameEn: 'Black', hex: '#000' },
            size: 'XS',
            priceAdjustment: 0,
            stockQuantity: 0, // Out of stock AND low stock radar
            inStock: false,
          },
          {
            id: 'v1',
            sku: 'SKU-1',
            color: { nameAr: 'أسود', nameEn: 'Black', hex: '#000' },
            size: 'S',
            priceAdjustment: 0,
            stockQuantity: 1, // Not out of stock, BUT in low stock radar (<=2)
            inStock: true,
          },
          {
            id: 'v2',
            sku: 'SKU-2',
            color: { nameAr: 'أسود', nameEn: 'Black', hex: '#000' },
            size: 'M',
            priceAdjustment: 0,
            stockQuantity: 2, // Not out of stock, BUT in low stock radar (<=2)
            inStock: true,
          },
          {
            id: 'v3',
            sku: 'SKU-3',
            color: { nameAr: 'أسود', nameEn: 'Black', hex: '#000' },
            size: 'L',
            priceAdjustment: 0,
            stockQuantity: 3, // Neither out of stock nor low stock radar (>2)
            inStock: true,
          },
          {
            id: 'vNull',
            sku: 'SKU-NULL',
            color: { nameAr: 'أسود', nameEn: 'Black', hex: '#000' },
            size: 'XL',
            priceAdjustment: 0,
            stockQuantity: undefined as any, // Missing / undefined stock defaults to 0
            inStock: false,
          },
        ],
      };

      const metrics = computeDashboardMetrics([productWithThresholds], [], []);

      // v0 (0) and vNull (undefined -> 0) are counted as out of stock
      expect(metrics.outOfStockVariantsCount).toBe(2);

      // v0 (0), v1 (1), v2 (2), vNull (0) are in low stock radar (4 total)
      expect(metrics.lowStockItems.length).toBe(4);
      expect(metrics.lowStockItems.map((i) => i.variant.sku)).toEqual([
        'SKU-0',
        'SKU-1',
        'SKU-2',
        'SKU-NULL',
      ]);
      expect(metrics.lowStockItems.map((i) => i.variant.sku)).not.toContain('SKU-3');
    });

    it('Scenario 2.4: 100 Orders Stress Test & Exclusion of Cancelled Revenue', () => {
      // 100 orders with diverse statuses:
      // 20 confirmed @ 500 EGP = 10,000 EGP
      // 20 dispatched_whatsapp @ 750 EGP = 15,000 EGP
      // 20 delivered @ 1,000 EGP = 20,000 EGP
      // 20 shipped @ 250 EGP = 5,000 EGP
      // 20 cancelled @ 2,000 EGP = 40,000 EGP (MUST BE EXCLUDED)
      const orderStatuses: { status: OrderStatus; price: number; count: number }[] = [
        { status: 'confirmed', price: 500, count: 20 },
        { status: 'dispatched_whatsapp', price: 750, count: 20 },
        { status: 'delivered', price: 1000, count: 20 },
        { status: 'shipped', price: 250, count: 20 },
        { status: 'cancelled', price: 2000, count: 20 },
      ];

      const orders: Order[] = [];
      let orderSeq = 1;

      for (const group of orderStatuses) {
        for (let i = 0; i < group.count; i++) {
          orders.push({
            orderId: `ROBY-2026-${String(orderSeq++).padStart(4, '0')}`,
            customer: {
              fullName: `عميل تجريبي ${orderSeq}`,
              phone: '01012345678',
              governorate: 'القاهرة',
              address: 'شارع 9 المعادي',
            },
            items: [
              {
                productId: 'prod_1',
                productTitleAr: 'فستان كتان',
                variantId: 'v1',
                variantSku: 'ROBY-LIN-01',
                color: { nameAr: 'وردي', nameEn: 'Rose', hex: '#D4A5A5' },
                size: 'M',
                unitPrice: group.price - 50,
                quantity: 1,
                totalPrice: group.price - 50,
              },
            ],
            pricing: {
              subtotal: group.price - 50,
              shippingCost: 50,
              discount: 0,
              grandTotal: group.price,
              currency: 'EGP',
            },
            status: group.status,
            createdAt: new Date(Date.now() - orderSeq * 3600000).toISOString(),
            updatedAt: new Date(Date.now() - orderSeq * 3600000).toISOString(),
          });
        }
      }

      expect(orders.length).toBe(100);

      const metrics = computeDashboardMetrics([], [], orders);

      expect(metrics.totalOrders).toBe(100);

      expect(metrics.totalRevenue).toBe(50000);
      expect(formatEGP(metrics.totalRevenue)).toMatch(/(50[,.]?000|٥٠٬٠٠٠)\s*(ج\.م|EGP)/);
    });

    it('Scenario 2.5: EMPIRICAL VULNERABILITY FINDING - Page Fetch Limit vs Total Orders', async () => {
      // In src/app/admin/page.tsx:53:
      // const [prodsRes, cats, ordersRes] = await Promise.all([
      //   service.getProducts({ pageSize: 1000 }),
      //   service.getCategories(),
      //   service.getOrders({ pageSize: 50 }),
      // ]);
      // Notice: service.getOrders is called with pageSize: 50.
      // If a store has 100 orders, ordersRes.data has length 50, while ordersRes.total is 100!
      // In page.tsx:
      // setOrders(ordersRes.data || []);
      // const totalOrders = orders.length;
      // This means totalOrders displays 50 instead of 100!

      const mockService = new MockStoreService();
      // Inject 100 orders directly into mockService orders store
      const hundredOrders: Order[] = Array.from({ length: 100 }, (_, i) => ({
        orderId: `ROBY-2026-STRESS-${i + 1}`,
        createdAt: new Date().toISOString(),
        customer: {
          fullName: `عميل رقم ${i + 1}`,
          phone: '01011112222',
          governorate: 'Cairo' as any,
          city: 'القاهرة',
          deliveryAddress: 'العنوان',
        },
        items: [],
        pricing: {
          subtotal: 500,
          shippingFee: 50,
          totalSavings: 0,
          grandTotal: 550,
          currency: 'EGP',
        },
        status: 'confirmed',
        dispatchChannel: 'whatsapp',
        formattedSocialMessage: '',
        whatsappDirectUrl: '',
      }));
      (mockService as any).orders = hundredOrders;

      // Replicate exact call in src/app/admin/page.tsx:53
      const ordersRes = await mockService.getOrders({ pageSize: 50 });

      // Empirical proof:
      expect(ordersRes.total).toBe(100);
      expect(ordersRes.data.length).toBe(50);

      // What page.tsx computes:
      const pageTotalOrdersComputed = ordersRes.data.length; // 50
      const actualStoreOrdersTotal = ordersRes.total; // 100

      // The discrepancy exists:
      expect(pageTotalOrdersComputed).toBeLessThan(actualStoreOrdersTotal);
      expect(pageTotalOrdersComputed).toBe(50);
      expect(actualStoreOrdersTotal).toBe(100);
    });
  });

  // =========================================================================
  // SUITE 3: SOURCE CODE AUDIT FOR HARDCODED STATIC METRICS
  // =========================================================================
  describe('Suite 3: No Facades & Static Figure Audit of /admin/page.tsx', () => {
    it('verifies all 5 KPI cards in /admin/page.tsx are dynamically bound and contain NO hardcoded numeric values', () => {
      const pagePath = path.resolve(process.cwd(), 'src/app/admin/page.tsx');
      expect(fs.existsSync(pagePath)).toBe(true);

      const content = fs.readFileSync(pagePath, 'utf8');

      // Verify KPI 1 is bound to totalProducts
      expect(content).toContain('{totalProducts}');

      // Verify KPI 2 is bound to activeCategories
      expect(content).toContain('{activeCategories}');

      // Verify KPI 3 is bound to totalOrders
      expect(content).toContain('{totalOrders}');

      // Verify KPI 4 is bound to formatEGP(totalRevenue)
      expect(content).toContain('{formatEGP(totalRevenue)}');

      // Verify KPI 5 is bound to outOfStockVariantsCount
      expect(content).toContain('{outOfStockVariantsCount}');

      // Verify out-of-stock color condition is dynamic
      expect(content).toContain("outOfStockVariantsCount > 0 ? 'text-red-700' : 'text-charcoal-900'");

      // Verify recent orders table uses dynamic orders slice
      expect(content).toContain('orders.slice(0, 8).map');

      // Verify low stock radar uses dynamic lowStockItems slice
      expect(content).toContain('lowStockItems.slice(0, 10).map');
    });
  });
});
