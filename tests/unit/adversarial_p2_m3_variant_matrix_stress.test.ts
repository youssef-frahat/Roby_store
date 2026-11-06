/**
 * Roby Store - Milestone P2-M3 Adversarial Stress Harness
 * Location: tests/unit/adversarial_p2_m3_variant_matrix_stress.test.ts
 *
 * EMPIRICAL ADVERSARIAL CHALLENGER SUITE
 * Stress-testing:
 * 1. Cartesian Product Generator under extreme loads, empty arrays, unicode diacritics, and adversarial strings.
 * 2. SKU Generator duplicate collision prevention, sanitization, length boundaries, and case normalization.
 * 3. Matrix Validation integrity checks: missing SKUs, case-insensitive duplicates, negative quantities, boundary conditions.
 * 4. Integration with Store Service and Pricing calculations under extreme variant loads.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateSlug,
  sanitizeCode,
  generateVariantSku,
  generateCartesianVariants,
  validateVariantMatrix,
  convertFileToDataUrl,
} from '../../src/utils/variantGenerator';
import { MockStoreService } from '../../src/services/mockStoreService';
import { calculateEffectiveUnitPrice } from '../../src/utils/pricing';
import { VariantColor, CreateProductInput, Product } from '../../src/types/store';

describe('Milestone P2-M3 Adversarial Variant Matrix & Cartesian Generator Stress Harness', () => {
  let service: MockStoreService;

  beforeEach(() => {
    service = new MockStoreService(0);
    service.resetSimulation?.();
  });

  // =========================================================================
  // SUITE 1: Cartesian Product Generator Extreme & Boundary Stress Tests
  // =========================================================================
  describe('Suite 1: Cartesian Generation Extreme & Boundary Inputs', () => {
    it('ADV-CART-01: generates exactly 100 variants for 10 colors × 10 sizes without memory degradation', () => {
      const colors: VariantColor[] = Array.from({ length: 10 }, (_, i) => ({
        nameAr: `لون تجريبي ${i + 1}`,
        nameEn: `Color_${i + 1}`,
        hex: `#${(i * 111111).toString(16).padStart(6, '0').slice(0, 6)}`,
      }));

      const sizes: string[] = Array.from({ length: 10 }, (_, i) => `Size_${i + 1}`);

      const startTime = performance.now();
      const variants = generateCartesianVariants({
        colors,
        sizes,
        slug: 'abaya-luxury-velvet',
        defaultStock: 15,
        defaultPriceAdjustment: 50,
      });
      const durationMs = performance.now() - startTime;

      expect(variants).toHaveLength(100);
      expect(durationMs).toBeLessThan(100); // Must be sub-100ms

      // Verify all 100 SKUs are strictly unique
      const skus = variants.map((v) => v.sku);
      const uniqueSkus = new Set(skus);
      expect(uniqueSkus.size).toBe(100);

      // Verify properties inherited correctly
      variants.forEach((v) => {
        expect(v.stockQuantity).toBe(15);
        expect(v.inStock).toBe(true);
        expect(v.priceAdjustment).toBe(50);
        expect(v.id).toMatch(/^var_gen_/);
      });
    });

    it('ADV-CART-02: stress-tests large volume matrix (50 colors × 20 sizes = 1,000 variants)', () => {
      const colors: VariantColor[] = Array.from({ length: 50 }, (_, i) => ({
        nameAr: `لون ${i}`,
        nameEn: `C${i}`,
        hex: '#800020',
      }));
      const sizes: string[] = Array.from({ length: 20 }, (_, i) => `S${i}`);

      const startTime = performance.now();
      const variants = generateCartesianVariants({
        colors,
        sizes,
        slug: 'bulk-prod',
      });
      const durationMs = performance.now() - startTime;

      expect(variants).toHaveLength(1000);
      expect(durationMs).toBeLessThan(500); // 1,000 variants generated in < 500ms

      const skus = variants.map((v) => v.sku);
      const uniqueSkus = new Set(skus);
      expect(uniqueSkus.size).toBe(1000);
    });

    it('ADV-CART-03: single color with 0 sizes falls back gracefully to 1 variant with Free Size', () => {
      const variants = generateCartesianVariants({
        colors: [{ nameAr: 'نبيتي ملكي', nameEn: 'Royal Burgundy', hex: '#800020' }],
        sizes: [],
        slug: 'dress',
      });

      expect(variants).toHaveLength(1);
      expect(variants[0].size).toBe('Free Size');
      expect(variants[0].color.nameAr).toBe('نبيتي ملكي');
      expect(variants[0].color.nameEn).toBe('Royal Burgundy');
      expect(variants[0].sku).toMatch(/^DRESS-ROY-FREE/);
    });

    it('ADV-CART-04: 0 colors with single size falls back gracefully to 1 variant with Standard color', () => {
      const variants = generateCartesianVariants({
        colors: [],
        sizes: ['XL'],
        slug: 'scarf',
      });

      expect(variants).toHaveLength(1);
      expect(variants[0].size).toBe('XL');
      expect(variants[0].color.nameAr).toBe('لون موحد');
      expect(variants[0].color.nameEn).toBe('Standard');
      expect(variants[0].sku).toMatch(/^SCARF-STA-XL/);
    });

    it('ADV-CART-05: 0 colors and 0 sizes produces 1 default fallback variant', () => {
      const variants = generateCartesianVariants({
        colors: [],
        sizes: [],
        slug: '',
      });

      expect(variants).toHaveLength(1);
      expect(variants[0].size).toBe('Free Size');
      expect(variants[0].color.nameAr).toBe('لون موحد');
      expect(variants[0].color.nameEn).toBe('Standard');
      expect(variants[0].sku).toBe('ROBY-STA-FREE');
    });

    it('ADV-CART-06: filters null/undefined and empty colors, and trims whitespace sizes', () => {
      const colors: any[] = [
        null,
        undefined,
        { nameAr: '', nameEn: '', hex: '' },
        { nameAr: 'كحلي', nameEn: 'Navy', hex: '#0F1E36' },
      ];
      const sizes = ['', '   ', 'M', '   ', 'L'];

      const variants = generateCartesianVariants({
        colors,
        sizes,
        slug: 'abaya',
      });

      // 1 valid color ('Navy') × 2 valid sizes ('M', 'L') = 2 variants
      expect(variants).toHaveLength(2);
      expect(variants[0].color.nameEn).toBe('Navy');
      expect(variants[0].size).toBe('M');
      expect(variants[1].color.nameEn).toBe('Navy');
      expect(variants[1].size).toBe('L');
    });

    it('ADV-CART-07: handles duplicate color names without generating duplicate SKUs', () => {
      const colors: VariantColor[] = [
        { nameAr: 'أسود مطرز', nameEn: 'Black', hex: '#111111' },
        { nameAr: 'أسود سادة', nameEn: 'Black', hex: '#000000' },
      ];
      const sizes = ['M'];

      const variants = generateCartesianVariants({
        colors,
        sizes,
        slug: 'abaya',
      });

      expect(variants).toHaveLength(2);
      expect(variants[0].sku).toBe('ABAYA-BLA-M');
      expect(variants[1].sku).toBe('ABAYA-BLA-M-1'); // Disambiguated by collision prevention!
      expect(variants[0].sku).not.toBe(variants[1].sku);
    });

    it('ADV-CART-08: documents behavior when color name consists solely of whitespace', () => {
      // In variantGenerator.ts line 85, (c.nameAr || c.nameEn || c.hex) does not call .trim().
      // Therefore, a color object with '  ' is treated as non-empty and defaults to fallback names.
      const colors: VariantColor[] = [
        { nameAr: '   ', nameEn: '   ', hex: '' },
      ];
      const variants = generateCartesianVariants({
        colors,
        sizes: ['M'],
        slug: 'prod',
      });

      expect(variants).toHaveLength(1);
      expect(variants[0].color.nameAr).toBe('لون موحد');
      expect(variants[0].color.nameEn).toBe('Standard');
    });
  });

  // =========================================================================
  // SUITE 2: SKU Generator Adversarial Challenges
  // =========================================================================
  describe('Suite 2: SKU Generator Adversarial Challenges', () => {
    it('ADV-SKU-01: sanitizeCode converts to uppercase and strips all special characters and emojis', () => {
      expect(sanitizeCode('bl@ck#123!')).toBe('BLCK');
      expect(sanitizeCode('👗👠👑')).toBe('DEF'); // Emojis stripped, fallback applied
      expect(sanitizeCode('   ')).toBe('DEF');
      expect(sanitizeCode('a-b_c.d')).toBe('ABCD');
    });

    it('ADV-SKU-02: sanitizeCode safely handles extreme 10,000 character strings without slowdown', () => {
      const hugeInput = 'A'.repeat(5000) + '!@#$' + 'B'.repeat(5000);
      const code = sanitizeCode(hugeInput, 5);
      expect(code).toBe('AAAAA');
    });

    it('ADV-SKU-03: handles Arabic characters with diacritics (تَشْكِيل) in color and size names', () => {
      // Arabic characters have no Latin letters, so sanitizeCode returns DEF
      const colorWithDiacritics = 'أَحْمَرُ مَلَكِيٌّ'; // Red with full Tashkeel
      const sizeWithTashkeel = 'كَبِيرٌ جِدّاً';

      const sku = generateVariantSku('prod-slug', colorWithDiacritics, sizeWithTashkeel);
      expect(sku).toBe('PRODSL-DEF-DEF');
    });

    it('ADV-SKU-04: generateSlug properly strips diacritics, punctuation, script tags, and handles edge cases', () => {
      expect(generateSlug('<script>alert("xss")</script>')).toBe('scriptalertxssscript');
      expect(generateSlug('Royal Velvet Abaya 2026!')).toBe('royal-velvet-abaya-2026');
      expect(generateSlug('---leading--and--trailing---')).toBe('leading-and-trailing');
      expect(generateSlug('   Multiple     Spaces    And___Underscores   ')).toBe(
        'multiple-spaces-and-underscores'
      );
      expect(generateSlug('')).toBe('');
    });

    it('ADV-SKU-05: collision resolution loop prevents duplicate SKUs when multiple variants share attributes', () => {
      // Test the collision loop inside generateCartesianVariants
      const identicalColors: VariantColor[] = [
        { nameAr: 'أحمر 1', nameEn: 'Red', hex: '#FF0000' },
        { nameAr: 'أحمر 2', nameEn: 'Red', hex: '#EE0000' },
        { nameAr: 'أحمر 3', nameEn: 'Red', hex: '#DD0000' },
        { nameAr: 'أحمر 4', nameEn: 'Red', hex: '#CC0000' },
      ];
      const sizes = ['Standard'];

      const variants = generateCartesianVariants({
        colors: identicalColors,
        sizes,
        slug: 'dress',
      });

      expect(variants).toHaveLength(4);
      const skus = variants.map((v) => v.sku);
      expect(skus).toEqual([
        'DRESS-RED-STAN',
        'DRESS-RED-STAN-1',
        'DRESS-RED-STAN-2',
        'DRESS-RED-STAN-3',
      ]);
    });
  });

  // =========================================================================
  // SUITE 3: Variant Matrix Validation Adversarial Stress Tests
  // =========================================================================
  describe('Suite 3: Variant Matrix Validation Integrity', () => {
    it('ADV-VAL-01: rejects empty, null, or undefined variant arrays', () => {
      const resEmpty = validateVariantMatrix([]);
      expect(resEmpty.isValid).toBe(false);
      expect(resEmpty.errors[0]).toMatch(/يجب إضافة متغير واحد على الأقل/);

      const resNull = validateVariantMatrix(null as any);
      expect(resNull.isValid).toBe(false);
      expect(resNull.errors[0]).toMatch(/يجب إضافة متغير واحد على الأقل/);

      const resUndefined = validateVariantMatrix(undefined as any);
      expect(resUndefined.isValid).toBe(false);
    });

    it('ADV-VAL-02: detects missing, empty, or whitespace-only SKUs across multiple rows', () => {
      const rows = [
        { sku: 'VALID-01', stockQuantity: 10 },
        { sku: '', stockQuantity: 5 },
        { sku: '   ', stockQuantity: 3 },
        { sku: undefined, stockQuantity: 2 },
      ];

      const res = validateVariantMatrix(rows);
      expect(res.isValid).toBe(false);
      expect(res.errors).toHaveLength(3); // Rows 2, 3, 4 are invalid
      expect(res.errors[0]).toMatch(/رقم 2/);
      expect(res.errors[1]).toMatch(/رقم 3/);
      expect(res.errors[2]).toMatch(/رقم 4/);
    });

    it('ADV-VAL-03: detects duplicate SKUs regardless of letter casing or padding', () => {
      const rows = [
        { sku: 'ROBY-BLK-M', stockQuantity: 5 },
        { sku: 'roby-blk-m', stockQuantity: 10 }, // Identical in lowercase
        { sku: '  ROBY-BLK-M  ', stockQuantity: 2 }, // Identical with padding
      ];

      const res = validateVariantMatrix(rows);
      expect(res.isValid).toBe(false);
      expect(res.errors).toHaveLength(2); // Rows 2 and 3 flagged as duplicates
      expect(res.errors[0]).toMatch(/مكرر في الصف رقم 2/);
      expect(res.errors[1]).toMatch(/مكرر في الصف رقم 3/);
    });

    it('ADV-VAL-04: rejects negative stock quantities while permitting zero stock', () => {
      const rowsWithNegatives = [
        { sku: 'SKU-01', stockQuantity: -1 },
        { sku: 'SKU-02', stockQuantity: -50 },
      ];

      const resNeg = validateVariantMatrix(rowsWithNegatives);
      expect(resNeg.isValid).toBe(false);
      expect(resNeg.errors).toHaveLength(2);
      expect(resNeg.errors[0]).toMatch(/قيمة سالبة/);

      // Zero stock MUST be valid (out-of-stock state)
      const rowsWithZero = [
        { sku: 'SKU-01', stockQuantity: 0 },
        { sku: 'SKU-02', stockQuantity: 10 },
      ];
      const resZero = validateVariantMatrix(rowsWithZero);
      expect(resZero.isValid).toBe(true);
      expect(resZero.errors).toHaveLength(0);
    });

    it('ADV-VAL-05: handles high volume matrix validation (2,500 variants) in < 50ms', () => {
      const bulkRows = Array.from({ length: 2500 }, (_, i) => ({
        sku: `BULK-SKU-${i}`,
        stockQuantity: i % 10,
      }));

      const start = performance.now();
      const res = validateVariantMatrix(bulkRows);
      const duration = performance.now() - start;

      expect(res.isValid).toBe(true);
      expect(res.errors).toHaveLength(0);
      expect(duration).toBeLessThan(50);
    });

    it('ADV-VAL-06: detects duplicate in massive list with correct row number attribution', () => {
      const bulkRows = Array.from({ length: 1000 }, (_, i) => ({
        sku: `BULK-SKU-${i}`,
        stockQuantity: 5,
      }));

      // Inject duplicate at index 750 (row 751) copying row 1
      bulkRows[750].sku = 'bulk-sku-0';

      const res = validateVariantMatrix(bulkRows);
      expect(res.isValid).toBe(false);
      expect(res.errors).toHaveLength(1);
      expect(res.errors[0]).toMatch(/رقم 751/);
    });
  });

  // =========================================================================
  // SUITE 4: Pricing & Store Service Integration under Variant Matrix
  // =========================================================================
  describe('Suite 4: Integration with Pricing Engine & Store Service', () => {
    it('ADV-INT-01: negative price adjustments do not result in negative effective unit price', () => {
      const product: Product = {
        id: 'prod_test_price',
        slug: 'test-dress',
        titleAr: 'فستان',
        titleEn: 'Dress',
        descriptionAr: '',
        descriptionEn: '',
        basePrice: 100, // 100 EGP
        currency: 'EGP',
        images: ['https://example.com/img.jpg'],
        categoryIds: ['cat_1'],
        primaryCategorySlug: 'dresses',
        isFeatured: false,
        isNewArrival: false,
        totalStock: 10,
        hasStock: true,
        availableColors: [],
        availableSizes: [],
        variants: [
          {
            id: 'v1',
            sku: 'SKU-DISC-EXCESSIVE',
            color: { nameAr: 'أسود', nameEn: 'Black', hex: '#000' },
            size: 'S',
            priceAdjustment: -200, // Massive negative adjustment exceeding base price
            stockQuantity: 5,
            inStock: true,
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const pricing = calculateEffectiveUnitPrice(product, product.variants[0]);
      // Must be safely clamped to 0, never negative!
      expect(pricing.unitPrice).toBe(0);
      expect(pricing.originalUnitPrice).toBe(0);
    });

    it('ADV-INT-02: creating product with 100 variants accurately aggregates totalStock and persists to service', async () => {
      const variants = generateCartesianVariants({
        colors: Array.from({ length: 10 }, (_, i) => ({
          nameAr: `لون ${i}`,
          nameEn: `Color_${i}`,
          hex: '#000000',
        })),
        sizes: Array.from({ length: 10 }, (_, i) => `Size_${i}`),
        slug: 'hundred-variants',
        defaultStock: 3, // 100 variants × 3 stock = 300 totalStock
      });

      const input: CreateProductInput = {
        titleAr: 'منتج ضخم بمائة متغير',
        titleEn: 'Mega Product 100 Variants',
        slug: 'mega-product-100-variants',
        basePrice: 1500,
        images: ['https://example.com/mega.jpg'],
        categoryIds: ['cat_womens_fashion'],
        variants,
        descriptionAr: 'وصف تجريبي',
        descriptionEn: 'Test description',
      };

      const created = await service.createProduct(input);

      expect(created.variants).toHaveLength(100);
      expect(created.totalStock).toBe(300);
      expect(created.hasStock).toBe(true);
      expect(created.availableColors).toHaveLength(10);
      expect(created.availableSizes).toHaveLength(10);

      // Verify retrieval from service
      const retrieved = await service.getProductById(created.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.variants).toHaveLength(100);
      expect(retrieved?.totalStock).toBe(300);
    });

    it('ADV-INT-03: fallback data URL conversion succeeds cleanly in test environment', async () => {
      const mockBlob = new Blob(['test-binary-data'], { type: 'image/jpeg' });
      const dataUrl = await convertFileToDataUrl(mockBlob);

      expect(typeof dataUrl).toBe('string');
      expect(dataUrl.startsWith('data:')).toBe(true);
    });
  });
});
