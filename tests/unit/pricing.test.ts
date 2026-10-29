import { describe, it, expect } from 'vitest';
import {
  calculateEffectiveUnitPrice,
  calculateCartSummary,
  canIncrementCartItem,
  clampCartQuantity,
} from '../../src/utils/pricing';
import type { Product, ProductVariant, CartItem, GovernorateInfo, EgyptianGovernorate } from '../../src/types/store';

describe('Pure Pricing & Math Engine (R3, AC 2 - Tiers 1 & 2)', () => {
  const mockVariant: ProductVariant = {
    id: 'var_01',
    sku: 'ROBY-ABY-BLK-M',
    color: { nameAr: 'أسود ملكي', nameEn: 'Royal Black', hex: '#1A1A1A' },
    size: 'M',
    priceAdjustment: 50,
    stockQuantity: 5,
    inStock: true,
  };

  const mockProduct: Product = {
    id: 'prod_01',
    slug: 'luxury-silk-abaya',
    titleAr: 'عباية حرير فاخرة',
    titleEn: 'Luxury Silk Abaya',
    descriptionAr: 'عباية مصنوعة من الحرير الطبيعي',
    descriptionEn: 'Abaya crafted from natural silk',
    basePrice: 800,
    discountPrice: 650,
    currency: 'EGP',
    images: ['/images/abaya-1.jpg'],
    categoryIds: ['cat_abayas'],
    primaryCategorySlug: 'abayas',
    tags: ['luxury', 'abaya'],
    rating: 4.9,
    reviewCount: 28,
    isFeatured: true,
    isNewArrival: true,
    variants: [mockVariant],
    availableColors: [mockVariant.color],
    availableSizes: ['M'],
    totalStock: 5,
    hasStock: true,
    createdAt: '2026-10-28T00:00:00Z',
    updatedAt: '2026-10-28T00:00:00Z',
  };

  const mockGovernorates: GovernorateInfo[] = [
    { code: 'Cairo', nameAr: 'القاهرة', nameEn: 'Cairo', shippingFee: 50, shippingZone: 1 },
    { code: 'Giza', nameAr: 'الجيزة', nameEn: 'Giza', shippingFee: 50, shippingZone: 1 },
    { code: 'Alexandria', nameAr: 'الإسكندرية', nameEn: 'Alexandria', shippingFee: 65, shippingZone: 2 },
    { code: 'Aswan', nameAr: 'أسوان', nameEn: 'Aswan', shippingFee: 100, shippingZone: 4 },
  ];

  // ==========================================
  // TIER 1: FEATURE COVERAGE (HAPPY PATH)
  // ==========================================

  describe('Tier 1: Feature Coverage (>=5 test cases)', () => {
    it('TC-T1-MTH-01: calculates effective unit price without discount', () => {
      const productNoDiscount: Product = { ...mockProduct, discountPrice: undefined };
      const result = calculateEffectiveUnitPrice(productNoDiscount);

      expect(result.unitPrice).toBe(800);
      expect(result.originalUnitPrice).toBe(800);
      expect(result.hasDiscount).toBe(false);
    });

    it('TC-T1-MTH-02: calculates effective unit price with valid discount', () => {
      const result = calculateEffectiveUnitPrice(mockProduct);

      expect(result.unitPrice).toBe(650);
      expect(result.originalUnitPrice).toBe(800);
      expect(result.hasDiscount).toBe(true);
    });

    it('TC-T1-MTH-03: applies variant price adjustment to both unit and original price', () => {
      const result = calculateEffectiveUnitPrice(mockProduct, mockVariant);

      // base: 800, discount: 650, adjustment: +50 -> unitPrice: 700, original: 850
      expect(result.unitPrice).toBe(700);
      expect(result.originalUnitPrice).toBe(850);
      expect(result.hasDiscount).toBe(true);
    });

    it('TC-T1-MTH-04: calculates exact subtotal and customer savings for cart items', () => {
      const items: CartItem[] = [
        {
          id: 'prod_01__ROBY-ABY-BLK-M',
          productId: 'prod_01',
          productSlug: 'luxury-silk-abaya',
          productTitleAr: 'عباية حرير فاخرة',
          productTitleEn: 'Luxury Silk Abaya',
          productImage: '/images/abaya-1.jpg',
          variant: mockVariant,
          unitPrice: 700,
          originalUnitPrice: 850,
          quantity: 2,
          subtotal: 1400,
        },
      ];

      const summary = calculateCartSummary(items, 'Cairo', mockGovernorates);

      expect(summary.totalItemCount).toBe(2);
      expect(summary.subtotal).toBe(1400);
      expect(summary.totalSavings).toBe(300); // (850 - 700) * 2 = 300
      expect(summary.shippingFee).toBe(50);
      expect(summary.grandTotal).toBe(1450);
      expect(summary.currency).toBe('EGP');
    });

    it('TC-T1-MTH-05: updates grand total accurately when shipping zone changes', () => {
      const items: CartItem[] = [
        {
          id: 'item_1',
          productId: 'prod_01',
          productSlug: 'test',
          productTitleAr: 'منتج',
          productTitleEn: 'Product',
          productImage: '/test.jpg',
          variant: mockVariant,
          unitPrice: 500,
          originalUnitPrice: 500,
          quantity: 1,
          subtotal: 500,
        },
      ];

      const cairoSummary = calculateCartSummary(items, 'Cairo', mockGovernorates);
      expect(cairoSummary.shippingFee).toBe(50);
      expect(cairoSummary.grandTotal).toBe(550);

      const aswanSummary = calculateCartSummary(items, 'Aswan', mockGovernorates);
      expect(aswanSummary.shippingFee).toBe(100);
      expect(aswanSummary.grandTotal).toBe(600);
    });
  });

  // ==========================================
  // TIER 2: BOUNDARY & CORNER CASES (>=5 test cases)
  // ==========================================

  describe('Tier 2: Boundary & Corner Cases (>=5 test cases)', () => {
    it('TC-T2-MTH-01: eliminates JavaScript float arithmetic drift (0.1 + 0.2 precision)', () => {
      const floatItems: CartItem[] = [
        {
          id: 'f1',
          productId: 'p1',
          productSlug: 'p1',
          productTitleAr: 'p1',
          productTitleEn: 'p1',
          productImage: '',
          variant: mockVariant,
          unitPrice: 199.99,
          originalUnitPrice: 199.99,
          quantity: 3,
          subtotal: 599.97,
        },
        {
          id: 'f2',
          productId: 'p2',
          productSlug: 'p2',
          productTitleAr: 'p2',
          productTitleEn: 'p2',
          productImage: '',
          variant: mockVariant,
          unitPrice: 49.95,
          originalUnitPrice: 49.95,
          quantity: 1,
          subtotal: 49.95,
        },
      ];

      const summary = calculateCartSummary(floatItems, 'Alexandria', mockGovernorates);
      // 599.97 + 49.95 = 649.92
      // 649.92 + 65 (shipping) = 714.92
      expect(summary.subtotal).toBe(649.92);
      expect(summary.shippingFee).toBe(65);
      expect(summary.grandTotal).toBe(714.92);
      // Verify no IEEE-754 decimal artifacts (e.g. 714.9200000000001)
      expect(summary.grandTotal.toString()).toBe('714.92');
    });

    it('TC-T2-MTH-02: invalid discount (discountPrice >= basePrice) is ignored', () => {
      const invalidDiscountProduct: Product = {
        ...mockProduct,
        basePrice: 500,
        discountPrice: 550, // Higher than base price!
      };

      const result = calculateEffectiveUnitPrice(invalidDiscountProduct);
      expect(result.unitPrice).toBe(500);
      expect(result.originalUnitPrice).toBe(500);
      expect(result.hasDiscount).toBe(false);
    });

    it('TC-T2-MTH-03: negative price adjustment greater than base price is clamped to zero', () => {
      const heavyNegativeVariant: ProductVariant = {
        ...mockVariant,
        priceAdjustment: -1000,
      };

      const result = calculateEffectiveUnitPrice(mockProduct, heavyNegativeVariant);
      expect(result.unitPrice).toBe(0);
      expect(result.originalUnitPrice).toBe(0);
    });

    it('TC-T2-MTH-04: variant absolute priceOverride takes absolute precedence', () => {
      const overrideVariant: ProductVariant = {
        ...mockVariant,
        priceOverride: 499,
        priceAdjustment: 100, // Should be ignored in favor of override
      };

      const result = calculateEffectiveUnitPrice(mockProduct, overrideVariant);
      expect(result.unitPrice).toBe(499);
      expect(result.originalUnitPrice).toBe(499);
      expect(result.hasDiscount).toBe(false);
    });

    it('TC-T2-MTH-05: empty cart produces exact zeros without NaN or undefined', () => {
      const emptySummary = calculateCartSummary([]);

      expect(emptySummary.totalItemCount).toBe(0);
      expect(emptySummary.subtotal).toBe(0);
      expect(emptySummary.totalSavings).toBe(0);
      expect(emptySummary.shippingFee).toBe(0);
      expect(emptySummary.grandTotal).toBe(0);
      expect(Number.isNaN(emptySummary.grandTotal)).toBe(false);
    });

    it('TC-T2-MTH-06: canIncrementCartItem blocks increment when quantity equals stock', () => {
      const itemAtLimit: CartItem = {
        id: 'limit_item',
        productId: 'prod_01',
        productSlug: 'slug',
        productTitleAr: 'title',
        productTitleEn: 'title',
        productImage: '',
        variant: { ...mockVariant, stockQuantity: 3 },
        unitPrice: 100,
        originalUnitPrice: 100,
        quantity: 3,
        subtotal: 300,
      };

      expect(canIncrementCartItem(itemAtLimit)).toBe(false);

      const itemBelowLimit: CartItem = {
        ...itemAtLimit,
        quantity: 2,
      };
      expect(canIncrementCartItem(itemBelowLimit)).toBe(true);
    });

    it('TC-T2-MTH-07: clampCartQuantity clamps inputs to [1, maxStock]', () => {
      expect(clampCartQuantity(10, 5)).toBe(5);
      expect(clampCartQuantity(-2, 5)).toBe(1);
      expect(clampCartQuantity(0, 5)).toBe(1);
      expect(clampCartQuantity(3, 5)).toBe(3);
    });
  });
});
