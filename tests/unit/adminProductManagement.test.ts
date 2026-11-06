/**
 * Roby Store - Admin Product Management & Variant Matrix Unit Tests
 * Location: tests/unit/adminProductManagement.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MockStoreService } from '../../src/services/mockStoreService';
import { CreateProductInput, UpdateProductInput, VariantColor } from '../../src/types/store';
import {
  generateSlug,
  generateVariantSku,
  generateCartesianVariants,
  validateVariantMatrix,
  convertFileToDataUrl,
} from '../../src/utils/variantGenerator';

describe('Admin Product Catalog Management & Variant Matrix (Milestone P2-M3)', () => {
  let service: MockStoreService;

  beforeEach(() => {
    // Zero latency for snappy test runs
    service = new MockStoreService(0);
    service.resetSimulation?.();
  });

  // ==========================================
  // Suite 1: Product Creation & Aggregate Calculations
  // ==========================================
  describe('Suite 1: Product Creation & Aggregates', () => {
    it('TC-ADM-PRD-01: createProduct creates new product with all metadata, images, and unique ID', async () => {
      const input: CreateProductInput = {
        titleAr: 'عباية مخملية ملكية مطرزة',
        titleEn: 'Royal Velvet Embroidered Abaya',
        slug: 'royal-velvet-embroidered-abaya',
        descriptionAr: 'تصميم فاخر من قماش المخمل الكوري الراقي.',
        descriptionEn: 'Luxury design crafted from premium velvet.',
        basePrice: 1650,
        discountPrice: 1350,
        currency: 'EGP',
        images: ['https://images.unsplash.com/photo-sample-1.jpg'],
        categoryIds: ['cat_womens_fashion', 'cat_abayas'],
        primaryCategorySlug: 'abayas',
        tags: ['velvet', 'royal', 'winter-2026'],
        isFeatured: true,
        isNewArrival: true,
        variants: [
          {
            sku: 'ROBY-VELVET-BLK-M',
            color: { nameAr: 'أسود', nameEn: 'Black', hex: '#111111' },
            size: 'M',
            priceAdjustment: 0,
            stockQuantity: 8,
            inStock: true,
          },
          {
            sku: 'ROBY-VELVET-BUR-L',
            color: { nameAr: 'نبيتي', nameEn: 'Burgundy', hex: '#800020' },
            size: 'L',
            priceAdjustment: 50,
            stockQuantity: 4,
            inStock: true,
          },
        ],
      };

      const product = await service.createProduct(input);

      expect(product).toBeDefined();
      expect(product.id).toMatch(/^prod_/);
      expect(product.slug).toBe('royal-velvet-embroidered-abaya');
      expect(product.titleAr).toBe(input.titleAr);
      expect(product.titleEn).toBe(input.titleEn);
      expect(product.basePrice).toBe(1650);
      expect(product.discountPrice).toBe(1350);
      expect(product.isFeatured).toBe(true);
      expect(product.isNewArrival).toBe(true);
      expect(product.images).toEqual(['https://images.unsplash.com/photo-sample-1.jpg']);
      expect(product.variants.length).toBe(2);
    });

    it('TC-ADM-PRD-02: createProduct accurately computes aggregate totalStock and hasStock', async () => {
      const input: CreateProductInput = {
        titleAr: 'طقم مفروشات سرير قطن مصري 100%',
        titleEn: 'Egyptian Cotton Bedding Set',
        basePrice: 2200,
        images: ['https://images.unsplash.com/photo-bedding.jpg'],
        categoryIds: ['cat_home_bedding'],
        variants: [
          {
            sku: 'BED-160-WHT',
            color: { nameAr: 'أبيض', nameEn: 'White', hex: '#FFFFFF' },
            size: '160x200cm',
            stockQuantity: 15,
          },
          {
            sku: 'BED-180-WHT',
            color: { nameAr: 'أبيض', nameEn: 'White', hex: '#FFFFFF' },
            size: '180x200cm',
            stockQuantity: 5,
          },
        ],
        descriptionAr: 'مفروشات سرير فاخرة',
        descriptionEn: 'Luxury Egyptian cotton',
      };

      const product = await service.createProduct(input);

      expect(product.totalStock).toBe(20);
      expect(product.hasStock).toBe(true);
    });

    it('TC-ADM-PRD-03: createProduct correctly handles zero inventory (totalStock = 0, hasStock = false)', async () => {
      const input: CreateProductInput = {
        titleAr: 'فستان سهرة دانتيل',
        titleEn: 'Evening Lace Dress',
        basePrice: 3500,
        images: ['https://images.unsplash.com/photo-dress.jpg'],
        categoryIds: ['cat_womens_fashion'],
        variants: [
          {
            sku: 'DRESS-OOS-01',
            color: { nameAr: 'أسود', nameEn: 'Black', hex: '#111111' },
            size: 'S',
            stockQuantity: 0,
          },
        ],
        descriptionAr: 'فستان سهرة',
        descriptionEn: 'Evening dress',
      };

      const product = await service.createProduct(input);

      expect(product.totalStock).toBe(0);
      expect(product.hasStock).toBe(false);
    });

    it('TC-ADM-PRD-04: createProduct correctly extracts distinct availableColors and availableSizes', async () => {
      const input: CreateProductInput = {
        titleAr: 'كارديجان صوف كشمير',
        titleEn: 'Cashmere Wool Cardigan',
        basePrice: 850,
        images: ['https://images.unsplash.com/photo-cardigan.jpg'],
        categoryIds: ['cat_womens_fashion'],
        variants: [
          {
            sku: 'CARD-BLK-S',
            color: { nameAr: 'أسود', nameEn: 'Black', hex: '#111111' },
            size: 'S',
            stockQuantity: 3,
          },
          {
            sku: 'CARD-BLK-M',
            color: { nameAr: 'أسود', nameEn: 'Black', hex: '#111111' },
            size: 'M',
            stockQuantity: 5,
          },
          {
            sku: 'CARD-BEI-S',
            color: { nameAr: 'بيج', nameEn: 'Beige', hex: '#E8D8C8' },
            size: 'S',
            stockQuantity: 2,
          },
          {
            sku: 'CARD-BEI-L',
            color: { nameAr: 'بيج', nameEn: 'Beige', hex: '#E8D8C8' },
            size: 'L',
            stockQuantity: 4,
          },
        ],
        descriptionAr: 'كارديجان صوف',
        descriptionEn: 'Cashmere cardigan',
      };

      const product = await service.createProduct(input);

      expect(product.availableColors.length).toBe(2);
      expect(product.availableColors.map((c) => c.nameEn)).toEqual(
        expect.arrayContaining(['Black', 'Beige'])
      );
      expect(product.availableSizes.length).toBe(3);
      expect(product.availableSizes).toEqual(expect.arrayContaining(['S', 'M', 'L']));
    });

    it('TC-ADM-PRD-05: newly created product is instantly queryable via getProductById and getProductBySlug', async () => {
      const input: CreateProductInput = {
        titleAr: 'طرحة شيفون كريستال',
        titleEn: 'Crystal Chiffon Scarf',
        slug: 'crystal-chiffon-scarf-exclusive',
        basePrice: 250,
        images: ['https://images.unsplash.com/photo-scarf.jpg'],
        categoryIds: ['cat_scarves'],
        variants: [
          {
            sku: 'SCARF-CRY-01',
            color: { nameAr: 'وردي', nameEn: 'Pink', hex: '#FFC0CB' },
            size: 'One Size',
            stockQuantity: 50,
          },
        ],
        descriptionAr: 'طرحة فاخرة',
        descriptionEn: 'Luxury scarf',
      };

      const created = await service.createProduct(input);

      const byId = await service.getProductById(created.id);
      expect(byId).not.toBeNull();
      expect(byId?.id).toBe(created.id);
      expect(byId?.titleAr).toBe('طرحة شيفون كريستال');

      const bySlug = await service.getProductBySlug('crystal-chiffon-scarf-exclusive');
      expect(bySlug).not.toBeNull();
      expect(bySlug?.id).toBe(created.id);
    });
  });

  // ==========================================
  // Suite 2: Product Updates & Deletion
  // ==========================================
  describe('Suite 2: Product Updates & Deletion', () => {
    it('TC-ADM-PRD-06: updateProduct updates metadata and changes updatedAt timestamp', async () => {
      const created = await service.createProduct({
        titleAr: 'منتج تجريبي للتحديث',
        titleEn: 'Test Update Product',
        basePrice: 500,
        images: ['https://images.unsplash.com/sample.jpg'],
        categoryIds: ['cat_womens_fashion'],
        variants: [
          {
            sku: 'TEST-UPD-01',
            color: { nameAr: 'أسود', nameEn: 'Black', hex: '#111111' },
            size: 'Free Size',
            stockQuantity: 10,
          },
        ],
        descriptionAr: 'وصف قديم',
        descriptionEn: 'Old description',
      });

      const updateInput: UpdateProductInput = {
        titleAr: 'منتج تجريبي معدل',
        basePrice: 650,
        discountPrice: 550,
        descriptionAr: 'تم تحديث الوصف الفاخر بنجاح',
      };

      const updated = await service.updateProduct(created.id, updateInput);

      expect(updated.id).toBe(created.id);
      expect(updated.titleAr).toBe('منتج تجريبي معدل');
      expect(updated.basePrice).toBe(650);
      expect(updated.discountPrice).toBe(550);
      expect(updated.descriptionAr).toBe('تم تحديث الوصف الفاخر بنجاح');
      expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(created.createdAt).getTime()
      );
    });

    it('TC-ADM-PRD-07: updateProduct updates variant matrix and recalculates aggregate total stock', async () => {
      const created = await service.createProduct({
        titleAr: 'عباية خليجية مطرزة',
        titleEn: 'Gulf Embroidered Abaya',
        basePrice: 1200,
        images: ['https://images.unsplash.com/sample.jpg'],
        categoryIds: ['cat_abayas'],
        variants: [
          {
            sku: 'GULF-01',
            color: { nameAr: 'أسود', nameEn: 'Black', hex: '#111111' },
            size: 'M',
            stockQuantity: 5,
          },
        ],
        descriptionAr: 'عباية',
        descriptionEn: 'Abaya',
      });

      expect(created.totalStock).toBe(5);

      // Add a second variant with 15 stock
      const updated = await service.updateProduct(created.id, {
        variants: [
          {
            sku: 'GULF-01',
            color: { nameAr: 'أسود', nameEn: 'Black', hex: '#111111' },
            size: 'M',
            stockQuantity: 5,
          },
          {
            sku: 'GULF-02',
            color: { nameAr: 'كحلي', nameEn: 'Navy', hex: '#0F1E36' },
            size: 'L',
            stockQuantity: 15,
          },
        ],
      });

      expect(updated.variants.length).toBe(2);
      expect(updated.totalStock).toBe(20);
      expect(updated.availableColors.length).toBe(2);
    });

    it('TC-ADM-PRD-08: deleteProduct removes product and subsequent lookups return null', async () => {
      const created = await service.createProduct({
        titleAr: 'منتج للحذف الفوري',
        titleEn: 'Product To Delete',
        basePrice: 300,
        images: ['https://images.unsplash.com/sample.jpg'],
        categoryIds: ['cat_accessories'],
        variants: [
          {
            sku: 'DEL-01',
            color: { nameAr: 'ذهبي', nameEn: 'Gold', hex: '#D4AF37' },
            size: 'Free Size',
            stockQuantity: 1,
          },
        ],
        descriptionAr: 'وصف',
        descriptionEn: 'Description',
      });

      const deleteResult = await service.deleteProduct(created.id);
      expect(deleteResult).toBe(true);

      const lookById = await service.getProductById(created.id);
      expect(lookById).toBeNull();

      const lookBySlug = await service.getProductBySlug(created.slug);
      expect(lookBySlug).toBeNull();
    });

    it('TC-ADM-PRD-09: deleteProduct with non-existent ID returns false', async () => {
      const result = await service.deleteProduct('non_existent_prod_999999');
      expect(result).toBe(false);
    });
  });

  // ==========================================
  // Suite 3: Validation Constraints (Negative Tests)
  // ==========================================
  describe('Suite 3: Validation Constraints', () => {
    it('TC-ADM-PRD-10: rejects product creation with missing or empty Arabic title', async () => {
      const invalidInput: any = {
        titleAr: '   ',
        titleEn: 'Valid Title',
        basePrice: 100,
        images: ['url'],
        categoryIds: ['cat_1'],
        variants: [{ sku: 'SKU1', size: 'M', color: { nameAr: 'أسود', nameEn: 'Black', hex: '#000' }, stockQuantity: 1 }],
      };

      await expect(service.createProduct(invalidInput)).rejects.toThrow(
        /Arabic title is required/i
      );
    });

    it('TC-ADM-PRD-11: rejects product creation with missing or empty English title', async () => {
      const invalidInput: any = {
        titleAr: 'عنوان عربي صالح',
        titleEn: '',
        basePrice: 100,
        images: ['url'],
        categoryIds: ['cat_1'],
        variants: [{ sku: 'SKU1', size: 'M', color: { nameAr: 'أسود', nameEn: 'Black', hex: '#000' }, stockQuantity: 1 }],
      };

      await expect(service.createProduct(invalidInput)).rejects.toThrow(
        /English title is required/i
      );
    });

    it('TC-ADM-PRD-12: rejects product creation with zero or negative base price', async () => {
      const invalidInput: any = {
        titleAr: 'عنوان',
        titleEn: 'Title',
        basePrice: 0,
        images: ['url'],
        categoryIds: ['cat_1'],
        variants: [{ sku: 'SKU1', size: 'M', color: { nameAr: 'أسود', nameEn: 'Black', hex: '#000' }, stockQuantity: 1 }],
      };

      await expect(service.createProduct(invalidInput)).rejects.toThrow(
        /Base price must be greater than zero/i
      );
    });

    it('TC-ADM-PRD-13: rejects discount price greater than or equal to base price', async () => {
      const invalidInput: any = {
        titleAr: 'عنوان',
        titleEn: 'Title',
        basePrice: 500,
        discountPrice: 600, // Invalid: discount cannot be higher than base price
        images: ['url'],
        categoryIds: ['cat_1'],
        variants: [{ sku: 'SKU1', size: 'M', color: { nameAr: 'أسود', nameEn: 'Black', hex: '#000' }, stockQuantity: 1 }],
      };

      await expect(service.createProduct(invalidInput)).rejects.toThrow(
        /Discount price must be less than base price/i
      );
    });

    it('TC-ADM-PRD-14: rejects product creation without at least one category', async () => {
      const invalidInput: any = {
        titleAr: 'عنوان',
        titleEn: 'Title',
        basePrice: 500,
        images: ['url'],
        categoryIds: [],
        variants: [{ sku: 'SKU1', size: 'M', color: { nameAr: 'أسود', nameEn: 'Black', hex: '#000' }, stockQuantity: 1 }],
      };

      await expect(service.createProduct(invalidInput)).rejects.toThrow(
        /At least one category is required/i
      );
    });

    it('TC-ADM-PRD-15: rejects product creation without at least one variant', async () => {
      const invalidInput: any = {
        titleAr: 'عنوان',
        titleEn: 'Title',
        basePrice: 500,
        images: ['url'],
        categoryIds: ['cat_1'],
        variants: [],
      };

      await expect(service.createProduct(invalidInput)).rejects.toThrow(
        /At least one variant is required/i
      );
    });
  });

  // ==========================================
  // Suite 4: Cartesian Variant Matrix Generator & Helpers
  // ==========================================
  describe('Suite 4: Cartesian Variant Matrix & SKU Generator', () => {
    it('TC-ADM-PRD-16: generateCartesianVariants computes Colors × Sizes with unique SKUs', () => {
      const colors: VariantColor[] = [
        { nameAr: 'أسود', nameEn: 'Black', hex: '#111111' },
        { nameAr: 'وردي', nameEn: 'Pink', hex: '#D4A5A5' },
      ];
      const sizes = ['S', 'M', 'L'];

      const matrix = generateCartesianVariants({
        colors,
        sizes,
        slug: 'royal-crepe',
        defaultStock: 7,
      });

      // 2 colors × 3 sizes = 6 variants
      expect(matrix.length).toBe(6);

      // Verify each variant has non-empty unique SKU
      const skus = matrix.map((v) => v.sku);
      const uniqueSkus = new Set(skus);
      expect(uniqueSkus.size).toBe(6);

      // Verify default properties
      expect(matrix[0].stockQuantity).toBe(7);
      expect(matrix[0].inStock).toBe(true);
      expect(matrix[0].priceAdjustment).toBe(0);
    });

    it('TC-ADM-PRD-17: generateCartesianVariants handles empty colors or sizes gracefully with defaults', () => {
      const matrix = generateCartesianVariants({
        colors: [],
        sizes: [],
        slug: 'abaya',
      });

      expect(matrix.length).toBe(1);
      expect(matrix[0].sku).toBeDefined();
      expect(matrix[0].size).toBe('Free Size');
      expect(matrix[0].color.nameAr).toBe('لون موحد');
    });

    it('TC-ADM-PRD-18: validateVariantMatrix detects empty list, blank SKUs, and duplicates', () => {
      // 1. Empty list
      const res1 = validateVariantMatrix([]);
      expect(res1.isValid).toBe(false);
      expect(res1.errors.length).toBeGreaterThan(0);

      // 2. Blank SKU
      const res2 = validateVariantMatrix([{ sku: '   ', stockQuantity: 5 }]);
      expect(res2.isValid).toBe(false);
      expect(res2.errors[0]).toMatch(/كود الصنف/i);

      // 3. Duplicate SKUs
      const res3 = validateVariantMatrix([
        { sku: 'SKU-01', stockQuantity: 5 },
        { sku: 'sku-01', stockQuantity: 10 }, // Case-insensitive duplicate
      ]);
      expect(res3.isValid).toBe(false);
      expect(res3.errors[0]).toMatch(/مكرر/i);

      // 4. Valid matrix
      const res4 = validateVariantMatrix([
        { sku: 'SKU-01', stockQuantity: 5 },
        { sku: 'SKU-02', stockQuantity: 10 },
      ]);
      expect(res4.isValid).toBe(true);
      expect(res4.errors.length).toBe(0);
    });

    it('TC-ADM-PRD-19: generateSlug produces standard lowercase hyphenated slugs', () => {
      expect(generateSlug('Royal Embroidered Crepe Abaya')).toBe(
        'royal-embroidered-crepe-abaya'
      );
      expect(generateSlug('  Cotton Bedding & Sheets 100% !!! ')).toBe(
        'cotton-bedding-sheets-100'
      );
      expect(generateSlug('')).toBe('');
    });

    it('TC-ADM-PRD-20: convertFileToDataUrl converts file to data URL fallback', async () => {
      const dummyBlob = new Blob(['hello-roby-store'], { type: 'text/plain' });
      const dataUrl = await convertFileToDataUrl(dummyBlob);

      expect(typeof dataUrl).toBe('string');
      expect(dataUrl.startsWith('data:')).toBe(true);
    });
  });

  // ==========================================
  // Suite 5: Persistence Across Service Re-Instantiation
  // ==========================================
  describe('Suite 5: Persistence Across Service Re-Instantiation', () => {
    it('TC-ADM-PRD-21: created product persists in localStorage across service re-instantiation', async () => {
      const created = await service.createProduct({
        titleAr: 'منتج اختبار التخزين المحلي',
        titleEn: 'Persistence Test Product',
        slug: 'persistence-test-product',
        basePrice: 999,
        images: ['https://example.com/img.jpg'],
        categoryIds: ['cat_womens_fashion'],
        variants: [
          {
            sku: 'PERSIST-01',
            color: { nameAr: 'أسود', nameEn: 'Black', hex: '#111111' },
            size: 'Free Size',
            stockQuantity: 12,
          },
        ],
        descriptionAr: 'وصف للتخزين',
        descriptionEn: 'Storage description',
      });

      // Instantiate a fresh service instance simulating page reload
      const reloadedService = new MockStoreService(0);
      const retrieved = await reloadedService.getProductById(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.titleAr).toBe('منتج اختبار التخزين المحلي');
      expect(retrieved?.totalStock).toBe(12);
    });
  });
});
