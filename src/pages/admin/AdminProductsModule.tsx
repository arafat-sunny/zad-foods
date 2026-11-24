import React, { useMemo, useState } from 'react';
import {
  Copy,
  Edit3,
  Eye,
  EyeOff,
  GripVertical,
  ImagePlus,
  Plus,
  Save,
  Search,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { formatBDT } from '../../lib/i18n';
import { deleteProduct, saveProduct, slugify } from '../../lib/firestoreService';
import AdminImageUploaderModal from './AdminImageUploaderModal';
import type { MediaAsset, Product, ProductImage, ProductStatus, ProductVariant } from '../../types';

function emptyProduct(defaultCategoryId: string, defaultCategorySlug: string): Omit<Product, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    slug: '',
    sku: `ZAD-${Math.floor(1000 + Math.random() * 9000)}`,
    nameBn: '',
    nameEn: '',
    shortDescBn: '',
    shortDescEn: '',
    descBn: '',
    descEn: '',
    categoryId: defaultCategoryId,
    categorySlug: defaultCategorySlug,
    status: 'draft',
    isFeatured: false,
    isBestseller: false,
    isNewArrival: true,
    isOutOfStock: false,
    hasWholesale: false,
    wholesaleNoteBn: '',
    wholesaleNoteEn: '',
    specialOfferBn: '',
    specialOfferEn: '',
    deliveryInfoBn: '',
    deliveryInfoEn: '',
    images: [],
    variants: [
      {
        id: `var-${Date.now()}`,
        labelBn: '৫০০ গ্রাম',
        labelEn: '500 Gram',
        weightGrams: 500,
        price: null,
        compareAtPrice: null,
        stock: 0,
        sku: '',
        wholesalePrice: null,
        wholesaleMinQty: null,
        bulkTiers: [],
        freeDelivery: false,
      },
    ],
    tags: [],
    seoTitle: '',
    seoDescription: '',
  };
}

