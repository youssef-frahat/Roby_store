'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShoppingBag,
  Clock,
  Truck,
  Coins,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  LayoutGrid,
  ListFilter,
} from 'lucide-react';
import { Order, OrderStatus } from '@/types/order';
import { getStoreService } from '@/services/storeService';
import OrdersTable from '@/components/admin/orders/OrdersTable';
import OrderFiltersBar from '@/components/admin/orders/OrderFiltersBar';
import OrderDetailsDrawer from '@/components/admin/orders/OrderDetailsDrawer';
import OrdersKanbanBoard from '@/components/admin/orders/OrdersKanbanBoard';

interface ToastFeedback {
  type: 'success' | 'error';
  message: string;
}

export default function AdminOrdersPage(props: {
  params?: Record<string, string | string[]>;
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const searchParams = props?.searchParams;
  const initialView = searchParams?.view === 'kanban' ? 'kanban' : 'table';
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [feedback, setFeedback] = useState<ToastFeedback | null>(null);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>(initialView);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [governorateFilter, setGovernorateFilter] = useState<string | 'all'>('all');

  // Drawer State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Auto-dismiss toast
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => {
        setFeedback(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Load orders from StoreService
  const loadOrders = useCallback(async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const service = getStoreService();
      // Fetch up to 100 orders for comprehensive admin overview
      const response = await service.getOrders({ pageSize: 100 });
      setOrders(response.data);

      if (isManualRefresh) {
        setFeedback({
          type: 'success',
          message: 'تم تحديث قائمة الطلبات بنجاح من قاعدة البيانات',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `تعذر تحميل الطلبات: ${err?.message || 'حدث خطأ غير متوقع'}`,
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Handle Real Status Mutation
  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    const previousOrders = [...orders];
    const targetOrder = orders.find((o) => o.orderId === orderId);
    if (!targetOrder || targetOrder.status === newStatus) return;

    // 1. Optimistic UI update
    setOrders((prev) =>
      prev.map((o) => (o.orderId === orderId ? { ...o, status: newStatus } : o))
    );
    if (selectedOrder && selectedOrder.orderId === orderId) {
      setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
    }

    // 2. Real persistent mutation
    try {
      const service = getStoreService();
      const updatedOrder = await service.updateOrderStatus(orderId, newStatus);

      // Re-sync with authoritative returned order
      setOrders((prev) =>
        prev.map((o) => (o.orderId === orderId ? updatedOrder : o))
      );
      if (selectedOrder && selectedOrder.orderId === orderId) {
        setSelectedOrder(updatedOrder);
      }

      setFeedback({
        type: 'success',
        message: `تم تحديث حالة الطلب #${orderId} بنجاح إلى "${newStatus}"`,
      });
    } catch (err: any) {
      // Rollback on error
      setOrders(previousOrders);
      if (selectedOrder && selectedOrder.orderId === orderId) {
        setSelectedOrder(targetOrder);
      }
      setFeedback({
        type: 'error',
        message: `تعذر تحديث حالة الطلب: ${err?.message || 'فشلت عملية الحفظ'}`,
      });
    }
  };

  // Open details drawer
  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsDrawerOpen(true);
  };

  // Close details drawer
  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedOrder(null);
  };

  // Filtered orders computation
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Status filter
      if (statusFilter !== 'all' && order.status !== statusFilter) {
        return false;
      }

      // Governorate filter
      if (governorateFilter !== 'all' && order.customer.governorate !== governorateFilter) {
        return false;
      }

      // Search query across ID, customer name, and phone
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesId = order.orderId.toLowerCase().includes(q);
        const matchesName = order.customer.fullName.toLowerCase().includes(q);
        const matchesPhone = order.customer.phone.includes(q);
        if (!matchesId && !matchesName && !matchesPhone) {
          return false;
        }
      }

      return true;
    });
  }, [orders, statusFilter, governorateFilter, searchQuery]);

  // Dynamic KPI Metrics (Zero Facades — computed directly from real dataset)
  const kpiMetrics = useMemo(() => {
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(
      (o) => o.status === 'pending_dispatch' || o.status === 'dispatched_whatsapp'
    ).length;
    const activeDeliveryOrders = orders.filter(
      (o) => o.status === 'confirmed' || o.status === 'shipped'
    ).length;
    // Calculate revenue from non-cancelled orders
    const totalRevenue = orders
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + (o.pricing?.grandTotal || 0), 0);

    return {
      totalOrders,
      pendingOrders,
      activeDeliveryOrders,
      totalRevenue,
    };
  }, [orders]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setGovernorateFilter('all');
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black font-serif text-charcoal-900 tracking-wide">
            إدارة الطلبات
          </h1>
          <p className="text-xs text-charcoal-500 font-medium mt-1">
            لوحة التحكم المركزية لمتابعة ومعالجة كافة طلبات متجر روبي وتحديث الحالات لحظياً
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle: Kanban vs Table */}
          <div className="flex items-center bg-white p-1 rounded-2xl border border-rose-200 shadow-2xs">
            <button
              onClick={() => setViewMode('kanban')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === 'kanban'
                  ? 'bg-[#800020] text-white shadow-xs'
                  : 'text-charcoal-600 hover:text-charcoal-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>لوحة كانبان</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === 'table'
                  ? 'bg-[#800020] text-white shadow-xs'
                  : 'text-charcoal-600 hover:text-charcoal-900'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>جدول تفصيلي</span>
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => loadOrders(true)}
            disabled={isLoading || isRefreshing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-rose-200 text-charcoal-700 hover:text-[#800020] hover:bg-rose-50/50 text-xs font-bold transition-all shadow-2xs disabled:opacity-60"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#800020]' : ''}`}
            />
            <span>{isRefreshing ? 'تحديث' : 'تحديث البيانات'}</span>
          </button>
        </div>
      </div>

      {/* Toast Feedback Notification */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between gap-3 transition-all animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="p-1 text-charcoal-400 hover:text-charcoal-700"
            aria-label="إغلاق التنبيه"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4 KPI Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Orders */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-rose-100 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-charcoal-500 uppercase tracking-wider">
              إجمالي الطلبات
            </div>
            <div className="text-2xl font-black font-serif text-charcoal-900 mt-1">
              {kpiMetrics.totalOrders}
            </div>
            <div className="text-[10px] text-charcoal-400 mt-0.5">
              مسجلة في قاعدة البيانات
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-[#800020] flex items-center justify-center shrink-0">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Pending Dispatch */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-rose-100 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-charcoal-500 uppercase tracking-wider">
              طلبات جديدة وقيد التجهيز
            </div>
            <div className="text-2xl font-black font-serif text-amber-700 mt-1">
              {kpiMetrics.pendingOrders}
            </div>
            <div className="text-[10px] text-amber-600 font-bold mt-0.5">
              تتطلب المراجعة والتأكيد
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: In Delivery / Confirmed */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-rose-100 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-charcoal-500 uppercase tracking-wider">
              طلبات جارية ومؤكدة
            </div>
            <div className="text-2xl font-black font-serif text-indigo-700 mt-1">
              {kpiMetrics.activeDeliveryOrders}
            </div>
            <div className="text-[10px] text-indigo-600 font-bold mt-0.5">
              مؤكدة أو مع شركة الشحن
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
            <Truck className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Total Revenue */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-rose-100 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-charcoal-500 uppercase tracking-wider">
              إجمالي المبيعات المحققة
            </div>
            <div className="text-2xl font-black font-serif text-[#800020] mt-1">
              {kpiMetrics.totalRevenue.toLocaleString('ar-EG')} <span className="text-xs font-sans font-bold">ج.م</span>
            </div>
            <div className="text-[10px] text-charcoal-400 mt-0.5">
              باستثناء الطلبات الملغاة
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <Coins className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Multi-Criteria Filters Bar */}
      <OrderFiltersBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        governorateFilter={governorateFilter}
        onGovernorateChange={setGovernorateFilter}
        totalFilteredCount={filteredOrders.length}
        totalOrdersCount={orders.length}
        onResetFilters={handleResetFilters}
      />

      {/* Interactive Orders View (Kanban Board or Detailed Table) */}
      {viewMode === 'kanban' ? (
        <OrdersKanbanBoard
          orders={filteredOrders}
          onStatusChange={handleStatusChange}
          onSelectOrder={handleViewOrder}
        />
      ) : (
        <OrdersTable
          orders={filteredOrders}
          isLoading={isLoading}
          onViewOrder={handleViewOrder}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* Slide-over Order Details Drawer */}
      <OrderDetailsDrawer
        order={selectedOrder}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
