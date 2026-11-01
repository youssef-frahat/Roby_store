/**
 * Roby Store - Store Service Contract & Factory
 * Location: src/services/storeService.ts
 */

import {
  Category,
  CategoryTreeItem,
  Product,
  ProductFilterParams,
  PaginatedResponse,
  PromotionalBanner,
  GovernorateInfo,
  StockValidationItem,
  StockValidationResult,
  StoreSettings,
  UpdateStoreSettingsInput,
} from '../types/store';
import { CreateOrderPayload, OrderSubmitResult } from '../types/order';
import { MockStoreService } from './mockStoreService';

export interface IStoreService {
  /** Fetch all categories (flat list) */
  getCategories(): Promise<Category[]>;

  /** Fetch hierarchical category tree */
  getCategoryTree(): Promise<CategoryTreeItem[]>;

  /** Fetch category by slug */
  getCategoryBySlug(slug: string): Promise<Category | null>;

  /** Fetch paginated products with multi-facet filters and search */
  getProducts(params?: ProductFilterParams): Promise<PaginatedResponse<Product>>;

  /** Fetch single product by slug */
  getProductBySlug(slug: string): Promise<Product | null>;

  /** Fetch single product by ID */
  getProductById(id: string): Promise<Product | null>;

  /** Fetch featured products for homepage */
  getFeaturedProducts(limit?: number): Promise<Product[]>;

  /** Fetch new arrivals */
  getNewArrivals(limit?: number): Promise<Product[]>;

  /** Fetch related products */
  getRelatedProducts(productId: string, limit?: number): Promise<Product[]>;

  /** Fetch active promotional banners */
  getPromotionalBanners(): Promise<PromotionalBanner[]>;

  /** Fetch governorates list with shipping rates */
  getGovernorates(): Promise<GovernorateInfo[]>;

  /** Validate stock for cart items */
  validateStock(items: StockValidationItem[]): Promise<StockValidationResult>;

  /** Submit checkout order */
  submitOrder(payload: CreateOrderPayload): Promise<OrderSubmitResult>;

  /** Fetch public store settings (contact numbers, social URLs, etc.) */
  getSettings(): Promise<StoreSettings>;

  /** Update store settings (Admin operation) */
  updateSettings(settings: UpdateStoreSettingsInput): Promise<StoreSettings>;

  // Optional simulation controls for testing
  setSimulatedError?(error: '500' | 'network' | 'none' | null): void;
  setSimulateEmpty?(empty: boolean): void;
  setSimulatedDelay?(ms: number): void;
  resetSimulation?(): void;
}

// Singleton reference
let cachedServiceInstance: IStoreService | null = null;

/**
 * Service Factory providing the configured store service instance.
 */
export function getStoreService(): IStoreService {
  if (cachedServiceInstance) {
    return cachedServiceInstance;
  }

  const useMock =
    process.env.NEXT_PUBLIC_USE_MOCK_API !== 'false' ||
    !process.env.NEXT_PUBLIC_API_BASE_URL;

  if (useMock) {
    const delay = Number(process.env.NEXT_PUBLIC_MOCK_LATENCY_MS) || 0;
    const mock = new MockStoreService(delay);

    if (
      process.env.NEXT_PUBLIC_SIMULATE_API_ERROR === '500' ||
      process.env.NEXT_PUBLIC_SIMULATE_API_ERROR === 'network'
    ) {
      mock.setSimulatedError(
        process.env.NEXT_PUBLIC_SIMULATE_API_ERROR as '500' | 'network'
      );
    }
    if (process.env.NEXT_PUBLIC_SIMULATE_EMPTY === 'true') {
      mock.setSimulateEmpty(true);
    }

    cachedServiceInstance = mock;
  } else {
    // Default to MockStoreService if REST is not yet integrated
    cachedServiceInstance = new MockStoreService(0);
  }

  return cachedServiceInstance;
}

/**
 * Resets the cached singleton service instance (used in test suites).
 */
export function resetStoreServiceInstance(): void {
  cachedServiceInstance = null;
}
