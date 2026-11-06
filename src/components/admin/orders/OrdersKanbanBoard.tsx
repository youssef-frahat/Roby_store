'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  MessageCircle,
  Printer,
  ChevronRight,
  MoreVertical,
  MoveRight,
  Phone,
  MapPin,
  Package,
} from 'lucide-react';
import { Order, OrderStatus } from '@/types/order';
import { formatEGP } from '@/utils/pricing';
import { buildOrderStatusWhatsAppUrl, buildAdminCustomerWhatsAppUrl } from '@/utils/order';

interface OrdersKanbanBoardProps {
  orders: Order[];
  onStatusChange: (orderId: string, newStatus: OrderStatus) => Promise<void>;
  onSelectOrder: (order: Order) => void;
}

interface KanbanColumnConfig {
  id: OrderStatus;
  title: string;
  statuses: OrderStatus[];
  colorClasses: {
    border: string;
    bg: string;
    headerBg: string;
    text: string;
    badgeBg: string;
  };
  icon: React.ComponentType<{ className?: string }>;
}

const KANBAN_COLUMNS: KanbanColumnConfig[] = [
  {
    id: 'pending_dispatch',
    title: 'جديد / قيد المعالجة',
    statuses: ['pending_dispatch', 'dispatched_whatsapp'],
    colorClasses: {
      border: 'border-amber-200',
      bg: 'bg-amber-50/20',
      headerBg: 'bg-amber-100/60',
      text: 'text-amber-900',
      badgeBg: 'bg-amber-500 text-white',
    },
    icon: Clock,
  },
  {
    id: 'confirmed',
    title: 'تم التأكيد والتجهيز',
    statuses: ['confirmed'],
    colorClasses: {
      border: 'border-blue-200',
      bg: 'bg-blue-50/20',
      headerBg: 'bg-blue-100/60',
      text: 'text-blue-900',
      badgeBg: 'bg-blue-600 text-white',
    },
    icon: CheckCircle2,
  },
  {
    id: 'shipped',
    title: 'مع المندوب / للشحن',
    statuses: ['shipped'],
    colorClasses: {
      border: 'border-indigo-200',
      bg: 'bg-indigo-50/20',
      headerBg: 'bg-indigo-100/60',
      text: 'text-indigo-900',
      badgeBg: 'bg-indigo-600 text-white',
    },
    icon: Truck,
  },
  {
    id: 'delivered',
    title: 'تم التسليم بنجاح',
    statuses: ['delivered'],
    colorClasses: {
      border: 'border-emerald-200',
      bg: 'bg-emerald-50/20',
      headerBg: 'bg-emerald-100/60',
      text: 'text-emerald-900',
      badgeBg: 'bg-emerald-600 text-white',
    },
    icon: CheckCircle2,
  },
  {
    id: 'cancelled_or_returned',
    title: 'ملغي أو مرتجع',
    statuses: ['cancelled_or_returned', 'cancelled'],
    colorClasses: {
      border: 'border-red-200',
      bg: 'bg-red-50/20',
      headerBg: 'bg-red-100/60',
      text: 'text-red-900',
      badgeBg: 'bg-red-600 text-white',
    },
    icon: XCircle,
  },
];

