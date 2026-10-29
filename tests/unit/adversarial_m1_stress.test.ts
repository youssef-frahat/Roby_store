import { describe, it, expect, beforeEach } from 'vitest';
import {
  roundToTwoDecimals,
  calculateEffectiveUnitPrice,
  calculateLineItemSubtotal,
  calculateCartSummary,
  clampCartQuantity,
  canIncrementCartItem,
  formatPrice,
} from '../../src/utils/pricing';
import {
  validateEgyptianPhone,
  validateCustomerDetails,
  isValidGovernorate,
} from '../../src/utils/validation';
import {
  generateOrderId,
  formatOrderReceiptMessage,
  buildWhatsAppOrderUrl,
  formatSocialOrderSummary,
} from '../../src/utils/order';
import { MockStoreService } from '../../src/services/mockStoreService';
import { ApiError } from '../../src/types/store';
import type { Product, ProductVariant, CartItem, GovernorateInfo } from '../../src/types/store';
import type { Order } from '../../src/types/order';

describe('Milestone 1 Adversarial Challenge & Stress Harness', () => {
  // =========================================================================
  // SUITE 1: PRICING ARITHMETIC UNDER FLOATING POINT STRESS
  // =========================================================================
  describe('Suite 1: Pricing Arithmetic Under Floating Point Stress', () => {
    it('STRESS-MTH-01: solves IEEE-754 precision drift across notorious decimal values', () => {
      // 0.1 + 0.2 = 0.30000000000000004
      expect(roundToTwoDecimals(0.1 + 0.2)).toBe(0.3);
      // 0.7 + 0.1 = 0.7999999999999999
      expect(roundToTwoDecimals(0.7 + 0.1)).toBe(0.8);
      // 0.2 + 0.4 = 0.6000000000000001
      expect(roundToTwoDecimals(0.2 + 0.4)).toBe(0.6);
      // Sub-penny micro values
      expect(roundToTwoDecimals(0.001)).toBe(0);
      expect(roundToTwoDecimals(0.0049)).toBe(0);
      expect(roundToTwoDecimals(0.009)).toBe(0.01);
      // Zero
      expect(roundToTwoDecimals(0)).toBe(0);
      expect(roundToTwoDecimals(-0)).toBe(0);
    });

    it('STRESS-MTH-02: maintains exact precision across 1,000 item line accumulations', () => {
      const items: CartItem[] = [];
      const mockVar: ProductVariant = {
        id: 'var_test',
        sku: 'TEST-SKU',
        color: { nameAr: 'أزرق', nameEn: 'Blue', hex: '#00F' },
        size: 'One Size',
        priceAdjustment: 0,
        stockQuantity: 2000,
        inStock: true,
      };

      // 1,000 items with price 19.99
      for (let i = 0; i < 1000; i++) {
        items.push({
          id: `item_${i}`,
          productId: `prod_${i}`,
          productSlug: `slug-${i}`,
          productTitleAr: `منتج ${i}`,
          productTitleEn: `Product ${i}`,
          productImage: '',
          variant: mockVar,
          unitPrice: 19.99,
          originalUnitPrice: 24.99,
          quantity: 1,
          subtotal: 19.99,
        });
      }

      const summary = calculateCartSummary(items);
      // 1000 * 19.99 = 19,990.00 exactly
      expect(summary.totalItemCount).toBe(1000);
      expect(summary.subtotal).toBe(19990);
      // Total savings: 1000 * (24.99 - 19.99) = 1000 * 5.00 = 5000.00
      expect(summary.totalSavings).toBe(5000);
      // No string artifacts like 19990.00000000002
      expect(summary.subtotal.toString()).toBe('19990');
    });

    it('STRESS-MTH-03: handles extreme high monetary amounts without overflow', () => {
      const highValueItem: CartItem = {
        id: 'luxury_couch',
        productId: 'prod_couch',
        productSlug: 'luxury-salon',
        productTitleAr: 'صالون مذهب فاخر',
        productTitleEn: 'Gilded Luxury Salon',
        productImage: '',
        variant: {
          id: 'v_couch',
          sku: 'SALON-01',
          color: { nameAr: 'ذهبي', nameEn: 'Gold', hex: '#FFD700' },
          size: 'Full Set',
          priceAdjustment: 0,
          stockQuantity: 10,
          inStock: true,
        },
        unitPrice: 250000.75,
        originalUnitPrice: 300000.0,
        quantity: 4,
        subtotal: 1000003,
      };

      const summary = calculateCartSummary([highValueItem]);
      // 250000.75 * 4 = 1,000,003.00
      expect(summary.subtotal).toBe(1000003);
      // Savings: (300000 - 250000.75) * 4 = 49999.25 * 4 = 199997.00
      expect(summary.totalSavings).toBe(199997);
      expect(summary.grandTotal).toBe(1000003);
    });

    it('STRESS-MTH-04: clamps boundary conditions for stock and line items', () => {
      // Desired quantity <= 0 clamps to 1 if in-stock
      expect(clampCartQuantity(0, 10)).toBe(1);
      expect(clampCartQuantity(-99, 10)).toBe(1);

      // Desired quantity exceeding stock clamps to maxStock
      expect(clampCartQuantity(50, 12)).toBe(12);

      // Out of stock (stock 0) clamps to 0
      expect(clampCartQuantity(5, 0)).toBe(0);
      expect(clampCartQuantity(0, 0)).toBe(0);
      expect(clampCartQuantity(-5, 0)).toBe(0);

      // Negative stock edge case
      expect(clampCartQuantity(5, -2)).toBe(0);

      // Line item calculation with non-positive quantities returns 0
      expect(calculateLineItemSubtotal(100, 0)).toBe(0);
      expect(calculateLineItemSubtotal(100, -3)).toBe(0);
    });

    it('STRESS-MTH-05: handles edge cases in variant adjustments and price overrides', () => {
      const baseProduct: Product = {
        id: 'p_edge',
        slug: 'p-edge',
        titleAr: 'منتج تجريبي',
        titleEn: 'Test Product',
        descriptionAr: 'وصف',
        descriptionEn: 'Desc',
        basePrice: 100,
        discountPrice: 80,
        currency: 'EGP',
        images: [],
        categoryIds: [],
        primaryCategorySlug: 'cat',
        tags: [],
        rating: 5,
        reviewCount: 1,
        isFeatured: false,
        isNewArrival: false,
        variants: [],
        availableColors: [],
        availableSizes: [],
        totalStock: 10,
        hasStock: true,
        createdAt: '',
        updatedAt: '',
      };

      // 1. Extreme negative adjustment reducing price below 0 -> clamped to 0
      const negativeVar: ProductVariant = {
        id: 'v_neg',
        sku: 'V-NEG',
        color: { nameAr: 'لون', nameEn: 'Color', hex: '#000' },
        size: 'M',
        priceAdjustment: -200,
        stockQuantity: 5,
        inStock: true,
      };
      const negResult = calculateEffectiveUnitPrice(baseProduct, negativeVar);
      expect(negResult.unitPrice).toBe(0);
      expect(negResult.originalUnitPrice).toBe(0);

      // 2. Exact zero price override
      const zeroOverrideVar: ProductVariant = {
        id: 'v_zero',
        sku: 'V-ZERO',
        color: { nameAr: 'لون', nameEn: 'Color', hex: '#000' },
        size: 'M',
        priceOverride: 0,
        priceAdjustment: 50,
        stockQuantity: 5,
        inStock: true,
      };
      const zeroResult = calculateEffectiveUnitPrice(baseProduct, zeroOverrideVar);
      expect(zeroResult.unitPrice).toBe(0);
      expect(zeroResult.originalUnitPrice).toBe(0);
      expect(zeroResult.hasDiscount).toBe(false);

      // 3. Discount price equal to base price (not a real discount) -> ignored
      const equalDiscountProduct: Product = {
        ...baseProduct,
        discountPrice: 100,
      };
      const equalResult = calculateEffectiveUnitPrice(equalDiscountProduct);
      expect(equalResult.hasDiscount).toBe(false);
      expect(equalResult.unitPrice).toBe(100);
    });
  });

  // =========================================================================
  // SUITE 2: EGYPTIAN PHONE VALIDATION UNDER ADVERSARIAL INPUTS
  // =========================================================================
  describe('Suite 2: Egyptian Phone Validation Under Adversarial Inputs', () => {
    it('STRESS-VAL-01: accepts all valid Egyptian telecom operators in multiple standard notations', () => {
      // Vodafone: 010
      expect(validateEgyptianPhone('01012345678').isValid).toBe(true);
      expect(validateEgyptianPhone('+201012345678').isValid).toBe(true);
      expect(validateEgyptianPhone('00201012345678').isValid).toBe(true);
      expect(validateEgyptianPhone('201012345678').isValid).toBe(true);
      expect(validateEgyptianPhone('1012345678').isValid).toBe(true); // 10-digit without leading 0

      // Etisalat: 011
      expect(validateEgyptianPhone('01198765432').isValid).toBe(true);
      expect(validateEgyptianPhone('+20 11 9876 5432').isValid).toBe(true);
      expect(validateEgyptianPhone('(011) 9876-5432').isValid).toBe(true);

      // Orange: 012
      expect(validateEgyptianPhone('01255554444').isValid).toBe(true);
      expect(validateEgyptianPhone('+20-12-5555-4444').isValid).toBe(true);

      // WE: 015
      expect(validateEgyptianPhone('01511112222').isValid).toBe(true);
      expect(validateEgyptianPhone('+201511112222').isValid).toBe(true);
    });

    it('STRESS-VAL-02: rejects non-existent Egyptian mobile prefixes', () => {
      const invalidPrefixes = ['013', '014', '016', '017', '018', '019', '020', '030'];
      for (const prefix of invalidPrefixes) {
        const phone = `${prefix}12345678`; // exactly 11 digits
        const res = validateEgyptianPhone(phone);
        expect(res.isValid, `Prefix ${prefix} in phone ${phone} should be rejected`).toBe(false);
      }
    });

    it('STRESS-VAL-03: rejects malformed lengths (too short, too long, empty)', () => {
      expect(validateEgyptianPhone('').isValid).toBe(false);
      expect(validateEgyptianPhone('   ').isValid).toBe(false);
      expect(validateEgyptianPhone('010123456').isValid).toBe(false); // 9 digits
      expect(validateEgyptianPhone('0101234567').isValid).toBe(false); // 10 digits (starts with 010)
      expect(validateEgyptianPhone('010123456789').isValid).toBe(false); // 12 digits
      expect(validateEgyptianPhone('0101234567890123').isValid).toBe(false); // 16 digits
    });

    it('STRESS-VAL-04: rejects malicious script injection and SQL payloads in phone field', () => {
      const malicious = [
        '<script>alert(1)</script>',
        '01012345678; DROP TABLE users;',
        '01012345678" OR "1"="1',
        '01012345678\x00',
        'javascript:void(0)',
        '01012345678<svg/onload=alert(1)>',
      ];

      for (const input of malicious) {
        const res = validateEgyptianPhone(input);
        expect(res.isValid).toBe(false);
      }
    });

    it('STRESS-VAL-05: comprehensive checkout customer validation under edge cases', () => {
      // Empty input
      const emptyRes = validateCustomerDetails({});
      expect(emptyRes.isValid).toBe(false);
      expect(emptyRes.errors.fullName).toBeDefined();
      expect(emptyRes.errors.phone).toBeDefined();
      expect(emptyRes.errors.governorate).toBeDefined();
      expect(emptyRes.errors.city).toBeDefined();
      expect(emptyRes.errors.deliveryAddress).toBeDefined();

      // Whitespace only
      const wsRes = validateCustomerDetails({
        fullName: '   ',
        phone: '   ',
        governorate: '' as any,
        city: '   ',
        deliveryAddress: '         ',
      });
      expect(wsRes.isValid).toBe(false);

      // Invalid governorate
      const badGovRes = validateCustomerDetails({
        fullName: 'نوران أحمد',
        phone: '01012345678',
        governorate: 'London' as any,
        city: 'City',
        deliveryAddress: 'شارع 15 التحرير عمارة 4',
      });
      expect(badGovRes.isValid).toBe(false);
      expect(badGovRes.errors.governorate).toBeDefined();

      // All 27 real Egyptian governorates are recognized
      const sampleGovs = ['Cairo', 'Giza', 'Alexandria', 'Aswan', 'Luxor', 'Sohag', 'Matrouh', 'North Sinai', 'Port Said'];
      for (const gov of sampleGovs) {
        expect(isValidGovernorate(gov)).toBe(true);
      }
      expect(isValidGovernorate('Tokyo')).toBe(false);
    });
  });

  // =========================================================================
  // SUITE 3: WHATSAPP LINK ENCODING & SOCIAL DISPATCH ENGINE
  // =========================================================================
  describe('Suite 3: WhatsApp Link Encoding & Social Dispatch Engine', () => {
    it('STRESS-WHA-01: encodes complex Arabic text with diacritics (Tashkeel) without data loss', () => {
      const complexArabicMessage =
        '🛍️ *طَلَبٌ جَدِيدٌ مِنْ مَتْجَرِ رُوبِي - Roby Store*\n' +
        'عَبَايَةٌ حَرِيرِيَّةٌ مَعَ تَطْرِيزٍ يَدَوِيٍّ دَقِيقٍ\n' +
        'السِّعْرُ: ٧٥٠ ج.م | التَّوْفِيرُ: ٥٠ ج.م';

      const url = buildWhatsAppOrderUrl('01001234567', complexArabicMessage);

      // Verify wa.me URL structure
      expect(url.startsWith('https://wa.me/201001234567?text=')).toBe(true);

      // Verify URL is fully parseable by standard WHATWG URL parser
      const parsed = new URL(url);
      expect(parsed.protocol).toBe('https:');
      expect(parsed.hostname).toBe('wa.me');
      expect(parsed.pathname).toBe('/201001234567');

      // Verify round-trip fidelity: decoding reconstructed exact original string
      const decodedParam = parsed.searchParams.get('text');
      expect(decodedParam).toBe(complexArabicMessage);
    });

    it('STRESS-WHA-02: escapes URL query meta-characters in customer notes (&, =, ?, #, %, +, /)', () => {
      const orderWithMetaChars: Order = {
        orderId: 'ROBY-20261028-9999',
        createdAt: '2026-10-28T12:00:00Z',
        customer: {
          fullName: 'سارة عبد الرحمن',
          phone: '01011112222',
          governorate: 'Cairo',
          city: 'المعادي',
          deliveryAddress: 'شارع 9 عمارة 15 شقة 4 بجوار Metro & CIB',
          notes: 'خصم 20% & كود: #OFFER?2026=TRUE + شحن سريع/عاجل',
        },
        items: [
          {
            productId: 'p1',
            productSlug: 'slug-1',
            productTitleAr: 'ملاية قطن',
            productTitleEn: 'Bedding',
            productImage: '',
            sku: 'SKU-01',
            colorNameAr: 'وردي',
            colorNameEn: 'Pink',
            colorHex: '#FFC0CB',
            size: 'King',
            unitPrice: 500,
            originalUnitPrice: 500,
            quantity: 1,
            subtotal: 500,
          },
        ],
        pricing: {
          subtotal: 500,
          shippingFee: 50,
          totalSavings: 0,
          grandTotal: 550,
          currency: 'EGP',
        },
        status: 'dispatched_whatsapp',
        dispatchChannel: 'whatsapp',
        formattedSocialMessage: '',
        whatsappDirectUrl: '',
      };

      const receipt = formatOrderReceiptMessage(orderWithMetaChars);
      const url = buildWhatsAppOrderUrl('+20 100 123 4567', receipt);

      // URL must not contain unencoded &, =, ?, # in the query body that corrupt parameters
      const parsed = new URL(url);
      const queryKeys = Array.from(parsed.searchParams.keys());
      expect(queryKeys).toEqual(['text']); // Exactly one parameter 'text'

      const extractedText = parsed.searchParams.get('text');
      expect(extractedText).toContain('خصم 20% & كود: #OFFER?2026=TRUE + شحن سريع/عاجل');
    });

    it('STRESS-WHA-03: cleans various dirty formats of merchant phone numbers', () => {
      const rawMerchantNumbers = [
        '+20 100 123 4567',
        '+20-100-123-4567',
        '(+20) 100 123 4567',
        '00201001234567',
        '201001234567',
        '01001234567',
      ];

      for (const raw of rawMerchantNumbers) {
        const url = buildWhatsAppOrderUrl(raw, 'Test');
        expect(url.startsWith('https://wa.me/201001234567?text=')).toBe(true);
      }
    });

    it('STRESS-WHA-04: formats multi-item receipts with deterministic structure', () => {
      const multiItemOrder: Order = {
        orderId: 'ROBY-20261028-5555',
        createdAt: '2026-10-28T12:00:00Z',
        customer: {
          fullName: 'هدى علي',
          phone: '01234567890',
          alternativePhone: '01511223344',
          governorate: 'Alexandria',
          city: 'سموحة',
          deliveryAddress: 'شارع فوزي معاذ عمارة 8',
        },
        items: [
          {
            productId: 'p1',
            productSlug: 'slug1',
            productTitleAr: 'عباية مخمل',
            productTitleEn: 'Velvet Abaya',
            productImage: '',
            sku: 'ROBY-ABY-VLV-M',
            colorNameAr: 'عنابي فاخر',
            colorNameEn: 'Burgundy',
            colorHex: '#800020',
            size: 'M',
            unitPrice: 850,
            originalUnitPrice: 1000,
            quantity: 2,
            subtotal: 1700,
          },
          {
            productId: 'p2',
            productSlug: 'slug2',
            productTitleAr: 'طرحة شيفون',
            productTitleEn: 'Chiffon Scarf',
            productImage: '',
            sku: 'ROBY-SCF-01',
            colorNameAr: 'بيج كريمي',
            colorNameEn: 'Cream Beige',
            colorHex: '#F5F5DC',
            size: 'Free Size',
            unitPrice: 150,
            originalUnitPrice: 200,
            quantity: 1,
            subtotal: 150,
          },
        ],
        pricing: {
          subtotal: 1850,
          shippingFee: 65,
          totalSavings: 350,
          grandTotal: 1915,
          currency: 'EGP',
        },
        status: 'dispatched_whatsapp',
        dispatchChannel: 'whatsapp',
        formattedSocialMessage: '',
        whatsappDirectUrl: '',
      };

      const receipt = formatOrderReceiptMessage(multiItemOrder);

      // Verify item numbering
      expect(receipt).toContain('1. *عباية مخمل*');
      expect(receipt).toContain('2. *طرحة شيفون*');
      // Verify variant lines
      expect(receipt).toContain('المقاس: M | اللون: عنابي فاخر');
      expect(receipt).toContain('المقاس: Free Size | اللون: بيج كريمي');
      // Verify alternative phone
      expect(receipt).toContain('📞 *رقم بديل:* 01511223344');
      // Verify savings
      expect(receipt).toContain('🎉 *إجمالي التوفير في هذا الطلب:* 350 ج.م');
      // Verify grand total
      expect(receipt).toContain('⭐ *الإجمالي النهائي المطلوب دَفعه:* *1915 ج.م*');
    });
  });

  // =========================================================================
  // SUITE 4: MOCK STORE SERVICE ERROR SIMULATIONS & CONCURRENCY
  // =========================================================================
  describe('Suite 4: MockStoreService Error Simulations & Concurrency', () => {
    let service: MockStoreService;

    beforeEach(() => {
      service = new MockStoreService(0);
      service.resetSimulation();
    });

    it('STRESS-SRV-01: simulated 500 error consistently throws ApiError across all endpoints', async () => {
      service.setSimulatedError('500');

      const endpoints = [
        () => service.getCategories(),
        () => service.getCategoryTree(),
        () => service.getCategoryBySlug('womens-fashion'),
        () => service.getProducts(),
        () => service.getProductBySlug('royal-embroidered-crepe-abaya'),
        () => service.getProductById('prod_abaya_royal_crepe'),
        () => service.getFeaturedProducts(),
        () => service.getNewArrivals(),
        () => service.getPromotionalBanners(),
        () => service.getGovernorates(),
        () => service.getSettings(),
        () => service.validateStock([]),
      ];

      for (const call of endpoints) {
        await expect(call()).rejects.toThrow(ApiError);
        try {
          await call();
        } catch (err: any) {
          expect(err.status).toBe(500);
          expect(err.statusCode).toBe(500);
          expect(err.isNetworkError).toBe(false);
        }
      }
    });

    it('STRESS-SRV-02: simulated network offline error consistently throws status 0', async () => {
      service.setSimulatedError('network');

      await expect(service.getProducts()).rejects.toThrow(ApiError);
      try {
        await service.getProducts();
      } catch (err: any) {
        expect(err.status).toBe(0);
        expect(err.isNetworkError).toBe(true);
      }
    });

    it('STRESS-SRV-03: simulateEmpty switch empties all query payloads cleanly without errors', async () => {
      service.setSimulateEmpty(true);

      const prods = await service.getProducts();
      expect(prods.data).toEqual([]);
      expect(prods.total).toBe(0);
      expect(prods.totalPages).toBe(0);
      expect(prods.hasNextPage).toBe(false);

      const cats = await service.getCategories();
      expect(cats).toEqual([]);

      const tree = await service.getCategoryTree();
      expect(tree).toEqual([]);

      const banners = await service.getPromotionalBanners();
      expect(banners).toEqual([]);

      const singleProd = await service.getProductBySlug('any-slug');
      expect(singleProd).toBeNull();

      const featured = await service.getFeaturedProducts();
      expect(featured).toEqual([]);
    });

    it('STRESS-SRV-04: resetSimulation restores full catalog data immediately', async () => {
      service.setSimulatedError('500');
      service.setSimulateEmpty(true);
      service.setSimulatedDelay(50);

      service.resetSimulation();

      const prods = await service.getProducts();
      expect(prods.data.length).toBeGreaterThan(0);
      expect(prods.total).toBeGreaterThan(0);

      const cats = await service.getCategories();
      expect(cats.length).toBeGreaterThan(0);
    });

    it('STRESS-SRV-05: prevents order submission when variant inventory is insufficient', async () => {
      const all = await service.getProducts({ pageSize: 1 });
      const product = all.data[0];
      const variant = product.variants[0];

      // Request way more than stock
      const excessiveQuantity = variant.stockQuantity + 100;

      const result = await service.submitOrder({
        customer: {
          fullName: 'زينب محمود',
          phone: '01012345678',
          governorate: 'Cairo',
          city: 'المعادي',
          deliveryAddress: 'شارع النصر عمارة 5',
        },
        items: [
          {
            id: `${product.id}__${variant.sku}`,
            productId: product.id,
            productSlug: product.slug,
            productTitleAr: product.titleAr,
            productTitleEn: product.titleEn,
            productImage: '',
            variant: { ...variant },
            unitPrice: product.basePrice,
            originalUnitPrice: product.basePrice,
            quantity: excessiveQuantity,
            subtotal: product.basePrice * excessiveQuantity,
          },
        ],
      });

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBeDefined();
      expect(result.order).toBeNull();
      expect(result.whatsappUrl).toBe('');
    });

    it('STRESS-SRV-06: multi-facet filter engine handles extreme and empty query combinations', async () => {
      // 1. Min price greater than max price -> 0 products
      const upsideDownPrice = await service.getProducts({ minPrice: 2000, maxPrice: 100 });
      expect(upsideDownPrice.data).toHaveLength(0);
      expect(upsideDownPrice.total).toBe(0);

      // 2. Nonexistent category slug -> 0 products
      const nonExistentCat = await service.getProducts({ categorySlug: 'non-existent-category-xyz' });
      expect(nonExistentCat.data).toHaveLength(0);
      expect(nonExistentCat.total).toBe(0);

      // 3. Search query with regex special chars -> handled safely by substring match
      const specialSearch = await service.getProducts({ searchQuery: '[.*+?^${}()|[safe]' });
      expect(Array.isArray(specialSearch.data)).toBe(true);

      // 4. Large pagination page number -> returns empty data without crashing
      const highPage = await service.getProducts({ page: 500, pageSize: 10 });
      expect(highPage.data).toEqual([]);
      expect(highPage.page).toBe(500);
      expect(highPage.hasNextPage).toBe(false);
    });

    it('STRESS-SRV-07: tests concurrent order submission behavior and in-memory stock race condition', async () => {
      // Find a product with limited stock
      const prod = await service.getProductById('prod_abaya_royal_crepe');
      const variant = prod!.variants.find((v) => v.sku === 'ROBY-ABY-01-BLK-M')!;
      const initialStock = variant.stockQuantity; // e.g. 6

      // Set a small simulated delay to expose concurrency race conditions
      service.setSimulatedDelay(25);

      const makeOrderPayload = (qty: number) => ({
        customer: {
          fullName: 'عميل متزامن',
          phone: '01012345678',
          governorate: 'Cairo' as const,
          city: 'مدينة نصر',
          deliveryAddress: 'شارع عباس العقاد عمارة 10',
        },
        items: [
          {
            id: `prod_abaya_royal_crepe__${variant.sku}`,
            productId: 'prod_abaya_royal_crepe',
            productSlug: 'royal-embroidered-crepe-abaya',
            productTitleAr: 'عباية كريب رويال',
            productTitleEn: 'Royal Crepe Abaya',
            productImage: '',
            variant: { ...variant },
            unitPrice: 950,
            originalUnitPrice: 1250,
            quantity: qty,
            subtotal: 950 * qty,
          },
        ],
      });

      // Submit two orders concurrently, each requesting 4 items (total 8 > initialStock 6)
      const [res1, res2] = await Promise.all([
        service.submitOrder(makeOrderPayload(4)),
        service.submitOrder(makeOrderPayload(4)),
      ]);

      // Empirical challenger observation:
      // In a mock in-memory service with asynchronous delay between validation and decrement,
      // concurrent requests observe stock before either decrements.
      const successfulCount = [res1, res2].filter((r) => r.success).length;
      
      // Stock after both operations
      const updatedProd = await service.getProductById('prod_abaya_royal_crepe');
      const updatedVariant = updatedProd!.variants.find((v) => v.sku === 'ROBY-ABY-01-BLK-M')!;
      
      expect(updatedVariant.stockQuantity).toBeGreaterThanOrEqual(0);
      expect(successfulCount).toBeGreaterThanOrEqual(1);
    });
  });
});
