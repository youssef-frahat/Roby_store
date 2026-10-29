import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from '../../src/store/useCartStore';
import type { Product, ProductVariant } from '../../src/types/store';

describe('Zustand Shopping Cart Store (R3, AC 2 - Tiers 1 & 2)', () => {
  const mockVariant1: ProductVariant = {
    id: 'var_01',
    sku: 'ROBY-ABY-BLK-M',
    color: { nameAr: 'أسود ملكي', nameEn: 'Royal Black', hex: '#1A1A1A' },
    size: 'M',
    priceAdjustment: 0,
    stockQuantity: 3,
    inStock: true,
  };

  const mockVariant2: ProductVariant = {
    id: 'var_02',
    sku: 'ROBY-ABY-ROS-L',
    color: { nameAr: 'وردي مغبر', nameEn: 'Dusty Rose', hex: '#D4A5A5' },
    size: 'L',
    priceAdjustment: 50,
    stockQuantity: 2,
    inStock: true,
  };

  const mockProduct: Product = {
    id: 'prod_01',
    slug: 'luxury-silk-abaya',
    titleAr: 'عباية حرير فاخرة',
    titleEn: 'Luxury Silk Abaya',
    descriptionAr: 'عباية فاخرة',
    descriptionEn: 'Luxury abaya',
    basePrice: 500,
    discountPrice: 400,
    currency: 'EGP',
    images: ['/abaya-black.jpg', '/abaya-rose.jpg'],
    categoryIds: ['cat_abayas'],
    primaryCategorySlug: 'abayas',
    tags: ['abaya'],
    rating: 5,
    reviewCount: 10,
    isFeatured: true,
    isNewArrival: true,
    variants: [mockVariant1, mockVariant2],
    availableColors: [mockVariant1.color, mockVariant2.color],
    availableSizes: ['M', 'L'],
    totalStock: 5,
    hasStock: true,
    createdAt: '2026-10-28T00:00:00Z',
    updatedAt: '2026-10-28T00:00:00Z',
  };

  beforeEach(() => {
    useCartStore.getState().clearCart();
    localStorage.clear();
  });

  // ==========================================
  // TIER 1: FEATURE COVERAGE (HAPPY PATH)
  // ==========================================

  describe('Tier 1: Feature Coverage (>=5 test cases)', () => {
    it('TC-T1-CRT-01: adds a new item to cart with correct initial quantity', () => {
      const success = useCartStore.getState().addItem(mockProduct, mockVariant1, 1);
      expect(success).toBe(true);

      const items = useCartStore.getState().items;
      expect(items.length).toBe(1);
      expect(items[0].productId).toBe('prod_01');
      expect(items[0].sku).toBe('ROBY-ABY-BLK-M');
      expect(items[0].quantity).toBe(1);
      expect(items[0].unitPrice).toBe(400); // Uses discount price
    });

    it('TC-T1-CRT-02: adding identical item increments existing quantity without duplicating row', () => {
      useCartStore.getState().addItem(mockProduct, mockVariant1, 1);
      useCartStore.getState().addItem(mockProduct, mockVariant1, 1);

      const items = useCartStore.getState().items;
      expect(items.length).toBe(1);
      expect(items[0].quantity).toBe(2);
    });

    it('TC-T1-CRT-03: creates distinct line items for different variants of the same product', () => {
      useCartStore.getState().addItem(mockProduct, mockVariant1, 1);
      useCartStore.getState().addItem(mockProduct, mockVariant2, 1);

      const items = useCartStore.getState().items;
      expect(items.length).toBe(2);
      expect(items[0].sku).toBe('ROBY-ABY-BLK-M');
      expect(items[1].sku).toBe('ROBY-ABY-ROS-L');
      // Variant 2 has +50 priceAdjustment: 400 + 50 = 450
      expect(items[1].unitPrice).toBe(450);
    });

    it('TC-T1-CRT-04: removes specific item from cart by item ID', () => {
      useCartStore.getState().addItem(mockProduct, mockVariant1, 1);
      useCartStore.getState().addItem(mockProduct, mockVariant2, 1);

      const firstItemId = useCartStore.getState().items[0].id;
      useCartStore.getState().removeItem(firstItemId);

      const remainingItems = useCartStore.getState().items;
      expect(remainingItems.length).toBe(1);
      expect(remainingItems[0].sku).toBe('ROBY-ABY-ROS-L');
    });

    it('TC-T1-CRT-05: clears entire cart and resets totals to zero', () => {
      useCartStore.getState().addItem(mockProduct, mockVariant1, 2);
      useCartStore.getState().clearCart();

      expect(useCartStore.getState().items.length).toBe(0);
      expect(useCartStore.getState().getItemCount()).toBe(0);
      expect(useCartStore.getState().getSubtotal()).toBe(0);
    });
  });

  // ==========================================
  // TIER 2: BOUNDARY & CORNER CASES (>=5 test cases)
  // ==========================================

  describe('Tier 2: Boundary & Corner Cases (>=5 test cases)', () => {
    it('TC-T2-CRT-01: prevents adding quantity exceeding variant stock limit', () => {
      // mockVariant1 has stockQuantity: 3
      const success = useCartStore.getState().addItem(mockProduct, mockVariant1, 5);
      expect(success).toBe(false);

      const items = useCartStore.getState().items;
      expect(items.length).toBe(0);
    });

    it('TC-T2-CRT-02: prevents incrementing existing item beyond available stock ceiling', () => {
      useCartStore.getState().addItem(mockProduct, mockVariant1, 2);
      // Attempting to add 2 more when stock is 3 should fail
      const success = useCartStore.getState().addItem(mockProduct, mockVariant1, 2);
      expect(success).toBe(false);

      expect(useCartStore.getState().items[0].quantity).toBe(2);
    });

    it('TC-T2-CRT-03: updateQuantity clamps requested value to maxStock limit', () => {
      useCartStore.getState().addItem(mockProduct, mockVariant1, 1);
      const itemId = useCartStore.getState().items[0].id;

      // Update to 99 should clamp to stock (3)
      useCartStore.getState().updateQuantity(itemId, 99);
      expect(useCartStore.getState().items[0].quantity).toBe(3);
    });

    it('TC-T2-CRT-04: updateQuantity to zero or negative removes item from cart', () => {
      useCartStore.getState().addItem(mockProduct, mockVariant1, 1);
      const itemId = useCartStore.getState().items[0].id;

      useCartStore.getState().updateQuantity(itemId, 0);
      expect(useCartStore.getState().items.length).toBe(0);
    });

    it('TC-T2-CRT-05: calculates exact item count, subtotal, and savings getters', () => {
      // Item 1: qty 2 @ 400 EGP (orig 500) = 800 (orig 1000, save 200)
      useCartStore.getState().addItem(mockProduct, mockVariant1, 2);
      // Item 2: qty 1 @ 450 EGP (orig 550) = 450 (orig 550, save 100)
      useCartStore.getState().addItem(mockProduct, mockVariant2, 1);

      expect(useCartStore.getState().getItemCount()).toBe(3);
      expect(useCartStore.getState().getSubtotal()).toBe(1250);
      expect(useCartStore.getState().getTotalDiscount()).toBe(300);
      expect(useCartStore.getState().getGrandTotal()).toBe(1250);
    });
  });
});
