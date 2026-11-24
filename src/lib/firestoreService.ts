import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import {
  INITIAL_CATEGORIES,
  INITIAL_MEDIA_ASSETS,
  INITIAL_PRODUCTS,
  INITIAL_SETTINGS,
} from '../data/initialSeed';
import type {
  AdminUser,
  Category,
  CustomerProfile,
  Inquiry,
  MediaAsset,
  Order,
  OrderStatus,
  OrderTracking,
  PaymentStatus,
  Product,
  Review,
  SiteSettingsBundle,
  StockLog,
} from '../types';

function cleanId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now()}-${rand}`;
}

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 110) || `item-${Date.now()}`
  );
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

// ============================================================================
// INITIAL DATABASE SEEDING (ADMIN-ONLY ONE-TIME BOOTSTRAP INTO FIRESTORE)
// ============================================================================

export async function seedInitialDatabaseIfEmpty(): Promise<{ seeded: boolean; counts: Record<string, number> }> {
  const counts: Record<string, number> = { settings: 0, categories: 0, products: 0, media: 0 };

  try {
    // 1. Seed Settings sections if missing
    const settingKeys = Object.keys(INITIAL_SETTINGS) as (keyof SiteSettingsBundle)[];
    for (const section of settingKeys) {
      const ref = doc(db, 'settings', section);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          section,
          data: INITIAL_SETTINGS[section],
          updatedAt: serverTimestamp(),
        });
        counts.settings += 1;
      }
    }

    // 2. Seed Categories if empty
    const existingCats = await getDocs(collection(db, 'categories'));
    if (existingCats.empty) {
      for (const cat of INITIAL_CATEGORIES) {
        const payload = stripUndefined({
          slug: cat.slug,
          nameBn: cat.nameBn,
          nameEn: cat.nameEn,
          descriptionBn: cat.descriptionBn ?? '',
          descriptionEn: cat.descriptionEn ?? '',
          imageUrl: cat.imageUrl,
          order: cat.order,
          isActive: cat.isActive,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await setDoc(doc(db, 'categories', cat.id), payload);
        counts.categories += 1;
      }
    }

    // 3. Seed Products if empty
    const existingProds = await getDocs(collection(db, 'products'));
    if (existingProds.empty) {
      for (const prod of INITIAL_PRODUCTS) {
        const payload = stripUndefined({
          slug: prod.slug,
          sku: prod.sku,
          nameBn: prod.nameBn,
          nameEn: prod.nameEn,
          shortDescBn: prod.shortDescBn ?? '',
          shortDescEn: prod.shortDescEn ?? '',
          descBn: prod.descBn ?? '',
          descEn: prod.descEn ?? '',
          categoryId: prod.categoryId,
          categorySlug: prod.categorySlug,
          status: prod.status,
          isFeatured: prod.isFeatured,
          isBestseller: prod.isBestseller,
          isNewArrival: prod.isNewArrival,
          isOutOfStock: prod.isOutOfStock,
          hasWholesale: prod.hasWholesale,
          wholesaleNoteBn: prod.wholesaleNoteBn ?? '',
          wholesaleNoteEn: prod.wholesaleNoteEn ?? '',
          specialOfferBn: prod.specialOfferBn ?? '',
          specialOfferEn: prod.specialOfferEn ?? '',
          deliveryInfoBn: prod.deliveryInfoBn ?? '',
          deliveryInfoEn: prod.deliveryInfoEn ?? '',
          images: prod.images,
          variants: prod.variants,
          tags: prod.tags,
          seoTitle: prod.seoTitle ?? '',
          seoDescription: prod.seoDescription ?? '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await setDoc(doc(db, 'products', prod.id), payload);
        counts.products += 1;
      }
    }

    // 4. Seed Media Library with uploaded brand assets if empty
    const existingMedia = await getDocs(collection(db, 'media'));
    if (existingMedia.empty) {
      for (const asset of INITIAL_MEDIA_ASSETS) {
        await setDoc(doc(db, 'media', asset.id), {
          name: asset.name,
          url: asset.url,
          folder: asset.folder,
          alt: asset.alt ?? asset.name,
          createdAt: serverTimestamp(),
        });
        counts.media += 1;
      }
    }

    // 5. Ensure current signed-in owner exists in /admins/{uid}
    const currentUser = auth.currentUser;
    if (currentUser && currentUser.email) {
      const adminRef = doc(db, 'admins', currentUser.uid);
      const adminSnap = await getDoc(adminRef);
      if (!adminSnap.exists()) {
        await setDoc(adminRef, {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName || 'Irfan Ahmad (Owner)',
          role: 'owner',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }

    const totalSeeded = counts.settings + counts.categories + counts.products + counts.media;
    return { seeded: totalSeeded > 0, counts };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'seed');
  }
}

// ============================================================================
// SITE SETTINGS CRUD
// ============================================================================

export async function saveSettingsSection<K extends keyof SiteSettingsBundle>(
  section: K,
  data: SiteSettingsBundle[K]
): Promise<void> {
  const path = `settings/${section}`;
  try {
    const ref = doc(db, 'settings', section);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, {
        data,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        section,
        data,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ============================================================================
// CATEGORIES CRUD
// ============================================================================

export async function saveCategory(
  category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>,
  existingId?: string
): Promise<string> {
  const id = existingId || cleanId('cat');
  const path = `categories/${id}`;
  try {
    const ref = doc(db, 'categories', id);
    const base = {
      slug: slugify(category.slug || category.nameEn),
      nameBn: category.nameBn.trim().slice(0, 160),
      nameEn: category.nameEn.trim().slice(0, 160),
      descriptionBn: (category.descriptionBn || '').trim().slice(0, 600),
      descriptionEn: (category.descriptionEn || '').trim().slice(0, 600),
      imageUrl: (category.imageUrl || '').trim().slice(0, 2000),
      order: Number(category.order) || 0,
      isActive: Boolean(category.isActive),
      updatedAt: serverTimestamp(),
    };
    if (existingId) {
      await updateDoc(ref, base);
    } else {
      await setDoc(ref, { ...base, createdAt: serverTimestamp() });
    }
    return id;
  } catch (error) {
    handleFirestoreError(error, existingId ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function deleteCategory(categoryId: string): Promise<void> {
  const path = `categories/${categoryId}`;
  try {
    await deleteDoc(doc(db, 'categories', categoryId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ============================================================================
// PRODUCTS CRUD
// ============================================================================

export async function saveProduct(
  product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>,
  existingId?: string
): Promise<string> {
  const id = existingId || cleanId('prod');
  const path = `products/${id}`;
  try {
    const ref = doc(db, 'products', id);
    const payload = {
      slug: slugify(product.slug || product.nameEn),
      sku: (product.sku || `ZAD-${Date.now().toString().slice(-5)}`).trim().slice(0, 80),
      nameBn: product.nameBn.trim().slice(0, 200),
      nameEn: product.nameEn.trim().slice(0, 200),
      shortDescBn: (product.shortDescBn || '').trim().slice(0, 600),
      shortDescEn: (product.shortDescEn || '').trim().slice(0, 600),
      descBn: (product.descBn || '').trim().slice(0, 8000),
      descEn: (product.descEn || '').trim().slice(0, 8000),
      categoryId: product.categoryId.slice(0, 128),
      categorySlug: product.categorySlug.slice(0, 128),
      status: product.status,
      isFeatured: Boolean(product.isFeatured),
      isBestseller: Boolean(product.isBestseller),
      isNewArrival: Boolean(product.isNewArrival),
      isOutOfStock: Boolean(product.isOutOfStock),
      hasWholesale: Boolean(product.hasWholesale),
      wholesaleNoteBn: (product.wholesaleNoteBn || '').trim().slice(0, 600),
      wholesaleNoteEn: (product.wholesaleNoteEn || '').trim().slice(0, 600),
      specialOfferBn: (product.specialOfferBn || '').trim().slice(0, 400),
      specialOfferEn: (product.specialOfferEn || '').trim().slice(0, 400),
      deliveryInfoBn: (product.deliveryInfoBn || '').trim().slice(0, 600),
      deliveryInfoEn: (product.deliveryInfoEn || '').trim().slice(0, 600),
      images: product.images.slice(0, 15),
      variants: product.variants.slice(0, 20),
      tags: product.tags.filter(Boolean).slice(0, 15),
      seoTitle: (product.seoTitle || '').trim().slice(0, 200),
      seoDescription: (product.seoDescription || '').trim().slice(0, 500),
      updatedAt: serverTimestamp(),
    };
    if (existingId) {
      await updateDoc(ref, payload);
    } else {
      await setDoc(ref, { ...payload, createdAt: serverTimestamp() });
    }
    return id;
  } catch (error) {
    handleFirestoreError(error, existingId ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function deleteProduct(productId: string): Promise<void> {
  const path = `products/${productId}`;
  try {
    await deleteDoc(doc(db, 'products', productId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function adjustVariantStock(params: {
  product: Product;
  variantId: string;
  newStock: number;
  reason: string;
  orderNumber?: string;
}): Promise<void> {
  const { product, variantId, newStock, reason, orderNumber } = params;
  const clampedStock = Math.max(0, Math.round(newStock));
  const targetVariant = product.variants.find((v) => v.id === variantId);
  if (!targetVariant) return;

  const previousStock = targetVariant.stock;
  const updatedVariants = product.variants.map((v) =>
    v.id === variantId ? { ...v, stock: clampedStock } : v
  );
  const allZero = updatedVariants.every((v) => v.stock <= 0);

  const batch = writeBatch(db);
  batch.update(doc(db, 'products', product.id), {
    variants: updatedVariants,
    isOutOfStock: allZero,
    updatedAt: serverTimestamp(),
  });

  const logId = cleanId('stk');
  const logPayload: Record<string, unknown> = {
    productId: product.id,
    productName: product.nameEn,
    variantId: targetVariant.id,
    variantLabel: targetVariant.labelEn,
    previousStock,
    newStock: clampedStock,
    change: clampedStock - previousStock,
    reason: reason.trim().slice(0, 300),
    actorEmail: auth.currentUser?.email || 'admin',
    createdAt: serverTimestamp(),
  };
  if (orderNumber) {
    logPayload.orderNumber = orderNumber;
  }
  batch.set(doc(db, 'stockLogs', logId), logPayload);

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `products/${product.id}`);
  }
}

// ============================================================================
// ORDERS & ATOMIC ORDER TRACKING
// ============================================================================

export function generateOrderNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `ZAD-${y}${m}${d}-${rand}`;
}

export async function placeCustomerOrder(input: {
  customerName: string;
  phone: string;
  altPhone?: string;
  district: string;
  thana: string;
  address: string;
  notes?: string;
  paymentMethod: string;
  paymentReference?: string;
  items: Order['items'];
  subtotal: number;
  discount: number;
  deliveryCharge: number;
  totalAmount: number;
}): Promise<string> {
  const orderNumber = generateOrderNumber();
  const nowTs = serverTimestamp();

  const safeNum = (val: number): number => (Number.isFinite(Number(val)) && Number(val) >= 0 ? Number(val) : 0);

  const sanitizedItems = input.items.slice(0, 50).map((item) => {
    const qty = Math.max(1, Math.round(Number(item.quantity) || 1));
    const unit = safeNum(item.unitPrice);
    return {
      productId: String(item.productId || '').slice(0, 128),
      productNameBn: String(item.productNameBn || item.productNameEn || 'Product').slice(0, 200),
      productNameEn: String(item.productNameEn || item.productNameBn || 'Product').slice(0, 200),
      variantId: String(item.variantId || '').slice(0, 128),
      variantLabelBn: String(item.variantLabelBn || item.variantLabelEn || 'Standard').slice(0, 120),
      variantLabelEn: String(item.variantLabelEn || item.variantLabelBn || 'Standard').slice(0, 120),
      quantity: qty,
      unitPrice: unit,
      lineTotal: safeNum(item.lineTotal ?? unit * qty),
      isWholesale: Boolean(item.isWholesale),
      freeDelivery: Boolean(item.freeDelivery),
    };
  });

  const paymentStatus: PaymentStatus =
    input.paymentMethod.toLowerCase().includes('cash') ? 'unpaid' : 'pending_verification';

  const orderDoc: Record<string, unknown> = {
    orderNumber,
    customerName: input.customerName.trim().slice(0, 160),
    phone: input.phone.trim().slice(0, 32),
    district: input.district.trim().slice(0, 100),
    thana: input.thana.trim().slice(0, 120),
    address: input.address.trim().slice(0, 600),
    paymentMethod: input.paymentMethod.trim().slice(0, 80),
    paymentStatus,
    status: 'pending' as OrderStatus,
    items: sanitizedItems,
    subtotal: safeNum(input.subtotal),
    discount: safeNum(input.discount),
    deliveryCharge: safeNum(input.deliveryCharge),
    totalAmount: safeNum(input.totalAmount),
    stockDeducted: false,
    createdAt: nowTs,
    updatedAt: nowTs,
  };

  if (auth.currentUser?.uid) {
    orderDoc.customerUid = auth.currentUser.uid;
  }
  if (input.altPhone && input.altPhone.trim()) {
    orderDoc.altPhone = input.altPhone.trim().slice(0, 32);
  }
  if (input.notes && input.notes.trim()) {
    orderDoc.notes = input.notes.trim().slice(0, 600);
  }
  if (input.paymentReference && input.paymentReference.trim()) {
    orderDoc.paymentReference = input.paymentReference.trim().slice(0, 120);
  }

  const itemCount = Math.min(5000, Math.max(1, sanitizedItems.reduce((acc, item) => acc + item.quantity, 0)));
  const trackingDoc = {
    orderNumber,
    status: 'pending' as OrderStatus,
    district: input.district.trim().slice(0, 100),
    paymentMethod: input.paymentMethod.trim().slice(0, 80),
    subtotal: safeNum(input.subtotal),
    discount: safeNum(input.discount),
    deliveryCharge: safeNum(input.deliveryCharge),
    totalAmount: safeNum(input.totalAmount),
    itemCount,
    itemsSummary: sanitizedItems.map((i) => ({
      nameBn: i.productNameBn,
      nameEn: i.productNameEn,
      variantBn: i.variantLabelBn,
      variantEn: i.variantLabelEn,
      quantity: i.quantity,
      lineTotal: i.lineTotal,
    })),
    createdAt: nowTs,
    updatedAt: nowTs,
  };

  const batch = writeBatch(db);
  batch.set(doc(db, 'orderTracking', orderNumber), trackingDoc);
  batch.set(doc(db, 'orders', orderNumber), orderDoc);

  try {
    await batch.commit();
    return orderNumber;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `orders/${orderNumber}`);
  }
}

export async function getOrderTrackingByNumber(orderNumber: string): Promise<OrderTracking | null> {
  const normalized = orderNumber.trim().toUpperCase();
  if (!/^[a-zA-Z0-9_-]{3,64}$/.test(normalized)) return null;
  const path = `orderTracking/${normalized}`;
  try {
    const snap = await getDoc(doc(db, 'orderTracking', normalized));
    if (!snap.exists()) return null;
    return snap.data() as OrderTracking;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function updateOrderByAdmin(params: {
  order: Order;
  newStatus: OrderStatus;
  newPaymentStatus: PaymentStatus;
  adminNotes: string;
  products: Product[];
  stockPolicy: { enabled: boolean; deductOn: 'confirmed' | 'delivered'; restoreOnCancel: boolean };
}): Promise<void> {
  const { order, newStatus, newPaymentStatus, adminNotes, products, stockPolicy } = params;
  const batch = writeBatch(db);

  let nextStockDeducted = order.stockDeducted;
  const shouldDeductNow =
    stockPolicy.enabled &&
    !order.stockDeducted &&
    ((stockPolicy.deductOn === 'confirmed' &&
      ['confirmed', 'processing', 'ready_to_ship', 'shipped', 'delivered'].includes(newStatus)) ||
      (stockPolicy.deductOn === 'delivered' && newStatus === 'delivered'));

  const shouldRestoreNow =
    stockPolicy.enabled &&
    order.stockDeducted &&
    stockPolicy.restoreOnCancel &&
    ['cancelled', 'returned'].includes(newStatus);

  if (shouldDeductNow || shouldRestoreNow) {
    const deltaSign = shouldDeductNow ? -1 : 1;
    const productUpdates = new Map<string, Product>();

    for (const item of order.items) {
      const baseProd = productUpdates.get(item.productId) || products.find((p) => p.id === item.productId);
      if (!baseProd) continue;

      const updatedVariants = baseProd.variants.map((v) => {
        if (v.id !== item.variantId) return v;
        const prev = v.stock;
        const next = Math.max(0, prev + deltaSign * item.quantity);

        const logId = cleanId('stk');
        batch.set(doc(db, 'stockLogs', logId), {
          productId: baseProd.id,
          productName: baseProd.nameEn,
          variantId: v.id,
          variantLabel: v.labelEn,
          previousStock: prev,
          newStock: next,
          change: next - prev,
          reason: shouldDeductNow ? `Order ${order.orderNumber} (${newStatus})` : `Restored from ${order.orderNumber} (${newStatus})`,
          orderNumber: order.orderNumber,
          actorEmail: auth.currentUser?.email || 'admin',
          createdAt: serverTimestamp(),
        });

        return { ...v, stock: next };
      });

      productUpdates.set(baseProd.id, {
        ...baseProd,
        variants: updatedVariants,
        isOutOfStock: updatedVariants.every((v) => v.stock <= 0),
      });
    }

    for (const [pid, updatedProd] of productUpdates.entries()) {
      batch.update(doc(db, 'products', pid), {
        variants: updatedProd.variants,
        isOutOfStock: updatedProd.isOutOfStock,
        updatedAt: serverTimestamp(),
      });
    }

    nextStockDeducted = shouldDeductNow ? true : false;
  }

  batch.update(doc(db, 'orders', order.orderNumber), {
    status: newStatus,
    paymentStatus: newPaymentStatus,
    adminNotes: adminNotes.trim().slice(0, 1000),
    stockDeducted: nextStockDeducted,
    updatedAt: serverTimestamp(),
  });

  batch.update(doc(db, 'orderTracking', order.orderNumber), {
    status: newStatus,
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `orders/${order.orderNumber}`);
  }
}

export async function fetchCustomerOrders(uid: string): Promise<Order[]> {
  const path = 'orders';
  try {
    const q = query(collection(db, 'orders'), where('customerUid', '==', uid), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Order, 'id'>) }));
  } catch (error) {
    // Fallback without composite index if needed
    try {
      const qFallback = query(collection(db, 'orders'), where('customerUid', '==', uid));
      const snap = await getDocs(qFallback);
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Order, 'id'>) }));
    } catch (err2) {
      handleFirestoreError(err2, OperationType.LIST, path);
    }
  }
}

// ============================================================================
// REVIEWS CRUD
// ============================================================================

export async function saveReview(
  review: Omit<Review, 'id' | 'createdAt' | 'updatedAt'>,
  existingId?: string
): Promise<string> {
  const id = existingId || cleanId('rev');
  const path = `reviews/${id}`;
  try {
    const payload = stripUndefined({
      customerName: review.customerName.trim().slice(0, 120),
      location: (review.location || '').trim().slice(0, 120),
      rating: Math.min(5, Math.max(1, Number(review.rating) || 5)),
      commentBn: (review.commentBn || '').trim().slice(0, 1000),
      commentEn: (review.commentEn || '').trim().slice(0, 1000),
      photoUrl: (review.photoUrl || '').trim().slice(0, 2000),
      productId: review.productId || '',
      isApproved: Boolean(review.isApproved),
      showOnHomepage: Boolean(review.showOnHomepage),
      updatedAt: serverTimestamp(),
    });
    if (existingId) {
      await updateDoc(doc(db, 'reviews', id), payload);
    } else {
      await setDoc(doc(db, 'reviews', id), { ...payload, createdAt: serverTimestamp() });
    }
    return id;
  } catch (error) {
    handleFirestoreError(error, existingId ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function deleteReview(reviewId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'reviews', reviewId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `reviews/${reviewId}`);
  }
}

// ============================================================================
// MEDIA LIBRARY CRUD
// ============================================================================

export async function saveMediaAsset(
  asset: Omit<MediaAsset, 'id' | 'createdAt'>,
  existingId?: string
): Promise<string> {
  const id = existingId || cleanId('med');
  const path = `media/${id}`;
  try {
    const payload = stripUndefined({
      name: asset.name.trim().slice(0, 200),
      url: asset.url.trim().slice(0, 2000),
      storagePath: asset.storagePath ? asset.storagePath.slice(0, 500) : undefined,
      folder: asset.folder,
      alt: (asset.alt || asset.name).trim().slice(0, 250),
      width: asset.width,
      height: asset.height,
      sizeBytes: asset.sizeBytes,
      mimeType: asset.mimeType,
    });
    if (existingId) {
      await updateDoc(doc(db, 'media', id), payload);
    } else {
      await setDoc(doc(db, 'media', id), { ...payload, createdAt: serverTimestamp() });
    }
    return id;
  } catch (error) {
    handleFirestoreError(error, existingId ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function deleteMediaAsset(mediaId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'media', mediaId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `media/${mediaId}`);
  }
}

// ============================================================================
// INQUIRIES (WHOLESALE / CONTACT / NEWSLETTER)
// ============================================================================

export async function submitInquiry(input: Omit<Inquiry, 'id' | 'status' | 'createdAt'>): Promise<string> {
  const id = cleanId('inq');
  const path = `inquiries/${id}`;
  try {
    const payload = stripUndefined({
      type: input.type,
      name: input.name ? input.name.trim().slice(0, 160) : undefined,
      phone: input.phone ? input.phone.trim().slice(0, 32) : undefined,
      email: input.email ? input.email.trim().slice(0, 200) : undefined,
      businessName: input.businessName ? input.businessName.trim().slice(0, 200) : undefined,
      productInterest: input.productInterest ? input.productInterest.trim().slice(0, 200) : undefined,
      quantity: input.quantity ? input.quantity.trim().slice(0, 100) : undefined,
      message: input.message ? input.message.trim().slice(0, 2000) : undefined,
      status: 'new',
      createdAt: serverTimestamp(),
    });
    await setDoc(doc(db, 'inquiries', id), payload);
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateInquiryStatus(inquiryId: string, status: Inquiry['status']): Promise<void> {
  try {
    await updateDoc(doc(db, 'inquiries', inquiryId), { status });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `inquiries/${inquiryId}`);
  }
}

export async function deleteInquiry(inquiryId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'inquiries', inquiryId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `inquiries/${inquiryId}`);
  }
}

// ============================================================================
// ADMIN USERS & CUSTOMER PROFILES
// ============================================================================

export async function saveAdminUser(adminUser: Omit<AdminUser, 'createdAt' | 'updatedAt'>, isEdit = false): Promise<void> {
  const uid = adminUser.uid.trim();
  const path = `admins/${uid}`;
  try {
    if (isEdit) {
      await updateDoc(doc(db, 'admins', uid), {
        email: adminUser.email.trim().slice(0, 200),
        displayName: adminUser.displayName.trim().slice(0, 120),
        role: adminUser.role,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'admins', uid), {
        uid,
        email: adminUser.email.trim().slice(0, 200),
        displayName: adminUser.displayName.trim().slice(0, 120),
        role: adminUser.role,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, isEdit ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function deleteAdminUser(uid: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'admins', uid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `admins/${uid}`);
  }
}

export async function saveCustomerProfile(profile: Omit<CustomerProfile, 'updatedAt'>): Promise<void> {
  const path = `users/${profile.uid}`;
  try {
    const ref = doc(db, 'users', profile.uid);
    const snap = await getDoc(ref);
    const payload = stripUndefined({
      uid: profile.uid,
      displayName: profile.displayName?.trim().slice(0, 160),
      email: profile.email?.trim().slice(0, 200),
      phone: profile.phone?.trim().slice(0, 32),
      district: profile.district?.trim().slice(0, 100),
      thana: profile.thana?.trim().slice(0, 120),
      address: profile.address?.trim().slice(0, 600),
      wishlist: profile.wishlist.slice(0, 100),
      updatedAt: serverTimestamp(),
    });
    if (snap.exists()) {
      await updateDoc(ref, payload);
    } else {
      await setDoc(ref, payload);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchStockLogs(): Promise<StockLog[]> {
  try {
    const snap = await getDocs(query(collection(db, 'stockLogs'), orderBy('createdAt', 'desc')));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<StockLog, 'id'>) }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'stockLogs');
  }
}
