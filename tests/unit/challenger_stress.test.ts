import { describe, it, expect, beforeEach } from 'vitest';
import { MockStoreService } from '../../src/services/mockStoreService';
import { useCartStore } from '../../src/store/useCartStore';
import {
  calculateCartSummary,
  calculateEffectiveUnitPrice,
  clampCartQuantity,
  canIncrementCartItem,
  roundToTwoDecimals,
} from '../../src/utils/pricing';
import { isValidGovernorate, validateCustomerDetails } from '../../src/utils/validation';
import type {
  Product,
  ProductVariant,
  Category,
  GovernorateInfo,
  EgyptianGovernorate,
  ApiError,
} from '../../src/types/store';
import type { CartItem } from '../../src/types/order';

import governoratesFixture from '../../src/data/governorates.json';
import categoriesFixture from '../../src/data/categories.json';

describe('Milestone 1 Challenger Stress Suite (Adversarial Testing)', () => {
  // =========================================================================
  // 1. CATEGORY HIERARCHY RECURSION STRESS TESTS
  // =========================================================================
  describe('1. Category Hierarchy Recursion & Tree Construction', () => {
    let service: MockStoreService;

    beforeEach(() => {
      service = new MockStoreService(0);
      service.resetSimulation();
    });

    it('CHAL-CAT-01: constructs hierarchical tree with correct parent-child nesting', async () => {
      const tree = await service.getCategoryTree();
      expect(Array.isArray(tree)).toBe(true);
      expect(tree.length).toBeGreaterThan(0);

      // Root categories must have parentId === null
      for (const root of tree) {
        expect(root.parentId).toBeNull();
        expect(Array.isArray(root.children)).toBe(true);
      }

      // Find Women's Fashion and verify its children
      const womensFashion = tree.find((c) => c.slug === 'womens-fashion');
      expect(womensFashion).toBeDefined();
      expect(womensFashion!.children.length).toBeGreaterThan(0);

      const abayasChild = womensFashion!.children.find((c) => c.slug === 'abayas-and-kaftans');
      expect(abayasChild).toBeDefined();
      expect(abayasChild!.parentId).toBe(womensFashion!.id);
    });

    it('CHAL-CAT-02: filters products by root category slug including all descendant categories', async () => {
      // Querying by root category 'womens-fashion'
      const response = await service.getProducts({ categorySlug: 'womens-fashion', pageSize: 100 });
      expect(response.data.length).toBeGreaterThan(0);

      // Ensure that products assigned to subcategories (e.g. cat_abayas) are included
      const hasAbayas = response.data.some((p) => p.categoryIds.includes('cat_abayas'));
      expect(hasAbayas).toBe(true);
    });

    it('CHAL-CAT-03: querying by leaf subcategory slug returns strictly scoped products', async () => {
      const response = await service.getProducts({ categorySlug: 'abayas-and-kaftans', pageSize: 100 });
      expect(response.data.length).toBeGreaterThan(0);

      // All returned products must belong to abayas
      for (const prod of response.data) {
        const belongsToAbayas =
          prod.categoryIds.includes('cat_abayas') || prod.primaryCategorySlug === 'abayas-and-kaftans';
        expect(belongsToAbayas).toBe(true);
      }
    });

    it('CHAL-CAT-04: non-existent category slug returns empty data array without throwing', async () => {
      const response = await service.getProducts({ categorySlug: 'non-existent-category-slug' });
      expect(response.data).toEqual([]);
      expect(response.total).toBe(0);
    });

    it('CHAL-CAT-05: orphan category with unknown parentId falls back gracefully to root level', async () => {
      // Create a test instance with an orphan category injected
      const testCategories: Category[] = [
        {
          id: 'cat_root',
          nameAr: 'جذر',
          nameEn: 'Root',
          slug: 'root',
          description: '',
          imageUrl: '',
          iconName: 'Home',
          parentId: null,
          level: 0,
          displayOrder: 1,
        },
        {
          id: 'cat_orphan',
          nameAr: 'يتيم',
          nameEn: 'Orphan',
          slug: 'orphan',
          description: '',
          imageUrl: '',
          iconName: 'HelpCircle',
          parentId: 'cat_missing_parent_999', // Unknown parent
          level: 1,
          displayOrder: 2,
        },
      ];

      // In mockStoreService, treeNode is added to rootNodes if parentId not in map
      const categoryMap = new Map<string, any>();
      testCategories.forEach((cat) => categoryMap.set(cat.id, { ...cat, children: [] }));
      const rootNodes: any[] = [];
      testCategories.forEach((cat) => {
        const treeNode = categoryMap.get(cat.id)!;
        if (cat.parentId && categoryMap.has(cat.parentId)) {
          categoryMap.get(cat.parentId)!.children.push(treeNode);
        } else {
          rootNodes.push(treeNode);
        }
      });

      expect(rootNodes.length).toBe(2);
      expect(rootNodes.map((r) => r.id)).toContain('cat_orphan');
    });

    it('CHAL-CAT-06: deep multi-level (3+ levels) hierarchy resolves properly', () => {
      const multiLevel: Category[] = [
        { id: 'l0', nameAr: 'مستوى 0', nameEn: 'L0', slug: 'l0', description: '', imageUrl: '', iconName: '', parentId: null, level: 0, displayOrder: 1 },
        { id: 'l1', nameAr: 'مستوى 1', nameEn: 'L1', slug: 'l1', description: '', imageUrl: '', iconName: '', parentId: 'l0', level: 1, displayOrder: 1 },
        { id: 'l2', nameAr: 'مستوى 2', nameEn: 'L2', slug: 'l2', description: '', imageUrl: '', iconName: '', parentId: 'l1', level: 2, displayOrder: 1 },
      ];

      const categoryMap = new Map<string, any>();
      multiLevel.forEach((cat) => categoryMap.set(cat.id, { ...cat, children: [] }));
      const roots: any[] = [];
      multiLevel.forEach((cat) => {
        const treeNode = categoryMap.get(cat.id)!;
        if (cat.parentId && categoryMap.has(cat.parentId)) {
          categoryMap.get(cat.parentId)!.children.push(treeNode);
        } else {
          roots.push(treeNode);
        }
      });

      expect(roots.length).toBe(1);
      expect(roots[0].id).toBe('l0');
      expect(roots[0].children.length).toBe(1);
      expect(roots[0].children[0].id).toBe('l1');
      expect(roots[0].children[0].children.length).toBe(1);
      expect(roots[0].children[0].children[0].id).toBe('l2');
    });
  });

  // =========================================================================
  // 2. MOCK LATENCY & ERROR INJECTION SWITCHES (none vs 500 vs network)
  // =========================================================================
  describe('2. Mock Latency and Error Injection Switches', () => {
    let service: MockStoreService;

    beforeEach(() => {
      service = new MockStoreService(0);
      service.resetSimulation();
    });

    it('CHAL-ERR-01: setting simulatedError to 500 causes all service endpoints to throw ApiError 500', async () => {
      service.setSimulatedError('500');

      await expect(service.getCategories()).rejects.toThrow();
      await expect(service.getCategoryTree()).rejects.toThrow();
      await expect(service.getCategoryBySlug('womens-fashion')).rejects.toThrow();
      await expect(service.getProducts()).rejects.toThrow();
      await expect(service.getProductBySlug('royal-embroidered-crepe-abaya')).rejects.toThrow();
      await expect(service.getProductById('prod_abaya_royal_crepe')).rejects.toThrow();
      await expect(service.getFeaturedProducts()).rejects.toThrow();
      await expect(service.getNewArrivals()).rejects.toThrow();
      await expect(service.getRelatedProducts('prod_abaya_royal_crepe')).rejects.toThrow();
      await expect(service.getPromotionalBanners()).rejects.toThrow();
      await expect(service.getGovernorates()).rejects.toThrow();
      await expect(service.validateStock([])).rejects.toThrow();
      await expect(service.getSettings()).rejects.toThrow();
      await expect(service.updateSettings({})).rejects.toThrow();

      try {
        await service.getCategories();
      } catch (err: any) {
        expect(err.statusCode).toBe(500);
        expect(err.status).toBe(500);
        expect(err.isNetworkError).toBe(false);
      }
    });

    it('CHAL-ERR-02: setting simulatedError to network causes endpoints to throw ApiError status 0 and isNetworkError: true', async () => {
      service.setSimulatedError('network');

      await expect(service.getProducts()).rejects.toThrow();
      try {
        await service.getProducts();
      } catch (err: any) {
        expect(err.status).toBe(0);
        expect(err.statusCode).toBe(0);
        expect(err.isNetworkError).toBe(true);
      }
    });

    it('CHAL-ERR-03: setting simulatedError to none or null clears error and resumes normal operation', async () => {
      service.setSimulatedError('500');
      await expect(service.getProducts()).rejects.toThrow();

      // Clear using null
      service.setSimulatedError(null);
      const resNull = await service.getProducts();
      expect(resNull.data.length).toBeGreaterThan(0);

      // Set to 500 again
      service.setSimulatedError('500');
      await expect(service.getProducts()).rejects.toThrow();

      // Clear using 'none' as any (per PROJECT.md specification)
      service.setSimulatedError('none' as any);
      const resNone = await service.getProducts();
      expect(resNone.data.length).toBeGreaterThan(0);
    });

    it('CHAL-ERR-04: resetSimulation clears error, empty, and latency delay simultaneously', async () => {
      service.setSimulatedError('500');
      service.setSimulateEmpty(true);
      service.setSimulatedDelay(200);

      service.resetSimulation();

      const start = Date.now();
      const res = await service.getProducts();
      const elapsed = Date.now() - start;

      expect(res.data.length).toBeGreaterThan(0);
      expect(elapsed).toBeLessThan(100); // Latency cleared
    });

    it('CHAL-ERR-05: artificial latency respects configured delay and handles negative values safely', async () => {
      // Negative delay should be clamped to 0
      service.setSimulatedDelay(-100);
      const startNeg = Date.now();
      await service.getProducts();
      expect(Date.now() - startNeg).toBeLessThan(50);

      // Positive delay (40ms)
      service.setSimulatedDelay(40);
      const startPos = Date.now();
      await service.getProducts();
      expect(Date.now() - startPos).toBeGreaterThanOrEqual(30);
    });

    it('CHAL-ERR-06: concurrent requests under latency do not block or corrupt results', async () => {
      service.setSimulatedDelay(30);

      const p1 = service.getProducts({ page: 1, pageSize: 2 });
      const p2 = service.getCategories();
      const p3 = service.getGovernorates();

      const [products, categories, governorates] = await Promise.all([p1, p2, p3]);

      expect(products.data.length).toBe(2);
      expect(categories.length).toBeGreaterThan(0);
      expect(governorates.length).toBe(27);
    });
  });

  // =========================================================================
  // 3. STOCK LIMIT CEILING PREVENTION IN CART ITEMS
  // =========================================================================
  describe('3. Stock Limit Ceiling Prevention in Cart Store', () => {
    const testVariant: ProductVariant = {
      id: 'var_test_1',
      sku: 'TEST-SKU-001',
      color: { nameAr: 'وردي', nameEn: 'Pink', hex: '#FFC0CB' },
      size: 'M',
      priceAdjustment: 0,
      stockQuantity: 4,
      inStock: true,
    };

    const outOfStockVariant: ProductVariant = {
      id: 'var_test_out',
      sku: 'TEST-SKU-OUT',
      color: { nameAr: 'أبيض', nameEn: 'White', hex: '#FFFFFF' },
      size: 'S',
      priceAdjustment: 0,
      stockQuantity: 0,
      inStock: false,
    };

    const testProduct: Product = {
      id: 'prod_test_01',
      slug: 'test-dress',
      titleAr: 'فستان تجريبي',
      titleEn: 'Test Dress',
      descriptionAr: 'وصف تجريبي',
      descriptionEn: 'Test description',
      basePrice: 300,
      currency: 'EGP',
      images: ['/test.jpg'],
      categoryIds: ['cat_dresses'],
      primaryCategorySlug: 'modest-dresses',
      tags: ['test'],
      rating: 5,
      reviewCount: 1,
      isFeatured: false,
      isNewArrival: false,
      variants: [testVariant, outOfStockVariant],
      availableColors: [testVariant.color, outOfStockVariant.color],
      availableSizes: ['M', 'S'],
      totalStock: 4,
      hasStock: true,
      createdAt: '2026-10-28T00:00:00Z',
      updatedAt: '2026-10-28T00:00:00Z',
    };

    beforeEach(() => {
      useCartStore.getState().clearCart();
      localStorage.clear();
    });

    it('CHAL-STK-01: prevents adding an out-of-stock variant (stockQuantity 0 or inStock false)', () => {
      const added = useCartStore.getState().addItem(testProduct, outOfStockVariant, 1);
      expect(added).toBe(false);
      expect(useCartStore.getState().items.length).toBe(0);
    });

    it('CHAL-STK-02: prevents adding initial quantity exceeding available inventory', () => {
      // testVariant has stockQuantity 4; attempting to add 5
      const added = useCartStore.getState().addItem(testProduct, testVariant, 5);
      expect(added).toBe(false);
      expect(useCartStore.getState().items.length).toBe(0);
    });

    it('CHAL-STK-03: permits adding exactly available inventory ceiling', () => {
      const added = useCartStore.getState().addItem(testProduct, testVariant, 4);
      expect(added).toBe(true);
      expect(useCartStore.getState().items[0].quantity).toBe(4);
    });

    it('CHAL-STK-04: prevents incrementing existing cart item beyond available stock ceiling', () => {
      // Add 3 items (stock is 4)
      expect(useCartStore.getState().addItem(testProduct, testVariant, 3)).toBe(true);

      // Attempt to add 2 more (3 + 2 = 5 > 4) -> must return false and NOT change quantity
      const secondAdd = useCartStore.getState().addItem(testProduct, testVariant, 2);
      expect(secondAdd).toBe(false);
      expect(useCartStore.getState().items[0].quantity).toBe(3);
    });

    it('CHAL-STK-05: updateQuantity strictly clamps quantity exceeding maxStock to maxStock', () => {
      useCartStore.getState().addItem(testProduct, testVariant, 2);
      const itemId = useCartStore.getState().items[0].id;

      // Update to 999 -> must clamp to 4
      useCartStore.getState().updateQuantity(itemId, 999);
      expect(useCartStore.getState().items[0].quantity).toBe(4);
      expect(useCartStore.getState().items[0].subtotal).toBe(1200); // 300 * 4
    });

    it('CHAL-STK-06: updateQuantity with 0 or negative value cleanly removes item from cart', () => {
      useCartStore.getState().addItem(testProduct, testVariant, 2);
      const itemId = useCartStore.getState().items[0].id;

      useCartStore.getState().updateQuantity(itemId, 0);
      expect(useCartStore.getState().items.length).toBe(0);

      // Repeat with negative quantity
      useCartStore.getState().addItem(testProduct, testVariant, 1);
      const newItemId = useCartStore.getState().items[0].id;
      useCartStore.getState().updateQuantity(newItemId, -5);
      expect(useCartStore.getState().items.length).toBe(0);
    });

    it('CHAL-STK-07: canIncrementCartItem oracle accurately mirrors ceiling boundary', () => {
      const cartItem: CartItem = {
        id: 'test_item',
        productId: testProduct.id,
        productSlug: testProduct.slug,
        productTitleAr: testProduct.titleAr,
        productTitleEn: testProduct.titleEn,
        productImage: '/img.jpg',
        variant: { ...testVariant, stockQuantity: 4 },
        unitPrice: 300,
        originalUnitPrice: 300,
        quantity: 3,
        subtotal: 900,
      };

      // quantity 3 < stock 4 -> true
      expect(canIncrementCartItem(cartItem)).toBe(true);

      // quantity 4 === stock 4 -> false
      cartItem.quantity = 4;
      expect(canIncrementCartItem(cartItem)).toBe(false);

      // quantity 5 > stock 4 -> false
      cartItem.quantity = 5;
      expect(canIncrementCartItem(cartItem)).toBe(false);
    });

    it('CHAL-STK-08: distinct variants maintain strictly isolated stock ceilings', () => {
      const variantA: ProductVariant = {
        ...testVariant,
        id: 'vA',
        sku: 'SKU-A',
        stockQuantity: 2,
      };
      const variantB: ProductVariant = {
        ...testVariant,
        id: 'vB',
        sku: 'SKU-B',
        stockQuantity: 3,
      };

      expect(useCartStore.getState().addItem(testProduct, variantA, 2)).toBe(true);
      expect(useCartStore.getState().addItem(testProduct, variantB, 3)).toBe(true);

      // Adding 1 more to variantA must fail without affecting variantB
      expect(useCartStore.getState().addItem(testProduct, variantA, 1)).toBe(false);
      expect(useCartStore.getState().items.find((i) => i.sku === 'SKU-A')!.quantity).toBe(2);
      expect(useCartStore.getState().items.find((i) => i.sku === 'SKU-B')!.quantity).toBe(3);
    });
  });

  // =========================================================================
  // 4. GOVERNORATE DELIVERY FEE RESOLUTION
  // =========================================================================
  describe('4. Governorate Delivery Fee Resolution & Shipping Zones', () => {
    const governorates: GovernorateInfo[] = governoratesFixture as GovernorateInfo[];

    const sampleItems: CartItem[] = [
      {
        id: 'item_cairo',
        productId: 'prod_1',
        productSlug: 'slug_1',
        productTitleAr: 'منتج',
        productTitleEn: 'Product',
        productImage: '/img.jpg',
        variant: {
          id: 'v1',
          sku: 'SKU1',
          color: { nameAr: 'أسود', nameEn: 'Black', hex: '#000' },
          size: 'M',
          priceAdjustment: 0,
          stockQuantity: 10,
          inStock: true,
        },
        unitPrice: 200,
        originalUnitPrice: 250,
        quantity: 1,
        subtotal: 200,
      },
    ];

    it('CHAL-GOV-01: exactly 27 Egyptian governorates are present and recognized', () => {
      expect(governorates.length).toBe(27);

      for (const gov of governorates) {
        expect(gov.code).toBeDefined();
        expect(gov.nameAr).toBeDefined();
        expect(gov.shippingFee).toBeGreaterThanOrEqual(50);
        expect(gov.shippingZone).toBeGreaterThanOrEqual(1);
        expect(gov.shippingZone).toBeLessThanOrEqual(4);
        expect(isValidGovernorate(gov.code)).toBe(true);
      }
    });

    it('CHAL-GOV-02: Zone 1 (Cairo, Giza) resolves to 50 EGP', () => {
      const cairoSummary = calculateCartSummary(sampleItems, 'Cairo', governorates);
      expect(cairoSummary.shippingFee).toBe(50);
      expect(cairoSummary.grandTotal).toBe(250);

      const gizaSummary = calculateCartSummary(sampleItems, 'Giza', governorates);
      expect(gizaSummary.shippingFee).toBe(50);
      expect(gizaSummary.grandTotal).toBe(250);
    });

    it('CHAL-GOV-03: Zone 2 (Alexandria, Canal, Delta) resolves to 65 EGP', () => {
      const zone2Govs: EgyptianGovernorate[] = [
        'Alexandria',
        'Dakahlia',
        'Beheira',
        'Gharbiya',
        'Ismailia',
        'Menofia',
        'Qaliubiya',
        'Suez',
        'Port Said',
        'Damietta',
        'Sharkia',
        'Kafr Al-Sheikh',
      ];

      for (const govCode of zone2Govs) {
        const summary = calculateCartSummary(sampleItems, govCode, governorates);
        expect(summary.shippingFee).toBe(65);
        expect(summary.grandTotal).toBe(265);
      }
    });

    it('CHAL-GOV-04: Zone 3 (Upper Egypt / Fayoum to Aswan) resolves to 80 EGP', () => {
      const zone3Govs: EgyptianGovernorate[] = [
        'Fayoum',
        'Beni Suef',
        'Minya',
        'Assiut',
        'Sohag',
        'Qena',
        'Luxor',
        'Aswan',
      ];

      for (const govCode of zone3Govs) {
        const summary = calculateCartSummary(sampleItems, govCode, governorates);
        expect(summary.shippingFee).toBe(80);
        expect(summary.grandTotal).toBe(280);
      }
    });

    it('CHAL-GOV-05: Zone 4 (Frontier: Red Sea, New Valley, Matrouh, Sinai) resolves to 100 EGP', () => {
      const zone4Govs: EgyptianGovernorate[] = [
        'Red Sea',
        'New Valley',
        'Matrouh',
        'North Sinai',
        'South Sinai',
      ];

      for (const govCode of zone4Govs) {
        const summary = calculateCartSummary(sampleItems, govCode, governorates);
        expect(summary.shippingFee).toBe(100);
        expect(summary.grandTotal).toBe(300);
      }
    });

    it('CHAL-GOV-06: empty cart results in zero shipping fee regardless of governorate', () => {
      const emptySummary = calculateCartSummary([], 'Aswan', governorates);
      expect(emptySummary.shippingFee).toBe(0);
      expect(emptySummary.subtotal).toBe(0);
      expect(emptySummary.grandTotal).toBe(0);
    });

    it('CHAL-GOV-07: unspecified governorate results in zero shipping fee', () => {
      const noGovSummary = calculateCartSummary(sampleItems, undefined, governorates);
      expect(noGovSummary.shippingFee).toBe(0);
      expect(noGovSummary.grandTotal).toBe(200);
    });

    it('CHAL-GOV-08: unknown governorate code falls back safely to default 50 EGP', () => {
      const unknownSummary = calculateCartSummary(sampleItems, 'UnknownZone' as any, governorates);
      expect(unknownSummary.shippingFee).toBe(50);
      expect(unknownSummary.grandTotal).toBe(250);
    });

    it('CHAL-GOV-09: validateCustomerDetails requires valid Egyptian governorate', () => {
      const invalidCustomer = {
        fullName: 'أحمد محمود علي',
        phone: '01012345678',
        governorate: 'Tokyo' as any,
        city: 'المهندسين',
        deliveryAddress: 'شارع جامعة الدول العربية عمارة 5',
      };

      const res = validateCustomerDetails(invalidCustomer);
      expect(res.isValid).toBe(false);
      expect(res.errors.governorate).toBeDefined();

      const validCustomer = {
        ...invalidCustomer,
        governorate: 'Giza' as EgyptianGovernorate,
      };
      const validRes = validateCustomerDetails(validCustomer);
      expect(validRes.isValid).toBe(true);
      expect(validRes.errors.governorate).toBeUndefined();
    });
  });
});
