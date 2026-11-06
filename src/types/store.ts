/**
 * Roby Store - Store & Catalog Domain Type Definitions
 * Location: src/types/store.ts
 */

// ==========================================
// 1. Category Hierarchy Models
// ==========================================

export interface Category {
  /** Unique category identifier (e.g. "cat_womens_fashion", "cat_abayas") */
  id: string;
  /** Display name in Arabic */
  nameAr: string;
  /** Display name in English */
  nameEn: string;
  /** URL-safe slug for routing (e.g. "womens-fashion", "abayas-and-kaftans") */
  slug: string;
  /** Comprehensive category description */
  description: string;
  /** High-resolution category image URL */
  imageUrl: string;
  /** Lucide icon identifier (e.g. "Sparkles", "Shirt", "Home", "BedDouble") */
  iconName: string;
  /** ID of parent category; null indicates a top-level root category */
  parentId: string | null;
  /** Optional nested children in tree representation */
  children?: Category[];
  /** Hierarchy depth level: 0 for root category, 1 for subcategory, 2 for nested leaf */
  level: number;
  /** Order weight for sorting in navigation menus */
  displayOrder: number;
  /** Optional active product count under this category */
  productCount?: number;
}

export interface CategoryTreeItem extends Category {
  /** Nested subcategories when structured as a hierarchical tree */
  children: CategoryTreeItem[];
}

export interface CategoryBreadcrumb {
  id: string;
  nameAr: string;
  nameEn: string;
  slug: string;
}

// ==========================================
// 2. Product & Multi-Variant Models
// ==========================================

export interface VariantColor {
  /** Color name in Arabic (e.g. "أسود ملكي", "أخضر زمردي", "وردي كشمير") */
  nameAr: string;
  /** Color name in English (e.g. "Royal Black", "Emerald Green", "Cashmere Rose") */
  nameEn: string;
  /** Hexadecimal color code for UI swatches (e.g. "#111111", "#046307", "#DCAE96") */
  hex: string;
}

export interface ProductVariant {
  /** Unique variant identifier */
  id: string;
  /** Standard Stock Keeping Unit (e.g. "ROBY-ABY-01-BLK-M") */
  sku: string;
  /** Color definition with swatch hex */
  color: VariantColor;
  /** Size label (e.g. "M", "L", "XL", "Free Size" or "160x200cm") */
  size: string;
  /** Price difference added to base/discount price in EGP (e.g. 0, 50, 150) */
  priceAdjustment: number;
  /** Optional absolute price override in EGP */
  priceOverride?: number;
  /** Available inventory count in stock */
  stockQuantity: number;
  /** Helper flag: true if stockQuantity > 0 */
  inStock: boolean;
  /** Optional variant-specific gallery thumbnail */
  variantImageUrl?: string;
}

export interface Product {
  /** Unique product ID (e.g. "prod_abaya_royal_crepe") */
  id: string;
  /** Unique URL-friendly slug */
  slug: string;
  /** Product title in Arabic */
  titleAr: string;
  /** Product title in English */
  titleEn: string;
  /** Product description in Arabic */
  descriptionAr: string;
  /** Product description in English */
  descriptionEn: string;
  /** Standard non-discounted base price in EGP */
  basePrice: number;
  /** Promotional discounted price in EGP (must be < basePrice when present) */
  discountPrice?: number;
  /** Standard currency code */
  currency: 'EGP';
  /** Gallery image URLs (first image is primary card thumbnail) */
  images: string[];
  /** IDs of associated categories (primary and parent categories) */
  categoryIds: string[];
  /** Primary category slug for breadcrumbs and navigation */
  primaryCategorySlug: string;
  /** Optional Arabic category display name */
  categoryNameAr?: string;
  /** Search and filtering tags (e.g. "bestseller", "ramadan-2026", "cotton-100") */
  tags: string[];
  /** Average customer rating (1.0 to 5.0) */
  rating: number;
  /** Total review count */
  reviewCount: number;
  /** Featured item for homepage highlights */
  isFeatured: boolean;
  /** New arrival flag */
  isNewArrival: boolean;
  /** Complete list of all color-size variants */
  variants: ProductVariant[];
  /** Pre-extracted list of distinct available colors across all variants */
  availableColors: VariantColor[];
  /** Pre-extracted list of distinct available sizes across all variants */
  availableSizes: string[];
  /** Total aggregate stock across all variants */
  totalStock: number;
  /** Computed helper: true if totalStock > 0 */
  hasStock: boolean;
  /** Creation timestamp (ISO 8601) */
  createdAt: string;
  /** Last update timestamp (ISO 8601) */
  updatedAt: string;
}

// ==========================================
// 3. Promotional Banner Model
// ==========================================

