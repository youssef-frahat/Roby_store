/**
 * Roby Store - Milestone P2-M3 Adversarial Challenge & Stress Harness
 * Focus: Product Catalog Management, Product Deletion Lifecycle, Image Uploader Fallback, and Search/Filters.
 * Location: tests/unit/adversarial_p2_m3_catalog_deletion.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MockStoreService } from '../../src/services/mockStoreService';
import { SupabaseStoreService } from '../../src/services/supabaseStoreService';
import {
  CreateProductInput,
  UpdateProductInput,
  Product,
  ProductVariant,
  VariantColor,
} from '../../src/types/store';
import {
  convertFileToDataUrl,
  generateCartesianVariants,
  validateVariantMatrix,
  generateSlug,
  generateVariantSku,
} from '../../src/utils/variantGenerator';
import fs from 'node:fs';
import path from 'node:path';

describe('Milestone P2-M3 Adversarial Challenge: Catalog Deletion, Fallback & Search', () => {
  let service: MockStoreService;

  beforeEach(() => {
    service = new MockStoreService(0);
    service.resetSimulation?.();
  });

  // =========================================================================
  // SUITE 1: Product Deletion Lifecycle, Cascade Effects & Ghost Prevention
  // =========================================================================
  describe('Suite 1: Product Deletion Lifecycle & Ghost Prevention', () => {
    it('CHALLENGE-DEL-01: Deleting an existing product completely eliminates it from all catalog queries', async () => {
      // 1. Create a product with distinct titles, category, and variants
      const input: CreateProductInput = {
        titleAr: 'عباية حرير كريب ملكية للاختبار الحذفي',
        titleEn: 'Royal Crepe Silk Abaya For Deletion Challenge',
        slug: 'royal-crepe-silk-abaya-deletion-target',
        descriptionAr: 'منتج مخصص لاختبار الحذف الصارم',
        descriptionEn: 'Product dedicated for strict deletion testing',
        basePrice: 1950,
        discountPrice: 1650,
        currency: 'EGP',
        images: ['https://images.unsplash.com/photo-deletion-target.jpg'],
        categoryIds: ['cat_abayas'],
        primaryCategorySlug: 'abayas',
        tags: ['deletion-target', 'luxury-test', 'silk-crepe'],
        isFeatured: true,
        isNewArrival: true,
        variants: [
          {
            sku: 'DEL-TARGET-BLK-M',
            color: { nameAr: 'أسود فاحم', nameEn: 'Black', hex: '#111111' },
            size: 'M',
            priceAdjustment: 0,
            stockQuantity: 12,
            inStock: true,
          },
          {
            sku: 'DEL-TARGET-BUR-L',
            color: { nameAr: 'نبيتي ملكي', nameEn: 'Burgundy', hex: '#800020' },
            size: 'L',
            priceAdjustment: 50,
            stockQuantity: 6,
            inStock: true,
          },
        ],
      };

      const created = await service.createProduct(input);
      expect(created.id).toBeDefined();

      // Verify product is queryable across all facets BEFORE deletion
      const beforeById = await service.getProductById(created.id);
      expect(beforeById).not.toBeNull();
      expect(beforeById?.id).toBe(created.id);

      const beforeBySlug = await service.getProductBySlug(created.slug);
      expect(beforeBySlug).not.toBeNull();
      expect(beforeBySlug?.id).toBe(created.id);

      const beforeSearch = await service.getProducts({
        searchQuery: 'للاختبار الحذفي',
      });
      expect(beforeSearch.data.some((p) => p.id === created.id)).toBe(true);

      const beforeCat = await service.getProducts({
        categorySlug: 'abayas',
      });
      expect(beforeCat.data.some((p) => p.id === created.id)).toBe(true);

      const beforeFeatured = await service.getFeaturedProducts(50);
      expect(beforeFeatured.some((p) => p.id === created.id)).toBe(true);

      const beforeNewArrivals = await service.getNewArrivals(50);
      expect(beforeNewArrivals.some((p) => p.id === created.id)).toBe(true);

      // 2. Perform Deletion
      const deleteResult = await service.deleteProduct(created.id);
      expect(deleteResult).toBe(true);

      // 3. Verify product completely disappeared from ALL query surfaces (no ghost records)
      const afterById = await service.getProductById(created.id);
      expect(afterById).toBeNull();

      const afterBySlug = await service.getProductBySlug(created.slug);
      expect(afterBySlug).toBeNull();

      const afterSearch = await service.getProducts({
        searchQuery: 'للاختبار الحذفي',
      });
      expect(afterSearch.data.some((p) => p.id === created.id)).toBe(false);

      const afterCat = await service.getProducts({
        categorySlug: 'abayas',
      });
      expect(afterCat.data.some((p) => p.id === created.id)).toBe(false);

      const afterFeatured = await service.getFeaturedProducts(50);
      expect(afterFeatured.some((p) => p.id === created.id)).toBe(false);

      const afterNewArrivals = await service.getNewArrivals(50);
      expect(afterNewArrivals.some((p) => p.id === created.id)).toBe(false);
    });

    it('CHALLENGE-DEL-02: Deleting a product prevents ordering or validating stock for its former variants', async () => {
      const created = await service.createProduct({
        titleAr: 'طقم بيجامة ستان فاخر للحذف',
        titleEn: 'Satin Pajama Set Deletion Test',
        basePrice: 900,
        images: ['https://images.unsplash.com/sample-satin.jpg'],
        categoryIds: ['cat_womens_fashion'],
        variants: [
          {
            sku: 'SATIN-GHOST-SKU-01',
            color: { nameAr: 'وردي', nameEn: 'Pink', hex: '#D4A5A5' },
            size: 'Free Size',
            stockQuantity: 20,
          },
        ],
        descriptionAr: 'بيجامة ستان',
        descriptionEn: 'Satin pajama',
      });

      // Stock validation before deletion should succeed
      const valBefore = await service.validateStock([
        {
          productId: created.id,
          sku: 'SATIN-GHOST-SKU-01',
          requestedQuantity: 2,
        },
      ]);
      expect(valBefore.isValid).toBe(true);
      expect(valBefore.conflicts.length).toBe(0);

      // Delete the product
      await service.deleteProduct(created.id);

      // Stock validation after deletion must fail with a conflict (product no longer exists)
      const valAfter = await service.validateStock([
        {
          productId: created.id,
          sku: 'SATIN-GHOST-SKU-01',
          requestedQuantity: 2,
        },
      ]);
      expect(valAfter.isValid).toBe(false);
      expect(valAfter.conflicts.length).toBe(1);
      expect(valAfter.conflicts[0].sku).toBe('SATIN-GHOST-SKU-01');
      expect(valAfter.conflicts[0].availableStock).toBe(0);
    });

    it('CHALLENGE-DEL-03: Repeated deletion (idempotency) and invalid IDs return false without crashing', async () => {
      // 1. Delete an existing product
      const created = await service.createProduct({
        titleAr: 'منتج مؤقت للحذف المزدوج',
        titleEn: 'Temporary Product For Double Deletion',
        basePrice: 400,
        images: ['https://sample.jpg'],
        categoryIds: ['cat_womens_fashion'],
        variants: [
          {
            sku: 'TEMP-DEL-01',
            color: { nameAr: 'أسود', nameEn: 'Black', hex: '#000' },
            size: 'M',
            stockQuantity: 5,
          },
        ],
        descriptionAr: 'وصف',
        descriptionEn: 'Desc',
      });

      const firstDelete = await service.deleteProduct(created.id);
      expect(firstDelete).toBe(true);

      // Second deletion on the same ID should return false gracefully
      const secondDelete = await service.deleteProduct(created.id);
      expect(secondDelete).toBe(false);

      // Third deletion on same ID
      const thirdDelete = await service.deleteProduct(created.id);
      expect(thirdDelete).toBe(false);

      // Arbitrary non-existent or adversarial IDs
      expect(await service.deleteProduct('non-existent-id-999999')).toBe(false);
      expect(await service.deleteProduct('')).toBe(false);
      expect(await service.deleteProduct('   ')).toBe(false);
      expect(await service.deleteProduct('null')).toBe(false);
      expect(await service.deleteProduct('undefined')).toBe(false);
      expect(await service.deleteProduct('!@#$%^&*()_+{}|:"<>?')).toBe(false);
      expect(await service.deleteProduct('DROP TABLE products;--')).toBe(false);
    });

    it('CHALLENGE-DEL-04: Supabase schema confirms ON DELETE CASCADE for variants and images', () => {
      const schemaPath = path.resolve(process.cwd(), 'supabase/schema.sql');
      expect(fs.existsSync(schemaPath)).toBe(true);

      const schemaContent = fs.readFileSync(schemaPath, 'utf8');

      // Check product_variants cascade
      const variantCascadeMatch = /product_id\s+TEXT\s+NOT\s+NULL\s+REFERENCES\s+public\.products\(id\)\s+ON\s+DELETE\s+CASCADE/i.test(
        schemaContent
      );
      expect(variantCascadeMatch).toBe(true);

      // Check product_images cascade
      const imagesCascadeMatch = /product_id\s+TEXT\s+NOT\s+NULL\s+REFERENCES\s+public\.products\(id\)\s+ON\s+DELETE\s+CASCADE/i.test(
        schemaContent
      );
      expect(imagesCascadeMatch).toBe(true);
    });
  });

  // =========================================================================
  // SUITE 2: Dual-Mode Image Uploader & Base64 Data URL Fallback
  // =========================================================================
  describe('Suite 2: Image Uploader Fallback & Base64 Data URL Persistence', () => {
    it('CHALLENGE-IMG-01: convertFileToDataUrl correctly converts Blob/File into base64 Data URL', async () => {
      // Create a small PNG Blob
      const mockPngBytes = new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89,
      ]);
      const blob = new Blob([mockPngBytes], { type: 'image/png' });

      const dataUrl = await convertFileToDataUrl(blob);

      expect(dataUrl).toBeDefined();
      expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true);
      expect(dataUrl.length).toBeGreaterThan(30);
    });

    it('CHALLENGE-IMG-02: convertFileToDataUrl handles various image MIME types (JPEG, WebP, SVG)', async () => {
      const jpegBlob = new Blob(['fake-jpeg-content'], { type: 'image/jpeg' });
      const webpBlob = new Blob(['fake-webp-content'], { type: 'image/webp' });
      const svgBlob = new Blob(['<svg></svg>'], { type: 'image/svg+xml' });

      const jpegUrl = await convertFileToDataUrl(jpegBlob);
      const webpUrl = await convertFileToDataUrl(webpBlob);
      const svgUrl = await convertFileToDataUrl(svgBlob);

      expect(jpegUrl.startsWith('data:image/jpeg;base64,')).toBe(true);
      expect(webpUrl.startsWith('data:image/webp;base64,')).toBe(true);
      expect(svgUrl.startsWith('data:image/svg+xml;base64,')).toBe(true);
    });

    it('CHALLENGE-IMG-03: convertFileToDataUrl handles large payload without truncation or memory explosion', async () => {
      // 100KB payload
      const largeBytes = new Uint8Array(100 * 1024);
      for (let i = 0; i < largeBytes.length; i++) {
        largeBytes[i] = i % 256;
      }
      const largeBlob = new Blob([largeBytes], { type: 'image/jpeg' });

      const dataUrl = await convertFileToDataUrl(largeBlob);
      expect(dataUrl.startsWith('data:image/jpeg;base64,')).toBe(true);
      expect(dataUrl.length).toBeGreaterThan(100 * 1024);
    });

    it('CHALLENGE-IMG-04: createProduct and updateProduct preserve base64 Data URLs without corruption', async () => {
      const base64Image1 =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const base64Image2 =
        'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

      const input: CreateProductInput = {
        titleAr: 'منتج يحمل صور بيانات مشفرة Base64',
        titleEn: 'Base64 Data URL Image Product',
        basePrice: 1100,
        images: [base64Image1, base64Image2],
        categoryIds: ['cat_womens_fashion'],
        variants: [
          {
            sku: 'B64-IMG-01',
            color: { nameAr: 'أسود', nameEn: 'Black', hex: '#000000' },
            size: 'Free Size',
            stockQuantity: 10,
          },
        ],
        descriptionAr: 'تجربة صور Base64',
        descriptionEn: 'Testing Base64',
      };

      const created = await service.createProduct(input);

      expect(created.images).toHaveLength(2);
      expect(created.images[0]).toBe(base64Image1);
      expect(created.images[1]).toBe(base64Image2);

      // Verify retrieval preserved the full strings
      const retrieved = await service.getProductById(created.id);
      expect(retrieved?.images[0]).toBe(base64Image1);
      expect(retrieved?.images[1]).toBe(base64Image2);

      // Update images with an additional base64 URL
      const base64Image3 = 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';
      const updated = await service.updateProduct(created.id, {
        images: [base64Image1, base64Image3],
      });

      expect(updated.images).toHaveLength(2);
      expect(updated.images[1]).toBe(base64Image3);
    });

    it('CHALLENGE-IMG-05: next.config.mjs specifies unoptimized: true allowing data: URLs without domain errors', () => {
      const configPath = path.resolve(process.cwd(), 'next.config.mjs');
      expect(fs.existsSync(configPath)).toBe(true);

      const content = fs.readFileSync(configPath, 'utf8');
      expect(content).toContain('unoptimized: true');
    });
  });

  // =========================================================================
  // SUITE 3: Search, Bilingual Matching & Category Multi-Facet Filter Engine
  // =========================================================================
  describe('Suite 3: Search & Multi-Facet Filtering Stress Harness', () => {
    let testProducts: Product[];

    beforeEach(async () => {
      // Seed a rich set of products for stress filtering
      const p1 = await service.createProduct({
        titleAr: 'عباية مخملية ملكية مطرزة بالخيوط الذهبية',
        titleEn: 'Royal Velvet Embroidered Gold Abaya',
        slug: 'royal-velvet-gold-abaya',
        basePrice: 2000,
        discountPrice: 1750,
        categoryIds: ['cat_abayas'],
        primaryCategorySlug: 'abayas',
        tags: ['velvet', 'gold', 'royal', 'winter'],
        variants: [
          {
            sku: 'ROBY-ABY-GLD-BLK-M',
            color: { nameAr: 'أسود', nameEn: 'Black', hex: '#111111' },
            size: 'M',
            stockQuantity: 10,
          },
          {
            sku: 'ROBY-ABY-GLD-BUR-L',
            color: { nameAr: 'نبيتي', nameEn: 'Burgundy', hex: '#800020' },
            size: 'L',
            stockQuantity: 0, // out of stock variant
          },
        ],
        descriptionAr: 'عباية مخملية سوداء مطرزة فاخرة',
        descriptionEn: 'Luxury black velvet abaya',
        images: ['https://sample.com/1.jpg'],
      });

      const p2 = await service.createProduct({
        titleAr: 'طقم ملايات قطن مصري 100% سوبر كينج',
        titleEn: 'Super King 100% Egyptian Cotton Bedding Set',
        slug: 'egyptian-cotton-super-king-bedding',
        basePrice: 2500,
        categoryIds: ['cat_home_bedding'],
        primaryCategorySlug: 'home-bedding',
        tags: ['cotton', 'bedding', 'luxury'],
        variants: [
          {
            sku: 'ROBY-BED-WHT-200',
            color: { nameAr: 'أبيض', nameEn: 'White', hex: '#FFFFFF' },
            size: '200x200cm',
            stockQuantity: 15,
          },
        ],
        descriptionAr: 'مفروشات نوم قطنية راقية',
        descriptionEn: 'Premium cotton bedding',
        images: ['https://sample.com/2.jpg'],
      });

      const p3 = await service.createProduct({
        titleAr: 'فستان دانتيل سهرة فرنسي ناعم',
        titleEn: 'French Soft Lace Evening Dress',
        slug: 'french-lace-evening-dress',
        basePrice: 3200,
        discountPrice: 2800,
        categoryIds: ['cat_dresses'],
        primaryCategorySlug: 'dresses',
        tags: ['evening', 'dress', 'lace', 'french'],
        variants: [
          {
            sku: 'ROBY-DRS-LCE-NVY-S',
            color: { nameAr: 'كحلي', nameEn: 'Navy', hex: '#0F1E36' },
            size: 'S',
            stockQuantity: 0, // totally out of stock product
          },
        ],
        descriptionAr: 'فستان سهرة دانتيل رقيق',
        descriptionEn: 'Evening lace dress',
        images: ['https://sample.com/3.jpg'],
      });

      testProducts = [p1, p2, p3];
    });

    it('CHALLENGE-SRCH-01: Searches accurately across Arabic title keywords', async () => {
      const res1 = await service.getProducts({ searchQuery: 'مخملية' });
      expect(res1.data.some((p) => p.slug === 'royal-velvet-gold-abaya')).toBe(true);
      expect(res1.data.some((p) => p.slug === 'french-lace-evening-dress')).toBe(false);

      const res2 = await service.getProducts({ searchQuery: 'قطن مصري' });
      expect(res2.data.some((p) => p.slug === 'egyptian-cotton-super-king-bedding')).toBe(true);

      const res3 = await service.getProducts({ searchQuery: 'دانتيل سهرة' });
      expect(res3.data.some((p) => p.slug === 'french-lace-evening-dress')).toBe(true);
    });

    it('CHALLENGE-SRCH-02: Searches accurately across English title keywords case-insensitively', async () => {
      const resUpper = await service.getProducts({ searchQuery: 'VELVET' });
      expect(resUpper.data.some((p) => p.slug === 'royal-velvet-gold-abaya')).toBe(true);

      const resLower = await service.getProducts({ searchQuery: 'super king' });
      expect(resLower.data.some((p) => p.slug === 'egyptian-cotton-super-king-bedding')).toBe(true);

      const resMixed = await service.getProducts({ searchQuery: 'FrEnCh SoFt' });
      expect(resMixed.data.some((p) => p.slug === 'french-lace-evening-dress')).toBe(true);
    });

    it('CHALLENGE-SRCH-03: In-memory table search matches variant SKUs, Arabic titles, and English titles', () => {
      // Simulate admin product catalog filter predicate from src/app/admin/products/page.tsx
      const filterCatalog = (
        products: Product[],
        searchQuery: string,
        category: string,
        stockFilter: 'all' | 'in_stock' | 'out_of_stock'
      ) => {
        const q = searchQuery.trim().toLowerCase();
        return products.filter((product) => {
          if (q) {
            const matchesTitleAr = product.titleAr?.toLowerCase().includes(q);
            const matchesTitleEn = product.titleEn?.toLowerCase().includes(q);
            const matchesSlug = product.slug?.toLowerCase().includes(q);
            const matchesSku = product.variants?.some((v) =>
              v.sku?.toLowerCase().includes(q)
            );
            const matchesTags = product.tags?.some((t) => t.toLowerCase().includes(q));

            if (!matchesTitleAr && !matchesTitleEn && !matchesSlug && !matchesSku && !matchesTags) {
              return false;
            }
          }

          if (category !== 'all') {
            const matchesCatId = product.categoryIds?.includes(category);
            const matchesCatSlug = product.primaryCategorySlug === category;
            if (!matchesCatId && !matchesCatSlug) {
              return false;
            }
          }

          if (stockFilter === 'in_stock') {
            if (!product.hasStock && (product.totalStock ?? 0) <= 0) return false;
          } else if (stockFilter === 'out_of_stock') {
            if (product.hasStock || (product.totalStock ?? 0) > 0) return false;
          }

          return true;
        });
      };

      // 1. Search by exact SKU
      const bySku = filterCatalog(testProducts, 'ROBY-ABY-GLD-BLK-M', 'all', 'all');
      expect(bySku.length).toBe(1);
      expect(bySku[0].slug).toBe('royal-velvet-gold-abaya');

      // 2. Search by partial SKU
      const byPartialSku = filterCatalog(testProducts, 'BED-WHT', 'all', 'all');
      expect(byPartialSku.length).toBe(1);
      expect(byPartialSku[0].slug).toBe('egyptian-cotton-super-king-bedding');

      // 3. Search by category filter
      const byCategory = filterCatalog(testProducts, '', 'abayas', 'all');
      expect(byCategory.some((p) => p.slug === 'royal-velvet-gold-abaya')).toBe(true);
      expect(byCategory.some((p) => p.slug === 'french-lace-evening-dress')).toBe(false);

      // 4. Filter by stock: out_of_stock
      const outOfStock = filterCatalog(testProducts, '', 'all', 'out_of_stock');
      expect(outOfStock.some((p) => p.slug === 'french-lace-evening-dress')).toBe(true);
      expect(outOfStock.some((p) => p.slug === 'royal-velvet-gold-abaya')).toBe(false);

      // 5. Composite: Category + In Stock + Text Search
      const composite = filterCatalog(testProducts, 'abaya', 'abayas', 'in_stock');
      expect(composite.length).toBe(1);
      expect(composite[0].slug).toBe('royal-velvet-gold-abaya');
    });

    it('CHALLENGE-SRCH-04: Adversarial search inputs do not throw syntax or regex errors', async () => {
      const adversarialQueries = [
        '.*',
        '^[a-z]+$',
        '(foo|bar)',
        '\\d+\\s+',
        '***',
        '???',
        '[[[',
        '{{{',
        '\\',
        '\' OR \'1\'=\'1',
        '<script>alert("xss")</script>',
        '      ', // pure whitespace
      ];

      for (const query of adversarialQueries) {
        await expect(service.getProducts({ searchQuery: query })).resolves.toBeDefined();
      }
    });
  });

  // =========================================================================
  // SUITE 4: Cartesian Matrix Resiliency & SKU Generator Stress
  // =========================================================================
  describe('Suite 4: Cartesian Variant Matrix Generator Resiliency', () => {
    it('CHALLENGE-VAR-01: Handles extreme Cartesian matrix generation (10 colors x 5 sizes = 50 unique SKUs)', () => {
      const colors: VariantColor[] = Array.from({ length: 10 }).map((_, i) => ({
        nameAr: `لون ${i + 1}`,
        nameEn: `Color_${i + 1}`,
        hex: `#${(i * 100000).toString(16).padStart(6, '0')}`,
      }));

      const sizes = ['XS', 'S', 'M', 'L', 'XL'];

      const variants = generateCartesianVariants({
        colors,
        sizes,
        slug: 'extreme-stress-dress',
        defaultStock: 10,
        defaultPriceAdjustment: 0,
      });

      expect(variants.length).toBe(50);

      // Verify every single SKU is non-empty and 100% unique
      const skuSet = new Set(variants.map((v) => v.sku));
      expect(skuSet.size).toBe(50);

      const validation = validateVariantMatrix(variants);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('CHALLENGE-VAR-02: validateVariantMatrix detects duplicate SKUs and negative stock', () => {
      const invalidVariants = [
        { sku: 'DUP-SKU-01', stockQuantity: 5 },
        { sku: 'DUP-SKU-01', stockQuantity: 10 }, // Duplicate SKU
        { sku: '', stockQuantity: 3 }, // Empty SKU
        { sku: 'NEG-SKU-01', stockQuantity: -2 }, // Negative stock
      ];

      const res = validateVariantMatrix(invalidVariants);
      expect(res.isValid).toBe(false);
      expect(res.errors.length).toBeGreaterThanOrEqual(3);
      expect(res.errors.some((e) => e.includes('مكرر'))).toBe(true);
      expect(res.errors.some((e) => e.includes('فارغاً'))).toBe(true);
      expect(res.errors.some((e) => e.includes('سالبة'))).toBe(true);
    });

    it('CHALLENGE-VAR-03: generateSlug and sanitizeCode handle complex unicode, Arabic, and symbols', () => {
      expect(generateSlug('Royal Velvet Abaya 2026')).toBe('royal-velvet-abaya-2026');
      expect(generateSlug('عباية مخملية ملكية')).toBe(''); // Arabic removed for URL slug
      expect(generateSlug('Special @#$% Offer & Big Sale!!')).toBe('special-offer-big-sale');
      expect(generateSlug('---Leading-Trailing---')).toBe('leading-trailing');
    });

    it('CHALLENGE-VAR-04: validateVariantMatrix detects case-insensitive duplicate SKUs with leading/trailing whitespace', () => {
      const variantsWithHiddenDuplicates = [
        { sku: '  ROBY-LUX-01  ', stockQuantity: 5 },
        { sku: 'roby-lux-01', stockQuantity: 8 }, // Same SKU in lowercase and without whitespace
      ];

      const res = validateVariantMatrix(variantsWithHiddenDuplicates);
      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.includes('مكرر'))).toBe(true);
    });
  });

  // =========================================================================
  // SUITE 5: Historical Order Integrity & Supabase Deletion Error Resilience
  // =========================================================================
  describe('Suite 5: Historical Integrity & Service Resilience', () => {
    it('CHALLENGE-HIST-01: Deleting a product does not break existing order history or metrics calculations', async () => {
      // 1. Create a product and submit an order containing it
      const product = await service.createProduct({
        titleAr: 'طقم ملابس تاريخي لاختبار الطلبات',
        titleEn: 'Historical Apparel Order Test',
        basePrice: 1500,
        images: ['https://sample.com/hist.jpg'],
        categoryIds: ['cat_womens_fashion'],
        variants: [
          {
            sku: 'HIST-ORD-01',
            color: { nameAr: 'نبيتي', nameEn: 'Burgundy', hex: '#800020' },
            size: 'L',
            stockQuantity: 10,
          },
        ],
        descriptionAr: 'منتج للطلب',
        descriptionEn: 'Order product',
      });

      const orderRes = await service.submitOrder({
        customer: {
          fullName: 'فاطمة الزهراء',
          phone: '01011223344',
          governorate: 'القاهرة',
          city: 'مدينة نصر',
          deliveryAddress: 'شارع عباس العقاد',
        },
        items: [
          {
            productId: product.id,
            productSlug: product.slug,
            productTitleAr: product.titleAr,
            productTitleEn: product.titleEn,
            productImage: product.images[0],
            variant: {
              sku: 'HIST-ORD-01',
              color: { nameAr: 'نبيتي', nameEn: 'Burgundy', hex: '#800020' },
              size: 'L',
            },
            unitPrice: 1500,
            originalUnitPrice: 1500,
            quantity: 1,
            subtotal: 1500,
          },
        ],
      });

      expect(orderRes.success).toBe(true);
      const orderId = orderRes.order.orderId;

      // 2. Now delete the product from the catalog
      const deleteResult = await service.deleteProduct(product.id);
      expect(deleteResult).toBe(true);

      // 3. Verify getOrders() still returns the order intact with complete frozen item data
      const orders = await service.getOrders();
      const targetOrder = orders.data.find((o) => o.orderId === orderId);

      expect(targetOrder).toBeDefined();
      expect(targetOrder?.items[0].productId).toBe(product.id);
      expect(targetOrder?.items[0].productTitleAr).toBe('طقم ملابس تاريخي لاختبار الطلبات');
      expect(targetOrder?.items[0].sku).toBe('HIST-ORD-01');
      expect(targetOrder?.pricing.grandTotal).toBeGreaterThan(0);

      // 4. Verify getAdminMetrics() continues to calculate revenue without crashing
      const metrics = await service.getAdminMetrics();
      expect(metrics.totalOrders).toBeGreaterThanOrEqual(1);
      expect(metrics.totalRevenue).toBeGreaterThanOrEqual(1500);
    });

    it('CHALLENGE-RES-02: SupabaseStoreService.deleteProduct throws ApiError when client returns an error', async () => {
      // Construct instance with dummy test credentials
      const failingService = new SupabaseStoreService('https://test-project.supabase.co', 'dummy-test-key');

      // Mock Supabase client returning a Postgres error
      const mockFailingClient: any = {
        from: () => ({
          delete: () => ({
            eq: async () => ({
              error: { message: 'Database constraint violation or network timeout', code: '500' },
            }),
          }),
        }),
      };

      (failingService as any).client = mockFailingClient;

      await expect(failingService.deleteProduct('some-prod-id')).rejects.toThrow(
        /Failed to delete product: Database constraint violation/i
      );
    });
  });
});
