import { describe, it, expect, beforeEach } from 'vitest';
import { MockStoreService } from '../../src/services/mockStoreService';
import { ApiError } from '../../src/types/store';

describe('Store Service Error Injection & Resiliency Switches (R5, AC 1)', () => {
  let service: MockStoreService;

  beforeEach(() => {
    service = new MockStoreService(0);
    service.resetSimulation();
  });

  describe('500 Internal Server Error Simulation', () => {
    it('throws ApiError with status 500 across all query endpoints', async () => {
      service.setSimulatedError('500');

      await expect(service.getCategories()).rejects.toThrow(ApiError);
      await expect(service.getCategoryTree()).rejects.toThrow(ApiError);
      await expect(service.getProducts()).rejects.toThrow(ApiError);
      await expect(service.getProductBySlug('royal-embroidered-crepe-abaya')).rejects.toThrow(ApiError);
      await expect(service.getPromotionalBanners()).rejects.toThrow(ApiError);
      await expect(service.getGovernorates()).rejects.toThrow(ApiError);

      try {
        await service.getProducts();
      } catch (err: any) {
        expect(err.status).toBe(500);
        expect(err.statusCode).toBe(500);
        expect(err.isNetworkError).toBe(false);
      }
    });
  });

  describe('Network Disconnection (Offline) Simulation', () => {
    it('throws ApiError with status 0 and isNetworkError: true', async () => {
      service.setSimulatedError('network');

      await expect(service.getProducts()).rejects.toThrow(ApiError);

      try {
        await service.getProducts();
      } catch (err: any) {
        expect(err.status).toBe(0);
        expect(err.isNetworkError).toBe(true);
        expect(err.message).toContain('Simulated network disconnection');
      }
    });
  });

  describe('Simulated Empty Results Switch', () => {
    it('returns empty data structures cleanly without throwing errors', async () => {
      service.setSimulateEmpty(true);

      const products = await service.getProducts();
      expect(products.data).toEqual([]);
      expect(products.total).toBe(0);
      expect(products.totalPages).toBe(0);

      const categories = await service.getCategories();
      expect(categories).toEqual([]);

      const banners = await service.getPromotionalBanners();
      expect(banners).toEqual([]);

      const product = await service.getProductBySlug('any-slug');
      expect(product).toBeNull();
    });
  });

  describe('Configurable Artificial Latency Simulation', () => {
    it('delays response by specified milliseconds for skeleton loader verification', async () => {
      service.setSimulatedDelay(60);
      const start = Date.now();

      await service.getProducts();
      const duration = Date.now() - start;

      expect(duration).toBeGreaterThanOrEqual(50);
    });
  });

  describe('Simulation Reset Capability', () => {
    it('clears all error and empty switches immediately upon resetSimulation', async () => {
      service.setSimulatedError('500');
      service.setSimulateEmpty(true);
      service.setSimulatedDelay(100);

      service.resetSimulation();

      const response = await service.getProducts();
      expect(response.data.length).toBeGreaterThan(0);
      expect(response.total).toBeGreaterThan(0);

      const categories = await service.getCategories();
      expect(categories.length).toBeGreaterThan(0);
    });
  });
});
