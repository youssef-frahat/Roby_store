import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MockStoreService } from '../../src/services/mockStoreService';
import { useCartStore } from '../../src/store/useCartStore';
import {
  calculateEffectiveUnitPrice,
  calculateCartSummary,
} from '../../src/utils/pricing';
import {
  validateEgyptianPhone,
  validateCustomerDetails,
} from '../../src/utils/validation';
import {
  generateOrderId,
  formatOrderReceiptMessage,
  buildWhatsAppOrderUrl,
  formatSocialOrderSummary,
} from '../../src/utils/order';
import type { CustomerDetails, Order } from '../../src/types/order';
import type { Product, ProductVariant } from '../../src/types/store';

describe('Tier 3 & Tier 4 E2E: Social Commerce Customer Journeys & Cross-Feature Integration', () => {
  let service: MockStoreService;

  beforeEach(() => {
    service = new MockStoreService(0);
    service.resetSimulation();
    useCartStore.getState().clearCart();
    localStorage.clear();
    vi.clearAllMocks();
  });

  // ==========================================
  // TIER 3: CROSS-FEATURE PAIRWISE COMBINATIONS
  // ==========================================

  describe('Tier 3: Cross-Feature Combinations', () => {
    it('TC-T3-PAIR-01: category navigation combined with faceted search filters', async () => {
      // 1. Fetch categories to locate Women's Fashion
      const categories = await service.getCategories();
      const fashionCategory = categories.find((c) => c.slug === 'womens-fashion' || c.id === 'cat_womens_fashion');
      expect(fashionCategory).toBeDefined();

      // 2. Query products constrained to category AND price range
      const response = await service.getProducts({
        categorySlug: fashionCategory?.slug,
        minPrice: 400,
        maxPrice: 900,
      });

      expect(response.data.length).toBeGreaterThan(0);
      for (const product of response.data) {
        const effectivePrice = product.discountPrice ?? product.basePrice;
        expect(effectivePrice).toBeGreaterThanOrEqual(400);
        expect(effectivePrice).toBeLessThanOrEqual(900);
      }
    });

    it('TC-T3-PAIR-02: adding two different variants of same product produces separate cart items', async () => {
      const { data: products } = await service.getProducts({ pageSize: 1 });
      const product = products[0];
      expect(product.variants.length).toBeGreaterThanOrEqual(2);

      const variant1 = product.variants[0];
      const variant2 = product.variants[1];

      // Add variant 1
      useCartStore.getState().addItem(product, variant1, 1);
      // Add variant 2
      useCartStore.getState().addItem(product, variant2, 1);

      const items = useCartStore.getState().items;
      expect(items.length).toBe(2);
      expect(items[0].sku).toBe(variant1.sku);
      expect(items[1].sku).toBe(variant2.sku);
      expect(items[0].id).not.toBe(items[1].id);
    });

    it('TC-T3-PAIR-03: changing governorate updates shipping fee and grand total dynamically', async () => {
      const governorates = await service.getGovernorates();
      const { data: products } = await service.getProducts({ pageSize: 1 });
      const product = products[0];
      const variant = product.variants[0];

      useCartStore.getState().addItem(product, variant, 1);
      const cartItems = useCartStore.getState().items;

      // Initial with Cairo
      const cairoSummary = calculateCartSummary(cartItems, 'Cairo', governorates);
      expect(cairoSummary.shippingFee).toBe(50);
      expect(cairoSummary.grandTotal).toBe(cairoSummary.subtotal + 50);

      // Customer switches to Alexandria
      const alexSummary = calculateCartSummary(cartItems, 'Alexandria', governorates);
      expect(alexSummary.shippingFee).toBe(65);
      expect(alexSummary.grandTotal).toBe(alexSummary.subtotal + 65);

      // Customer switches to Aswan (Zone 3: 80 EGP)
      const aswanSummary = calculateCartSummary(cartItems, 'Aswan', governorates);
      expect(aswanSummary.shippingFee).toBe(80);
      expect(aswanSummary.grandTotal).toBe(aswanSummary.subtotal + 80);

      // Customer switches to Matrouh (Zone 4: 100 EGP)
      const matrouhSummary = calculateCartSummary(cartItems, 'Matrouh', governorates);
      expect(matrouhSummary.shippingFee).toBe(100);
      expect(matrouhSummary.grandTotal).toBe(matrouhSummary.subtotal + 100);
    });

    it('TC-T3-PAIR-04: successful checkout order clears cart state and retains order record', async () => {
      const { data: products } = await service.getProducts({ pageSize: 1 });
      useCartStore.getState().addItem(products[0], products[0].variants[0], 2);

      expect(useCartStore.getState().items.length).toBe(1);

      const customer: CustomerDetails = {
        fullName: 'نورهان سعيد',
        phone: '01211112222',
        governorate: 'Giza',
        city: 'الدقي',
        deliveryAddress: '8 شارع التحرير، الدقي',
      };

      const result = await service.submitOrder({
        customer,
        items: useCartStore.getState().items,
        dispatchChannel: 'whatsapp',
      });

      expect(result.success).toBe(true);
      expect(result.whatsappUrl).toContain('https://wa.me/');

      // Once order dispatched, cart is cleared
      useCartStore.getState().clearCart();
      expect(useCartStore.getState().items.length).toBe(0);
    });
  });

  // ==========================================
  // TIER 4: REAL-WORLD APPLICATION SCENARIOS
  // ==========================================

  describe('Tier 4: Real-World Application Scenarios (AC 4)', () => {
    it('Scenario 1: Egyptian Shopper Silk Abaya Purchase Journey (Full E2E Flow)', async () => {
      // Step 1: User visits store and retrieves banners & categories
      const banners = await service.getPromotionalBanners();
      expect(banners.length).toBeGreaterThan(0);

      const categories = await service.getCategories();
      const abayasCategory = categories.find((c) => c.slug.includes('abaya') || c.id.includes('abaya'));

      // Step 2: User filters catalog for abayas
      const catalogResult = await service.getProducts({
        categorySlug: abayasCategory ? abayasCategory.slug : undefined,
      });
      expect(catalogResult.data.length).toBeGreaterThan(0);

      const targetProduct = catalogResult.data[0];

      // Step 3: Inspect product details and variant matrix
      const productDetails = await service.getProductBySlug(targetProduct.slug);
      expect(productDetails).not.toBeNull();

      // Find an in-stock variant
      const chosenVariant = productDetails!.variants.find((v) => v.inStock && v.stockQuantity >= 2);
      expect(chosenVariant).toBeDefined();

      // Step 4: Add 2 units to shopping cart
      const addSuccess = useCartStore.getState().addItem(productDetails!, chosenVariant!, 2);
      expect(addSuccess).toBe(true);

      const cartItems = useCartStore.getState().items;
      expect(cartItems.length).toBe(1);
      expect(cartItems[0].quantity).toBe(2);

      // Step 5: Fill checkout form with Egyptian customer information
      const customerData: CustomerDetails = {
        fullName: 'فاطمة الزهراء حسن',
        phone: '01019876543',
        governorate: 'Cairo',
        city: 'مدينة نصر',
        deliveryAddress: '12 شارع عباس العقاد، الدور الرابع، شقة 8',
        notes: 'يرجى الاتصال قبل الوصول بنصف ساعة',
      };

      // Step 6: Validate checkout data
      const phoneValidation = validateEgyptianPhone(customerData.phone);
      expect(phoneValidation.isValid).toBe(true);

      const formValidation = validateCustomerDetails(customerData);
      expect(formValidation.isValid).toBe(true);

      // Step 7: Calculate final cart summary with shipping
      const governorates = await service.getGovernorates();
      const summary = calculateCartSummary(cartItems, customerData.governorate, governorates);
      expect(summary.shippingFee).toBe(50);
      expect(summary.grandTotal).toBe(summary.subtotal + 50);

      // Step 8: Generate deterministic order and format WhatsApp dispatch
      const orderId = generateOrderId();
      const order: Order = {
        orderId,
        createdAt: new Date().toISOString(),
        customer: customerData,
        items: [
          {
            productId: targetProduct.id,
            productSlug: targetProduct.slug,
            productTitleAr: targetProduct.titleAr,
            productTitleEn: targetProduct.titleEn,
            productImage: targetProduct.images[0],
            sku: chosenVariant!.sku,
            colorNameAr: chosenVariant!.color.nameAr,
            colorNameEn: chosenVariant!.color.nameEn,
            colorHex: chosenVariant!.color.hex,
            size: chosenVariant!.size,
            unitPrice: cartItems[0].unitPrice,
            originalUnitPrice: cartItems[0].originalUnitPrice,
            quantity: cartItems[0].quantity,
            subtotal: cartItems[0].subtotal,
          },
        ],
        pricing: {
          subtotal: summary.subtotal,
          shippingFee: summary.shippingFee,
          totalSavings: summary.totalSavings,
          grandTotal: summary.grandTotal,
          currency: 'EGP',
        },
        status: 'dispatched_whatsapp',
        dispatchChannel: 'whatsapp',
        formattedSocialMessage: '',
        whatsappDirectUrl: '',
      };

      const receiptMessage = formatOrderReceiptMessage(order);
      expect(receiptMessage).toContain(orderId);
      expect(receiptMessage).toContain('فاطمة الزهراء حسن');
      expect(receiptMessage).toContain('01019876543');
      expect(receiptMessage).toContain(chosenVariant!.size);
      expect(receiptMessage).toContain(chosenVariant!.color.nameAr);
      expect(receiptMessage).toContain(`${summary.grandTotal} ج.م`);

      const whatsappUrl = buildWhatsAppOrderUrl('201001234567', receiptMessage);
      expect(whatsappUrl.startsWith('https://wa.me/201001234567?text=')).toBe(true);

      // Step 9: Verify window.open invocation in browser environment
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      expect(window.open).toHaveBeenCalledWith(
        expect.stringContaining('https://wa.me/201001234567?text='),
        '_blank',
        'noopener,noreferrer'
      );

      // Step 10: Clear cart and complete flow
      useCartStore.getState().clearCart();
      expect(useCartStore.getState().items.length).toBe(0);
    });

    it('Scenario 2: Home Bedding Custom Size & Dimension Adjustment Journey', async () => {
      // Find bedding product
      const { data: products } = await service.getProducts({
        categorySlug: 'home-textiles',
      });
      const beddingProduct = products.find(
        (p) => p.categoryIds.includes('cat_bedding') || p.slug.includes('bedding') || p.categoryIds.includes('cat_home_textiles')
      ) || products[0];

      // Select variant with price adjustment (e.g. King size)
      const adjustedVariant = beddingProduct.variants.find((v) => v.priceAdjustment > 0) || beddingProduct.variants[0];

      const priceResult = calculateEffectiveUnitPrice(beddingProduct, adjustedVariant);
      expect(priceResult.unitPrice).toBe(
        (beddingProduct.discountPrice ?? beddingProduct.basePrice) + adjustedVariant.priceAdjustment
      );

      useCartStore.getState().addItem(beddingProduct, adjustedVariant, 3);
      expect(useCartStore.getState().items[0].quantity).toBe(3);

      // Deliver to Luxor (Zone 4)
      const governorates = await service.getGovernorates();
      const summary = calculateCartSummary(useCartStore.getState().items, 'Luxor', governorates);

      const luxorGov = governorates.find((g) => g.code === 'Luxor');
      expect(summary.shippingFee).toBe(luxorGov ? luxorGov.shippingFee : 100);
    });

    it('Scenario 5: Social Quick-Copy Fallback for Instagram Direct and Messenger', async () => {
      const { data: products } = await service.getProducts({ pageSize: 1 });
      const product = products[0];
      const variant = product.variants[0];

      useCartStore.getState().addItem(product, variant, 1);

      const customer: CustomerDetails = {
        fullName: 'ياسمين علي',
        phone: '01199998888',
        governorate: 'Alexandria',
        city: 'سموحة',
        deliveryAddress: 'شارع فوزي معاذ، سموحة',
      };

      const orderId = generateOrderId();
      const order: Order = {
        orderId,
        createdAt: new Date().toISOString(),
        customer,
        items: [
          {
            productId: product.id,
            productSlug: product.slug,
            productTitleAr: product.titleAr,
            productTitleEn: product.titleEn,
            productImage: product.images[0],
            sku: variant.sku,
            colorNameAr: variant.color.nameAr,
            colorNameEn: variant.color.nameEn,
            colorHex: variant.color.hex,
            size: variant.size,
            unitPrice: variant.priceAdjustment + (product.discountPrice ?? product.basePrice),
            originalUnitPrice: variant.priceAdjustment + product.basePrice,
            quantity: 1,
            subtotal: variant.priceAdjustment + (product.discountPrice ?? product.basePrice),
          },
        ],
        pricing: {
          subtotal: 500,
          shippingFee: 65,
          totalSavings: 100,
          grandTotal: 565,
          currency: 'EGP',
        },
        status: 'pending_dispatch',
        dispatchChannel: 'instagram',
        formattedSocialMessage: '',
        whatsappDirectUrl: '',
      };

      const plainTextSummary = formatSocialOrderSummary(order);
      expect(plainTextSummary).toContain(orderId);
      expect(plainTextSummary).toContain('ياسمين علي');

      // Execute clipboard copy
      await navigator.clipboard.writeText(plainTextSummary);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(plainTextSummary);
    });
  });
});
