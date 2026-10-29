import { describe, it, expect, beforeEach } from 'vitest';
import {
  clampCartQuantity,
  clampQuantityToStock,
  canIncrementCartItem,
} from '../../src/utils/pricing';
import { MockStoreService } from '../../src/services/mockStoreService';
import { CartItem } from '../../src/types/order';

describe('Inventory & Stock Boundary Rules (R2, AC 2)', () => {
  let service: MockStoreService;

  beforeEach(() => {
    service = new MockStoreService(0);
    service.resetSimulation();
  });

  describe('Pure Stock Math Helpers', () => {
    it('clamps desired quantity to the available inventory bounds [1, maxStock]', () => {
      expect(clampCartQuantity(10, 5)).toBe(5);
      expect(clampCartQuantity(3, 5)).toBe(3);
      expect(clampCartQuantity(0, 5)).toBe(1);
      expect(clampCartQuantity(-5, 5)).toBe(1);
      expect(clampCartQuantity(4, 0)).toBe(0);
    });

    it('clampQuantityToStock alias produces identical results to clampCartQuantity', () => {
      expect(clampQuantityToStock(8, 4)).toBe(4);
      expect(clampQuantityToStock(2, 6)).toBe(2);
      expect(clampQuantityToStock(0, 3)).toBe(1);
    });

    it('canIncrementCartItem permits increment only below stockQuantity', () => {
      const item: CartItem = {
        id: 'item_1',
        productId: 'prod_1',
        productSlug: 'slug',
        productTitleAr: 'عنوان',
        productTitleEn: 'Title',
        productImage: '/img.jpg',
        variant: {
          id: 'v1',
          sku: 'SKU1',
          color: { nameAr: 'أسود', nameEn: 'Black', hex: '#000' },
          size: 'M',
          priceAdjustment: 0,
          stockQuantity: 4,
          inStock: true,
        },
        unitPrice: 100,
        originalUnitPrice: 100,
        quantity: 3,
        subtotal: 300,
      };

      expect(canIncrementCartItem(item)).toBe(true);

      item.quantity = 4; // Reached stock limit
      expect(canIncrementCartItem(item)).toBe(false);

      item.quantity = 5; // Exceeded
      expect(canIncrementCartItem(item)).toBe(false);
    });
  });

  describe('Service Pre-Checkout Inventory Validation', () => {
    it('approves orders when all items are within available inventory', async () => {
      const result = await service.validateStock([
        {
          productId: 'prod_abaya_royal_crepe',
          sku: 'ROBY-ABY-01-BLK-M',
          requestedQuantity: 2,
        },
      ]);

      expect(result.isValid).toBe(true);
      expect(result.conflicts).toHaveLength(0);
    });

    it('detects and flags conflict when requested quantity exceeds variant stock', async () => {
      const result = await service.validateStock([
        {
          productId: 'prod_abaya_royal_crepe',
          sku: 'ROBY-ABY-01-BLK-M',
          requestedQuantity: 999,
        },
      ]);

      expect(result.isValid).toBe(false);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].sku).toBe('ROBY-ABY-01-BLK-M');
      expect(result.conflicts[0].availableStock).toBe(6);
      expect(result.conflicts[0].requestedQuantity).toBe(999);
    });

    it('flags conflict for explicitly out-of-stock variant (stockQuantity 0)', async () => {
      const result = await service.validateStock([
        {
          productId: 'prod_abaya_royal_crepe',
          sku: 'ROBY-ABY-01-EMR-L', // Out of stock variant
          requestedQuantity: 1,
        },
      ]);

      expect(result.isValid).toBe(false);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].availableStock).toBe(0);
    });
  });

  describe('Order Placement & In-Memory Stock Decrement', () => {
    it('decrements stock upon successful order submission', async () => {
      const initialProduct = await service.getProductById('prod_abaya_royal_crepe');
      const variant = initialProduct!.variants.find((v) => v.sku === 'ROBY-ABY-01-BLK-M')!;
      const initialStock = variant.stockQuantity;

      const orderResult = await service.submitOrder({
        customer: {
          fullName: 'فاطمة محمد علي',
          phone: '01012345678',
          governorate: 'Cairo',
          city: 'مدينة نصر',
          deliveryAddress: 'شارع عباس العقاد عمارة 10',
        },
        items: [
          {
            id: 'prod_abaya_royal_crepe__ROBY-ABY-01-BLK-M',
            productId: 'prod_abaya_royal_crepe',
            productSlug: 'royal-embroidered-crepe-abaya',
            productTitleAr: 'عباية كريب رويال',
            productTitleEn: 'Royal Crepe Abaya',
            productImage: '',
            variant: { ...variant },
            unitPrice: 950,
            originalUnitPrice: 1250,
            quantity: 2,
            subtotal: 1900,
          },
        ],
      });

      expect(orderResult.success).toBe(true);

      const updatedProduct = await service.getProductById('prod_abaya_royal_crepe');
      const updatedVariant = updatedProduct!.variants.find((v) => v.sku === 'ROBY-ABY-01-BLK-M')!;
      expect(updatedVariant.stockQuantity).toBe(initialStock - 2);
    });
  });
});
