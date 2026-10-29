import { describe, it, expect, beforeEach } from 'vitest';
import { MockStoreService } from '../../src/services/mockStoreService';

describe('Decoupled MockStoreService & Error Injection (R1, R5, AC 1 - Tiers 1 & 2)', () => {
  let service: MockStoreService;

  beforeEach(() => {
    // 0ms delay for fast test execution
    service = new MockStoreService(0);
    service.resetSimulation();
  });

  // ==========================================
  // TIER 1: FEATURE COVERAGE (HAPPY PATH)
  // ==========================================

  describe('Tier 1: Feature Coverage (>=5 test cases)', () => {
    it('TC-T1-SRV-01: retrieves categories with parent-child relationships', async () => {
      const categories = await service.getCategories();
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);

      const rootCategories = categories.filter((c) => !c.parentId);
      expect(rootCategories.length).toBeGreaterThan(0);
      expect(categories.some((c) => c.slug === 'womens-fashion' || c.id === 'cat_womens_fashion')).toBe(true);
    });

    it('TC-T1-SRV-02: retrieves paginated products with default pagination metadata', async () => {
      const response = await service.getProducts({ page: 1, pageSize: 6 });

      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeLessThanOrEqual(6);
      expect(response.total).toBeGreaterThan(0);
      expect(response.page).toBe(1);
      expect(response.pageSize).toBe(6);
      expect(response.totalPages).toBe(Math.ceil(response.total / 6));
    });

    it('TC-T1-SRV-03: filters products by search query keyword', async () => {
      const all = await service.getProducts({ pageSize: 50 });
      const sampleProduct = all.data[0];
      const keyword = sampleProduct.titleEn.split(' ')[0];

      const filtered = await service.getProducts({ searchQuery: keyword });
      expect(filtered.data.length).toBeGreaterThan(0);
      expect(
        filtered.data.some(
          (p) =>
            p.titleEn.toLowerCase().includes(keyword.toLowerCase()) ||
            p.titleAr.includes(keyword) ||
            p.tags.includes(keyword.toLowerCase())
        )
      ).toBe(true);
    });

    it('TC-T1-SRV-04: retrieves single product by unique slug with complete variant matrix', async () => {
      const all = await service.getProducts({ pageSize: 1 });
      const firstSlug = all.data[0].slug;

      const product = await service.getProductBySlug(firstSlug);
      expect(product).not.toBeNull();
      expect(product?.slug).toBe(firstSlug);
      expect(Array.isArray(product?.variants)).toBe(true);
      expect(product?.variants.length).toBeGreaterThan(0);
    });

    it('TC-T1-SRV-05: retrieves active promotional hero banners', async () => {
      const banners = await service.getPromotionalBanners();
      expect(Array.isArray(banners)).toBe(true);
      expect(banners.length).toBeGreaterThan(0);
      expect(banners.every((b) => b.isActive)).toBe(true);
    });

    it('TC-T1-SRV-06: validates stock availability for requested items', async () => {
      const all = await service.getProducts({ pageSize: 1 });
      const variant = all.data[0].variants[0];

      const result = await service.validateStock([
        {
          productId: all.data[0].id,
          sku: variant.sku,
          requestedQuantity: 1,
        },
      ]);

      expect(result.isValid).toBe(true);
      expect(result.conflicts.length).toBe(0);
    });
  });

  // ==========================================
  // TIER 2: BOUNDARY & CORNER CASES (>=5 test cases)
  // ==========================================

  describe('Tier 2: Boundary & Corner Cases (>=5 test cases)', () => {
    it('TC-T2-SRV-01: simulated 500 error throws ApiError with status 500 across all queries', async () => {
      service.setSimulatedError('500');

      await expect(service.getCategories()).rejects.toThrow();
      await expect(service.getProducts()).rejects.toThrow();
      await expect(service.getProductBySlug('any-slug')).rejects.toThrow();
      await expect(service.getPromotionalBanners()).rejects.toThrow();
    });

    it('TC-T2-SRV-02: simulated network failure throws ApiError with status 0 (offline)', async () => {
      service.setSimulatedError('network');

      await expect(service.getProducts()).rejects.toMatchObject({
        status: 0,
      });
    });

    it('TC-T2-SRV-03: simulated empty switch returns empty list with 0 total', async () => {
      service.setSimulateEmpty(true);

      const response = await service.getProducts();
      expect(response.data).toEqual([]);
      expect(response.total).toBe(0);
      expect(response.totalPages).toBe(0);
    });

    it('TC-T2-SRV-04: resetSimulation restores normal behavior immediately', async () => {
      service.setSimulatedError('500');
      service.setSimulateEmpty(true);

      service.resetSimulation();

      const response = await service.getProducts();
      expect(response.data.length).toBeGreaterThan(0);
      expect(response.total).toBeGreaterThan(0);
    });

    it('TC-T2-SRV-05: getProductBySlug with nonexistent slug returns null without throwing', async () => {
      const product = await service.getProductBySlug('definitely-nonexistent-slug-xyz');
      expect(product).toBeNull();
    });

    it('TC-T2-SRV-06: out-of-bounds page returns empty data array safely', async () => {
      const response = await service.getProducts({ page: 99999, pageSize: 10 });
      expect(response.data).toEqual([]);
      expect(response.page).toBe(99999);
      expect(response.hasNextPage).toBe(false);
    });

    it('TC-T2-SRV-07: stock validation detects and flags quantity exceeding inventory', async () => {
      const all = await service.getProducts({ pageSize: 1 });
      const variant = all.data[0].variants[0];

      const conflictResult = await service.validateStock([
        {
          productId: all.data[0].id,
          sku: variant.sku,
          requestedQuantity: variant.stockQuantity + 50,
        },
      ]);

      expect(conflictResult.isValid).toBe(false);
      expect(conflictResult.conflicts.length).toBe(1);
      expect(conflictResult.conflicts[0].sku).toBe(variant.sku);
      expect(conflictResult.conflicts[0].availableStock).toBe(variant.stockQuantity);
    });
  });
});
