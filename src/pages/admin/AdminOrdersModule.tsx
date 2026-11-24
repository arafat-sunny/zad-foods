import React, { useMemo, useState } from 'react';
import {
  Eye,
  Mail,
  MessageSquare,
  Printer,
  Save,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import {
  formatBDT,
  formatFirestoreDate,
  ORDER_STATUS_META,
} from '../../lib/i18n';
import {
  deleteInquiry,
  updateInquiryStatus,
  updateOrderByAdmin,
} from '../../lib/firestoreService';
import type { Inquiry, Order, OrderStatus, PaymentStatus } from '../../types';

const ALL_STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'ready_to_ship',
  'shipped',
  'delivered',
  'cancelled',
  'returned',
];

export default function AdminOrdersModule({
  orders,
  inquiries,
  mode,
}: {
  orders: Order[];
  inquiries: Inquiry[];
  mode: 'orders' | 'customers' | 'inquiries';
}) {
  const { allProductsAdmin, settings, notify } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editStatus, setEditStatus] = useState<OrderStatus>('pending');
  const [editPaymentStatus, setEditPaymentStatus] = useState<PaymentStatus>('unpaid');
  const [editNotes, setEditNotes] = useState('');
  const [savingOrder, setSavingOrder] = useState(false);

  const [selectedCustomerPhone, setSelectedCustomerPhone] = useState<string | null>(null);

  const openOrderModal = (order: Order) => {
    setSelectedOrder(order);
    setEditStatus(order.status);
    setEditPaymentStatus(order.paymentStatus);
    setEditNotes(order.adminNotes || '');
  };

  const handleSaveOrder = async () => {
    if (!selectedOrder) return;
    setSavingOrder(true);
    try {
      await updateOrderByAdmin({
        order: selectedOrder,
        newStatus: editStatus,
        newPaymentStatus: editPaymentStatus,
        adminNotes: editNotes,
        products: allProductsAdmin,
        stockPolicy: settings.delivery.stockPolicy,
      });
      notify(`Order ${selectedOrder.orderNumber} updated to "${editStatus}".`);
      setSelectedOrder(null);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to update order', 'error');
    } finally {
      setSavingOrder(false);
    }
  };

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (paymentFilter !== 'all' && o.paymentMethod !== paymentFilter) return false;
      if (q) {
        const match =
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.phone.toLowerCase().includes(q) ||
          o.district.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (dateFrom || dateTo) {
        const ts =
          o.createdAt && typeof o.createdAt === 'object' && 'toDate' in o.createdAt
            ? (o.createdAt as { toDate: () => Date }).toDate()
            : null;
        if (ts) {
          if (dateFrom && ts < new Date(`${dateFrom}T00:00:00`)) return false;
          if (dateTo && ts > new Date(`${dateTo}T23:59:59`)) return false;
        }
      }
      return true;
    });
  }, [orders, search, statusFilter, paymentFilter, dateFrom, dateTo]);

  const paymentMethodsList = useMemo(
    () => Array.from(new Set(orders.map((o) => o.paymentMethod))),
    [orders]
  );

  // Aggregated Customers View
  const customersList = useMemo(() => {
    const map = new Map<
      string,
      { name: string; phone: string; district: string; address: string; orderCount: number; totalSpent: number; orders: Order[] }
    >();
    orders.forEach((o) => {
      const existing = map.get(o.phone);
      const validSale = o.status !== 'cancelled' && o.status !== 'returned' ? o.totalAmount : 0;
      if (existing) {
        existing.orderCount += 1;
        existing.totalSpent += validSale;
        existing.orders.push(o);
      } else {
        map.set(o.phone, {
          name: o.customerName,
          phone: o.phone,
          district: o.district,
          address: `${o.address}, ${o.thana}`,
          orderCount: 1,
          totalSpent: validSale,
          orders: [o],
        });
      }
    });
    return Array.from(map.values()).filter((c) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.district.toLowerCase().includes(q)
      );
    });
  }, [orders, search]);

  if (mode === 'customers') {
    const activeCustomer = customersList.find((c) => c.phone === selectedCustomerPhone);
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[#17251B] flex items-center gap-2">
              <Users className="w-5 h-5 text-[#006B35]" />
              <span>Customers Directory</span>
            </h2>
            <p className="text-xs text-[#4E6153]">
              Aggregated customer records and complete order history from live orders.
            </p>
          </div>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, district..."
            className="px-3.5 py-2 rounded-lg border border-[#DCE6DC] bg-white text-sm w-64"
          />
        </div>

        {customersList.length === 0 ? (
          <div className="bg-white border border-[#DCE6DC] rounded-xl p-10 text-center text-sm text-[#4E6153]">
            No customers yet. Customer records appear automatically as orders are placed.
          </div>
        ) : (
          <div className="bg-white border border-[#DCE6DC] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#F7FAF5] border-b border-[#DCE6DC] text-xs text-[#4E6153] uppercase">
                  <tr>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4 text-right">Orders</th>
                    <th className="py-3 px-4 text-right">Total Spent</th>
                    <th className="py-3 px-4 text-right">History</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF5EB]">
                  {customersList.map((c) => (
                    <tr key={c.phone} className="hover:bg-[#F7FAF5]/60">
                      <td className="py-3 px-4 font-semibold text-[#17251B]">{c.name}</td>
                      <td className="py-3 px-4 font-mono-num text-xs">{c.phone}</td>
                      <td className="py-3 px-4 text-xs text-[#4E6153]">
                        {c.district} — {c.address}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-num">{c.orderCount}</td>
                      <td className="py-3 px-4 text-right font-mono-num font-bold text-[#006B35]">
                        {formatBDT(c.totalSpent, 'en')}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedCustomerPhone(c.phone)}
                          className="text-xs font-semibold text-[#006B35] hover:underline cursor-pointer"
                        >
                          View Orders
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeCustomer && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white border border-[#DCE6DC] rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[#17251B]">{activeCustomer.name}</h3>
                  <p className="text-xs text-[#4E6153] font-mono-num">
                    {activeCustomer.phone} · {activeCustomer.district}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCustomerPhone(null)}
                  className="p-1.5 text-[#4E6153] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="divide-y divide-[#EEF5EB] border border-[#DCE6DC] rounded-xl">
                {activeCustomer.orders.map((ord) => (
                  <div key={ord.id} className="p-3.5 flex items-center justify-between text-sm">
                    <div>
                      <p className="font-mono-num font-bold">{ord.orderNumber}</p>
                      <p className="text-xs text-[#4E6153]">
                        {formatFirestoreDate(ord.createdAt, 'en')} · {ord.items.length} items
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono-num font-bold">{formatBDT(ord.totalAmount, 'en')}</p>
                      <span className="text-xs capitalize text-[#006B35]">{ord.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (mode === 'inquiries') {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-[#17251B] flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#006B35]" />
            <span>Wholesale Inquiries, Messages &amp; Subscribers</span>
          </h2>
          <p className="text-xs text-[#4E6153]">
            Incoming wholesale requests, contact messages, and newsletter signups.
          </p>
        </div>

        {inquiries.length === 0 ? (
          <div className="bg-white border border-[#DCE6DC] rounded-xl p-10 text-center text-sm text-[#4E6153]">
            No inquiries or newsletter subscribers yet.
          </div>
        ) : (
          <div className="space-y-3">
            {inquiries.map((inq) => (
              <div
                key={inq.id}
                className="bg-white border border-[#DCE6DC] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold uppercase text-[#006B35]">{inq.type}</span>
                    <span>·</span>
                    <span className="text-[#4E6153]">{formatFirestoreDate(inq.createdAt, 'en')}</span>
                  </div>
                  <p className="text-sm font-semibold text-[#17251B]">
                    {inq.name || inq.email || 'Subscriber'}
                    {inq.phone && <span className="font-mono-num text-xs ml-2 text-[#4E6153]">{inq.phone}</span>}
                    {inq.businessName && <span className="text-xs ml-2 text-[#006B35]">({inq.businessName})</span>}
                  </p>
                  {inq.productInterest && (
                    <p className="text-xs text-[#4E6153]">
                      Product: {inq.productInterest} {inq.quantity ? `— Qty: ${inq.quantity}` : ''}
                    </p>
                  )}
                  {inq.message && <p className="text-sm text-[#4E6153]">{inq.message}</p>}
                  {inq.email && (
                    <p className="text-xs text-[#4E6153] inline-flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5" /> {inq.email}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={inq.status}
                    onChange={(e) =>
                      void updateInquiryStatus(inq.id, e.target.value as Inquiry['status']).then(() =>
                        notify('Inquiry status updated')
                      )
                    }
                    className="px-2.5 py-1.5 rounded-lg border border-[#DCE6DC] bg-white text-xs font-semibold"
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="closed">Closed</option>
                  </select>
                  <button
                    type="button"
                    onClick={() =>
                      void deleteInquiry(inq.id).then(() => notify('Inquiry deleted'))
                    }
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Orders Mode
  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const deliveredCount = orders.filter((o) => o.status === 'delivered').length;
  const cancelledCount = orders.filter((o) => o.status === 'cancelled').length;
  const totalSales = orders
    .filter((o) => o.status !== 'cancelled' && o.status !== 'returned')
    .reduce((acc, o) => acc + o.totalAmount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#17251B]">Order Management</h2>
        <p className="text-xs text-[#4E6153]">
          Search, filter, update statuses, manage stock deduction, and print customer invoices.
        </p>
      </div>

      {/* Dynamic Order KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          ['Total Orders', String(orders.length), 'text-[#17251B]'],
          ['Pending', String(pendingCount), 'text-amber-700'],
          ['Delivered', String(deliveredCount), 'text-[#006B35]'],
          ['Cancelled', String(cancelledCount), 'text-red-600'],
          ['Total Sales', formatBDT(totalSales, 'en'), 'text-[#006B35]'],
        ].map(([label, val, cls]) => (
          <div key={label} className="bg-white border border-[#DCE6DC] rounded-xl p-4">
            <p className="text-xs text-[#4E6153]">{label}</p>
            <p className={`text-xl font-bold font-mono-num mt-1 ${cls}`}>{val}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#DCE6DC] rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="relative lg:col-span-2">
          <Search className="w-4 h-4 text-[#4E6153] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Order ID, customer name, phone..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#DCE6DC] text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[#DCE6DC] bg-white text-sm"
        >
          <option value="all">All Statuses</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_META[s].labelEn}
            </option>
          ))}
        </select>
        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[#DCE6DC] bg-white text-sm"
        >
          <option value="all">All Payment Methods</option>
          {paymentMethodsList.map((pm) => (
            <option key={pm} value={pm}>
              {pm}
            </option>
          ))}
        </select>
        <div className="flex gap-1.5">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            aria-label="From date"
            className="w-1/2 px-2 py-2 rounded-lg border border-[#DCE6DC] text-xs"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            aria-label="To date"
            className="w-1/2 px-2 py-2 rounded-lg border border-[#DCE6DC] text-xs"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-[#DCE6DC] rounded-xl overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="p-10 text-center text-sm text-[#4E6153]">
            No orders match your current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F7FAF5] border-b border-[#DCE6DC] text-xs text-[#4E6153] uppercase">
                <tr>
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">District</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF5EB]">
                {filteredOrders.map((order) => {
                  const meta = ORDER_STATUS_META[order.status];
                  return (
                    <tr key={order.id} className="hover:bg-[#F7FAF5]/60">
                      <td className="py-3 px-4">
                        <p className="font-mono-num font-bold text-[#17251B]">
                          {order.orderNumber}
                        </p>
                        <p className="text-[11px] text-[#4E6153]">
                          {formatFirestoreDate(order.createdAt, 'en')}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-[#17251B]">{order.customerName}</p>
                        <p className="font-mono-num text-xs text-[#4E6153]">{order.phone}</p>
                      </td>
                      <td className="py-3 px-4 text-xs text-[#4E6153]">
                        {order.district}
                        <span className="block">{order.thana}</span>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <p className="font-medium text-[#17251B]">{order.paymentMethod}</p>
                        <p className="capitalize text-[#4E6153]">{order.paymentStatus.replace('_', ' ')}</p>
                      </td>
                      <td className="py-3 px-4 text-right font-mono-num font-bold text-[#17251B]">
                        {formatBDT(order.totalAmount, 'en')}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded border ${meta.colorClass}`}>
                          {meta.labelEn}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => openOrderModal(order)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#DCE6DC] text-xs font-semibold hover:border-[#006B35] hover:text-[#006B35] cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Details / Invoice</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Detail & Printable Invoice Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white border border-[#DCE6DC] rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="no-print px-6 py-4 border-b border-[#DCE6DC] flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#17251B] font-mono-num">
                  Order {selectedOrder.orderNumber}
                </h3>
                <p className="text-xs text-[#4E6153]">
                  Placed {formatFirestoreDate(selectedOrder.createdAt, 'en')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#DCE6DC] text-xs font-semibold hover:border-[#006B35] cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / PDF Invoice</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="p-1.5 text-[#4E6153] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              {/* Printable Brand Header */}
              <div className="flex items-start justify-between border-b border-[#EEF5EB] pb-4">
                <div className="flex items-center gap-3">
                  <img
                    src={settings.appearance.logoUrl}
                    alt="ZAD Foods"
                    className="h-11 w-auto object-contain"
                  />
                  <div>
                    <p className="font-bold text-[#17251B]">{settings.business.brandNameEn}</p>
                    <p className="text-xs text-[#4E6153]">
                      {settings.business.addressEn} · {settings.business.phone}
                    </p>
                  </div>
                </div>
                <div className="text-right text-xs">
                  <p className="font-bold text-sm font-mono-num">{selectedOrder.orderNumber}</p>
                  <p className="text-[#4E6153]">{selectedOrder.paymentMethod}</p>
                  {selectedOrder.paymentReference && (
                    <p className="font-mono-num text-[#006B35]">
                      Ref: {selectedOrder.paymentReference}
                    </p>
                  )}
                </div>
              </div>

              {/* Customer & Shipping Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-[#F7FAF5] p-4 rounded-xl border border-[#EEF5EB]">
                <div>
                  <p className="text-xs font-semibold text-[#4E6153]">Customer</p>
                  <p className="font-bold text-[#17251B]">{selectedOrder.customerName}</p>
                  <p className="font-mono-num text-xs">{selectedOrder.phone}</p>
                  {selectedOrder.altPhone && (
                    <p className="font-mono-num text-xs text-[#4E6153]">
                      Alt: {selectedOrder.altPhone}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#4E6153]">Shipping Address</p>
                  <p className="text-[#17251B]">
                    {selectedOrder.address}, {selectedOrder.thana}, {selectedOrder.district}
                  </p>
                  {selectedOrder.notes && (
                    <p className="text-xs text-amber-800 mt-1">Note: {selectedOrder.notes}</p>
                  )}
                </div>
              </div>

              {/* Line Items */}
              <table className="w-full text-sm text-left border border-[#DCE6DC] rounded-xl overflow-hidden">
                <thead className="bg-[#F7FAF5] text-xs text-[#4E6153] border-b border-[#DCE6DC]">
                  <tr>
                    <th className="py-2.5 px-3">Product</th>
                    <th className="py-2.5 px-3">Variant</th>
                    <th className="py-2.5 px-3 text-right">Unit</th>
                    <th className="py-2.5 px-3 text-right">Qty</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF5EB]">
                  {selectedOrder.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 px-3 font-medium">
                        {item.productNameEn}
                        {item.isWholesale && (
                          <span className="ml-1.5 text-[11px] text-[#006B35] font-semibold">
                            (Wholesale)
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-[#4E6153]">{item.variantLabelEn}</td>
                      <td className="py-2.5 px-3 text-right font-mono-num">
                        {formatBDT(item.unitPrice, 'en')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-num">{item.quantity}</td>
                      <td className="py-2.5 px-3 text-right font-mono-num font-semibold">
                        {formatBDT(item.lineTotal, 'en')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end">
                <div className="w-64 space-y-1.5 text-sm">
                  <div className="flex justify-between text-[#4E6153]">
                    <span>Subtotal</span>
                    <span className="font-mono-num">{formatBDT(selectedOrder.subtotal, 'en')}</span>
                  </div>
                  {selectedOrder.discount > 0 && (
                    <div className="flex justify-between text-[#006B35]">
                      <span>Discount</span>
                      <span className="font-mono-num">−{formatBDT(selectedOrder.discount, 'en')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#4E6153]">
                    <span>Delivery</span>
                    <span className="font-mono-num">
                      {selectedOrder.deliveryCharge === 0
                        ? 'Free'
                        : formatBDT(selectedOrder.deliveryCharge, 'en')}
                    </span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-[#17251B] pt-2 border-t border-[#DCE6DC]">
                    <span>Total</span>
                    <span className="font-mono-num text-[#006B35]">
                      {formatBDT(selectedOrder.totalAmount, 'en')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Admin Controls (Hidden during Print) */}
              <div className="no-print pt-5 border-t border-[#DCE6DC] space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                      Order Status
                    </label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as OrderStatus)}
                      className="w-full px-3 py-2 rounded-lg border border-[#DCE6DC] bg-white text-sm font-semibold"
                    >
                      {ALL_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {ORDER_STATUS_META[s].labelEn}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                      Payment Status
                    </label>
                    <select
                      value={editPaymentStatus}
                      onChange={(e) => setEditPaymentStatus(e.target.value as PaymentStatus)}
                      className="w-full px-3 py-2 rounded-lg border border-[#DCE6DC] bg-white text-sm font-semibold"
                    >
                      <option value="unpaid">Unpaid</option>
                      <option value="pending_verification">Pending Verification</option>
                      <option value="paid">Paid</option>
                      <option value="refunded">Refunded</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                    Internal Admin Notes
                  </label>
                  <textarea
                    rows={2}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Courier tracking code, call verification note..."
                    className="w-full px-3 py-2 rounded-lg border border-[#DCE6DC] text-sm"
                  />
                </div>

                <p className="text-xs text-[#4E6153]">
                  Inventory status:{' '}
                  <span className="font-semibold text-[#17251B]">
                    {selectedOrder.stockDeducted
                      ? 'Stock already deducted (cancelling/returning will auto-restore if enabled)'
                      : `Stock will auto-deduct when order status reaches "${settings.delivery.stockPolicy.deductOn}"`}
                  </span>
                </p>
              </div>
            </div>

            <div className="no-print px-6 py-4 border-t border-[#DCE6DC] bg-[#F7FAF5] flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 rounded-lg border border-[#DCE6DC] bg-white text-sm font-medium cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                disabled={savingOrder}
                onClick={() => void handleSaveOrder()}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#006B35] text-white text-sm font-semibold hover:bg-[#168B35] disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{savingOrder ? 'Updating...' : 'Update Order'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
