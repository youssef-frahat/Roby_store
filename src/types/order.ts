/**
 * Roby Store - Cart & Social Commerce Order Type Definitions
 * Location: src/types/order.ts
 */

import { ProductVariant, EgyptianGovernorate } from './store';

// ==========================================
// 1. Shopping Cart Models
// ==========================================

export interface CartItem {
  /** Deterministic composite key: `${productId}__${variant.sku}` */
  id: string;
  productId: string;
  productSlug: string;
  productTitleAr: string;
  productTitleEn: string;
  productImage: string;
  variant: ProductVariant;
  /** Effective unit price charged in EGP (includes discount and variant adjustment) */
  unitPrice: number;
  /** Original unit price before discount (for savings calculation) */
  originalUnitPrice: number;
  /** Selected quantity */
  quantity: number;
  /** Line item subtotal: unitPrice * quantity (rounded to 2 decimal places) */
  subtotal: number;
  /** Optional SKU shortcut */
  sku?: string;
  /** Optional max stock shortcut */
  maxStock?: number;
}

export interface CartSummary {
  items: CartItem[];
  totalItemCount: number;
  subtotal: number;
  totalSavings: number;
  shippingFee: number;
  grandTotal: number;
  currency: 'EGP';
}

// ==========================================
// 2. Customer Checkout Models
// ==========================================

export interface CustomerDetails {
  /** Full customer name (min 3 chars) */
  fullName: string;
  /** Primary Egyptian mobile number (010/011/012/015) */
  phone: string;
  /** Optional secondary contact number */
  alternativePhone?: string;
  /** Selected governorate */
  governorate: EgyptianGovernorate;
  /** City or neighborhood (e.g. "مدينة نصر", "سموحة") */
  city: string;
  /** Full detailed street address (street, building, floor, apartment) */
  deliveryAddress: string;
  /** Optional customer delivery instructions */
  notes?: string;
}

// ==========================================
// 3. Immutable Order Models
// ==========================================

export type OrderStatus =
  | 'pending_dispatch'
  | 'dispatched_whatsapp'
  | 'confirmed'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'cancelled_or_returned';

export type DispatchChannel = 'whatsapp' | 'instagram' | 'facebook' | 'web';

export interface OrderItem {
  productId: string;
  productSlug: string;
  productTitleAr: string;
  productTitleEn: string;
  productImage: string;
  sku: string;
  colorNameAr: string;
  colorNameEn: string;
  colorHex: string;
  size: string;
  unitPrice: number;
  originalUnitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface OrderPricingSummary {
  subtotal: number;
  shippingFee: number;
  totalSavings: number;
  grandTotal: number;
  currency: 'EGP';
}

export interface Order {
  /** Unique human-friendly order reference: "ROBY-YYYYMMDD-XXXX" */
  orderId: string;
  createdAt: string;
  customer: CustomerDetails;
  items: OrderItem[];
  pricing: OrderPricingSummary;
  status: OrderStatus;
  dispatchChannel: DispatchChannel;
  formattedSocialMessage: string;
  whatsappDirectUrl: string;
}

export interface CreateOrderPayload {
  customer: CustomerDetails;
  items: CartItem[];
  dispatchChannel?: DispatchChannel;
}

export interface OrderSubmitResult {
  success: boolean;
  order: Order;
  whatsappUrl: string;
  formattedMessage: string;
  errorMessage?: string;
}
