/**
 * Roby Store - Mock Store Service with Error Switches & Multi-Facet Filter Engine
 * Location: src/services/mockStoreService.ts
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
  ApiError,
  StoreSettings,
  UpdateStoreSettingsInput,
} from '../types/store';
import { CreateOrderPayload, OrderSubmitResult, Order } from '../types/order';
import { IStoreService } from './storeService';
import { calculateCartSummary } from '../utils/pricing';
import {
  generateOrderId,
  formatOrderReceiptMessage,
  buildWhatsAppOrderUrl,
} from '../utils/order';

// Raw JSON fixtures
import categoriesData from '../data/categories.json';
import productsData from '../data/products.json';
import bannersData from '../data/banners.json';
import governoratesData from '../data/governorates.json';
import settingsData from '../data/settings.json';

export class MockStoreService implements IStoreService {
  private delayMs: number;
  private simulatedError: '500' | 'network' | null = null;
  private simulateEmpty = false;

  // In-memory data stores
  private categories: Category[];
  private products: Product[];
  private banners: PromotionalBanner[];
  private governorates: GovernorateInfo[];
  private settings: StoreSettings;

  constructor(delayMs = 0) {
    this.delayMs = delayMs;
    this.categories = JSON.parse(JSON.stringify(categoriesData)) as Category[];
    this.products = JSON.parse(JSON.stringify(productsData)) as Product[];
    this.banners = JSON.parse(JSON.stringify(bannersData)) as PromotionalBanner[];
    this.governorates = JSON.parse(JSON.stringify(governoratesData)) as GovernorateInfo[];
    this.settings = JSON.parse(JSON.stringify(settingsData)) as StoreSettings;
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = localStorage.getItem('roby_store_settings');
        if (saved) {
          this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
      } catch (e) {
        // ignore
      }
    }
  }

  // ==========================================
  // Simulation Control API
  // ==========================================

  public setSimulatedDelay(ms: number): void {
    this.delayMs = Math.max(0, ms);
  }

  public setSimulatedError(error: '500' | 'network' | 'none' | null): void {
    if (error === 'none') {
      this.simulatedError = null;
    } else {
      this.simulatedError = error;
    }
  }

  public setSimulateEmpty(empty: boolean): void {
    this.simulateEmpty = empty;
  }

  public resetSimulation(): void {
    this.simulatedError = null;
    this.simulateEmpty = false;
    this.delayMs = 0;
    this.settings = JSON.parse(JSON.stringify(settingsData)) as StoreSettings;
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = localStorage.getItem('roby_store_settings');
        if (saved) {
          this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
      } catch (e) {
        // ignore
      }
    }
  }

  private async applySimulation(): Promise<void> {
    if (this.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    }

    if (this.simulatedError === '500') {
      throw new ApiError('500 Internal Server Error: Simulated mock server failure', 500);
    }

    if (this.simulatedError === 'network') {
      throw new ApiError('Failed to fetch: Simulated network disconnection', 0, true);
    }
  }

  // ==========================================
  // Categories & Hierarchy API
  // ==========================================

  public async getCategories(): Promise<Category[]> {
    await this.applySimulation();
    if (this.simulateEmpty) return [];
    return JSON.parse(JSON.stringify(this.categories));
  }

  public async getCategoryTree(): Promise<CategoryTreeItem[]> {
    await this.applySimulation();
    if (this.simulateEmpty) return [];

    const flatCategories: Category[] = JSON.parse(JSON.stringify(this.categories));
    const categoryMap = new Map<string, CategoryTreeItem>();

    // 1. Initialize map entries with empty children array
    flatCategories.forEach((cat) => {
      categoryMap.set(cat.id, { ...cat, children: [] });
    });

    const rootNodes: CategoryTreeItem[] = [];

    // 2. Build tree relations
    flatCategories.forEach((cat) => {
      const treeNode = categoryMap.get(cat.id)!;
      if (cat.parentId && categoryMap.has(cat.parentId)) {
        categoryMap.get(cat.parentId)!.children.push(treeNode);
      } else {
        rootNodes.push(treeNode);
      }
    });

    // 3. Sort root and subcategories by displayOrder
    rootNodes.sort((a, b) => a.displayOrder - b.displayOrder);
    rootNodes.forEach((root) => {
      root.children.sort((a, b) => a.displayOrder - b.displayOrder);
    });

    return rootNodes;
  }

  public async getCategoryBySlug(slug: string): Promise<Category | null> {
    await this.applySimulation();
    if (this.simulateEmpty) return null;
    const cat = this.categories.find((c) => c.slug === slug);
    return cat ? JSON.parse(JSON.stringify(cat)) : null;
  }

  // ==========================================
  // Product Catalog & Multi-Facet Filter Engine
  // ==========================================

  public async getProducts(params?: ProductFilterParams): Promise<PaginatedResponse<Product>> {
    await this.applySimulation();

    if (this.simulateEmpty) {
      return {
        data: [],
        total: 0,
        page: params?.page ?? 1,
        pageSize: params?.pageSize ?? 12,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
      };
    }

    let filtered = [...this.products];

    if (params) {
      // 1. Text Search Query (Arabic & English titles, descriptions, tags)
      if (params.searchQuery && params.searchQuery.trim().length > 0) {
        const query = params.searchQuery.trim().toLowerCase();
        filtered = filtered.filter(
          (p) =>
            p.titleAr.toLowerCase().includes(query) ||
            p.titleEn.toLowerCase().includes(query) ||
            p.descriptionAr.toLowerCase().includes(query) ||
            p.descriptionEn.toLowerCase().includes(query) ||
            p.tags.some((t) => t.toLowerCase().includes(query))
        );
      }

      // 2. Category Filter (resolves selected category and all its descendants)
      if (params.categorySlug) {
        const querySlug = params.categorySlug.toLowerCase().trim();
        const targetCategory = this.categories.find(
          (c) =>
            c.slug.toLowerCase() === querySlug ||
            c.id.toLowerCase() === querySlug ||
            (querySlug.includes('abaya') && c.slug.includes('abaya')) ||
            (querySlug.includes('dress') && c.slug.includes('dress')) ||
            (querySlug.includes('bed') && c.slug.includes('bed'))
        );
        if (targetCategory) {
          const descendantIds = this.getDescendantCategoryIds(targetCategory.id);
          const allTargetIds = [targetCategory.id, ...descendantIds];
          filtered = filtered.filter(
            (p) =>
              p.categoryIds.some((cid) => allTargetIds.includes(cid)) ||
              p.primaryCategorySlug === targetCategory.slug ||
              p.primaryCategorySlug === querySlug
          );
        } else {
          filtered = filtered.filter(
            (p) =>
              p.primaryCategorySlug.toLowerCase() === querySlug ||
              p.categoryIds.some((cid) => cid.toLowerCase().includes(querySlug))
          );
        }
      } else if (params.categoryIds && params.categoryIds.length > 0) {
        filtered = filtered.filter((p) =>
          p.categoryIds.some((cid) => params.categoryIds!.includes(cid))
        );
      }

      // 3. Color Filter
      if (params.colors && params.colors.length > 0) {
        filtered = filtered.filter((p) =>
          p.availableColors.some(
            (c) =>
              params.colors!.includes(c.nameAr) ||
              params.colors!.includes(c.nameEn) ||
              params.colors!.includes(c.hex)
          ) ||
          p.variants.some(
            (v) =>
              params.colors!.includes(v.color.nameAr) ||
              params.colors!.includes(v.color.nameEn) ||
              params.colors!.includes(v.color.hex)
          )
        );
      }

      // 4. Size Filter
      if (params.sizes && params.sizes.length > 0) {
        filtered = filtered.filter((p) =>
          p.availableSizes.some((s) => params.sizes!.includes(s)) ||
          p.variants.some((v) => params.sizes!.includes(v.size))
        );
      }

      // 5. Price Range Filter (effective base or discount price)
      if (params.minPrice != null) {
        filtered = filtered.filter((p) => {
          const effectivePrice =
            p.discountPrice != null && p.discountPrice < p.basePrice
              ? p.discountPrice
              : p.basePrice;
          return effectivePrice >= params.minPrice!;
        });
      }
      if (params.maxPrice != null) {
        filtered = filtered.filter((p) => {
          const effectivePrice =
            p.discountPrice != null && p.discountPrice < p.basePrice
              ? p.discountPrice
              : p.basePrice;
          return effectivePrice <= params.maxPrice!;
        });
      }

      // 6. In-Stock Only Filter
      if (params.inStockOnly) {
        filtered = filtered.filter((p) => p.hasStock && p.totalStock > 0);
      }

      // 7. Sorting
      if (params.sortBy) {
        switch (params.sortBy) {
          case 'price_asc':
            filtered.sort((a, b) => {
              const priceA = a.discountPrice ?? a.basePrice;
              const priceB = b.discountPrice ?? b.basePrice;
              return priceA - priceB;
            });
            break;
          case 'price_desc':
            filtered.sort((a, b) => {
              const priceA = a.discountPrice ?? a.basePrice;
              const priceB = b.discountPrice ?? b.basePrice;
              return priceB - priceA;
            });
            break;
          case 'rating':
            filtered.sort((a, b) => b.rating - a.rating);
            break;
          case 'newest':
            filtered.sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            break;
          case 'featured':
          default:
            filtered.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
            break;
        }
      }
    }

    // 8. Pagination Calculations
    const total = filtered.length;
    const page = Math.max(1, params?.page ?? 1);
    const pageSize = Math.max(1, params?.pageSize ?? 12);
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    const paginatedData = filtered.slice(startIndex, startIndex + pageSize);

    return {
      data: JSON.parse(JSON.stringify(paginatedData)),
      total,
      page,
      pageSize,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }

  public async getProductBySlug(slug: string): Promise<Product | null> {
    await this.applySimulation();
    if (this.simulateEmpty) return null;
    const product = this.products.find((p) => p.slug === slug);
    return product ? JSON.parse(JSON.stringify(product)) : null;
  }

  public async getProductById(id: string): Promise<Product | null> {
    await this.applySimulation();
    if (this.simulateEmpty) return null;
    const product = this.products.find((p) => p.id === id);
    return product ? JSON.parse(JSON.stringify(product)) : null;
  }

  public async getFeaturedProducts(limit = 8): Promise<Product[]> {
    await this.applySimulation();
    if (this.simulateEmpty) return [];
    const featured = this.products.filter((p) => p.isFeatured).slice(0, limit);
    return JSON.parse(JSON.stringify(featured));
  }

  public async getNewArrivals(limit = 8): Promise<Product[]> {
    await this.applySimulation();
    if (this.simulateEmpty) return [];
    const newItems = this.products.filter((p) => p.isNewArrival).slice(0, limit);
    return JSON.parse(JSON.stringify(newItems));
  }

  public async getRelatedProducts(productId: string, limit = 4): Promise<Product[]> {
    await this.applySimulation();
    if (this.simulateEmpty) return [];
    const current = this.products.find((p) => p.id === productId);
    if (!current) return [];

    const related = this.products
      .filter(
        (p) =>
          p.id !== productId &&
          p.categoryIds.some((cid) => current.categoryIds.includes(cid))
      )
      .slice(0, limit);

    return JSON.parse(JSON.stringify(related));
  }

  // ==========================================
  // Promotional Banners & Governorates API
  // ==========================================

  public async getPromotionalBanners(): Promise<PromotionalBanner[]> {
    await this.applySimulation();
    if (this.simulateEmpty) return [];
    const activeBanners = this.banners
      .filter((b) => b.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder);
    return JSON.parse(JSON.stringify(activeBanners));
  }

  public async getGovernorates(): Promise<GovernorateInfo[]> {
    await this.applySimulation();
    if (this.simulateEmpty) return [];
    return JSON.parse(JSON.stringify(this.governorates));
  }

  // ==========================================
  // Stock Validation & Order Placement API
  // ==========================================

  public async validateStock(items: StockValidationItem[]): Promise<StockValidationResult> {
    await this.applySimulation();
    const conflicts = [];

    for (const item of items) {
      const product = this.products.find((p) => p.id === item.productId);
      if (!product) {
        conflicts.push({
          sku: item.sku,
          productTitleAr: 'منتج غير معروف',
          requestedQuantity: item.requestedQuantity,
          availableStock: 0,
        });
        continue;
      }

      const variant = product.variants.find((v) => v.sku === item.sku);
      if (!variant) {
        conflicts.push({
          sku: item.sku,
          productTitleAr: product.titleAr,
          requestedQuantity: item.requestedQuantity,
          availableStock: 0,
        });
        continue;
      }

      if (item.requestedQuantity > variant.stockQuantity) {
        conflicts.push({
          sku: item.sku,
          productTitleAr: product.titleAr,
          requestedQuantity: item.requestedQuantity,
          availableStock: variant.stockQuantity,
        });
      }
    }

    return {
      isValid: conflicts.length === 0,
      conflicts,
    };
  }

  public async submitOrder(payload: CreateOrderPayload): Promise<OrderSubmitResult> {
    await this.applySimulation();

    // 1. Validate stock
    const stockItems: StockValidationItem[] = payload.items.map((it) => ({
      productId: it.productId,
      sku: it.variant.sku,
      requestedQuantity: it.quantity,
    }));
    const stockValidation = await this.validateStock(stockItems);

    if (!stockValidation.isValid) {
      return {
        success: false,
        order: null as unknown as Order,
        whatsappUrl: '',
        formattedMessage: '',
        errorMessage: 'عذراً، بعض المنتجات المطلوبة غير متوفرة بالكمية المحددة في المخزن.',
      };
    }

    // 2. Decrement in-memory stock
    for (const item of payload.items) {
      const prod = this.products.find((p) => p.id === item.productId);
      if (prod) {
        const variant = prod.variants.find((v) => v.sku === item.variant.sku);
        if (variant) {
          variant.stockQuantity = Math.max(0, variant.stockQuantity - item.quantity);
          variant.inStock = variant.stockQuantity > 0;
        }
        prod.totalStock = prod.variants.reduce((acc, v) => acc + v.stockQuantity, 0);
        prod.hasStock = prod.totalStock > 0;
      }
    }

    // 3. Calculate frozen pricing summary
    const summary = calculateCartSummary(
      payload.items,
      payload.customer.governorate,
      this.governorates
    );

    // 4. Create immutable order record
    const orderId = generateOrderId();
    const createdAt = new Date().toISOString();

    const orderItems = payload.items.map((it) => ({
      productId: it.productId,
      productSlug: it.productSlug,
      productTitleAr: it.productTitleAr,
      productTitleEn: it.productTitleEn,
      productImage: it.productImage,
      sku: it.variant.sku,
      colorNameAr: it.variant.color.nameAr,
      colorNameEn: it.variant.color.nameEn,
      colorHex: it.variant.color.hex,
      size: it.variant.size,
      unitPrice: it.unitPrice,
      originalUnitPrice: it.originalUnitPrice,
      quantity: it.quantity,
      subtotal: it.subtotal,
    }));

    const order: Order = {
      orderId,
      createdAt,
      customer: payload.customer,
      items: orderItems,
      pricing: {
        subtotal: summary.subtotal,
        shippingFee: summary.shippingFee,
        totalSavings: summary.totalSavings,
        grandTotal: summary.grandTotal,
        currency: 'EGP',
      },
      status: 'dispatched_whatsapp',
      dispatchChannel: payload.dispatchChannel ?? 'whatsapp',
      formattedSocialMessage: '',
      whatsappDirectUrl: '',
    };

    const formattedMessage = formatOrderReceiptMessage(order);
    const merchantPhone =
      this.settings.whatsappNumber ||
      process.env.NEXT_PUBLIC_MERCHANT_WHATSAPP_PHONE ||
      process.env.NEXT_PUBLIC_WHATSAPP_PHONE ||
      '201001234567';
    const whatsappUrl = buildWhatsAppOrderUrl(merchantPhone, formattedMessage);

    order.formattedSocialMessage = formattedMessage;
    order.whatsappDirectUrl = whatsappUrl;

    return {
      success: true,
      order,
      whatsappUrl,
      formattedMessage,
    };
  }

  // ==========================================
  // Store Settings & Social Channels API
  // ==========================================

  public async getSettings(): Promise<StoreSettings> {
    await this.applySimulation();
    if (this.simulateEmpty) {
      return {
        storeName: '',
        tagline: '',
        whatsappNumber: '',
        currency: 'ج.م',
        currencyEn: 'EGP',
        enableSocialOrdering: false,
      };
    }
    return JSON.parse(JSON.stringify(this.settings));
  }

  public async updateSettings(input: UpdateStoreSettingsInput): Promise<StoreSettings> {
    await this.applySimulation();
    this.settings = {
      ...this.settings,
      ...input,
    };
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem('roby_store_settings', JSON.stringify(this.settings));
      } catch (e) {
        // ignore
      }
    }
    return JSON.parse(JSON.stringify(this.settings));
  }

  // ==========================================
  // Helper: Recursive Category Descendant Collector
  // ==========================================

  private getDescendantCategoryIds(categoryId: string): string[] {
    const directChildren = this.categories.filter((c) => c.parentId === categoryId);
    let childIds: string[] = [];
    for (const child of directChildren) {
      childIds.push(child.id);
      childIds = childIds.concat(this.getDescendantCategoryIds(child.id));
    }
    return childIds;
  }
}