export default function OrdersKanbanBoard({
  orders,
  onStatusChange,
  onSelectOrder,
}: OrdersKanbanBoardProps) {
  const [draggedOrderId, setDraggedOrderId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<OrderStatus | null>(null);

  // Group orders by column
  const getOrdersForColumn = (col: KanbanColumnConfig) => {
    return orders.filter((order) => col.statuses.includes(order.status));
  };

  const handleDragStart = (e: React.DragEvent, orderId: string) => {
    e.dataTransfer.setData('text/plain', orderId);
    setDraggedOrderId(orderId);
  };

  const handleDragEnd = () => {
    setDraggedOrderId(null);
    setDragOverColumnId(null);
  };

  const handleDragOver = (e: React.DragEvent, columnId: OrderStatus) => {
    e.preventDefault();
    if (dragOverColumnId !== columnId) {
      setDragOverColumnId(columnId);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetColumnId: OrderStatus) => {
    e.preventDefault();
    setDragOverColumnId(null);
    const orderId = e.dataTransfer.getData('text/plain') || draggedOrderId;
    if (!orderId) return;

    const draggedOrder = orders.find((o) => o.orderId === orderId);
    if (!draggedOrder) return;

    // Check if status is already within target column statuses
    const targetCol = KANBAN_COLUMNS.find((c) => c.id === targetColumnId);
    if (targetCol && targetCol.statuses.includes(draggedOrder.status)) {
      return;
    }

    await onStatusChange(orderId, targetColumnId);
  };

  return (
    <div className="w-full overflow-x-auto pb-6" dir="rtl">
      <div className="min-w-[1200px] grid grid-cols-5 gap-4 items-start">
        {KANBAN_COLUMNS.map((column) => {
          const colOrders = getOrdersForColumn(column);
          const colTotalRevenue = colOrders.reduce(
            (sum, o) => sum + (o.pricing?.grandTotal || 0),
            0
          );
          const Icon = column.icon;
          const isOver = dragOverColumnId === column.id;

          return (
            <div
              key={column.id}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={() => setDragOverColumnId(null)}
              onDrop={(e) => handleDrop(e, column.id)}
              className={`rounded-3xl border ${
                column.colorClasses.border
              } ${column.colorClasses.bg} flex flex-col min-h-[620px] transition-all duration-200 ${
                isOver ? 'ring-2 ring-[#800020] bg-rose-50/60 shadow-md' : 'shadow-2xs'
              }`}
            >
              {/* Column Header */}
              <div
                className={`p-3.5 rounded-t-3xl border-b ${
                  column.colorClasses.border
                } ${column.colorClasses.headerBg} flex items-center justify-between sticky top-0 z-10 backdrop-blur-xs`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center ${column.colorClasses.badgeBg} shadow-2xs`}
                  >
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className={`text-xs font-bold ${column.colorClasses.text} leading-tight`}>
                      {column.title}
                    </h3>
                    <p className="text-[10px] text-charcoal-500 font-medium">
                      {formatEGP(colTotalRevenue)}
                    </p>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-black ${column.colorClasses.badgeBg}`}
                >
                  {colOrders.length}
                </span>
              </div>

              {/* Cards Container */}
              <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[750px]">
                {colOrders.length === 0 ? (
                  <div className="py-12 px-3 text-center text-charcoal-400 text-xs border-2 border-dashed border-rose-200/60 rounded-2xl">
                    لا توجد طلبات هنا
                  </div>
                ) : (
                  colOrders.map((order) => {
                    const totalQty = order.items.reduce(
                      (sum, it) => sum + it.quantity,
                      0
                    );
                    const whatsAppStatusUrl = buildOrderStatusWhatsAppUrl(
                      order,
                      order.status
                    );
                    const isDragging = draggedOrderId === order.orderId;

                    return (
                      <div
                        key={order.orderId}
                        draggable
                        onDragStart={(e) => handleDragStart(e, order.orderId)}
                        onDragEnd={handleDragEnd}
                        className={`bg-white rounded-2xl p-3.5 border border-rose-100 shadow-2xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing group relative ${
                          isDragging ? 'opacity-40 scale-95' : 'hover:-translate-y-0.5'
                        }`}
                      >
                        {/* Top: Order ID & Date */}
                        <div className="flex items-center justify-between gap-1 pb-2 border-b border-rose-50">
                          <button
                            type="button"
                            onClick={() => onSelectOrder(order)}
                            className="font-mono text-[11px] font-black text-[#800020] hover:underline"
                          >
                            #{order.orderId}
                          </button>
                          <span className="text-[10px] text-charcoal-400 font-medium">
                            {new Date(order.createdAt).toLocaleDateString('ar-EG', {
                              month: 'numeric',
                              day: 'numeric',
                            })}
                          </span>
                        </div>

                        {/* Customer Info */}
                        <div
                          onClick={() => onSelectOrder(order)}
                          className="py-2 space-y-1 cursor-pointer"
                        >
                          <div className="text-xs font-bold text-charcoal-900 group-hover:text-[#800020] transition-colors line-clamp-1">
                            {order.customer.fullName}
                          </div>

                          <div className="flex items-center gap-2 text-[10px] text-charcoal-500 font-medium">
                            <span className="flex items-center gap-0.5 text-rose-800 bg-rose-50 px-1.5 py-0.5 rounded">
                              <MapPin className="w-2.5 h-2.5" />
                              <span>{order.customer.governorate}</span>
                            </span>
                            <span className="truncate max-w-[110px]">{order.customer.city}</span>
                          </div>

                          {/* Items Preview */}
                          <div className="text-[10px] text-charcoal-600 line-clamp-1 pt-1 flex items-center gap-1">
                            <Package className="w-3 h-3 text-[#800020] shrink-0" />
                            <span>
                              {totalQty} قطعة ({order.items[0]?.productTitleAr}
                              {order.items.length > 1 ? ` +${order.items.length - 1}` : ''})
                            </span>
                          </div>
                        </div>

                        {/* Price & Actions Footer */}
                        <div className="pt-2 border-t border-rose-50 flex items-center justify-between gap-2">
                          <div className="text-xs font-serif font-black text-charcoal-900">
                            {formatEGP(order.pricing.grandTotal)}
                          </div>

                          <div className="flex items-center gap-1">
                            {/* 1-Click WhatsApp Status Notification */}
                            <a
                              href={whatsAppStatusUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="إرسال إشعار تحديث الحالة للعميل عبر واتساب"
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-all border border-emerald-200"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>

                            {/* Printable Receipt */}
                            <Link
                              href={`/admin/orders/${order.orderId}/receipt`}
                              target="_blank"
                              title="طباعة الفاتورة"
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-[#800020] transition-all border border-rose-200"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </Link>

                            {/* Quick Move Dropdown (for Touch / Mobile Accessibility) */}
                            <select
                              aria-label="تغيير الحالة"
                              value={order.status}
                              onChange={(e) =>
                                onStatusChange(order.orderId, e.target.value as OrderStatus)
                              }
                              className="text-[10px] font-bold py-1 px-1.5 rounded-lg border border-rose-200 bg-white text-charcoal-700 cursor-pointer focus:outline-none"
                            >
                              {KANBAN_COLUMNS.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.title}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