export interface PromotionalBanner {
  /** Unique banner ID */
  id: string;
  /** Primary headline in Arabic */
  titleAr: string;
  /** Primary headline in English */
  titleEn: string;
  /** Subtitle marketing copy in Arabic */
  subtitleAr: string;
  /** Subtitle marketing copy in English */
  subtitleEn: string;
  /** Promotional badge text (e.g. "عرض الموسم", "الأكثر مبيعاً") */
  badgeTextAr?: string;
  badgeTextEn?: string;
  /** Optional badge tag alias */
  tagAr?: string;
  /** Call to action button label */
  buttonTextAr: string;
  buttonTextEn: string;
  /** Optional CTA label alias */
  ctaTextAr?: string;
  /** Banner background image URL */
  imageUrl: string;
  /** Target category slug for routing upon click */
  targetCategorySlug?: string;
  /** Custom target URL */
  targetUrl?: string;
  /** Whether banner is active */
  isActive: boolean;
  /** Display sorting order */
  displayOrder: number;
}

// ==========================================
// 4. Egyptian Geographic & Shipping Models
// ==========================================

export type EgyptianGovernorate =
  | 'Cairo'
  | 'Giza'
  | 'Alexandria'
  | 'Dakahlia'
  | 'Red Sea'
  | 'Beheira'
  | 'Fayoum'
  | 'Gharbiya'
  | 'Ismailia'
  | 'Menofia'
  | 'Minya'
  | 'Qaliubiya'
  | 'New Valley'
  | 'Suez'
  | 'Aswan'
  | 'Assiut'
  | 'Beni Suef'
  | 'Port Said'
  | 'Damietta'
  | 'Sharkia'
  | 'South Sinai'
  | 'Kafr Al-Sheikh'
  | 'Matrouh'
  | 'Luxor'
  | 'Qena'
  | 'North Sinai'
  | 'Sohag';

export interface GovernorateInfo {
  code: EgyptianGovernorate;
  nameAr: string;
  nameEn: string;
  shippingFee: number;
  shippingZone: 1 | 2 | 3 | 4;
}

// ==========================================
// 5. Query Filters & Pagination
// ==========================================

export interface ProductFilterParams {
  searchQuery?: string;
  categorySlug?: string;
  categoryIds?: string[];
  colors?: string[]; // color names or hexes
  sizes?: string[]; // "S", "M", "L", "King", etc.
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  sortBy?: 'featured' | 'price_asc' | 'price_desc' | 'rating' | 'newest';
  page?: number;
  pageSize?: number;
}

export type ProductFilter = ProductFilterParams;

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// ==========================================
// 6. Stock Validation Models
// ==========================================

export interface StockValidationItem {
  productId: string;
  sku: string;
  requestedQuantity: number;
}

export interface StockConflict {
  sku: string;
  productTitleAr: string;
  requestedQuantity: number;
  availableStock: number;
}

export interface StockValidationResult {
  isValid: boolean;
  conflicts: StockConflict[];
}

// ==========================================
// 7. Store Service Error Model
// ==========================================

export class ApiError extends Error {
  public status: number;
  public statusCode: number;
  public isNetworkError: boolean;

  constructor(message: string, statusCode = 500, isNetworkError = false) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.status = statusCode;
    this.isNetworkError = isNetworkError || statusCode === 0;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

// ==========================================
// 8. Store Settings & Social Channels
// ==========================================

export interface StoreSettings {
  storeName: string;
  storeNameEn?: string;
  tagline: string;
  whatsappNumber: string;
  whatsappMessageTemplate?: string;
  instagramUrl?: string;
  instagramHandle?: string;
  facebookUrl?: string;
  messengerUrl?: string;
  tiktokUrl?: string;
  contactPhone?: string;
  contactEmail?: string;
  storeAddress?: string;
  currency: string;
  currencyEn: string;
  freeShippingThreshold?: number;
  enableSocialOrdering: boolean;
}

export type UpdateStoreSettingsInput = Partial<StoreSettings>;

// ==========================================
// 9. Administrative Product Management & Metrics
// ==========================================

export interface CreateProductInput {
  titleAr: string;
  titleEn: string;
  slug?: string;
  descriptionAr: string;
  descriptionEn: string;
  basePrice: number;
  discountPrice?: number;
  currency?: 'EGP';
  images: string[];
  categoryIds: string[];
  primaryCategorySlug?: string;
  tags?: string[];
  isFeatured?: boolean;
  isNewArrival?: boolean;
  variants: Array<{
    id?: string;
    sku: string;
    color: VariantColor;
    size: string;
    priceAdjustment?: number;
    priceOverride?: number;
    stockQuantity: number;
    inStock?: boolean;
    variantImageUrl?: string;
  }>;
}

export type UpdateProductInput = Partial<CreateProductInput>;

export interface OrderFilterParams {
  status?: import('./order').OrderStatus;
  searchQuery?: string;
  governorate?: string;
  page?: number;
  pageSize?: number;
}

export interface AdminMetrics {
  totalOrders: number;
  totalRevenue: number;
  pendingOrdersCount: number;
  totalProductsCount: number;
  lowStockItemsCount: number;
  recentOrders: import('./order').Order[];
}

// Re-export Cart & Order types for convenience
export type { CartItem, CartSummary } from './order';

