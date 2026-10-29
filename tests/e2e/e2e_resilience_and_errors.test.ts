import { describe, it, expect, beforeEach } from 'vitest';
import { MockStoreService } from '../../src/services/mockStoreService';
import { useCartStore } from '../../src/store/useCartStore';

describe('Tier 3 & Tier 4 E2E: 4-State UI Resiliency & Error Recovery (R1, R5, AC 1, AC 3)', () => {
  let service: MockStoreService;

  beforeEach(() => {
    service = new MockStoreService(0);
    service.resetSimulation();
    useCartStore.getState().clearCart();
  });

  // ==========================================
  // 4 UI STATES RESILIENCY VERIFICATION
  // ==========================================

  it('State 1 (Loading): simulated latency delays promise resolution safely', async () => {
    const delayedService = new MockStoreService(80);
    const startTime = Date.now();

    const response = await delayedService.getProducts({ page: 1, pageSize: 4 });
    const elapsedTime = Date.now() - startTime;

    expect(elapsedTime).toBeGreaterThanOrEqual(70);
    expect(response.data.length).toBeGreaterThan(0);
  });

  it('State 2 (Success): normal service resolution returns populated product grid and categories', async () => {
    const categories = await service.getCategories();
    expect(categories.length).toBeGreaterThan(0);

    const products = await service.getProducts();
    expect(products.data.length).toBeGreaterThan(0);
    expect(products.total).toBeGreaterThan(0);
  });

  it('State 3 (Empty): returns empty state structure when query yields 0 matching items', async () => {
    // Force simulated empty state
    service.setSimulateEmpty(true);

    const emptyResult = await service.getProducts();
    expect(emptyResult.data).toEqual([]);
    expect(emptyResult.total).toBe(0);
    expect(emptyResult.totalPages).toBe(0);

    // Resetting filter restores full catalog
    service.setSimulateEmpty(false);
    const restoredResult = await service.getProducts();
    expect(restoredResult.data.length).toBeGreaterThan(0);
  });

  it('State 4 (Error & Retry Recovery): 500 error rejects with typed ApiError and recovers on retry', async () => {
    // 1. Inject simulated 500 server error
    service.setSimulatedError('500');

    let capturedError: any = null;
    try {
      await service.getProducts();
    } catch (err) {
      capturedError = err;
    }

    expect(capturedError).not.toBeNull();
    expect(capturedError.status).toBe(500);

    // 2. Simulate User clicking "Retry" after server heals (reset error to none)
    service.setSimulatedError(null);

    const retryResponse = await service.getProducts();
    expect(retryResponse.data.length).toBeGreaterThan(0);
    expect(retryResponse.total).toBeGreaterThan(0);
  });

  it('Network Offline Resilience: offline status (status 0) triggers network error and recovers', async () => {
    // 1. Inject network disconnection
    service.setSimulatedError('network');

    await expect(service.getProducts()).rejects.toMatchObject({
      status: 0,
    });

    // 2. Connection restored
    service.resetSimulation();

    const recovered = await service.getProducts();
    expect(recovered.data.length).toBeGreaterThan(0);
  });

  it('Out-of-Stock Lockout Protection: ensures 0-stock variants cannot be added to cart', async () => {
    const { data: products } = await service.getProducts({ pageSize: 10 });
    
    // Find or create an out-of-stock variant scenario
    const productWithVariants = products.find((p) => p.variants.some((v) => v.stockQuantity === 0)) || products[0];
    const outOfStockVariant = {
      ...productWithVariants.variants[0],
      stockQuantity: 0,
      inStock: false,
    };

    // Attempting to add 0-stock item to cart must return false
    const addResult = useCartStore.getState().addItem(productWithVariants, outOfStockVariant, 1);
    expect(addResult).toBe(false);

    // Cart items must remain empty
    expect(useCartStore.getState().items.length).toBe(0);
  });
});
