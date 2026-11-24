import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import {
  AlertTriangle,
  Boxes,
  Building2,
  ExternalLink,
  FileText,
  FolderTree,
  Globe,
  Image as ImageIcon,
  LayoutDashboard,
  LayoutTemplate,
  LogOut,
  Menu,
  MessageSquare,
  Package,
  Palette,
  RefreshCw,
  Shield,
  ShoppingCart,
  Star,
  Truck,
  Users,
  X,
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { ADMIN_LOGIN_PATH, db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { formatBDT, formatFirestoreDate, ORDER_STATUS_META } from '../../lib/i18n';
import { seedInitialDatabaseIfEmpty } from '../../lib/firestoreService';
import AdminProductsModule from './AdminProductsModule';
import AdminOrdersModule from './AdminOrdersModule';
import AdminCatalogOpsModule from './AdminCatalogOpsModule';
import AdminCmsModule from './AdminCmsModule';
import AdminSettingsModule from './AdminSettingsModule';
import type { AdminUser, Inquiry, MediaAsset, Order } from '../../types';

type AdminTab =
  | 'overview'
  | 'products'
  | 'categories'
  | 'orders'
  | 'customers'
  | 'inventory'
  | 'homepage'
  | 'content'
  | 'media'
  | 'reviews'
  | 'inquiries'
  | 'appearance'
  | 'delivery'
  | 'business'
  | 'seo'
  | 'admins';

const NAV_GROUPS: {
  group: string;
  items: { id: AdminTab; label: string; icon: React.ComponentType<{ className?: string }> }[];
}[] = [
  {
    group: 'Operations',
    items: [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard },
      { id: 'orders', label: 'Orders', icon: ShoppingCart },
      { id: 'products', label: 'Products', icon: Package },
      { id: 'categories', label: 'Categories', icon: FolderTree },
      { id: 'inventory', label: 'Inventory', icon: Boxes },
      { id: 'customers', label: 'Customers', icon: Users },
      { id: 'inquiries', label: 'Inquiries & Leads', icon: MessageSquare },
      { id: 'reviews', label: 'Customer Reviews', icon: Star },
    ],
  },
  {
    group: 'Content & Media',
    items: [
      { id: 'homepage', label: 'Homepage Editor', icon: LayoutTemplate },
      { id: 'content', label: 'Website Pages', icon: FileText },
      { id: 'media', label: 'Media Library', icon: ImageIcon },
    ],
  },
  {
    group: 'Configuration',
    items: [
      { id: 'appearance', label: 'Appearance', icon: Palette },
      { id: 'delivery', label: 'Delivery & Stock', icon: Truck },
      { id: 'business', label: 'Business Info', icon: Building2 },
      { id: 'seo', label: 'SEO Settings', icon: Globe },
      { id: 'admins', label: 'Admin Security', icon: Shield },
    ],
  },
];

export default function AdminDashboardPage() {
  const {
    user,
    authReady,
    isAdmin,
    verifyAdminSession,
    logout,
    settings,
    allProductsAdmin,
    notify,
  } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [serverChecked, setServerChecked] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const [orders, setOrders] = useState<Order[]>([]);
  const [mediaLibrary, setMediaLibrary] = useState<MediaAsset[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [seeding, setSeeding] = useState(false);

  // Prevent search engine indexing of Admin Dashboard
  useEffect(() => {
    let robotsMeta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const created = !robotsMeta;
    const prevContent = robotsMeta?.getAttribute('content') || null;
    if (!robotsMeta) {
      robotsMeta = document.createElement('meta');
      robotsMeta.name = 'robots';
      document.head.appendChild(robotsMeta);
    }
    robotsMeta.content = 'noindex, nofollow';

    return () => {
      if (created) {
        robotsMeta?.remove();
      } else if (robotsMeta) {
        if (prevContent !== null) {
          robotsMeta.content = prevContent;
        } else {
          robotsMeta.removeAttribute('content');
        }
      }
    };
  }, []);

  // Re-verify admin role against backend server whenever AdminDashboard mounts or user changes
  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      setServerChecked(true);
      return;
    }
    let active = true;
    setServerChecked(false);
    void verifyAdminSession().finally(() => {
      if (active) setServerChecked(true);
    });
    return () => {
      active = false;
    };
  }, [authReady, user, verifyAdminSession]);

  // Live Admin-Only Firestore Subscriptions
  useEffect(() => {
    if (!authReady || !serverChecked || !isAdmin) return;

    const unsubOrders = onSnapshot(
      query(collection(db, 'orders'), orderBy('createdAt', 'desc')),
      (snap) => {
        setOrders(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Order, 'id'>) })));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'orders')
    );

    const unsubMedia = onSnapshot(
      collection(db, 'media'),
      (snap) => {
        setMediaLibrary(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MediaAsset, 'id'>) }))
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'media')
    );

    const unsubInquiries = onSnapshot(
      query(collection(db, 'inquiries'), orderBy('createdAt', 'desc')),
      (snap) => {
        setInquiries(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Inquiry, 'id'>) })));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'inquiries')
    );

    const unsubAdmins = onSnapshot(
      collection(db, 'admins'),
      (snap) => {
        setAdmins(snap.docs.map((d) => d.data() as AdminUser));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'admins')
    );

    return () => {
      unsubOrders();
      unsubMedia();
      unsubInquiries();
      unsubAdmins();
    };
  }, [authReady, serverChecked, isAdmin]);

  const metrics = useMemo(() => {
    const validOrders = orders.filter((o) => o.status !== 'cancelled' && o.status !== 'returned');
    const totalRevenue = validOrders.reduce((acc, o) => acc + o.totalAmount, 0);
    const pendingOrders = orders.filter((o) => o.status === 'pending').length;
    const deliveredOrders = orders.filter((o) => o.status === 'delivered').length;
    const threshold = settings.delivery.stockPolicy.lowStockThreshold || 10;
    const lowStockVariants = allProductsAdmin.flatMap((p) =>
      p.variants
        .filter((v) => v.stock <= threshold)
        .map((v) => ({ productName: p.nameEn, variantLabel: v.labelEn, stock: v.stock }))
    );

    // Status distribution for clean visual bar breakdown
    const statusCounts: Record<string, number> = {};
    orders.forEach((o) => {
      statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
    });

    return {
      totalRevenue,
      totalOrders: orders.length,
      pendingOrders,
      deliveredOrders,
      totalProducts: allProductsAdmin.length,
      publishedProducts: allProductsAdmin.filter((p) => p.status === 'published').length,
      lowStockVariants,
      statusCounts,
    };
  }, [orders, allProductsAdmin, settings.delivery.stockPolicy.lowStockThreshold]);

  if (!authReady || !serverChecked || signingOut) {
    return (
      <div className="min-h-screen bg-[#F7FAF5] flex items-center justify-center text-sm text-[#4E6153]">
        {signingOut ? 'Signing out...' : 'Verifying administrator access...'}
      </div>
    );
  }

  // Never redirect unauthorized users to the private admin login URL
  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  const handleAdminLogout = async () => {
    setSigningOut(true);
    try {
      await logout();
      navigate(ADMIN_LOGIN_PATH, { replace: true });
    } catch {
      setSigningOut(false);
    }
  };

  const activeLabel =
    NAV_GROUPS.flatMap((g) => g.items).find((i) => i.id === activeTab)?.label || 'Overview';

  const handleManualSeed = async () => {
    setSeeding(true);
    try {
      const res = await seedInitialDatabaseIfEmpty();
      notify(
        res.seeded
          ? 'Seeded missing initial catalog & settings to Firestore.'
          : 'Firestore already contains your catalog and settings.',
        'info'
      );
    } catch {
      notify('Could not seed database.', 'error');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7FAF5] flex text-[#17251B]">
      {/* Desktop Left Sidebar */}
      <aside className="no-print hidden lg:flex lg:flex-col w-64 bg-white border-r border-[#DCE6DC] shrink-0 sticky top-0 h-screen">
        <div className="h-16 px-5 border-b border-[#DCE6DC] flex items-center gap-2.5">
          <img
            src={settings.appearance.logoUrl}
            alt="ZAD Foods"
            className="h-9 w-auto object-contain"
          />
          <span className="text-xs font-bold text-[#006B35] tracking-wide">ADMIN</span>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.group}>
              <p className="px-3 text-[11px] font-semibold text-[#4E6153] mb-1.5">
                {group.group}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#EEF5EB] text-[#006B35] font-semibold'
                          : 'text-[#4E6153] hover:bg-[#F7FAF5] hover:text-[#17251B]'
                      }`}
                    >
                      <span className="inline-flex items-center gap-2.5 truncate">
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </span>
                      {item.id === 'orders' && metrics.pendingOrders > 0 && (
                        <span className="text-[11px] font-mono-num font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                          {metrics.pendingOrders}
                        </span>
                      )}
                      {item.id === 'inquiries' &&
                        inquiries.filter((i) => i.status === 'new').length > 0 && (
                          <span className="text-[11px] font-mono-num font-bold text-[#006B35] bg-[#EEF5EB] px-1.5 py-0.5 rounded">
                            {inquiries.filter((i) => i.status === 'new').length}
                          </span>
                        )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-[#DCE6DC] text-xs space-y-2">
          <div className="px-2">
            <p className="font-semibold text-[#17251B] truncate">{user.displayName || 'Admin'}</p>
            <p className="text-[#4E6153] truncate">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={() => void handleAdminLogout()}
            className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-[#DCE6DC] text-[#4E6153] hover:text-red-700 hover:border-red-200 font-semibold cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Drawer */}
      {sidebarOpen && (
        <div className="no-print fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/45" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-72 max-w-[85vw] bg-white h-full flex flex-col shadow-xl">
            <div className="h-16 px-4 border-b border-[#DCE6DC] flex items-center justify-between">
              <img src={settings.appearance.logoUrl} alt="ZAD Foods" className="h-9 w-auto" />
              <button type="button" onClick={() => setSidebarOpen(false)} className="p-2">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3 space-y-4">
              {NAV_GROUPS.map((group) => (
                <div key={group.group}>
                  <p className="px-3 text-[11px] font-semibold text-[#4E6153] mb-1">
                    {group.group}
                  </p>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setActiveTab(item.id);
                          setSidebarOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium ${
                          activeTab === item.id
                            ? 'bg-[#EEF5EB] text-[#006B35] font-semibold'
                            : 'text-[#4E6153]'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Main Workspace Canvas */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="no-print h-16 bg-white border-b border-[#DCE6DC] px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-[#17251B]"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm truncate">
              <span className="text-[#4E6153] hidden sm:inline">ZAD Foods Admin</span>
              <span className="text-[#DCE6DC] hidden sm:inline">/</span>
              <span className="font-bold text-[#17251B] truncate">{activeLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              disabled={seeding}
              onClick={() => void handleManualSeed()}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#DCE6DC] text-xs font-semibold text-[#4E6153] hover:text-[#006B35] hover:border-[#006B35] cursor-pointer"
              title="Ensure initial ZAD Foods products & settings exist in Firestore"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${seeding ? 'animate-spin' : ''}`} />
              <span>Sync Seed</span>
            </button>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#006B35] text-white text-xs font-semibold hover:bg-[#168B35] whitespace-nowrap"
            >
              <span>View Storefront</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </header>

        {/* Active Module Viewport */}
        <main className="p-4 sm:p-6 lg:p-8 max-w-[1380px] w-full mx-auto">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-[#17251B]">Business Overview</h1>
                <p className="text-xs text-[#4E6153]">
                  Live metrics directly from Cloud Firestore.
                </p>
              </div>

              {/* KPI Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white border border-[#DCE6DC] rounded-xl p-5">
                  <p className="text-xs text-[#4E6153]">Total Revenue</p>
                  <p className="text-2xl font-bold font-mono-num text-[#006B35] mt-1">
                    {formatBDT(metrics.totalRevenue, 'en')}
                  </p>
                </div>
                <div className="bg-white border border-[#DCE6DC] rounded-xl p-5">
                  <p className="text-xs text-[#4E6153]">Total Orders</p>
                  <p className="text-2xl font-bold font-mono-num text-[#17251B] mt-1">
                    {metrics.totalOrders}
                  </p>
                </div>
                <div className="bg-white border border-[#DCE6DC] rounded-xl p-5">
                  <p className="text-xs text-[#4E6153]">Pending Orders</p>
                  <p className="text-2xl font-bold font-mono-num text-amber-700 mt-1">
                    {metrics.pendingOrders}
                  </p>
                </div>
                <div className="bg-white border border-[#DCE6DC] rounded-xl p-5">
                  <p className="text-xs text-[#4E6153]">Products</p>
                  <p className="text-2xl font-bold font-mono-num text-[#17251B] mt-1">
                    {metrics.publishedProducts}{' '}
                    <span className="text-xs font-normal text-[#4E6153]">
                      / {metrics.totalProducts}
                    </span>
                  </p>
                </div>
                <div className="bg-white border border-[#DCE6DC] rounded-xl p-5">
                  <p className="text-xs text-[#4E6153]">Low Stock Alerts</p>
                  <p className="text-2xl font-bold font-mono-num text-red-600 mt-1">
                    {metrics.lowStockVariants.length}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Recent Orders */}
                <div className="lg:col-span-8 bg-white border border-[#DCE6DC] rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-[#EEF5EB] flex items-center justify-between">
                    <h2 className="text-sm font-bold text-[#17251B]">Recent Orders</h2>
                    <button
                      type="button"
                      onClick={() => setActiveTab('orders')}
                      className="text-xs font-semibold text-[#006B35] hover:underline cursor-pointer"
                    >
                      Manage All →
                    </button>
                  </div>
                  {orders.length === 0 ? (
                    <p className="p-8 text-center text-sm text-[#4E6153]">
                      No orders placed yet. Orders submitted from the storefront appear here in real time.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-[#F7FAF5] text-xs text-[#4E6153] border-b border-[#DCE6DC]">
                          <tr>
                            <th className="py-2.5 px-4">Order ID</th>
                            <th className="py-2.5 px-4">Customer</th>
                            <th className="py-2.5 px-4">Status</th>
                            <th className="py-2.5 px-4 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EEF5EB]">
                          {orders.slice(0, 6).map((ord) => {
                            const meta = ORDER_STATUS_META[ord.status];
                            return (
                              <tr key={ord.id}>
                                <td className="py-2.5 px-4 font-mono-num font-bold text-xs">
                                  {ord.orderNumber}
                                  <span className="block font-sans font-normal text-[11px] text-[#4E6153]">
                                    {formatFirestoreDate(ord.createdAt, 'en')}
                                  </span>
                                </td>
                                <td className="py-2.5 px-4 text-xs">
                                  <span className="font-semibold text-[#17251B] block">
                                    {ord.customerName}
                                  </span>
                                  <span className="text-[#4E6153]">{ord.district}</span>
                                </td>
                                <td className="py-2.5 px-4">
                                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${meta.colorClass}`}>
                                    {meta.labelEn}
                                  </span>
                                </td>
                                <td className="py-2.5 px-4 text-right font-mono-num font-bold">
                                  {formatBDT(ord.totalAmount, 'en')}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Low Stock Alerts & Quick Actions */}
                <div className="lg:col-span-4 space-y-6">
                  <div className="bg-white border border-[#DCE6DC] rounded-xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-bold text-[#17251B] flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span>Low / Out-of-Stock Variants</span>
                      </h2>
                      <button
                        type="button"
                        onClick={() => setActiveTab('inventory')}
                        className="text-xs font-semibold text-[#006B35] hover:underline cursor-pointer"
                      >
                        Restock
                      </button>
                    </div>
                    {metrics.lowStockVariants.length === 0 ? (
                      <p className="text-xs text-[#4E6153]">All variants are well stocked.</p>
                    ) : (
                      <ul className="divide-y divide-[#EEF5EB] text-xs">
                        {metrics.lowStockVariants.slice(0, 6).map((item, idx) => (
                          <li key={idx} className="py-2 flex items-center justify-between gap-2">
                            <span className="truncate">
                              <strong className="text-[#17251B]">{item.productName}</strong> ·{' '}
                              {item.variantLabel}
                            </span>
                            <span
                              className={`font-mono-num font-bold shrink-0 ${
                                item.stock === 0 ? 'text-red-600' : 'text-amber-700'
                              }`}
                            >
                              {item.stock} left
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="bg-white border border-[#DCE6DC] rounded-xl p-5 space-y-2.5">
                    <h2 className="text-sm font-bold text-[#17251B]">Quick Actions</h2>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setActiveTab('products')}
                        className="p-2.5 rounded-lg border border-[#DCE6DC] font-semibold hover:border-[#006B35] hover:text-[#006B35] cursor-pointer"
                      >
                        + Manage Products
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('homepage')}
                        className="p-2.5 rounded-lg border border-[#DCE6DC] font-semibold hover:border-[#006B35] hover:text-[#006B35] cursor-pointer"
                      >
                        Edit Banners
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('media')}
                        className="p-2.5 rounded-lg border border-[#DCE6DC] font-semibold hover:border-[#006B35] hover:text-[#006B35] cursor-pointer"
                      >
                        Media Library
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('appearance')}
                        className="p-2.5 rounded-lg border border-[#DCE6DC] font-semibold hover:border-[#006B35] hover:text-[#006B35] cursor-pointer"
                      >
                        Brand Colors
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'products' && <AdminProductsModule mediaLibrary={mediaLibrary} />}
          {activeTab === 'categories' && (
            <AdminCatalogOpsModule mode="categories" mediaLibrary={mediaLibrary} />
          )}
          {activeTab === 'inventory' && (
            <AdminCatalogOpsModule mode="inventory" mediaLibrary={mediaLibrary} />
          )}
          {activeTab === 'reviews' && (
            <AdminCatalogOpsModule mode="reviews" mediaLibrary={mediaLibrary} />
          )}
          {activeTab === 'orders' && (
            <AdminOrdersModule orders={orders} inquiries={inquiries} mode="orders" />
          )}
          {activeTab === 'customers' && (
            <AdminOrdersModule orders={orders} inquiries={inquiries} mode="customers" />
          )}
          {activeTab === 'inquiries' && (
            <AdminOrdersModule orders={orders} inquiries={inquiries} mode="inquiries" />
          )}
          {activeTab === 'homepage' && (
            <AdminCmsModule mode="homepage" mediaLibrary={mediaLibrary} />
          )}
          {activeTab === 'content' && (
            <AdminCmsModule mode="content" mediaLibrary={mediaLibrary} />
          )}
          {activeTab === 'media' && <AdminCmsModule mode="media" mediaLibrary={mediaLibrary} />}
          {activeTab === 'appearance' && (
            <AdminSettingsModule mode="appearance" mediaLibrary={mediaLibrary} admins={admins} />
          )}
          {activeTab === 'delivery' && (
            <AdminSettingsModule mode="delivery" mediaLibrary={mediaLibrary} admins={admins} />
          )}
          {activeTab === 'business' && (
            <AdminSettingsModule mode="business" mediaLibrary={mediaLibrary} admins={admins} />
          )}
          {activeTab === 'seo' && (
            <AdminSettingsModule mode="seo" mediaLibrary={mediaLibrary} admins={admins} />
          )}
          {activeTab === 'admins' && (
            <AdminSettingsModule mode="admins" mediaLibrary={mediaLibrary} admins={admins} />
          )}
        </main>
      </div>
    </div>
  );
}
