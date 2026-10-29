import { describe, it, expect, beforeEach } from 'vitest';
import { MockStoreService } from '../../src/services/mockStoreService';
import { getStoreService, resetStoreServiceInstance } from '../../src/services/storeService';
import { ApiError } from '../../src/types/store';

describe('StoreService Contract & MockStoreService Query Engine', () => {
  let service: MockStoreService;

  beforeEach(() => {
    service = new MockStoreService(0);
    service.resetSimulation();
    resetStoreServiceInstance();
  });

  describe('Service Factory', () => {
    it('returns a singleton store service instance', () => {
      const s1 = getStoreService();
      const s2 = getStoreService();
      expect(s1).toBe(s2);
    });

    it('resets instance cleanly with resetStoreServiceInstance', () => {
      const s1 = getStoreService();
      resetStoreServiceInstance();
      const s2 = getStoreService();
      expect(s1).not.toBe(s2);
    });
  });

  describe('Categories & Category Hierarchy', () => {
    it('retrieves categories and builds hierarchical category tree', async () => {
      const flat = await service.getCategories();
      expect(flat.length).toBeGreaterThan(0);

      const tree = await service.getCategoryTree();
      expect(tree.length).toBe(2); // Root categories: Women's Fashion & Home Textiles
      expect(tree[0].children.length).toBeGreaterThan(0);
      expect(tree[1].children.length).toBeGreaterThan(0);
    });

    it('retrieves category by slug', async () => {
      const cat = await service.getCategoryBySlug('womens-fashion');
      expect(cat).not.toBeNull();
      expect(cat?.nameAr).toBe('ملابس حريمي');

      const nonExistent = await service.getCategoryBySlug('unknown-category');
      expect(nonExistent).toBeNull();
    });
  });

  describe('Catalog Filtering & Full-Text Search', () => {
    it('filters products by search query across Arabic & English', async () => {
      const arabicRes = await service.getProducts({ searchQuery: 'عباية' });
      expect(arabicRes.total).toBeGreaterThan(0);
      expect(arabicRes.data[0].titleAr).toContain('عباية');

      const englishRes = await service.getProducts({ searchQuery: 'Cotton' });
      expect(englishRes.total).toBeGreaterThan(0);
      expect(englishRes.data[0].titleEn).toContain('Cotton');
    });

    it('filters products recursively by parent category slug', async () => {
      // Parent category "womens-fashion" must include subcategory products (abayas)
      const res = await service.getProducts({ categorySlug: 'womens-fashion' });
      expect(res.total).toBeGreaterThan(0);
      const hasAbaya = res.data.some((p) => p.slug === 'royal-embroidered-crepe-abaya');
      expect(hasAbaya).toBe(true);
    });

    it('filters products by color and size variants', async () => {
      const colorRes = await service.getProducts({ colors: ['Royal Black', 'أسود ملكي'] });
      expect(colorRes.total).toBeGreaterThan(0);

      const sizeRes = await service.getProducts({ sizes: ['180x200cm (كينج)'] });
      expect(sizeRes.total).toBeGreaterThan(0);
    });

    it('filters products by min and max price', async () => {
      const res = await service.getProducts({ minPrice: 700, maxPrice: 1000 });
      expect(res.data.length).toBeGreaterThan(0);
      res.data.forEach((p) => {
        const price = p.discountPrice ?? p.basePrice;
        expect(price).toBeGreaterThanOrEqual(700);
        expect(price).toBeLessThanOrEqual(1000);
      });
    });

    it('handles pagination boundary accurately', async () => {
      const page1 = await service.getProducts({ page: 1, pageSize: 2 });
      expect(page1.data.length).toBe(2);
      expect(page1.page).toBe(1);
      expect(page1.hasNextPage).toBe(true);
      expect(page1.hasPrevPage).toBe(false);

      const page2 = await service.getProducts({ page: 2, pageSize: 2 });
      expect(page2.data.length).toBe(2);
      expect(page2.page).toBe(2);
      expect(page2.hasPrevPage).toBe(true);
    });
  });

  describe('Single Products, Featured & Related Queries', () => {
    it('retrieves single product by slug and by id', async () => {
      const bySlug = await service.getProductBySlug('royal-embroidered-crepe-abaya');
      expect(bySlug).not.toBeNull();
      expect(bySlug?.id).toBe('prod_abaya_royal_crepe');

      const byId = await service.getProductById('prod_abaya_royal_crepe');
      expect(byId).not.toBeNull();
      expect(byId?.slug).toBe('royal-embroidered-crepe-abaya');
    });

    it('retrieves featured products and new arrivals', async () => {
      const featured = await service.getFeaturedProducts(4);
      expect(featured.length).toBeGreaterThan(0);
      expect(featured.every((p) => p.isFeatured)).toBe(true);

      const newArrivals = await service.getNewArrivals(4);
      expect(newArrivals.length).toBeGreaterThan(0);
      expect(newArrivals.every((p) => p.isNewArrival)).toBe(true);
    });

    it('retrieves related products in same category', async () => {
      const related = await service.getRelatedProducts('prod_abaya_royal_crepe', 2);
      expect(Array.isArray(related)).toBe(true);
      related.forEach((p) => {
        expect(p.id).not.toBe('prod_abaya_royal_crepe');
        expect(p.categoryIds).toContain('cat_womens_fashion');
      });
    });
  });

  describe('Promotional Banners & Egyptian Governorates', () => {
    it('retrieves active promotional banners ordered by displayOrder', async () => {
      const banners = await service.getPromotionalBanners();
      expect(banners.length).toBeGreaterThan(0);
      expect(banners.every((b) => b.isActive)).toBe(true);
      for (let i = 1; i < banners.length; i++) {
        expect(banners[i].displayOrder).toBeGreaterThanOrEqual(banners[i - 1].displayOrder);
      }
    });

    it('retrieves all 27 Egyptian governorates with shipping fees', async () => {
      const govs = await service.getGovernorates();
      expect(govs.length).toBe(27);
      expect(govs.some((g) => g.code === 'Cairo')).toBe(true);
      expect(govs.some((g) => g.code === 'Alexandria')).toBe(true);
      expect(govs.some((g) => g.code === 'Aswan')).toBe(true);
    });
  });
});
