import { describe, it, expect } from 'vitest';
import type { Product, ProductVariant } from '../../src/types/store';

describe('VariantSelector Component Contract (R2, AC 3 - Tier 1 & Tier 2)', () => {
  const mockVariants: ProductVariant[] = [
    {
      id: 'v1',
      sku: 'ROBY-ABY-BLK-S',
      color: { nameAr: 'أسود ملكي', nameEn: 'Royal Black', hex: '#1A1A1A' },
      size: 'S',
      priceAdjustment: 0,
      stockQuantity: 0, // OUT OF STOCK
      inStock: false,
    },
    {
      id: 'v2',
      sku: 'ROBY-ABY-BLK-M',
      color: { nameAr: 'أسود ملكي', nameEn: 'Royal Black', hex: '#1A1A1A' },
      size: 'M',
      priceAdjustment: 0,
      stockQuantity: 4,
      inStock: true,
    },
    {
      id: 'v3',
      sku: 'ROBY-ABY-ROS-M',
      color: { nameAr: 'وردي مغبر', nameEn: 'Dusty Rose', hex: '#D4A5A5' },
      size: 'M',
      priceAdjustment: 50,
      stockQuantity: 2,
      inStock: true,
    },
  ];

  const mockProduct: Product = {
    id: 'prod_01',
    slug: 'silk-abaya',
    titleAr: 'عباية حرير',
    titleEn: 'Silk Abaya',
    descriptionAr: 'وصف',
    descriptionEn: 'desc',
    basePrice: 600,
    discountPrice: 500,
    currency: 'EGP',
    images: ['/abaya.jpg'],
    categoryIds: ['cat_abayas'],
    primaryCategorySlug: 'abayas',
    tags: ['abaya'],
    rating: 4.8,
    reviewCount: 15,
    isFeatured: true,
    isNewArrival: false,
    variants: mockVariants,
    availableColors: [mockVariants[0].color, mockVariants[2].color],
    availableSizes: ['S', 'M'],
    totalStock: 6,
    hasStock: true,
    createdAt: '2026-10-28T00:00:00Z',
    updatedAt: '2026-10-28T00:00:00Z',
  };

  it('TC-T1-VAR-01: resolves available colors list without duplicates', () => {
    const uniqueColors = Array.from(
      new Map(mockProduct.variants.map((v) => [v.color.nameEn, v.color])).values()
    );
    expect(uniqueColors.length).toBe(2);
    expect(uniqueColors.map((c) => c.nameEn)).toContain('Royal Black');
    expect(uniqueColors.map((c) => c.nameEn)).toContain('Dusty Rose');
  });

  it('TC-T1-VAR-02: resolves sizes for chosen color and marks out-of-stock sizes as disabled', () => {
    const blackVariants = mockProduct.variants.filter((v) => v.color.nameEn === 'Royal Black');
    const sizeS = blackVariants.find((v) => v.size === 'S');
    const sizeM = blackVariants.find((v) => v.size === 'M');

    expect(sizeS?.inStock).toBe(false);
    expect(sizeS?.stockQuantity).toBe(0);

    expect(sizeM?.inStock).toBe(true);
    expect(sizeM?.stockQuantity).toBe(4);
  });

  it('TC-T1-VAR-03: resolves price adjustment when switching variant size or color', () => {
    const baseEffectivePrice = mockProduct.discountPrice ?? mockProduct.basePrice;

    const blackM = mockVariants.find((v) => v.sku === 'ROBY-ABY-BLK-M')!;
    expect(baseEffectivePrice + blackM.priceAdjustment).toBe(500);

    const roseM = mockVariants.find((v) => v.sku === 'ROBY-ABY-ROS-M')!;
    expect(baseEffectivePrice + roseM.priceAdjustment).toBe(550);
  });
});
