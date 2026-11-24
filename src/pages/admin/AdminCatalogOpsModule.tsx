import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Edit3,
  History,
  ImagePlus,
  Plus,
  Save,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { formatFirestoreDate } from '../../lib/i18n';
import {
  adjustVariantStock,
  deleteCategory,
  deleteReview,
  fetchStockLogs,
  saveCategory,
  saveReview,
  slugify,
} from '../../lib/firestoreService';
import AdminImageUploaderModal from './AdminImageUploaderModal';
import type { Category, MediaAsset, Product, Review, StockLog } from '../../types';

export default function AdminCatalogOpsModule({
  mode,
  mediaLibrary,
}: {
  mode: 'categories' | 'inventory' | 'reviews';
  mediaLibrary: MediaAsset[];
}) {
  const { categories, allProductsAdmin, reviews, settings, notify } = useApp();

  // ================= CATEGORIES STATE =================
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catForm, setCatForm] = useState({
    slug: '',
    nameBn: '',
    nameEn: '',
    descriptionBn: '',
    descriptionEn: '',
    imageUrl: '',
    order: 1,
    isActive: true,
  });
  const [catImgModal, setCatImgModal] = useState(false);
  const [confirmDeleteCat, setConfirmDeleteCat] = useState<Category | null>(null);

  // ================= INVENTORY STATE =================
  const [invFilter, setInvFilter] = useState<'all' | 'low' | 'out'>('all');
  const [stockDrafts, setStockDrafts] = useState<Record<string, number>>({});
  const [stockReason, setStockReason] = useState('Manual restock / adjustment');
  const [stockLogs, setStockLogs] = useState<StockLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  // ================= REVIEWS STATE =================
  const [revModalOpen, setRevModalOpen] = useState(false);
  const [editingRevId, setEditingRevId] = useState<string | null>(null);
  const [revForm, setRevForm] = useState({
    customerName: '',
    location: '',
    rating: 5,
    commentBn: '',
    commentEn: '',
    photoUrl: '',
    isApproved: true,
    showOnHomepage: true,
  });
  const [revImgModal, setRevImgModal] = useState(false);

  useEffect(() => {
    if (mode === 'inventory' && showLogs) {
      void fetchStockLogs()
        .then(setStockLogs)
        .catch(() => setStockLogs([]));
    }
  }, [mode, showLogs]);

  // ---------------- CATEGORY HANDLERS ----------------
  const openNewCategory = () => {
    setEditingCatId(null);
    setCatForm({
      slug: '',
      nameBn: '',
      nameEn: '',
      descriptionBn: '',
      descriptionEn: '',
      imageUrl: '',
      order: categories.length + 1,
      isActive: true,
    });
    setCatModalOpen(true);
  };

  const openEditCategory = (cat: Category) => {
    setEditingCatId(cat.id);
    setCatForm({
      slug: cat.slug,
      nameBn: cat.nameBn,
      nameEn: cat.nameEn,
      descriptionBn: cat.descriptionBn || '',
      descriptionEn: cat.descriptionEn || '',
      imageUrl: cat.imageUrl || '',
      order: cat.order,
      isActive: cat.isActive,
    });
    setCatModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveCategory(
        {
          ...catForm,
          slug: catForm.slug.trim() ? slugify(catForm.slug) : slugify(catForm.nameEn),
        },
        editingCatId || undefined
      );
      notify(editingCatId ? 'Category updated.' : 'Category created.');
      setCatModalOpen(false);
    } catch {
      notify('Failed to save category.', 'error');
    }
  };

  const reorderCategory = async (idx: number, direction: -1 | 1) => {
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= categories.length) return;
    const a = categories[idx];
    const b = categories[targetIdx];
    try {
      await saveCategory({ ...a, order: b.order }, a.id);
      await saveCategory({ ...b, order: a.order }, b.id);
      notify('Category order updated.');
    } catch {
      notify('Reorder failed.', 'error');
    }
  };

  // ---------------- INVENTORY HANDLERS ----------------
  const handleSaveStock = async (product: Product, variantId: string, newQty: number) => {
    try {
      await adjustVariantStock({
        product,
        variantId,
        newStock: newQty,
        reason: stockReason || 'Manual inventory update',
      });
      notify(`Stock updated for ${product.nameEn}.`);
      if (showLogs) {
        const fresh = await fetchStockLogs();
        setStockLogs(fresh);
      }
    } catch {
      notify('Failed to update stock.', 'error');
    }
  };

  // ---------------- REVIEW HANDLERS ----------------
  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveReview(revForm, editingRevId || undefined);
      notify(editingRevId ? 'Review updated.' : 'Review added.');
      setRevModalOpen(false);
    } catch {
      notify('Failed to save review.', 'error');
    }
  };

  // ================= RENDER: CATEGORIES =================
  if (mode === 'categories') {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[#17251B]">Categories</h2>
            <p className="text-xs text-[#4E6153]">
              Add, edit, delete, reorder, and assign images to product categories.
            </p>
          </div>
          <button
            type="button"
            onClick={openNewCategory}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#006B35] text-white text-sm font-semibold hover:bg-[#168B35] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Category</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat, idx) => (
            <div
              key={cat.id}
              className="bg-white border border-[#DCE6DC] rounded-xl overflow-hidden flex flex-col"
            >
              <div className="aspect-[16/9] bg-[#EEF5EB] overflow-hidden relative">
                {cat.imageUrl ? (
                  <img
                    src={cat.imageUrl}
                    alt={cat.nameEn}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-[#4E6153]">
                    No Image
                  </div>
                )}
                <span
                  className={`absolute top-2.5 right-2.5 text-[11px] font-semibold px-2 py-0.5 rounded ${
                    cat.isActive ? 'bg-[#006B35] text-white' : 'bg-slate-600 text-white'
                  }`}
                >
                  {cat.isActive ? 'Active' : 'Hidden'}
                </span>
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                <div>
                  <p className="font-bold text-[#17251B]">{cat.nameEn}</p>
                  <p className="text-xs text-[#4E6153]">
                    {cat.nameBn} · <span className="font-mono-num">/{cat.slug}</span>
                  </p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-[#EEF5EB]">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => void reorderCategory(idx, -1)}
                      className="p-1.5 rounded border border-[#DCE6DC] disabled:opacity-30 cursor-pointer"
                      title="Move up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === categories.length - 1}
                      onClick={() => void reorderCategory(idx, 1)}
                      className="p-1.5 rounded border border-[#DCE6DC] disabled:opacity-30 cursor-pointer"
                      title="Move down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditCategory(cat)}
                      className="p-1.5 rounded-lg text-[#4E6153] hover:text-[#006B35] hover:bg-[#EEF5EB] cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteCat(cat)}
                      className="p-1.5 rounded-lg text-[#4E6153] hover:text-red-600 hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {catModalOpen && (
          <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4">
            <form
              onSubmit={handleSaveCategory}
              className="bg-white border border-[#DCE6DC] rounded-2xl max-w-lg w-full p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-[#17251B]">
                  {editingCatId ? 'Edit Category' : 'Add Category'}
                </h3>
                <button
                  type="button"
                  onClick={() => setCatModalOpen(false)}
                  className="p-1 text-[#4E6153] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                    Name (EN) *
                  </label>
                  <input
                    required
                    value={catForm.nameEn}
                    onChange={(e) =>
                      setCatForm((p) => ({
                        ...p,
                        nameEn: e.target.value,
                        slug: editingCatId ? p.slug : slugify(e.target.value),
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#DCE6DC] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                    নাম (বাংলা) *
                  </label>
                  <input
                    required
                    value={catForm.nameBn}
                    onChange={(e) => setCatForm((p) => ({ ...p, nameBn: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-[#DCE6DC] text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#4E6153] mb-1">Slug</label>
                  <input
                    value={catForm.slug}
                    onChange={(e) => setCatForm((p) => ({ ...p, slug: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-[#DCE6DC] text-sm font-mono-num"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#4E6153] mb-1">Order</label>
                  <input
                    type="number"
                    value={catForm.order}
                    onChange={(e) => setCatForm((p) => ({ ...p, order: Number(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 rounded-lg border border-[#DCE6DC] text-sm font-mono-num"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                  Category Image
                </label>
                <div className="flex items-center gap-3">
                  {catForm.imageUrl && (
                    <img
                      src={catForm.imageUrl}
                      alt="Preview"
                      className="w-16 h-12 rounded-lg object-cover border border-[#DCE6DC]"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setCatImgModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#006B35] text-[#006B35] text-xs font-semibold cursor-pointer"
                  >
                    <ImagePlus className="w-4 h-4" />
                    <span>Upload / Choose Image</span>
                  </button>
                </div>
              </div>
              <label className="inline-flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={catForm.isActive}
                  onChange={(e) => setCatForm((p) => ({ ...p, isActive: e.target.checked }))}
                  className="accent-[#006B35]"
                />
                <span>Active (Visible on Storefront)</span>
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCatModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#DCE6DC] text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#006B35] text-white text-sm font-semibold cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Category</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {confirmDeleteCat && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white border border-[#DCE6DC] rounded-2xl max-w-sm w-full p-6 space-y-4">
              <h3 className="text-base font-bold text-[#17251B]">Delete Category?</h3>
              <p className="text-sm text-[#4E6153]">
                Delete <span className="font-semibold">{confirmDeleteCat.nameEn}</span>? Existing
                products in this category will remain safe.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteCat(null)}
                  className="px-4 py-2 rounded-lg border border-[#DCE6DC] text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void deleteCategory(confirmDeleteCat.id).then(() => {
                      notify('Category deleted.');
                      setConfirmDeleteCat(null);
                    })
                  }
                  className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        <AdminImageUploaderModal
          open={catImgModal}
          onClose={() => setCatImgModal(false)}
          onSelect={(res) => setCatForm((p) => ({ ...p, imageUrl: res.url }))}
          mediaLibrary={mediaLibrary}
          defaultFolder="categories"
          title="Select Category Image"
        />
      </div>
    );
  }

  // ================= RENDER: INVENTORY =================
  if (mode === 'inventory') {
    const threshold = settings.delivery.stockPolicy.lowStockThreshold || 10;
    const rows = allProductsAdmin.flatMap((product) =>
      product.variants.map((variant) => ({ product, variant }))
    );
    const filteredRows = rows.filter(({ variant }) => {
      if (invFilter === 'out') return variant.stock <= 0;
      if (invFilter === 'low') return variant.stock > 0 && variant.stock <= threshold;
      return true;
    });

    const lowCount = rows.filter((r) => r.variant.stock > 0 && r.variant.stock <= threshold).length;
    const outCount = rows.filter((r) => r.variant.stock <= 0).length;

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[#17251B]">Inventory &amp; Stock Control</h2>
            <p className="text-xs text-[#4E6153]">
              Stock tracking is{' '}
              <span className="font-semibold text-[#006B35]">
                {settings.delivery.stockPolicy.enabled ? 'Enabled' : 'Disabled'}
              </span>{' '}
              · Low-stock threshold: ≤{threshold} units
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowLogs((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#DCE6DC] bg-white text-sm font-semibold hover:border-[#006B35] cursor-pointer"
          >
            <History className="w-4 h-4 text-[#006B35]" />
            <span>{showLogs ? 'Back to Stock Levels' : 'View Stock Audit Log'}</span>
          </button>
        </div>

        {showLogs ? (
          <div className="bg-white border border-[#DCE6DC] rounded-xl overflow-hidden">
            {stockLogs.length === 0 ? (
              <p className="p-8 text-center text-sm text-[#4E6153]">
                No stock adjustments logged yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[#F7FAF5] border-b border-[#DCE6DC] text-xs text-[#4E6153] uppercase">
                    <tr>
                      <th className="py-3 px-4">Time</th>
                      <th className="py-3 px-4">Product &amp; Variant</th>
                      <th className="py-3 px-4 text-right">Change</th>
                      <th className="py-3 px-4 text-right">Prev → New</th>
                      <th className="py-3 px-4">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF5EB]">
                    {stockLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="py-2.5 px-4 text-xs text-[#4E6153]">
                          {formatFirestoreDate(log.createdAt, 'en')}
                        </td>
                        <td className="py-2.5 px-4 font-medium">
                          {log.productName}{' '}
                          <span className="text-xs text-[#4E6153]">({log.variantLabel})</span>
                        </td>
                        <td
                          className={`py-2.5 px-4 text-right font-mono-num font-bold ${
                            log.change >= 0 ? 'text-[#006B35]' : 'text-red-600'
                          }`}
                        >
                          {log.change >= 0 ? `+${log.change}` : log.change}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono-num text-xs">
                          {log.previousStock} → {log.newStock}
                        </td>
                        <td className="py-2.5 px-4 text-xs text-[#4E6153]">{log.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-[#DCE6DC] rounded-xl p-4">
              <div className="flex items-center gap-2">
                {[
                  ['all', `All Variants (${rows.length})`],
                  ['low', `Low Stock (${lowCount})`],
                  ['out', `Out of Stock (${outCount})`],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setInvFilter(key as 'all' | 'low' | 'out')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                      invFilter === key
                        ? 'bg-[#006B35] text-white'
                        : 'bg-[#F7FAF5] text-[#4E6153] hover:text-[#17251B]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <input
                value={stockReason}
                onChange={(e) => setStockReason(e.target.value)}
                placeholder="Adjustment reason for audit log..."
                className="px-3 py-1.5 rounded-lg border border-[#DCE6DC] text-xs w-64"
              />
            </div>

            <div className="bg-white border border-[#DCE6DC] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[#F7FAF5] border-b border-[#DCE6DC] text-xs text-[#4E6153] uppercase">
                    <tr>
                      <th className="py-3 px-4">Product</th>
                      <th className="py-3 px-4">Variant</th>
                      <th className="py-3 px-4">Alert</th>
                      <th className="py-3 px-4 text-right">Current Stock</th>
                      <th className="py-3 px-4 text-right">Update Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF5EB]">
                    {filteredRows.map(({ product, variant }) => {
                      const key = `${product.id}_${variant.id}`;
                      const draftVal = stockDrafts[key] ?? variant.stock;
                      const isOut = variant.stock <= 0;
                      const isLow = !isOut && variant.stock <= threshold;
                      return (
                        <tr key={key}>
                          <td className="py-3 px-4 font-semibold text-[#17251B]">
                            {product.nameEn}
                          </td>
                          <td className="py-3 px-4 text-xs text-[#4E6153]">{variant.labelEn}</td>
                          <td className="py-3 px-4 text-xs">
                            {isOut ? (
                              <span className="text-red-600 font-semibold inline-flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" /> Out of Stock
                              </span>
                            ) : isLow ? (
                              <span className="text-amber-700 font-semibold inline-flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" /> Low Stock
                              </span>
                            ) : (
                              <span className="text-[#168B35] font-medium">Healthy</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono-num font-bold">
                            {variant.stock}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end gap-2">
                              <input
                                type="number"
                                min={0}
                                value={draftVal}
                                onChange={(e) =>
                                  setStockDrafts((prev) => ({
                                    ...prev,
                                    [key]: Math.max(0, Number(e.target.value) || 0),
                                  }))
                                }
                                className="w-20 px-2.5 py-1 rounded border border-[#DCE6DC] text-right font-mono-num text-xs"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  void handleSaveStock(product, variant.id, draftVal)
                                }
                                className="px-3 py-1 rounded-lg bg-[#006B35] text-white text-xs font-semibold hover:bg-[#168B35] cursor-pointer"
                              >
                                Save
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // ================= RENDER: REVIEWS =================
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#17251B]">Customer Reviews</h2>
          <p className="text-xs text-[#4E6153]">
            Add verified customer testimonials, approve/hide reviews, and select homepage highlights.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingRevId(null);
            setRevForm({
              customerName: '',
              location: 'Dhaka',
              rating: 5,
              commentBn: '',
              commentEn: '',
              photoUrl: '',
              isApproved: true,
              showOnHomepage: true,
            });
            setRevModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#006B35] text-white text-sm font-semibold cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Customer Review</span>
        </button>
      </div>

      {reviews.length === 0 ? (
        <div className="bg-white border border-[#DCE6DC] rounded-xl p-10 text-center text-sm text-[#4E6153]">
          No customer reviews added yet. Authentic reviews added here appear on the storefront once approved.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-white border border-[#DCE6DC] rounded-xl p-5 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  {rev.photoUrl && (
                    <img
                      src={rev.photoUrl}
                      alt={rev.customerName}
                      className="w-10 h-10 rounded-full object-cover border border-[#DCE6DC]"
                    />
                  )}
                  <div>
                    <p className="font-bold text-sm text-[#17251B]">{rev.customerName}</p>
                    <p className="text-xs text-[#4E6153]">{rev.location || 'Bangladesh'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 text-amber-500">
                  {Array.from({ length: rev.rating }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-amber-500" />
                  ))}
                </div>
              </div>
              <p className="text-sm text-[#17251B]">{rev.commentEn || rev.commentBn}</p>
              {rev.commentBn && rev.commentEn && (
                <p className="text-xs text-[#4E6153]">{rev.commentBn}</p>
              )}
              <div className="pt-2 border-t border-[#EEF5EB] flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className={rev.isApproved ? 'text-[#006B35] font-semibold' : 'text-amber-700'}>
                    {rev.isApproved ? 'Approved' : 'Hidden'}
                  </span>
                  {rev.showOnHomepage && <span className="text-[#4E6153]">· Homepage</span>}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingRevId(rev.id);
                      setRevForm({
                        customerName: rev.customerName,
                        location: rev.location || '',
                        rating: rev.rating,
                        commentBn: rev.commentBn,
                        commentEn: rev.commentEn,
                        photoUrl: rev.photoUrl || '',
                        isApproved: rev.isApproved,
                        showOnHomepage: rev.showOnHomepage,
                      });
                      setRevModalOpen(true);
                    }}
                    className="text-[#006B35] font-semibold hover:underline cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void deleteReview(rev.id).then(() => notify('Review deleted.'))
                    }
                    className="text-red-600 hover:underline cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {revModalOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveReview}
            className="bg-white border border-[#DCE6DC] rounded-2xl max-w-lg w-full p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#17251B]">
                {editingRevId ? 'Edit Review' : 'Add Customer Review'}
              </h3>
              <button
                type="button"
                onClick={() => setRevModalOpen(false)}
                className="p-1 text-[#4E6153] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                  Customer Name *
                </label>
                <input
                  required
                  value={revForm.customerName}
                  onChange={(e) => setRevForm((p) => ({ ...p, customerName: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-[#DCE6DC] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                  Location
                </label>
                <input
                  value={revForm.location}
                  onChange={(e) => setRevForm((p) => ({ ...p, location: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-[#DCE6DC] text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#4E6153] mb-1">Rating</label>
              <select
                value={revForm.rating}
                onChange={(e) => setRevForm((p) => ({ ...p, rating: Number(e.target.value) }))}
                className="px-3 py-2 rounded-lg border border-[#DCE6DC] bg-white text-sm"
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} Stars
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                Review Text (English)
              </label>
              <textarea
                rows={2}
                value={revForm.commentEn}
                onChange={(e) => setRevForm((p) => ({ ...p, commentEn: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[#DCE6DC] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                রিভিউ (বাংলা)
              </label>
              <textarea
                rows={2}
                value={revForm.commentBn}
                onChange={(e) => setRevForm((p) => ({ ...p, commentBn: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[#DCE6DC] text-sm"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setRevImgModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#DCE6DC] text-xs font-semibold cursor-pointer"
              >
                <ImagePlus className="w-4 h-4 text-[#006B35]" />
                <span>Optional Customer Photo</span>
              </button>
              {revForm.photoUrl && (
                <img src={revForm.photoUrl} alt="Customer" className="w-9 h-9 rounded-full object-cover" />
              )}
            </div>
            <div className="flex items-center gap-5">
              <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={revForm.isApproved}
                  onChange={(e) => setRevForm((p) => ({ ...p, isApproved: e.target.checked }))}
                  className="accent-[#006B35]"
                />
                <span>Approved</span>
              </label>
              <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={revForm.showOnHomepage}
                  onChange={(e) => setRevForm((p) => ({ ...p, showOnHomepage: e.target.checked }))}
                  className="accent-[#006B35]"
                />
                <span>Display on Homepage</span>
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRevModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-[#DCE6DC] text-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-[#006B35] text-white text-sm font-semibold cursor-pointer"
              >
                Save Review
              </button>
            </div>
          </form>
        </div>
      )}

      <AdminImageUploaderModal
        open={revImgModal}
        onClose={() => setRevImgModal(false)}
        onSelect={(res) => setRevForm((p) => ({ ...p, photoUrl: res.url }))}
        mediaLibrary={mediaLibrary}
        defaultFolder="reviews"
        title="Select Customer Photo"
      />
    </div>
  );
}
