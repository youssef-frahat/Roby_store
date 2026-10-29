/**
 * Roby Store - Pure Pricing & Stock Math Engine
 * Location: src/utils/pricing.ts
 */

import { Product, ProductVariant, EgyptianGovernorate, GovernorateInfo } from '../types/store';
import { CartItem, CartSummary } from '../types/order';

/**
 * Rounds a number to exactly two decimal places, eliminating IEEE 754 precision artifacts.
 */
export function roundToTwoDecimals(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Calculates effective unit price taking into account base price, promotional discount,
 * and variant-specific price adjustments or overrides.
 */
export function calculateEffectiveUnitPrice(
  product: Product,
  variant?: ProductVariant
): {
  unitPrice: number;
  originalUnitPrice: number;
  hasDiscount: boolean;
  discountPercentage: number;
} {
  // 1. Direct price override on variant takes highest precedence
  if (variant?.priceOverride != null && variant.priceOverride >= 0) {
    const override = roundToTwoDecimals(variant.priceOverride);
    return {
      unitPrice: override,
      originalUnitPrice: override,
      hasDiscount: false,
      discountPercentage: 0,
    };
  }

  const adjustment = variant?.priceAdjustment ?? 0;
  const originalUnitPrice = roundToTwoDecimals(
    Math.max(0, product.basePrice + adjustment)
  );

  // 2. Promotional discount price active (must be strictly lower than basePrice and > 0)
  if (
    product.discountPrice != null &&
    product.discountPrice > 0 &&
    product.discountPrice < product.basePrice
  ) {
    const discountedUnitPrice = roundToTwoDecimals(
      Math.max(0, product.discountPrice + adjustment)
    );
    const savings = Math.max(0, originalUnitPrice - discountedUnitPrice);
    const discountPercentage =
      originalUnitPrice > 0
        ? Math.round((savings / originalUnitPrice) * 100)
        : 0;

    return {
      unitPrice: discountedUnitPrice,
      originalUnitPrice,
      hasDiscount: true,
      discountPercentage,
    };
  }

  // 3. Standard base price with variant adjustment
  return {
    unitPrice: originalUnitPrice,
    originalUnitPrice,
    hasDiscount: false,
    discountPercentage: 0,
  };
}

/**
 * Calculates line item subtotal: unitPrice * quantity
 */
export function calculateLineItemSubtotal(unitPrice: number, quantity: number): number {
  if (quantity <= 0) return 0;
  return roundToTwoDecimals(unitPrice * quantity);
}

/**
 * Calculates complete cart financial totals including savings and shipping fees.
 */
export function calculateCartSummary(
  items: CartItem[],
  governorate?: EgyptianGovernorate,
  governoratesList?: GovernorateInfo[]
): CartSummary {
  let totalItemCount = 0;
  let subtotal = 0;
  let totalSavings = 0;

  for (const item of items) {
    const qty = Math.max(0, item.quantity);
    totalItemCount += qty;

    const lineSubtotal = calculateLineItemSubtotal(item.unitPrice, qty);
    subtotal = roundToTwoDecimals(subtotal + lineSubtotal);

    const originalLineSubtotal = calculateLineItemSubtotal(item.originalUnitPrice, qty);
    const savings = Math.max(0, originalLineSubtotal - lineSubtotal);
    totalSavings = roundToTwoDecimals(totalSavings + savings);
  }

  // Shipping fee determination
  let shippingFee = 0;
  if (items.length > 0 && governorate) {
    if (governoratesList && governoratesList.length > 0) {
      const govInfo = governoratesList.find((g) => g.code === governorate);
      shippingFee = govInfo ? govInfo.shippingFee : 50;
    } else {
      shippingFee = 50;
    }
  }

  const grandTotal = roundToTwoDecimals(subtotal + shippingFee);

  return {
    items,
    totalItemCount,
    subtotal,
    totalSavings,
    shippingFee,
    grandTotal,
    currency: 'EGP',
  };
}

/**
 * Verifies whether an item's quantity can be safely incremented without exceeding stock.
 */
export function canIncrementCartItem(item: CartItem): boolean {
  return item.quantity < item.variant.stockQuantity;
}

/**
 * Clamps a desired quantity to the range [1, stockQuantity] (or 0 if out of stock).
 */
export function clampCartQuantity(desiredQuantity: number, stockQuantity: number): number {
  if (stockQuantity <= 0) return 0;
  if (desiredQuantity <= 0) return 1;
  return Math.min(desiredQuantity, stockQuantity);
}

/**
 * Alias for clampCartQuantity.
 */
export const clampQuantityToStock = clampCartQuantity;

/**
 * Formats a monetary amount into a clean, localized Egyptian Pound display string.
 */
export function formatPrice(amount: number, locale: 'ar-EG' | 'en-US' = 'ar-EG'): string {
  const rounded = roundToTwoDecimals(amount);
  if (locale === 'ar-EG') {
    return `${rounded.toLocaleString('ar-EG')} ج.م`;
  }
  return `${rounded.toLocaleString('en-US')} EGP`;
}
