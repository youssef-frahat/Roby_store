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
  CreateProductInput,
  UpdateProductInput,
  OrderFilterParams,
  AdminMetrics,
} from '../types/store';
import { CreateOrderPayload, OrderSubmitResult, Order, OrderStatus } from '../types/order';
import { MockStoreService } from './mockStoreService';
import { SupabaseStoreService } from './supabaseStoreService';

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

  // Administrative Catalog Mutations (Requirements R2, R3, R4)
  createProduct(input: CreateProductInput): Promise<Product>;
  updateProduct(id: string, input: UpdateProductInput): Promise<Product>;
  deleteProduct(id: string): Promise<boolean>;
  getOrders(params?: OrderFilterParams): Promise<PaginatedResponse<Order>>;
  getOrderById(orderId: string): Promise<Order | null>;
  updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order>;
  getAdminMetrics(): Promise<AdminMetrics>;
  uploadProductImage(file: File | Blob, customPath?: string): Promise<{ url: string; path: string }>;

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

  const forceMock = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true';
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  const hasValidSupabaseKeys = Boolean(
    !forceMock &&
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('http') &&
    supabaseAnonKey.length > 20
  );

  if (hasValidSupabaseKeys) {
    try {
      cachedServiceInstance = new SupabaseStoreService(supabaseUrl!, supabaseAnonKey!);
      return cachedServiceInstance;
    } catch (err) {
      console.warn('Failed to initialize SupabaseStoreService, falling back to MockStoreService', err);
    }
  }

  // Fallback to MockStoreService
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
  return cachedServiceInstance;
}

/**
 * Resets the cached singleton service instance (used in test suites).
 */
export function resetStoreServiceInstance(): void {
  cachedServiceInstance = null;
}
