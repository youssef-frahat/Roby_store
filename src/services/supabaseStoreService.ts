/**
 * Roby Store - Supabase Store Service Implementation
 * Location: src/services/supabaseStoreService.ts
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
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
  StockConflict,
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
import { getSupabaseClient } from '../lib/supabaseClient';

// ==========================================
// Database Record Type Definitions
// ==========================================

interface DbVariantRow {
  id: string;
  product_id: string;
  sku: string;
  color_name_ar: string;
  color_name_en: string;
  color_hex: string;
  size: string;
  price_adjustment: number | string;
  price_override: number | string | null;
  stock_quantity: number;
  in_stock: boolean;
  variant_image_url: string | null;
}

interface DbImageRow {
  id: string;
  product_id: string;
  image_url: string;
  display_order: number;
  is_primary: boolean;
  alt_text: string | null;
}

interface DbProductRow {
  id: string;
  slug: string;
  title_ar: string;
  title_en: string;
  description_ar: string;
  description_en: string;
  base_price: number | string;
  discount_price: number | string | null;
  currency: string;
  primary_category_id: string | null;
  primary_category_slug: string;
  category_ids: string[];
  tags: string[];
  rating: number | string;
  review_count: number;
  is_featured: boolean;
  is_new_arrival: boolean;
  created_at: string;
  updated_at: string;
  variants?: DbVariantRow[];
  images?: DbImageRow[];
}

// ==========================================
// Database to Domain Mappers
// ==========================================

function mapDbProductToProduct(row: DbProductRow): Product {
  const variants: ProductVariant[] = (row.variants || []).map((v) => ({
    id: v.id,
    sku: v.sku,
    color: {
      nameAr: v.color_name_ar,
      nameEn: v.color_name_en,
      hex: v.color_hex,
    },
    size: v.size,
    priceAdjustment: Number(v.price_adjustment) || 0,
    priceOverride: v.price_override != null ? Number(v.price_override) : undefined,
    stockQuantity: Number(v.stock_quantity) || 0,
    inStock: Boolean(v.in_stock),
    variantImageUrl: v.variant_image_url || undefined,
  }));

  const sortedImages = (row.images || []).slice().sort((a, b) => a.display_order - b.display_order);
  const images = sortedImages.map((img) => img.image_url);

  const colorMap = new Map<string, VariantColor>();
  variants.forEach((v) => {
    if (v.color && v.color.nameEn) {
      colorMap.set(v.color.nameEn, v.color);
    }
  });
  const availableColors = Array.from(colorMap.values());
  const availableSizes = Array.from(new Set(variants.map((v) => v.size).filter(Boolean)));
  const totalStock = variants.reduce((sum, v) => sum + v.stockQuantity, 0);

  return {
    id: row.id,
    slug: row.slug,
    titleAr: row.title_ar,
    titleEn: row.title_en,
    descriptionAr: row.description_ar || '',
    descriptionEn: row.description_en || '',
    basePrice: Number(row.base_price),
    discountPrice: row.discount_price != null ? Number(row.discount_price) : undefined,
    currency: 'EGP',
    images: images.length > 0 ? images : [],
    categoryIds: row.category_ids || [],
    primaryCategorySlug: row.primary_category_slug || '',
    tags: row.tags || [],
    rating: Number(row.rating) || 5.0,
    reviewCount: Number(row.review_count) || 0,
    isFeatured: Boolean(row.is_featured),
    isNewArrival: Boolean(row.is_new_arrival),
    variants,
    availableColors,
    availableSizes,
    totalStock,
    hasStock: totalStock > 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDbCategoryToCategory(row: any): Category {
  return {
    id: row.id,
    nameAr: row.name_ar,
    nameEn: row.name_en,
    slug: row.slug,
    description: row.description || '',
    imageUrl: row.image_url || '',
    iconName: row.icon_name || 'Sparkles',
    parentId: row.parent_id || null,
    level: Number(row.level) || 0,
    displayOrder: Number(row.display_order) || 0,
    productCount: Number(row.product_count) || 0,
  };
}

function mapDbBannerToBanner(row: any): PromotionalBanner {
  let targetProductSlug: string | undefined = undefined;
  if (row.target_url && row.target_url.startsWith('/products/')) {
    targetProductSlug = row.target_url.replace('/products/', '');
  }

  return {
    id: row.id,
    titleAr: row.title_ar,
    titleEn: row.title_en,
    subtitleAr: row.subtitle_ar || '',
    subtitleEn: row.subtitle_en || '',
    badgeTextAr: row.badge_text_ar || undefined,
    badgeTextEn: row.badge_text_en || undefined,
    buttonTextAr: row.button_text_ar,
    buttonTextEn: row.button_text_en,
    imageUrl: row.image_url,
    targetCategorySlug: row.target_category_slug || undefined,
    targetProductSlug,
    targetUrl: row.target_url || undefined,
    isActive: Boolean(row.is_active),
    displayOrder: Number(row.display_order) || 0,
  };
}

function mapBannerToDbRow(banner: Partial<PromotionalBanner>): any {
  const row: any = {};
  if (banner.id !== undefined) row.id = banner.id;
  if (banner.titleAr !== undefined) row.title_ar = banner.titleAr;
  if (banner.titleEn !== undefined) row.title_en = banner.titleEn;
  if (banner.subtitleAr !== undefined) row.subtitle_ar = banner.subtitleAr;
  if (banner.subtitleEn !== undefined) row.subtitle_en = banner.subtitleEn;
  if (banner.badgeTextAr !== undefined) row.badge_text_ar = banner.badgeTextAr;
  if (banner.badgeTextEn !== undefined) row.badge_text_en = banner.badgeTextEn;
  if (banner.buttonTextAr !== undefined) row.button_text_ar = banner.buttonTextAr;
  if (banner.buttonTextEn !== undefined) row.button_text_en = banner.buttonTextEn;
  if (banner.imageUrl !== undefined) row.image_url = banner.imageUrl;
  if (banner.targetCategorySlug !== undefined) row.target_category_slug = banner.targetCategorySlug;
  if (banner.targetProductSlug) {
    row.target_url = `/products/${banner.targetProductSlug}`;
  } else if (banner.targetUrl !== undefined) {
    row.target_url = banner.targetUrl;
  }
  if (banner.isActive !== undefined) row.is_active = banner.isActive;
  if (banner.displayOrder !== undefined) row.display_order = banner.displayOrder;
  return row;
}

function mapDbGovernorateToGovernorate(row: any): GovernorateInfo {
  return {
    code: row.code,
    nameAr: row.name_ar,
    nameEn: row.name_en,
    shippingFee: Number(row.shipping_fee) || 0,
    shippingZone: row.shipping_zone as 1 | 2 | 3 | 4,
  };
}

function mapDbSettingsToSettings(row: any): StoreSettings {
  return {
    storeName: row.store_name,
    storeNameEn: row.store_name_en || undefined,
    tagline: row.tagline,
    whatsappNumber: row.whatsapp_number,
    whatsappMessageTemplate: row.whatsapp_message_template || undefined,
    instagramUrl: row.instagram_url || undefined,
    instagramHandle: row.instagram_handle || undefined,
    facebookUrl: row.facebook_url || undefined,
    messengerUrl: row.messenger_url || undefined,
    tiktokUrl: row.tiktok_url || undefined,
    contactPhone: row.contact_phone || undefined,
    contactEmail: row.contact_email || undefined,
    storeAddress: row.store_address || undefined,
    currency: row.currency || 'ج.م',
    currencyEn: row.currency_en || 'EGP',
    freeShippingThreshold:
      row.free_shipping_threshold != null ? Number(row.free_shipping_threshold) : undefined,
    enableSocialOrdering: Boolean(row.enable_social_ordering),
  };
}

function mapDbOrderToOrder(row: any): Order {
  return {
    orderId: row.order_id,
    createdAt: row.created_at,
    customer: row.customer_details,
    items: row.items,
    pricing: row.pricing_summary,
    status: row.status,
    dispatchChannel: row.dispatch_channel,
    formattedSocialMessage: row.formatted_social_message || '',
    whatsappDirectUrl: row.whatsapp_direct_url || '',
  };
}

// ==========================================
// Service Implementation
// ==========================================

export class SupabaseStoreService implements IStoreService {
  private client: SupabaseClient;

  constructor(supabaseUrl?: string, supabaseAnonKey?: string) {
    if (supabaseUrl && supabaseAnonKey) {
      this.client = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
    } else {
      const client = getSupabaseClient();
      if (!client) {
        throw new Error(
          'Supabase client could not be initialized: missing or invalid environment variables.'
        );
      }
      this.client = client;
    }
  }

  // ==========================================
  // Categories & Hierarchy API
  // ==========================================

  public async getCategories(): Promise<Category[]> {
    const { data, error } = await this.client
      .from('categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      throw new ApiError(`Failed to fetch categories: ${error.message}`, 500);
    }
    return (data || []).map(mapDbCategoryToCategory);
  }

  public async getCategoryTree(): Promise<CategoryTreeItem[]> {
    const flatCategories = await this.getCategories();
    const categoryMap = new Map<string, CategoryTreeItem>();

    flatCategories.forEach((cat) => {
      categoryMap.set(cat.id, { ...cat, children: [] });
    });

    const rootNodes: CategoryTreeItem[] = [];

    flatCategories.forEach((cat) => {
      const treeNode = categoryMap.get(cat.id)!;
      if (cat.parentId && categoryMap.has(cat.parentId)) {
        categoryMap.get(cat.parentId)!.children.push(treeNode);
      } else {
        rootNodes.push(treeNode);
      }
    });

    return rootNodes;
  }

  public async getCategoryBySlug(slug: string): Promise<Category | null> {
    const { data, error } = await this.client
      .from('categories')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      throw new ApiError(`Failed to fetch category by slug: ${error.message}`, 500);
    }
    return data ? mapDbCategoryToCategory(data) : null;
  }

  // ==========================================
  // Products & Multi-Facet Filter Engine API
  // ==========================================

  public async getProducts(params?: ProductFilterParams): Promise<PaginatedResponse<Product>> {
    let query = this.client
      .from('products')
      .select('*, variants:product_variants(*), images:product_images(*)', { count: 'exact' });

    if (params?.categorySlug) {
      query = query.or(
        `primary_category_slug.eq.${params.categorySlug},category_ids.cs.{${params.categorySlug}}`
      );
    }

    if (params?.categoryIds && params.categoryIds.length > 0) {
      query = query.overlaps('category_ids', params.categoryIds);
    }

    if (params?.minPrice !== undefined) {
      query = query.gte('base_price', params.minPrice);
    }

    if (params?.maxPrice !== undefined) {
      query = query.lte('base_price', params.maxPrice);
    }

    if (params?.searchQuery && params.searchQuery.trim()) {
      const q = params.searchQuery.trim();
      query = query.or(
        `title_ar.ilike.%${q}%,title_en.ilike.%${q}%,description_ar.ilike.%${q}%,description_en.ilike.%${q}%`
      );
    }

    switch (params?.sortBy) {
      case 'price_asc':
        query = query.order('base_price', { ascending: true });
        break;
      case 'price_desc':
        query = query.order('base_price', { ascending: false });
        break;
      case 'newest':
        query = query.order('created_at', { ascending: false });
        break;
      case 'rating':
        query = query.order('rating', { ascending: false });
        break;
      case 'featured':
      default:
        query = query
          .order('is_featured', { ascending: false })
          .order('created_at', { ascending: false });
        break;
    }

    const page = Math.max(1, params?.page || 1);
    const pageSize = Math.max(1, params?.pageSize || 12);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query.range(from, to);

    const { data, count, error } = await query;

    if (error) {
      throw new ApiError(`Failed to fetch products: ${error.message}`, 500);
    }

    let products = (data || []).map(mapDbProductToProduct);

    if (params?.colors && params.colors.length > 0) {
      const colorsLower = params.colors.map((c) => c.toLowerCase());
      products = products.filter((p) =>
        p.availableColors.some(
          (c) =>
            colorsLower.includes(c.nameAr.toLowerCase()) ||
            colorsLower.includes(c.nameEn.toLowerCase()) ||
            colorsLower.includes(c.hex.toLowerCase())
        )
      );
    }

    if (params?.sizes && params.sizes.length > 0) {
      const sizesLower = params.sizes.map((s) => s.toLowerCase());
      products = products.filter((p) =>
        p.availableSizes.some((s) => sizesLower.includes(s.toLowerCase()))
      );
    }

    if (params?.inStockOnly) {
      products = products.filter((p) => p.hasStock);
    }

    const total = count != null ? count : products.length;
    const totalPages = Math.ceil(total / pageSize) || 1;

    return {
      data: products,
      total,
      page,
      pageSize,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }

  public async getProductBySlug(slug: string): Promise<Product | null> {
    const { data, error } = await this.client
      .from('products')
      .select('*, variants:product_variants(*), images:product_images(*)')
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      throw new ApiError(`Failed to fetch product by slug: ${error.message}`, 500);
    }
    return data ? mapDbProductToProduct(data) : null;
  }

  public async getProductById(id: string): Promise<Product | null> {
    const { data, error } = await this.client
      .from('products')
      .select('*, variants:product_variants(*), images:product_images(*)')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new ApiError(`Failed to fetch product by id: ${error.message}`, 500);
    }
    return data ? mapDbProductToProduct(data) : null;
  }

  public async getFeaturedProducts(limit = 4): Promise<Product[]> {
    const { data, error } = await this.client
      .from('products')
      .select('*, variants:product_variants(*), images:product_images(*)')
      .eq('is_featured', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new ApiError(`Failed to fetch featured products: ${error.message}`, 500);
    }
    return (data || []).map(mapDbProductToProduct);
  }

  public async getNewArrivals(limit = 4): Promise<Product[]> {
    const { data, error } = await this.client
      .from('products')
      .select('*, variants:product_variants(*), images:product_images(*)')
      .eq('is_new_arrival', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new ApiError(`Failed to fetch new arrivals: ${error.message}`, 500);
    }
    return (data || []).map(mapDbProductToProduct);
  }

  public async getRelatedProducts(productId: string, limit = 4): Promise<Product[]> {
    const current = await this.getProductById(productId);
    if (!current) return [];

    let query = this.client
      .from('products')
      .select('*, variants:product_variants(*), images:product_images(*)')
      .neq('id', productId);

    if (current.primaryCategorySlug) {
      query = query.eq('primary_category_slug', current.primaryCategorySlug);
    }

    const { data, error } = await query.limit(limit);
    if (error) {
      throw new ApiError(`Failed to fetch related products: ${error.message}`, 500);
    }
    return (data || []).map(mapDbProductToProduct);
  }

  // ==========================================
  // Promotional Banners API
  // ==========================================

  public async getPromotionalBanners(): Promise<PromotionalBanner[]> {
    const { data, error } = await this.client
      .from('promotional_banners')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      throw new ApiError(`Failed to fetch promotional banners: ${error.message}`, 500);
    }
    return (data || []).map(mapDbBannerToBanner);
  }

  public async getAllBanners(): Promise<PromotionalBanner[]> {
    const { data, error } = await this.client
      .from('promotional_banners')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      throw new ApiError(`Failed to fetch all promotional banners: ${error.message}`, 500);
    }
    return (data || []).map(mapDbBannerToBanner);
  }

  public async createBanner(banner: Omit<PromotionalBanner, 'id'>): Promise<PromotionalBanner> {
    const bannerId = `banner_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const dbRow = mapBannerToDbRow({ ...banner, id: bannerId });

    const { data, error } = await this.client
      .from('promotional_banners')
      .insert(dbRow)
      .select()
      .single();

    if (error) {
      throw new ApiError(`Failed to create promotional banner: ${error.message}`, 500);
    }
    return mapDbBannerToBanner(data);
  }

  public async updateBanner(id: string, updates: Partial<PromotionalBanner>): Promise<PromotionalBanner> {
    const dbRow = mapBannerToDbRow(updates);

    const { data, error } = await this.client
      .from('promotional_banners')
      .update(dbRow)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new ApiError(`Failed to update promotional banner: ${error.message}`, 500);
    }
    return mapDbBannerToBanner(data);
  }

  public async deleteBanner(id: string): Promise<boolean> {
    const { error } = await this.client
      .from('promotional_banners')
      .delete()
      .eq('id', id);

    if (error) {
      throw new ApiError(`Failed to delete promotional banner: ${error.message}`, 500);
    }
    return true;
  }

  // ==========================================
  // Egyptian Governorates & Shipping API
  // ==========================================

  public async getGovernorates(): Promise<GovernorateInfo[]> {
    const { data, error } = await this.client
      .from('governorates')
      .select('*')
      .order('name_ar', { ascending: true });

    if (error) {
      throw new ApiError(`Failed to fetch governorates: ${error.message}`, 500);
    }
    return (data || []).map(mapDbGovernorateToGovernorate);
  }

  // ==========================================
  // Stock Validation & Checkout API
  // ==========================================

  public async validateStock(items: StockValidationItem[]): Promise<StockValidationResult> {
    const conflicts: StockConflict[] = [];

    for (const item of items) {
      const { data, error } = await this.client
        .from('product_variants')
        .select('sku, stock_quantity, products(title_ar)')
        .eq('sku', item.sku)
        .maybeSingle();

      if (error || !data) {
        conflicts.push({
          sku: item.sku,
          productTitleAr: '',
          requestedQuantity: item.requestedQuantity,
          availableStock: 0,
        });
        continue;
      }

      const availableStock = Number(data.stock_quantity) || 0;
      if (item.requestedQuantity > availableStock) {
        const prod = data.products as any;
        conflicts.push({
          sku: item.sku,
          productTitleAr: prod?.title_ar || '',
          requestedQuantity: item.requestedQuantity,
          availableStock,
        });
      }
    }

    return {
      isValid: conflicts.length === 0,
      conflicts,
    };
  }

  public async submitOrder(payload: CreateOrderPayload): Promise<OrderSubmitResult> {
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

    // Decrement stock via stored RPC
    for (const item of payload.items) {
      try {
        await this.client.rpc('decrement_variant_stock', {
          p_sku: item.variant.sku,
          p_quantity: item.quantity,
        });
      } catch (e) {
        console.warn(`RPC decrement_variant_stock failed for ${item.variant.sku}:`, e);
      }
    }

    const governorates = await this.getGovernorates();
    const settings = await this.getSettings();

    const summary = calculateCartSummary(
      payload.items,
      payload.customer.governorate,
      governorates
    );

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
      status: 'pending_dispatch',
      dispatchChannel: payload.dispatchChannel ?? 'whatsapp',
      formattedSocialMessage: '',
      whatsappDirectUrl: '',
    };

    const formattedMessage = formatOrderReceiptMessage(order);
    const merchantPhone =
      settings.whatsappNumber ||
      process.env.NEXT_PUBLIC_MERCHANT_WHATSAPP_PHONE ||
      process.env.NEXT_PUBLIC_WHATSAPP_PHONE ||
      '201001234567';
    const whatsappUrl = buildWhatsAppOrderUrl(merchantPhone, formattedMessage);

    order.formattedSocialMessage = formattedMessage;
    order.whatsappDirectUrl = whatsappUrl;

    const { error: insertError } = await this.client.from('orders').insert({
      order_id: order.orderId,
      customer_name: order.customer.fullName,
      customer_phone: order.customer.phone,
      customer_alt_phone: order.customer.alternativePhone || null,
      customer_governorate: order.customer.governorate,
      customer_city: order.customer.city,
      delivery_address: order.customer.deliveryAddress,
      customer_notes: order.customer.notes || null,
      customer_details: order.customer,
      items: order.items,
      subtotal: order.pricing.subtotal,
      shipping_fee: order.pricing.shippingFee,
      total_savings: order.pricing.totalSavings,
      grand_total: order.pricing.grandTotal,
      currency: 'EGP',
      pricing_summary: order.pricing,
      status: order.status,
      dispatch_channel: order.dispatchChannel,
      formatted_social_message: order.formattedSocialMessage,
      whatsapp_direct_url: order.whatsappDirectUrl,
      created_at: order.createdAt,
    });

    if (insertError) {
      console.error('Failed to insert order into Supabase:', insertError);
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
    const { data, error } = await this.client
      .from('store_settings')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();

    if (error || !data) {
      return {
        storeName: 'روبي ستور - Roby Store',
        storeNameEn: 'Roby Store',
        tagline: 'أزياء حريمي ومفروشات راقية',
        whatsappNumber: '201000000000',
        whatsappMessageTemplate: 'مرحباً، أود تأكيد هذا الطلب من متجركم.',
        instagramUrl: 'https://instagram.com/roby_store',
        instagramHandle: '@roby_store',
        facebookUrl: 'https://facebook.com/robystore.eg',
        messengerUrl: 'https://m.me/robystore.eg',
        tiktokUrl: 'https://tiktok.com/@roby_store',
        contactPhone: '01000000000',
        contactEmail: 'contact@robystore.com',
        storeAddress: 'القاهرة، جمهورية مصر العربية',
        currency: 'ج.م',
        currencyEn: 'EGP',
        freeShippingThreshold: 1500,
        enableSocialOrdering: true,
      };
    }
    return mapDbSettingsToSettings(data);
  }

  public async updateSettings(input: UpdateStoreSettingsInput): Promise<StoreSettings> {
    const updates: any = {
      updated_at: new Date().toISOString(),
    };
    if (input.storeName !== undefined) updates.store_name = input.storeName;
    if (input.storeNameEn !== undefined) updates.store_name_en = input.storeNameEn;
    if (input.tagline !== undefined) updates.tagline = input.tagline;
    if (input.whatsappNumber !== undefined) updates.whatsapp_number = input.whatsappNumber;
    if (input.whatsappMessageTemplate !== undefined)
      updates.whatsapp_message_template = input.whatsappMessageTemplate;
    if (input.instagramUrl !== undefined) updates.instagram_url = input.instagramUrl;
    if (input.instagramHandle !== undefined) updates.instagram_handle = input.instagramHandle;
    if (input.facebookUrl !== undefined) updates.facebook_url = input.facebookUrl;
    if (input.messengerUrl !== undefined) updates.messenger_url = input.messengerUrl;
    if (input.tiktokUrl !== undefined) updates.tiktok_url = input.tiktokUrl;
    if (input.contactPhone !== undefined) updates.contact_phone = input.contactPhone;
    if (input.contactEmail !== undefined) updates.contact_email = input.contactEmail;
    if (input.storeAddress !== undefined) updates.store_address = input.storeAddress;
    if (input.currency !== undefined) updates.currency = input.currency;
    if (input.currencyEn !== undefined) updates.currency_en = input.currencyEn;
    if (input.freeShippingThreshold !== undefined)
      updates.free_shipping_threshold = input.freeShippingThreshold;
    if (input.enableSocialOrdering !== undefined)
      updates.enable_social_ordering = input.enableSocialOrdering;

    const { data, error } = await this.client
      .from('store_settings')
      .update(updates)
      .eq('id', 'default')
      .select()
      .single();

    if (error) {
      throw new ApiError(`Failed to update store settings: ${error.message}`, 500);
    }
    return mapDbSettingsToSettings(data);
  }

  // ==========================================
  // Administrative Catalog Mutations (R2, R3, R4)
  // ==========================================

  public async createProduct(input: CreateProductInput): Promise<Product> {
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

    const primaryCategorySlug = input.primaryCategorySlug || '';

    // 1. Insert product
    const { error: prodError } = await this.client.from('products').insert({
      id,
      slug,
      title_ar: input.titleAr,
      title_en: input.titleEn,
      description_ar: input.descriptionAr || '',
      description_en: input.descriptionEn || '',
      base_price: input.basePrice,
      discount_price: input.discountPrice ?? null,
      currency: 'EGP',
      primary_category_id: input.categoryIds[0] || null,
      primary_category_slug: primaryCategorySlug,
      category_ids: input.categoryIds,
      tags: input.tags || [],
      rating: 5.0,
      review_count: 0,
      is_featured: Boolean(input.isFeatured),
      is_new_arrival: input.isNewArrival !== undefined ? Boolean(input.isNewArrival) : true,
    });

    if (prodError) {
      throw new ApiError(`Failed to insert product: ${prodError.message}`, 500);
    }

    // 2. Insert variants
    const variantRows = input.variants.map((v, i) => {
      const stockQuantity = v.stockQuantity ?? 0;
      return {
        id: v.id || `var_${timestamp}_${i}`,
        product_id: id,
        sku: v.sku,
        color_name_ar: v.color.nameAr,
        color_name_en: v.color.nameEn,
        color_hex: v.color.hex,
        size: v.size,
        price_adjustment: v.priceAdjustment ?? 0,
        price_override: v.priceOverride ?? null,
        stock_quantity: stockQuantity,
        in_stock: v.inStock !== undefined ? v.inStock : stockQuantity > 0,
        variant_image_url: v.variantImageUrl || null,
      };
    });

    const { error: varError } = await this.client.from('product_variants').insert(variantRows);
    if (varError) {
      throw new ApiError(`Failed to insert variants: ${varError.message}`, 500);
    }

    // 3. Insert images
    if (input.images && input.images.length > 0) {
      const imageRows = input.images.map((imgUrl, i) => ({
        product_id: id,
        image_url: imgUrl,
        display_order: i,
        is_primary: i === 0,
      }));
      const { error: imgError } = await this.client.from('product_images').insert(imageRows);
      if (imgError) {
        console.warn('Failed to insert product images:', imgError.message);
      }
    }

    const created = await this.getProductById(id);
    if (!created) {
      throw new ApiError('Failed to retrieve newly created product', 500);
    }
    return created;
  }

  public async updateProduct(id: string, input: UpdateProductInput): Promise<Product> {
    const productUpdates: any = {
      updated_at: new Date().toISOString(),
    };
    if (input.titleAr !== undefined) productUpdates.title_ar = input.titleAr;
    if (input.titleEn !== undefined) productUpdates.title_en = input.titleEn;
    if (input.slug !== undefined) productUpdates.slug = input.slug;
    if (input.descriptionAr !== undefined) productUpdates.description_ar = input.descriptionAr;
    if (input.descriptionEn !== undefined) productUpdates.description_en = input.descriptionEn;
    if (input.basePrice !== undefined) productUpdates.base_price = input.basePrice;
    if (input.discountPrice !== undefined) productUpdates.discount_price = input.discountPrice;
    if (input.categoryIds !== undefined) {
      productUpdates.category_ids = input.categoryIds;
      if (input.categoryIds[0]) productUpdates.primary_category_id = input.categoryIds[0];
    }
    if (input.primaryCategorySlug !== undefined)
      productUpdates.primary_category_slug = input.primaryCategorySlug;
    if (input.tags !== undefined) productUpdates.tags = input.tags;
    if (input.isFeatured !== undefined) productUpdates.is_featured = input.isFeatured;
    if (input.isNewArrival !== undefined) productUpdates.is_new_arrival = input.isNewArrival;

    const { error: prodError } = await this.client
      .from('products')
      .update(productUpdates)
      .eq('id', id);

    if (prodError) {
      throw new ApiError(`Failed to update product: ${prodError.message}`, 500);
    }

    if (input.variants) {
      await this.client.from('product_variants').delete().eq('product_id', id);
      const timestamp = Date.now();
      const variantRows = input.variants.map((v, i) => {
        const stockQuantity = v.stockQuantity ?? 0;
        return {
          id: v.id || `var_${timestamp}_${i}`,
          product_id: id,
          sku: v.sku,
          color_name_ar: v.color.nameAr,
          color_name_en: v.color.nameEn,
          color_hex: v.color.hex,
          size: v.size,
          price_adjustment: v.priceAdjustment ?? 0,
          price_override: v.priceOverride ?? null,
          stock_quantity: stockQuantity,
          in_stock: v.inStock !== undefined ? v.inStock : stockQuantity > 0,
          variant_image_url: v.variantImageUrl || null,
        };
      });
      await this.client.from('product_variants').insert(variantRows);
    }

    if (input.images) {
      await this.client.from('product_images').delete().eq('product_id', id);
      const imageRows = input.images.map((imgUrl, i) => ({
        product_id: id,
        image_url: imgUrl,
        display_order: i,
        is_primary: i === 0,
      }));
      await this.client.from('product_images').insert(imageRows);
    }

    const updated = await this.getProductById(id);
    if (!updated) {
      throw new ApiError('Product not found after update', 404);
    }
    return updated;
  }

  public async deleteProduct(id: string): Promise<boolean> {
    const { error } = await this.client.from('products').delete().eq('id', id);
    if (error) {
      throw new ApiError(`Failed to delete product: ${error.message}`, 500);
    }
    return true;
  }

  // ==========================================
  // Administrative Order Management API
  // ==========================================

  public async getOrders(params?: OrderFilterParams): Promise<PaginatedResponse<Order>> {
    let query = this.client.from('orders').select('*', { count: 'exact' });

    if (params?.status) {
      query = query.eq('status', params.status);
    }
    if (params?.governorate) {
      query = query.eq('customer_governorate', params.governorate);
    }
    if (params?.searchQuery && params.searchQuery.trim()) {
      const q = params.searchQuery.trim();
      query = query.or(
        `order_id.ilike.%${q}%,customer_name.ilike.%${q}%,customer_phone.ilike.%${q}%`
      );
    }

    query = query.order('created_at', { ascending: false });

    const page = Math.max(1, params?.page || 1);
    const pageSize = Math.max(1, params?.pageSize || 20);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query.range(from, to);

    const { data, count, error } = await query;
    if (error) {
      throw new ApiError(`Failed to fetch orders: ${error.message}`, 500);
    }

    const orders = (data || []).map(mapDbOrderToOrder);
    const total = count != null ? count : orders.length;
    const totalPages = Math.ceil(total / pageSize) || 1;

    return {
      data: orders,
      total,
      page,
      pageSize,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }

  public async getOrderById(orderId: string): Promise<Order | null> {
    const { data, error } = await this.client
      .from('orders')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle();

    if (error) {
      throw new ApiError(`Failed to fetch order: ${error.message}`, 500);
    }
    return data ? mapDbOrderToOrder(data) : null;
  }

  public async updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
    const { data, error } = await this.client
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('order_id', orderId)
      .select()
      .single();

    if (error) {
      throw new ApiError(`Failed to update order status: ${error.message}`, 500);
    }
    return mapDbOrderToOrder(data);
  }

  public async getAdminMetrics(): Promise<AdminMetrics> {
    const { data: orders, error: ordersError } = await this.client
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (ordersError) {
      throw new ApiError(`Failed to fetch admin metrics: ${ordersError.message}`, 500);
    }

    const mappedOrders = (orders || []).map(mapDbOrderToOrder);
    const totalOrders = mappedOrders.length;
    const totalRevenue = mappedOrders
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + (o.pricing?.grandTotal || 0), 0);
    const pendingOrdersCount = mappedOrders.filter(
      (o) => o.status === 'pending_dispatch' || o.status === 'dispatched_whatsapp'
    ).length;

    const { count: totalProductsCount } = await this.client
      .from('products')
      .select('*', { count: 'exact', head: true });

    const { data: lowStockVariants } = await this.client
      .from('product_variants')
      .select('product_id')
      .lte('stock_quantity', 5);

    const lowStockProductIds = new Set((lowStockVariants || []).map((v) => v.product_id));

    return {
      totalOrders,
      totalRevenue,
      pendingOrdersCount,
      totalProductsCount: totalProductsCount || 0,
      lowStockItemsCount: lowStockProductIds.size,
      recentOrders: mappedOrders.slice(0, 5),
    };
  }

  public async uploadProductImage(
    file: File | Blob,
    customPath?: string
  ): Promise<{ url: string; path: string }> {
    const fileName = (file as File).name || `img_${Date.now()}.png`;
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = customPath || `products/${Date.now()}_${cleanFileName}`;

    const { error: uploadError } = await this.client.storage
      .from('product-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw new ApiError(`Failed to upload product image: ${uploadError.message}`, 500);
    }

    const {
      data: { publicUrl },
    } = this.client.storage.from('product-images').getPublicUrl(filePath);

    return { url: publicUrl, path: filePath };
  }
}
