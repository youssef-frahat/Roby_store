'use client';

import React from 'react';
import Link from 'next/link';
import {
  Eye,
  Printer,
  MessageCircle,
  Phone,
  Package,
  Calendar,
  AlertCircle,
  ArrowUpDown,
} from 'lucide-react';
import { Order, OrderStatus } from '@/types/order';
import { buildAdminCustomerWhatsAppUrl } from '@/utils/order';
import OrderStatusBadge from './OrderStatusBadge';
import OrderStatusSelector from './OrderStatusSelector';

interface OrdersTableProps {
  orders: Order[];
  isLoading: boolean;
  onViewOrder: (order: Order) => void;
  onStatusChange: (orderId: string, newStatus: OrderStatus) => Promise<void> | void;
}

export default function OrdersTable({
  orders,
  isLoading,
  onViewOrder,
  onStatusChange,
}: OrdersTableProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl border border-rose-100 shadow-2xs overflow-hidden p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-rose-50/60 rounded-xl" />
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 bg-rose-50/30 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-rose-100 shadow-2xs p-12 text-center space-y-3">
        <div className="w-14 h-14 rounded-full bg-rose-50 text-[#800020] mx-auto flex items-center justify-center">
          <Package className="w-7 h-7" />
        </div>
        <h3 className="font-serif font-black text-base text-charcoal-900">
          لا توجد طلبات مطابقة للبحث أو الفلتر
        </h3>
        <p className="text-xs text-charcoal-500 max-w-sm mx-auto">
          جرب تغيير معايير البحث أو اختيار محافظة أخرى أو إعادة ضبط الفلاتر لعرض كافة الطلبات.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-rose-100 shadow-2xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-start text-xs border-collapse">
          <thead>
            <tr className="bg-rose-50/60 border-b border-rose-100 text-charcoal-700 font-bold uppercase tracking-wider text-[11px]">
              <th scope="col" className="px-4 py-3.5 text-start">
                كود الطلب
              </th>
              <th scope="col" className="px-4 py-3.5 text-start">
                العميل
              </th>
              <th scope="col" className="px-4 py-3.5 text-start">
                المحافظة والمدينة
              </th>
              <th scope="col" className="px-4 py-3.5 text-start">
                الأصناف
              </th>
              <th scope="col" className="px-4 py-3.5 text-start">
                الإجمالي
              </th>
              <th scope="col" className="px-4 py-3.5 text-start">
                حالة الطلب
              </th>
              <th scope="col" className="px-4 py-3.5 text-start">
                تاريخ الطلب
              </th>
              <th scope="col" className="px-4 py-3.5 text-center">
                الإجراءات
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rose-50">
            {orders.map((order) => {
              const whatsAppUrl = buildAdminCustomerWhatsAppUrl(order);
              const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

              return (
                <tr
                  key={order.orderId}
                  className="hover:bg-rose-50/30 transition-colors group"
                >
                  {/* Order ID */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <button
                      onClick={() => onViewOrder(order)}
                      className="font-mono font-bold text-[#800020] hover:underline focus:outline-none text-xs block"
                      title="عرض تفاصيل الطلب"
                    >
                      #{order.orderId}
                    </button>
                    <span className="text-[10px] text-charcoal-400 uppercase font-medium">
                      {order.dispatchChannel}
                    </span>
                  </td>

                  {/* Customer */}
                  <td className="px-4 py-3.5">
                    <div className="font-bold text-charcoal-900 truncate max-w-[150px]">
                      {order.customer.fullName}
                    </div>
                    <a
                      href={`tel:${order.customer.phone}`}
                      className="text-[11px] text-charcoal-500 hover:text-[#800020] flex items-center gap-1 mt-0.5"
                      dir="ltr"
                    >
                      <Phone className="w-3 h-3 text-charcoal-400" />
                      <span>{order.customer.phone}</span>
                    </a>
                  </td>

                  {/* Governorate & City */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="font-bold text-charcoal-800">
                      {order.customer.governorate}
                    </div>
                    <div className="text-[11px] text-charcoal-500 truncate max-w-[130px]">
                      {order.customer.city}
                    </div>
                  </td>

                  {/* Items Count */}
                  <td className="px-4 py-3.5 whitespace-nowrap text-charcoal-600 font-medium">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-50 text-charcoal-700 font-bold text-[11px]">
                      {itemCount} قطع ({order.items.length} صنف)
                    </span>
                  </td>

                  {/* Grand Total */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span className="font-serif font-black text-sm text-charcoal-900 block">
                      {order.pricing.grandTotal} ج.م
                    </span>
                    {order.pricing.totalSavings > 0 && (
                      <span className="text-[10px] text-emerald-700 font-medium block">
                        توفير: {order.pricing.totalSavings} ج.م
                      </span>
                    )}
                  </td>

                  {/* Order Status Selector */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <OrderStatusSelector
                      currentStatus={order.status}
                      onStatusChange={(newStatus) => onStatusChange(order.orderId, newStatus)}
                      size="sm"
                    />
                  </td>

                  {/* Created At */}
                  <td className="px-4 py-3.5 whitespace-nowrap text-[11px] text-charcoal-500 font-medium">
                    {new Date(order.createdAt).toLocaleDateString('ar-EG', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                    <span className="block text-[10px] text-charcoal-400">
                      {new Date(order.createdAt).toLocaleTimeString('ar-EG', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3.5 whitespace-nowrap text-center">
                    <div className="inline-flex items-center gap-1.5">
                      {/* View Drawer Button */}
                      <button
                        onClick={() => onViewOrder(order)}
                        className="p-1.5 rounded-lg text-charcoal-500 hover:text-[#800020] hover:bg-rose-50 transition-colors focus:outline-none"
                        title="عرض تفاصيل الطلب بالكامل"
                        aria-label={`عرض تفاصيل الطلب ${order.orderId}`}
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Direct WhatsApp Button */}
                      <a
                        href={whatsAppUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                        title="محادثة العميل عبر واتساب"
                        aria-label={`محادثة العميل ${order.customer.fullName} عبر واتساب`}
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>

                      {/* Print Receipt Button */}
                      <Link
                        href={`/admin/orders/${order.orderId}/receipt`}
                        className="p-1.5 rounded-lg text-charcoal-500 hover:text-[#800020] hover:bg-rose-50 transition-colors"
                        title="طباعة الفاتورة وإيصال الشحن PDF"
                        aria-label={`طباعة فاتورة الطلب ${order.orderId}`}
                      >
                        <Printer className="w-4 h-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
