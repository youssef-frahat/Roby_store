/**
 * Roby Store - Zustand Shopping Cart Store
 * Location: src/store/useCartStore.ts
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Product, ProductVariant } from '../types/store';
import { CartItem } from '../types/order';
import {
  calculateEffectiveUnitPrice,
  calculateLineItemSubtotal,
  clampCartQuantity,
  roundToTwoDecimals,
} from '../utils/pricing';

export interface CartStore {
  items: CartItem[];
  addItem: (product: Product, variant: ProductVariant, quantity: number) => boolean;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getItemCount: () => number;
  getSubtotal: () => number;
  getTotalDiscount: () => number;
  getGrandTotal: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product: Product, variant: ProductVariant, quantity: number) => {
        // Enforce stock boundary
        if (!variant || variant.stockQuantity <= 0 || !variant.inStock) {
          return false;
        }

        const requestedQty = Math.max(1, quantity);
        const compositeId = `${product.id}__${variant.sku}`;
        const existingItem = get().items.find((item) => item.id === compositeId);

        const currentQty = existingItem ? existingItem.quantity : 0;
        const newTotalQty = currentQty + requestedQty;

        if (newTotalQty > variant.stockQuantity) {
          return false;
        }

        const pricing = calculateEffectiveUnitPrice(product, variant);
        const unitPrice = pricing.unitPrice;
        const originalUnitPrice = pricing.originalUnitPrice;

        if (existingItem) {
          const updatedSubtotal = calculateLineItemSubtotal(unitPrice, newTotalQty);
          set((state) => ({
            items: state.items.map((item) =>
              item.id === compositeId
                ? {
                    ...item,
                    quantity: newTotalQty,
                    subtotal: updatedSubtotal,
                  }
                : item
            ),
          }));
        } else {
          const subtotal = calculateLineItemSubtotal(unitPrice, requestedQty);
          const newItem: CartItem = {
            id: compositeId,
            productId: product.id,
            productSlug: product.slug,
            productTitleAr: product.titleAr,
            productTitleEn: product.titleEn,
            productImage:
              variant.variantImageUrl || product.images[0] || '/images/placeholder.jpg',
            variant: { ...variant },
            unitPrice,
            originalUnitPrice,
            quantity: requestedQty,
            subtotal,
            sku: variant.sku,
            maxStock: variant.stockQuantity,
          };

          set((state) => ({
            items: [...state.items, newItem],
          }));
        }

        return true;
      },

      removeItem: (itemId: string) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== itemId),
        }));
      },

      updateQuantity: (itemId: string, quantity: number) => {
        if (quantity <= 0) {
          get().removeItem(itemId);
          return;
        }

        const currentItem = get().items.find((item) => item.id === itemId);
        if (!currentItem) return;

        const clampedQty = clampCartQuantity(quantity, currentItem.variant.stockQuantity);
        if (clampedQty <= 0) {
          get().removeItem(itemId);
          return;
        }

        set((state) => ({
          items: state.items.map((item) => {
            if (item.id === itemId) {
              const subtotal = calculateLineItemSubtotal(item.unitPrice, clampedQty);
              return {
                ...item,
                quantity: clampedQty,
                subtotal,
              };
            }
            return item;
          }),
        }));
      },


      clearCart: () => {
        set({ items: [] });
      },

      getItemCount: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      getSubtotal: () => {
        const sum = get().items.reduce((total, item) => total + item.subtotal, 0);
        return roundToTwoDecimals(sum);
      },

      getTotalDiscount: () => {
        const sum = get().items.reduce((total, item) => {
          const savingsPerUnit = Math.max(0, item.originalUnitPrice - item.unitPrice);
          return total + savingsPerUnit * item.quantity;
        }, 0);
        return roundToTwoDecimals(sum);
      },

      getGrandTotal: () => {
        return get().getSubtotal();
      },
    }),
    {
      name: 'roby-cart-storage',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? window.localStorage : (null as any)
      ),
    }
  )
);