export default function AdminProductsModule({ mediaLibrary }: { mediaLibrary: MediaAsset[] }) {
  const { allProductsAdmin, categories, notify } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>(() =>
    emptyProduct(categories[0]?.id || '', categories[0]?.slug || '')
  );
  const [tagsInput, setTagsInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [replacingImageId, setReplacingImageId] = useState<string | null>(null);
  const [dragImageIdx, setDragImageIdx] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allProductsAdmin.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && p.categoryId !== categoryFilter) return false;
      if (q) {
        return (
          p.nameEn.toLowerCase().includes(q) ||
          p.nameBn.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allProductsAdmin, search, statusFilter, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const openNewProduct = () => {
    const firstCat = categories[0];
    setEditingId(null);
    setForm(emptyProduct(firstCat?.id || 'cat-nuts-dry-fruits', firstCat?.slug || 'nuts-dry-fruits'));
    setTagsInput('');
    setFormOpen(true);
  };

  const openEditProduct = (product: Product) => {
    setEditingId(product.id);
    setForm({
      slug: product.slug,
      sku: product.sku,
      nameBn: product.nameBn,
      nameEn: product.nameEn,
      shortDescBn: product.shortDescBn || '',
      shortDescEn: product.shortDescEn || '',
      descBn: product.descBn || '',
      descEn: product.descEn || '',
      categoryId: product.categoryId,
      categorySlug: product.categorySlug,
      status: product.status,
      isFeatured: product.isFeatured,
      isBestseller: product.isBestseller,
      isNewArrival: product.isNewArrival,
      isOutOfStock: product.isOutOfStock,
      hasWholesale: product.hasWholesale,
      wholesaleNoteBn: product.wholesaleNoteBn || '',
      wholesaleNoteEn: product.wholesaleNoteEn || '',
      specialOfferBn: product.specialOfferBn || '',
      specialOfferEn: product.specialOfferEn || '',
      deliveryInfoBn: product.deliveryInfoBn || '',
      deliveryInfoEn: product.deliveryInfoEn || '',
      images: product.images.map((i) => ({ ...i })),
      variants: product.variants.map((v) => ({ ...v, bulkTiers: [...(v.bulkTiers || [])] })),
      tags: [...product.tags],
      seoTitle: product.seoTitle || '',
      seoDescription: product.seoDescription || '',
    });
    setTagsInput(product.tags.join(', '));
    setFormOpen(true);
  };

  const handleDuplicate = async (product: Product) => {
    try {
      await saveProduct({
        ...product,
        nameEn: `${product.nameEn} (Copy)`,
        nameBn: `${product.nameBn} (কপি)`,
        slug: `${product.slug}-copy-${Date.now().toString().slice(-4)}`,
        sku: `${product.sku}-COPY`,
        status: 'draft',
      });
      notify('Product duplicated as draft.');
    } catch {
      notify('Failed to duplicate product.', 'error');
    }
  };

  const handleQuickPublishToggle = async (product: Product) => {
    const nextStatus: ProductStatus = product.status === 'published' ? 'draft' : 'published';
    try {
      await saveProduct({ ...product, status: nextStatus }, product.id);
      notify(`Product marked as ${nextStatus}.`);
    } catch {
      notify('Could not update status.', 'error');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nameEn.trim() || !form.nameBn.trim()) {
      notify('Please enter both Bangla and English product names.', 'error');
      return;
    }
    setSaving(true);
    try {
      const cat = categories.find((c) => c.id === form.categoryId);
      const normalizedImages = form.images.map((img, idx) => ({
        ...img,
        order: idx,
        isCover: form.images.some((i) => i.isCover) ? img.isCover : idx === 0,
      }));
      await saveProduct(
        {
          ...form,
          slug: form.slug.trim() ? slugify(form.slug) : slugify(form.nameEn),
          categorySlug: cat?.slug || form.categorySlug || 'nuts-dry-fruits',
          images: normalizedImages,
          tags: tagsInput
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
        },
        editingId || undefined
      );
      notify(editingId ? 'Product updated in Firestore.' : 'New product created.');
      setFormOpen(false);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to save product', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!confirmDelete) return;
    try {
      await deleteProduct(confirmDelete.id);
      notify(`Deleted "${confirmDelete.nameEn}".`);
      setConfirmDelete(null);
    } catch {
      notify('Failed to delete product.', 'error');
    }
  };

  const addVariant = () => {
    setForm((prev) => ({
      ...prev,
      variants: [
        ...prev.variants,
        {
          id: `var-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          labelBn: '',
          labelEn: '',
          weightGrams: 500,
          price: null,
          compareAtPrice: null,
          stock: 0,
          sku: '',
          wholesalePrice: null,
          wholesaleMinQty: null,
          bulkTiers: [],
          freeDelivery: false,
        },
      ],
    }));
  };

  const updateVariant = (idx: number, patch: Partial<ProductVariant>) => {
    setForm((prev) => {
      const next = [...prev.variants];
      next[idx] = { ...next[idx], ...patch };
      return { ...prev, variants: next };
    });
  };

  const removeVariant = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== idx),
    }));
  };

  const handleAddOrReplaceImage = (selected: { url: string; alt: string }) => {
    setForm((prev) => {
      if (replacingImageId) {
        return {
          ...prev,
          images: prev.images.map((img) =>
            img.id === replacingImageId ? { ...img, url: selected.url, alt: selected.alt } : img
          ),
        };
      }
      const nextImg: ProductImage = {
        id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        url: selected.url,
        alt: selected.alt,
        isCover: prev.images.length === 0,
        order: prev.images.length,
      };
      return { ...prev, images: [...prev.images, nextImg] };
    });
    setReplacingImageId(null);
  };

  const reorderImage = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx || toIdx < 0 || toIdx >= form.images.length) return;
    setForm((prev) => {
      const arr = [...prev.images];
      const [moved] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, moved);
      return { ...prev, images: arr.map((img, i) => ({ ...img, order: i })) };
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#17251B]">Products Catalog</h2>
          <p className="text-xs text-[#4E6153]">
            Manage products, variants, retail &amp; wholesale pricing, images, and publishing status.
          </p>
        </div>
        <button
          type="button"
          onClick={openNewProduct}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#006B35] text-white text-sm font-semibold hover:bg-[#168B35] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-white border border-[#DCE6DC] rounded-xl p-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-[#4E6153] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by Bangla/English name or SKU..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#DCE6DC] text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 rounded-lg border border-[#DCE6DC] bg-white text-sm"
        >
          <option value="all">All Statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 rounded-lg border border-[#DCE6DC] bg-white text-sm"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nameEn}
            </option>
          ))}
        </select>
      </div>

      {/* Products Data Table */}
      <div className="bg-white border border-[#DCE6DC] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#F7FAF5] border-b border-[#DCE6DC] text-xs text-[#4E6153] uppercase">
              <tr>
                <th className="py-3 px-4 font-semibold">Product</th>
                <th className="py-3 px-4 font-semibold">Category</th>
                <th className="py-3 px-4 font-semibold">Variants &amp; Prices</th>
                <th className="py-3 px-4 font-semibold text-right">Stock</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF5EB]">
              {paginated.map((product) => {
                const cover = product.images.find((i) => i.isCover)?.url || product.images[0]?.url;
                const cat = categories.find((c) => c.id === product.categoryId);
                const totalStock = product.variants.reduce((acc, v) => acc + (v.stock || 0), 0);

                return (
                  <tr key={product.id} className="hover:bg-[#F7FAF5]/60">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-lg bg-[#EEF5EB] border border-[#DCE6DC] overflow-hidden shrink-0">
                          {cover ? (
                            <img src={cover} alt={product.nameEn} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] text-[#4E6153]">
                              No img
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-[#17251B] truncate">{product.nameEn}</p>
                          <p className="text-xs text-[#4E6153] truncate">
                            {product.nameBn} · <span className="font-mono-num">{product.sku}</span>
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-[#4E6153]">
                      {cat?.nameEn || product.categorySlug}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono-num">
                      {product.variants.map((v) => (
                        <div key={v.id} className="whitespace-nowrap">
                          {v.labelEn}: <span className="font-semibold">{formatBDT(v.price, 'en')}</span>
                          {v.wholesalePrice ? ` (WS: ${formatBDT(v.wholesalePrice, 'en')})` : ''}
                        </div>
                      ))}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-num font-semibold">
                      <span className={totalStock <= 10 ? 'text-amber-700' : 'text-[#17251B]'}>
                        {totalStock}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block text-xs font-semibold px-2 py-0.5 rounded border capitalize ${
                          product.status === 'published'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : product.status === 'draft'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-100 text-slate-600 border-slate-300'
                        }`}
                      >
                        {product.status}
                      </span>
                      {product.isFeatured && (
                        <span className="ml-1.5 text-[11px] text-[#006B35] font-medium">
                          · Featured
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => void handleQuickPublishToggle(product)}
                          title={product.status === 'published' ? 'Unpublish to Draft' : 'Publish'}
                          className="p-1.5 rounded-lg text-[#4E6153] hover:text-[#006B35] hover:bg-[#EEF5EB] cursor-pointer"
                        >
                          {product.status === 'published' ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditProduct(product)}
                          title="Edit"
                          className="p-1.5 rounded-lg text-[#4E6153] hover:text-[#006B35] hover:bg-[#EEF5EB] cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDuplicate(product)}
                          title="Duplicate"
                          className="p-1.5 rounded-lg text-[#4E6153] hover:text-[#006B35] hover:bg-[#EEF5EB] cursor-pointer"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(product)}
                          title="Delete"
                          className="p-1.5 rounded-lg text-[#4E6153] hover:text-red-600 hover:bg-red-50 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-[#EEF5EB] flex items-center justify-between text-xs text-[#4E6153]">
            <span>
              Page {page} of {totalPages} ({filtered.length} products)
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 rounded border border-[#DCE6DC] disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 rounded border border-[#DCE6DC] disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Product Editor Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-3 sm:p-6">
          <form
            onSubmit={handleSave}
            className="bg-white border border-[#DCE6DC] rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl"
          >
            <div className="px-6 py-4 border-b border-[#DCE6DC] flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#17251B]">
                {editingId ? `Edit Product — ${form.nameEn}` : 'Create New Product'}
              </h3>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="p-1.5 rounded-lg text-[#4E6153] hover:bg-[#F7FAF5] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                    Product Name (English) *
                  </label>
                  <input
                    required
                    value={form.nameEn}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        nameEn: e.target.value,
                        slug: editingId ? prev.slug : slugify(e.target.value),
                      }))
                    }
                    className="w-full px-3.5 py-2 rounded-lg border border-[#DCE6DC] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                    পণ্যের নাম (বাংলা) *
                  </label>
                  <input
                    required
                    value={form.nameBn}
                    onChange={(e) => setForm((prev) => ({ ...prev, nameBn: e.target.value }))}
                    className="w-full px-3.5 py-2 rounded-lg border border-[#DCE6DC] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                    URL Slug
                  </label>
                  <input
                    value={form.slug}
                    onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                    className="w-full px-3.5 py-2 rounded-lg border border-[#DCE6DC] text-sm font-mono-num"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#4E6153] mb-1">SKU</label>
                    <input
                      required
                      value={form.sku}
                      onChange={(e) => setForm((prev) => ({ ...prev, sku: e.target.value }))}
                      className="w-full px-3.5 py-2 rounded-lg border border-[#DCE6DC] text-sm font-mono-num"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                      Category
                    </label>
                    <select
                      value={form.categoryId}
                      onChange={(e) => {
                        const c = categories.find((cat) => cat.id === e.target.value);
                        setForm((prev) => ({
                          ...prev,
                          categoryId: e.target.value,
                          categorySlug: c?.slug || prev.categorySlug,
                        }));
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-[#DCE6DC] bg-white text-sm"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nameEn}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Publishing & Merchandising Flags */}
              <div className="p-4 rounded-xl bg-[#F7FAF5] border border-[#DCE6DC] flex flex-wrap items-center gap-5">
                <div>
                  <label className="block text-[11px] font-semibold text-[#4E6153] mb-1">
                    Visibility Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, status: e.target.value as ProductStatus }))
                    }
                    className="px-3 py-1.5 rounded-lg border border-[#DCE6DC] bg-white text-sm font-semibold"
                  >
                    <option value="published">Published (Live)</option>
                    <option value="draft">Draft (Hidden)</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                {[
                  ['isFeatured', 'Featured'],
                  ['isBestseller', 'Bestseller'],
                  ['isNewArrival', 'New Arrival'],
                  ['isOutOfStock', 'Mark Out of Stock'],
                  ['hasWholesale', 'Enable Wholesale Pricing'],
                ].map(([key, label]) => (
                  <label key={key} className="inline-flex items-center gap-2 text-xs font-semibold text-[#17251B] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(form[key as keyof typeof form])}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, [key]: e.target.checked }))
                      }
                      className="accent-[#006B35] w-4 h-4"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>

              {/* Multi-Image Gallery Manager with Drag-and-Drop Reorder */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-[#17251B]">
                      Product Images (Drag to Reorder)
                    </h4>
                    <p className="text-xs text-[#4E6153]">
                      Upload compressed WebP images, pick from Media Library, set Cover photo, or edit alt text.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setReplacingImageId(null);
                      setImageModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#006B35] text-[#006B35] text-xs font-semibold hover:bg-[#EEF5EB] cursor-pointer"
                  >
                    <ImagePlus className="w-4 h-4" />
                    <span>Add / Upload Image</span>
                  </button>
                </div>

                {form.images.length === 0 ? (
                  <div className="border border-dashed border-[#DCE6DC] rounded-xl p-6 text-center text-xs text-[#4E6153]">
                    No product images yet. Click “Add / Upload Image” to upload or choose from Media Library.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {form.images.map((img, idx) => (
                      <div
                        key={img.id}
                        draggable
                        onDragStart={() => setDragImageIdx(idx)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => {
                          if (dragImageIdx !== null) reorderImage(dragImageIdx, idx);
                          setDragImageIdx(null);
                        }}
                        className={`border rounded-xl p-2.5 space-y-2 bg-white ${
                          img.isCover ? 'border-[#006B35]' : 'border-[#DCE6DC]'
                        }`}
                      >
                        <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-[#F7FAF5]">
                          <img
                            src={img.url}
                            alt={img.alt}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-1.5 left-1.5 bg-white/90 px-1.5 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1">
                            <GripVertical className="w-3 h-3 text-[#4E6153]" />
                            <span>#{idx + 1}</span>
                          </div>
                          {img.isCover && (
                            <span className="absolute top-1.5 right-1.5 bg-[#006B35] text-white text-[10px] font-semibold px-2 py-0.5 rounded">
                              Cover
                            </span>
                          )}
                        </div>
                        <input
                          value={img.alt}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              images: prev.images.map((item) =>
                                item.id === img.id ? { ...item, alt: e.target.value } : item
                              ),
                            }))
                          }
                          placeholder="Alt text..."
                          className="w-full px-2.5 py-1 rounded border border-[#DCE6DC] text-xs"
                        />
                        <div className="flex items-center justify-between gap-1 text-[11px]">
                          <button
                            type="button"
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                images: prev.images.map((item) => ({
                                  ...item,
                                  isCover: item.id === img.id,
                                })),
                              }))
                            }
                            className="inline-flex items-center gap-1 text-[#006B35] font-semibold hover:underline cursor-pointer"
                          >
                            <Star className={`w-3.5 h-3.5 ${img.isCover ? 'fill-[#006B35]' : ''}`} />
                            <span>Cover</span>
                          </button>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setReplacingImageId(img.id);
                                setImageModalOpen(true);
                              }}
                              className="text-[#4E6153] hover:text-[#006B35] cursor-pointer"
                            >
                              Replace
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setForm((prev) => ({
                                  ...prev,
                                  images: prev.images.filter((item) => item.id !== img.id),
                                }))
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
              </div>

              {/* Variants & Wholesale Pricing */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-[#17251B]">
                    Weight / Size Variants &amp; Pricing (BDT ৳)
                  </h4>
                  <button
                    type="button"
                    onClick={addVariant}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#006B35] text-[#006B35] text-xs font-semibold hover:bg-[#EEF5EB] cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Variant</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {form.variants.map((v, idx) => (
                    <div
                      key={v.id}
                      className="p-4 rounded-xl border border-[#DCE6DC] bg-[#F7FAF5]/60 space-y-3"
                    >
                      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-semibold text-[#4E6153] mb-0.5">
                            Label (EN) *
                          </label>
                          <input
                            required
                            value={v.labelEn}
                            onChange={(e) => updateVariant(idx, { labelEn: e.target.value })}
                            placeholder="e.g. 500 Gram"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-[#DCE6DC] bg-white text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-[#4E6153] mb-0.5">
                            লেবেল (বাংলা) *
                          </label>
                          <input
                            required
                            value={v.labelBn}
                            onChange={(e) => updateVariant(idx, { labelBn: e.target.value })}
                            placeholder="যেমন: ৫০০ গ্রাম"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-[#DCE6DC] bg-white text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-[#4E6153] mb-0.5">
                            Retail Price (৳)
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={v.price ?? ''}
                            onChange={(e) =>
                              updateVariant(idx, {
                                price: e.target.value === '' ? null : Number(e.target.value),
                              })
                            }
                            placeholder="Empty = TBD"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-[#DCE6DC] bg-white text-xs font-mono-num"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-[#4E6153] mb-0.5">
                            Previous Price (৳)
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={v.compareAtPrice ?? ''}
                            onChange={(e) =>
                              updateVariant(idx, {
                                compareAtPrice: e.target.value === '' ? null : Number(e.target.value),
                              })
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg border border-[#DCE6DC] bg-white text-xs font-mono-num"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-[#4E6153] mb-0.5">
                            Stock Qty
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={v.stock}
                            onChange={(e) =>
                              updateVariant(idx, { stock: Math.max(0, Number(e.target.value) || 0) })
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg border border-[#DCE6DC] bg-white text-xs font-mono-num"
                          />
                        </div>
                        <div className="flex items-end justify-between gap-2">
                          <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#006B35] cursor-pointer pb-1.5">
                            <input
                              type="checkbox"
                              checked={Boolean(v.freeDelivery)}
                              onChange={(e) =>
                                updateVariant(idx, { freeDelivery: e.target.checked })
                              }
                              className="accent-[#006B35]"
                            />
                            <span>Free Del.</span>
                          </label>
                          {form.variants.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeVariant(idx)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {form.hasWholesale && (
                        <div className="pt-2 border-t border-[#DCE6DC] grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-semibold text-[#006B35] mb-0.5">
                              Wholesale Price (৳)
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={v.wholesalePrice ?? ''}
                              onChange={(e) =>
                                updateVariant(idx, {
                                  wholesalePrice:
                                    e.target.value === '' ? null : Number(e.target.value),
                                })
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg border border-[#DCE6DC] bg-white text-xs font-mono-num"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-[#006B35] mb-0.5">
                              Min Wholesale Qty
                            </label>
                            <input
                              type="number"
                              min={1}
                              value={v.wholesaleMinQty ?? ''}
                              onChange={(e) =>
                                updateVariant(idx, {
                                  wholesaleMinQty:
                                    e.target.value === '' ? null : Number(e.target.value),
                                })
                              }
                              placeholder="e.g. 30"
                              className="w-full px-2.5 py-1.5 rounded-lg border border-[#DCE6DC] bg-white text-xs font-mono-num"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-[#4E6153] mb-0.5">
                              Special Bulk Qty (opt)
                            </label>
                            <input
                              type="number"
                              min={1}
                              value={v.bulkTiers?.[0]?.minQty ?? ''}
                              onChange={(e) => {
                                const minQty = Number(e.target.value);
                                const prevUnit = v.bulkTiers?.[0]?.unitPrice ?? 0;
                                updateVariant(idx, {
                                  bulkTiers:
                                    e.target.value === ''
                                      ? []
                                      : [{ minQty, unitPrice: prevUnit, labelEn: `Special Bulk (${minQty}+)`, labelBn: `বিশেষ পাইকারি (${minQty}+)` }],
                                });
                              }}
                              placeholder="e.g. 300"
                              className="w-full px-2.5 py-1.5 rounded-lg border border-[#DCE6DC] bg-white text-xs font-mono-num"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-[#4E6153] mb-0.5">
                              Special Bulk Price (৳)
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={v.bulkTiers?.[0]?.unitPrice ?? ''}
                              onChange={(e) => {
                                const unitPrice = Number(e.target.value);
                                const prevQty = v.bulkTiers?.[0]?.minQty ?? 300;
                                updateVariant(idx, {
                                  bulkTiers:
                                    e.target.value === ''
                                      ? []
                                      : [{ minQty: prevQty, unitPrice, labelEn: `Special Bulk (${prevQty}+)`, labelBn: `বিশেষ পাইকারি (${prevQty}+)` }],
                                });
                              }}
                              placeholder="e.g. 18"
                              className="w-full px-2.5 py-1.5 rounded-lg border border-[#DCE6DC] bg-white text-xs font-mono-num"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Descriptions, Offers, Delivery & SEO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                    Short Description (EN)
                  </label>
                  <textarea
                    rows={2}
                    value={form.shortDescEn}
                    onChange={(e) => setForm((p) => ({ ...p, shortDescEn: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-[#DCE6DC] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                    সংক্ষিপ্ত বিবরণ (বাংলা)
                  </label>
                  <textarea
                    rows={2}
                    value={form.shortDescBn}
                    onChange={(e) => setForm((p) => ({ ...p, shortDescBn: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-[#DCE6DC] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                    Full Description (EN)
                  </label>
                  <textarea
                    rows={4}
                    value={form.descEn}
                    onChange={(e) => setForm((p) => ({ ...p, descEn: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-[#DCE6DC] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                    বিস্তারিত বিবরণ (বাংলা)
                  </label>
                  <textarea
                    rows={4}
                    value={form.descBn}
                    onChange={(e) => setForm((p) => ({ ...p, descBn: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-[#DCE6DC] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                    Special Offer Banner Text (EN)
                  </label>
                  <input
                    value={form.specialOfferEn}
                    onChange={(e) => setForm((p) => ({ ...p, specialOfferEn: e.target.value }))}
                    placeholder="e.g. Free Home Delivery on 3 KG orders"
                    className="w-full px-3 py-2 rounded-lg border border-[#DCE6DC] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                    বিশেষ অফার (বাংলা)
                  </label>
                  <input
                    value={form.specialOfferBn}
                    onChange={(e) => setForm((p) => ({ ...p, specialOfferBn: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-[#DCE6DC] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                    Tags (comma separated)
                  </label>
                  <input
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="honey, natural, wholesale"
                    className="w-full px-3 py-2 rounded-lg border border-[#DCE6DC] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                    SEO Title
                  </label>
                  <input
                    value={form.seoTitle}
                    onChange={(e) => setForm((p) => ({ ...p, seoTitle: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-[#DCE6DC] text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-[#DCE6DC] bg-[#F7FAF5] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="px-4 py-2 rounded-lg border border-[#DCE6DC] bg-white text-sm font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#006B35] text-white text-sm font-semibold hover:bg-[#168B35] disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save Product'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DCE6DC] rounded-2xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-[#17251B]">Delete Product?</h3>
            <p className="text-sm text-[#4E6153]">
              Are you sure you want to permanently delete{' '}
              <span className="font-semibold text-[#17251B]">{confirmDelete.nameEn}</span>?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-lg border border-[#DCE6DC] text-sm font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteConfirmed()}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <AdminImageUploaderModal
        open={imageModalOpen}
        onClose={() => {
          setImageModalOpen(false);
          setReplacingImageId(null);
        }}
        onSelect={handleAddOrReplaceImage}
        mediaLibrary={mediaLibrary}
        defaultFolder="products"
        title={replacingImageId ? 'Replace Product Image' : 'Add Product Image'}
      />
    </div>
  );
}
