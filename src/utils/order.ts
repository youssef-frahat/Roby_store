/**
 * Roby Store - Social Commerce Receipt & WhatsApp Dispatch Engine
 * Location: src/utils/order.ts
 */

import { Order, OrderStatus } from '../types/order';

/**
 * Generates human-readable, deterministic order references (e.g. ROBY-20261028-4821)
 */
export function generateOrderId(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString();
  return `ROBY-${dateStr}-${randomSuffix}`;
}

/**
 * Formats structured, itemized Arabic receipt message with emojis for social commerce.
 */
export function formatOrderReceiptMessage(order: Order): string {
  const { orderId, customer, items, pricing } = order;

  const itemLines = items
    .map(
      (item, idx) =>
        `${idx + 1}. *${item.productTitleAr}*\n` +
        `   • المقاس: ${item.size} | اللون: ${item.colorNameAr}\n` +
        `   • الكمية: ${item.quantity} × ${item.unitPrice} ج.م = *${item.subtotal} ج.م*\n` +
        `   • كود: \`${item.sku}\``
    )
    .join('\n\n');

  const savingsLine =
    pricing.totalSavings > 0
      ? `🎉 *إجمالي التوفير في هذا الطلب:* ${pricing.totalSavings} ج.م\n`
      : '';

  const notesLine = customer.notes ? `📝 *ملاحظات:* ${customer.notes}\n` : '';
  const altPhoneLine = customer.alternativePhone
    ? `📞 *رقم بديل:* ${customer.alternativePhone}\n`
    : '';

  return (
    `🛍️ *طلب جديد من متجر روبي - Roby Store*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🔖 *رقم الطلب:* #${orderId}\n` +
    `📅 *التاريخ:* ${new Date(order.createdAt).toLocaleDateString('ar-EG')}\n\n` +
    `👤 *بيانات العميل:*\n` +
    `• الاسم: ${customer.fullName}\n` +
    `• رقم الهاتف: ${customer.phone}\n` +
    altPhoneLine +
    `• المحافظة: ${customer.governorate}\n` +
    `• المنطقة / المدينة: ${customer.city}\n` +
    `• العنوان بالتفصيل: ${customer.deliveryAddress}\n` +
    notesLine +
    `\n📦 *تفاصيل المنتجات:*\n` +
    itemLines +
    `\n\n━━━━━━━━━━━━━━━━━━━━━━\n` +
    `💵 *الملخص المالي:*\n` +
    `• إجمالي المنتجات: ${pricing.subtotal} ج.م\n` +
    `• مصاريف الشحن (${customer.governorate}): ${pricing.shippingFee} ج.م\n` +
    savingsLine +
    `⭐ *الإجمالي النهائي المطلوب دَفعه:* *${pricing.grandTotal} ج.م*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `شكراً لتسوقك من روبي ستور! يرجى إرسال هذه الرسالة لتأكيد وتجهيز طلبك فوراً.`
  );
}

/**
 * Builds valid WhatsApp wa.me Click-to-Chat direct URL.
 */
export function buildWhatsAppOrderUrl(
  merchantPhone: string,
  formattedMessage: string
): string {
  // Strip non-digits
  let cleanPhone = merchantPhone.replace(/\D/g, '');

  // Normalize Egyptian phone numbers (if starting with 0020, remove 00)
  if (cleanPhone.startsWith('0020')) {
    cleanPhone = cleanPhone.slice(2);
  } else if (cleanPhone.startsWith('01') && cleanPhone.length === 11) {
    cleanPhone = `2${cleanPhone}`;
  }

  const encodedText = encodeURIComponent(formattedMessage);
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}

/**
 * Quick-copy plain text format for Instagram Direct / Facebook Messenger.
 */
export function formatSocialOrderSummary(order: Order): string {
  return formatOrderReceiptMessage(order);
}

/**
 * Builds direct WhatsApp Click-to-Chat URL for Admin-to-Customer communication regarding an existing order.
 * Normalizes customer Egyptian phone (01... -> 201...) and constructs a tailored greeting message.
 */
export function buildAdminCustomerWhatsAppUrl(order: Order): string {
  const customerPhone = order.customer.phone;
  const itemsCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  const message =
    `مرحباً ${order.customer.fullName} 👋🌸\n` +
    `معاكِ خدمة عملاء متجر روبي ستور (ROBY STORE).\n` +
    `بخصوص طلبك المسجل لدينا برقم: #${order.orderId}\n` +
    `عدد المنتجات: (${itemsCount} قطع) بإجمالي: ${order.pricing.grandTotal} ج.م\n` +
    `العنوان: ${order.customer.governorate} - ${order.customer.city}\n\n` +
    `نود التأكيد معكِ بشأن تفاصيل وموعد شحن الطلب...`;

  return buildWhatsAppOrderUrl(customerPhone, message);
}

/**
 * Builds tailored 1-Click WhatsApp status update messages for customer notification
 * across each stage of order fulfillment (Confirmed, Shipped, Delivered, Cancelled/Returned).
 */
export function buildOrderStatusWhatsAppUrl(order: Order, targetStatus: OrderStatus): string {
  const customerPhone = order.customer.phone;
  const { fullName, governorate } = order.customer;
  const { orderId, pricing } = order;

  let body = '';
  switch (targetStatus) {
    case 'confirmed':
      body =
        `مرحباً ${fullName} 👋🌸✨\n` +
        `يسعدنا إبلاغكِ بأنه تم تأكيد وتجهيز طلبكِ رقم: #${orderId} بنجاح لدى روبي ستور (ROBY STORE).\n` +
        `💵 إجمالي الطلب: ${pricing.grandTotal} ج.م.\n` +
        `📦 يتم الآن تغليف المنتجات بعناية لتسليمها لشركة الشحن.\n\n` +
        `شكراً لثقتكِ بروبي ستور!`;
      break;

    case 'shipped':
      body =
        `مرحباً ${fullName} 🚚📦\n` +
        `شحنتكِ من متجر روبي ستور برقم: #${orderId} الآن مع مندوب التوصيل وفي طريقها إليكِ بمحافظة ${governorate}.\n` +
        `💵 المبلغ المطلوب سداده عند الاستلام: ${pricing.grandTotal} ج.م.\n` +
        `📱 يرجى إبقاء الهاتف متاحاً لسهولة تواصل المندوب معكِ.\n\n` +
        `نتمنى لكِ يوماً سعيداً!`;
      break;

    case 'delivered':
      body =
        `مرحباً ${fullName} 🎉💖\n` +
        `تم تسليم طلبكِ رقم: #${orderId} بنجاح!\n` +
        `سعدنا جداً بخدمتكِ ونتمنى أن تنال منتجات روبي ستور إعجابك ورضاكِ تماماً.\n` +
        `🌸 يسعدنا دائماً مشاركتنا رأيكِ وتجربتكِ عبر المتجر أو الواتساب.`;
      break;

    case 'cancelled':
    case 'cancelled_or_returned':
      body =
        `مرحباً ${fullName} 👋🌸\n` +
        `بخصوص طلبكِ رقم: #${orderId} لدى متجر روبي ستور، نود إعلامكِ بأنه تم تحديث حالة الطلب إلى (ملغي / مرتجع).\n` +
        `إذا كان لديكِ أي استفسار أو رغبة في استبدال أو إعادة الطلب، يسعدنا دائماً خدمتكِ في أي وقت.`;
      break;

    case 'pending_dispatch':
    case 'dispatched_whatsapp':
    default:
      body =
        `مرحباً ${fullName} 👋🌸\n` +
        `تم تسجيل طلبكِ رقم: #${orderId} لدى متجر روبي ستور، وجاري مراجعته من قبل فريق العمل.\n` +
        `💵 إجمالي الطلب: ${pricing.grandTotal} ج.م.\n` +
        `سنتواصل معكِ فور بدء التجهيز!`;
      break;
  }

  return buildWhatsAppOrderUrl(customerPhone, body);
}


