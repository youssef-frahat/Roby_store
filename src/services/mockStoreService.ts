/**
 * Roby Store - Mock Store Service with Error Switches & Multi-Facet Filter Engine
 * Location: src/services/mockStoreService.ts
 */

import {
  Category,
  CategoryTreeItem,
  Product,
  ProductVariant,
  VariantColor,
  ProductFilterParams,
  PaginatedResponse,
  PromotionalBanner,
  GovernorateInfo,
  StockValidationItem,
  StockValidationResult,
  ApiError,
  StoreSettings,
  UpdateStoreSettingsInput,
  CreateProductInput,
  UpdateProductInput,
  OrderFilterParams,
  AdminMetrics,
} from '../types/store';
import { CreateOrderPayload, OrderSubmitResult, Order, OrderStatus } from '../types/order';
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
  private orders: Order[];

  constructor(delayMs = 0) {
    this.delayMs = delayMs;
    this.categories = JSON.parse(JSON.stringify(categoriesData)) as Category[];
    this.products = JSON.parse(JSON.stringify(productsData)) as Product[];
    this.banners = JSON.parse(JSON.stringify(bannersData)) as PromotionalBanner[];
    this.governorates = JSON.parse(JSON.stringify(governoratesData)) as GovernorateInfo[];
    this.settings = JSON.parse(JSON.stringify(settingsData)) as StoreSettings;
    this.orders = [];

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const savedSettings = window.localStorage.getItem('roby_store_settings');
        if (savedSettings) {
          this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
        }
        const savedProducts = window.localStorage.getItem('roby_store_products');
        if (savedProducts) {
          this.products = JSON.parse(savedProducts);
        }
        const savedOrders = window.localStorage.getItem('roby_store_orders');
        if (savedOrders) {
          this.orders = JSON.parse(savedOrders);
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
    this.products = JSON.parse(JSON.stringify(productsData)) as Product[];
    this.orders = [];
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = window.localStorage.getItem('roby_store_settings');
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

    this.orders.unshift(order);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem('roby_store_orders', JSON.stringify(this.orders));
      } catch (e) {
        // ignore
      }
    }

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
        window.localStorage.setItem('roby_store_settings', JSON.stringify(this.settings));
      } catch (e) {
        // ignore
      }
    }
    return JSON.parse(JSON.stringify(this.settings));
  }

  // ==========================================
  // Administrative Catalog Mutations (R2, R3, R4)
  // ==========================================

  public async createProduct(input: CreateProductInput): Promise<Product> {
    await this.applySimulation();

    if (!input.titleAr || !input.titleAr.trim()) {
      throw new ApiError('Arabic title is required', 400);
    }
    if (!input.titleEn || !input.titleEn.trim()) {
      throw new ApiError('English title is required', 400);
    }
    if (input.basePrice === undefined || input.basePrice <= 0) {
      throw new ApiError('Base price must be greater than zero', 400);
    }
    if (input.discountPrice !== undefined && input.discountPrice >= input.basePrice) {
      throw new ApiError('Discount price must be less than base price', 400);
    }
    if (!input.categoryIds || input.categoryIds.length === 0) {
      throw new ApiError('At least one category is required', 400);
    }
    if (!input.variants || input.variants.length === 0) {
      throw new ApiError('At least one variant is required', 400);
    }

    const timestamp = Date.now();
    const id = `prod_${timestamp}`;
    const slug =
      input.slug && input.slug.trim()
        ? input.slug.trim()
        : input.titleEn
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');

    const primaryCategorySlug =
      input.primaryCategorySlug ||
      this.categories.find((c) => input.categoryIds.includes(c.id))?.slug ||
      '';

    const variants: ProductVariant[] = input.variants.map((v, i) => {
      const stockQuantity = v.stockQuantity ?? 0;
      return {
        id: v.id || `var_${timestamp}_${i}`,
        sku: v.sku,
        color: v.color,
        size: v.size,
        priceAdjustment: v.priceAdjustment ?? 0,
        priceOverride: v.priceOverride,
        stockQuantity,
        inStock: v.inStock !== undefined ? v.inStock : stockQuantity > 0,
        variantImageUrl: v.variantImageUrl,
      };
    });

    const colorMap = new Map<string, VariantColor>();
    variants.forEach((v) => {
      if (v.color && v.color.nameEn) {
        colorMap.set(v.color.nameEn, v.color);
      }
    });
    const availableColors = Array.from(colorMap.values());
    const availableSizes = Array.from(new Set(variants.map((v) => v.size).filter(Boolean)));
    const totalStock = variants.reduce((sum, v) => sum + v.stockQuantity, 0);
    const hasStock = totalStock > 0;
    const now = new Date().toISOString();

    const newProduct: Product = {
      id,
      slug,
      titleAr: input.titleAr,
      titleEn: input.titleEn,
      descriptionAr: input.descriptionAr || '',
      descriptionEn: input.descriptionEn || '',
      basePrice: input.basePrice,
      discountPrice: input.discountPrice,
      currency: 'EGP',
      images: input.images || [],
      categoryIds: input.categoryIds,
      primaryCategorySlug,
      tags: input.tags || [],
      rating: 5.0,
      reviewCount: 0,
      isFeatured: Boolean(input.isFeatured),
      isNewArrival: input.isNewArrival !== undefined ? Boolean(input.isNewArrival) : true,
      variants,
      availableColors,
      availableSizes,
      totalStock,
      hasStock,
      createdAt: now,
      updatedAt: now,
    };

    this.products.unshift(newProduct);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem('roby_store_products', JSON.stringify(this.products));
      } catch (e) {
        // ignore
      }
    }

    return JSON.parse(JSON.stringify(newProduct));
  }

  public async updateProduct(id: string, input: UpdateProductInput): Promise<Product> {
    await this.applySimulation();

    const index = this.products.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new ApiError('Product not found', 404);
    }

    const existing = this.products[index];

    let variants = existing.variants;
    let availableColors = existing.availableColors;
    let availableSizes = existing.availableSizes;
    let totalStock = existing.totalStock;
    let hasStock = existing.hasStock;

    if (input.variants) {
      const timestamp = Date.now();
      variants = input.variants.map((v, i) => {
        const stockQuantity = v.stockQuantity ?? 0;
        return {
          id: v.id || `var_${timestamp}_${i}`,
          sku: v.sku,
          color: v.color,
          size: v.size,
          priceAdjustment: v.priceAdjustment ?? 0,
          priceOverride: v.priceOverride,
          stockQuantity,
          inStock: v.inStock !== undefined ? v.inStock : stockQuantity > 0,
          variantImageUrl: v.variantImageUrl,
        };
      });

      const colorMap = new Map<string, VariantColor>();
      variants.forEach((v) => {
        if (v.color && v.color.nameEn) {
          colorMap.set(v.color.nameEn, v.color);
        }
      });
      availableColors = Array.from(colorMap.values());
      availableSizes = Array.from(new Set(variants.map((v) => v.size).filter(Boolean)));
      totalStock = variants.reduce((sum, v) => sum + v.stockQuantity, 0);
      hasStock = totalStock > 0;
    }

    const updatedProduct: Product = {
      ...existing,
      ...input,
      variants,
      availableColors,
      availableSizes,
      totalStock,
      hasStock,
      updatedAt: new Date().toISOString(),
    };

    this.products[index] = updatedProduct;
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem('roby_store_products', JSON.stringify(this.products));
      } catch (e) {
        // ignore
      }
    }

    return JSON.parse(JSON.stringify(updatedProduct));
  }

  public async deleteProduct(id: string): Promise<boolean> {
    await this.applySimulation();

    const index = this.products.findIndex((p) => p.id === id);
    if (index === -1) {
      return false;
    }

    this.products.splice(index, 1);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem('roby_store_products', JSON.stringify(this.products));
      } catch (e) {
        // ignore
      }
    }

    return true;
  }

  // ==========================================
  // Administrative Order Management API
  // ==========================================

  public async getOrders(params?: OrderFilterParams): Promise<PaginatedResponse<Order>> {
    await this.applySimulation();

    let filtered = [...this.orders];

    if (params?.status) {
      filtered = filtered.filter((o) => o.status === params.status);
    }
    if (params?.governorate) {
      filtered = filtered.filter((o) => o.customer.governorate === params.governorate);
    }
    if (params?.searchQuery && params.searchQuery.trim()) {
      const q = params.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (o) =>
          o.orderId.toLowerCase().includes(q) ||
          o.customer.fullName.toLowerCase().includes(q) ||
          o.customer.phone.includes(q)
      );
    }

    const page = Math.max(1, params?.page || 1);
    const pageSize = Math.max(1, params?.pageSize || 20);
    const total = filtered.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const startIndex = (page - 1) * pageSize;
    const data = filtered.slice(startIndex, startIndex + pageSize);

    return {
      data: JSON.parse(JSON.stringify(data)),
      total,
      page,
      pageSize,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }

  public async getOrderById(orderId: string): Promise<Order | null> {
    await this.applySimulation();
    const order = this.orders.find((o) => o.orderId === orderId);
    return order ? JSON.parse(JSON.stringify(order)) : null;
  }

  public async updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
    await this.applySimulation();
    const order = this.orders.find((o) => o.orderId === orderId);
    if (!order) {
      throw new ApiError('Order not found', 404);
    }

    order.status = status;
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem('roby_store_orders', JSON.stringify(this.orders));
      } catch (e) {
        // ignore
      }
    }

    return JSON.parse(JSON.stringify(order));
  }

  public async getAdminMetrics(): Promise<AdminMetrics> {
    await this.applySimulation();

    const totalOrders = this.orders.length;
    const totalRevenue = this.orders
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + (o.pricing?.grandTotal || 0), 0);
    const pendingOrdersCount = this.orders.filter(
      (o) => o.status === 'pending_dispatch' || o.status === 'dispatched_whatsapp'
    ).length;
    const totalProductsCount = this.products.length;
    const lowStockItemsCount = this.products.filter((p) => p.totalStock <= 5).length;
    const recentOrders = this.orders.slice(0, 5);

    return {
      totalOrders,
      totalRevenue,
      pendingOrdersCount,
      totalProductsCount,
      lowStockItemsCount,
      recentOrders: JSON.parse(JSON.stringify(recentOrders)),
    };
  }

  public async uploadProductImage(
    file: File | Blob,
    customPath?: string
  ): Promise<{ url: string; path: string }> {
    await this.applySimulation();

    const fileName = (file as File).name || `img_${Date.now()}.png`;
    const path = customPath || `mock_uploads/${Date.now()}_${fileName}`;
    let url = '';

    if (typeof window !== 'undefined' && typeof window.URL?.createObjectURL === 'function') {
      try {
        url = window.URL.createObjectURL(file);
      } catch (e) {
        url = 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80';
      }
    } else {
      url = 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80';
    }

    return { url, path };
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
