import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
  verifyAdminAuthorizationOnServer,
  type ServerAdminAuthResult,
} from '../lib/firebase';
import { INITIAL_CATEGORIES, INITIAL_PRODUCTS, INITIAL_SETTINGS } from '../data/initialSeed';
import { calculateVariantUnitPrice } from '../lib/i18n';
import { saveCustomerProfile, seedInitialDatabaseIfEmpty } from '../lib/firestoreService';
import type {
  AdminRole,
  CartItem,
  Category,
  CustomerProfile,
  Language,
  Product,
  ProductVariant,
  Review,
  SiteSettingsBundle,
} from '../types';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface AppContextValue {
  // Language
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;

  // Auth & RBAC
  user: User | null;
  authReady: boolean;
  isAdmin: boolean;
  adminRole: AdminRole | null;
  adminAuthError: string | null;
  verifyAdminSession: () => Promise<ServerAdminAuthResult>;
  loginWithGoogle: (options?: { silent?: boolean }) => Promise<User | null>;
  logout: () => Promise<void>;

  // Live Storefront Data (Firestore-backed with seamless initial seed fallback until first admin write)
  settings: SiteSettingsBundle;
  categories: Category[];
  products: Product[]; // published products for storefront; all products when admin
  allProductsAdmin: Product[];
  reviews: Review[];
  dataLoading: boolean;
  firestoreInitialized: boolean;

  // Cart & Customer State
  cart: CartItem[];
  cartCount: number;
  cartSubtotal: number;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  addToCart: (product: Product, variant: ProductVariant, quantity?: number) => void;
  updateCartItemQty: (productId: string, variantId: string, quantity: number) => void;
  changeCartItemVariant: (productId: string, oldVariantId: string, newVariant: ProductVariant) => void;
  removeFromCart: (productId: string, variantId: string) => void;
  clearCart: () => void;

  // Recently Viewed & Wishlist
  recentlyViewedIds: string[];
  recordProductView: (productId: string) => void;
  wishlistIds: string[];
  toggleWishlist: (productId: string) => Promise<void>;
  customerProfile: CustomerProfile | null;

  // Toasts
  toasts: ToastMessage[];
  notify: (message: string, type?: ToastMessage['type']) => void;
  dismissToast: (id: string) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

const CART_SESSION_KEY = 'zad_foods_cart_v1';
const LANG_SESSION_KEY = 'zad_foods_lang_v1';
const RECENT_SESSION_KEY = 'zad_foods_recent_v1';

export function AppProvider({ children }: { children: React.ReactNode }) {
  // Default language is Bangla ('bn') as specified
  const [lang, setLangState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(LANG_SESSION_KEY);
      return saved === 'en' ? 'en' : 'bn';
    } catch {
      return 'bn';
    }
  });

  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminRole, setAdminRole] = useState<AdminRole | null>(null);
  const [adminAuthError, setAdminAuthError] = useState<string | null>(null);

  const [settings, setSettings] = useState<SiteSettingsBundle>(INITIAL_SETTINGS);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [publishedProducts, setPublishedProducts] = useState<Product[]>(
    INITIAL_PRODUCTS.filter((p) => p.status === 'published')
  );
  const [allProductsAdmin, setAllProductsAdmin] = useState<Product[]>(INITIAL_PRODUCTS);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [firestoreInitialized, setFirestoreInitialized] = useState(false);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(CART_SESSION_KEY);
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  });
  const [cartOpen, setCartOpen] = useState(false);

  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(RECENT_SESSION_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const notify = useCallback((message: string, type: ToastMessage['type'] = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-3), { id, type, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    document.documentElement.lang = next;
    try {
      localStorage.setItem(LANG_SESSION_KEY, next);
    } catch {
      // ignore storage errors
    }
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === 'bn' ? 'en' : 'bn');
  }, [lang, setLang]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Persist cart across page refreshes
  useEffect(() => {
    try {
      localStorage.setItem(CART_SESSION_KEY, JSON.stringify(cart));
    } catch {
      // ignore
    }
  }, [cart]);

  // Apply dynamic Appearance CSS variables & SEO metadata whenever settings change
  useEffect(() => {
    const ap = settings.appearance;
    const root = document.documentElement;
    root.style.setProperty('--zad-primary', ap.primaryColor || '#006B35');
    root.style.setProperty('--zad-secondary', ap.secondaryColor || '#168B35');
    root.style.setProperty('--zad-accent', ap.accentColor || '#7CCB19');
    root.style.setProperty('--zad-bg', ap.backgroundColor || '#F7FAF5');
    root.style.setProperty('--zad-text', ap.textColor || '#17251B');
    const radiusMap = { sharp: '4px', rounded: '12px', soft: '20px' };
    root.style.setProperty('--zad-radius', radiusMap[ap.borderRadius] || '12px');

    if (ap.faviconUrl) {
      const iconLink = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (iconLink) iconLink.href = ap.faviconUrl;
    }

    const seo = settings.seo;
    document.title = lang === 'bn' ? seo.siteTitleBn || 'ZAD Foods' : seo.siteTitleEn || 'ZAD Foods';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        lang === 'bn' ? seo.metaDescriptionBn : seo.metaDescriptionEn
      );
    }
  }, [settings.appearance, settings.seo, lang]);

  // Auth listener & Server-Verified Admin RBAC resolution
  useEffect(() => {
    let active = true;
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setAuthReady(false);
      setUser(firebaseUser);
      if (!firebaseUser) {
        if (active) {
          setIsAdmin(false);
          setAdminRole(null);
          setAdminAuthError(null);
          setCustomerProfile(null);
          setAuthReady(true);
        }
        return;
      }

      try {
        // Authoritative backend/server verification — never trust client-side email matching
        const verification = await verifyAdminAuthorizationOnServer(firebaseUser);
        if (!active) return;

        if (verification.authorized && verification.role) {
          setIsAdmin(true);
          setAdminRole(verification.role);
          setAdminAuthError(null);
        } else {
          setIsAdmin(false);
          setAdminRole(null);
          setAdminAuthError(verification.error || null);
        }

        // Load customer profile & wishlist if exists
        try {
          const profileSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (!active) return;
          if (profileSnap.exists()) {
            setCustomerProfile(profileSnap.data() as CustomerProfile);
          } else {
            setCustomerProfile({
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || '',
              email: firebaseUser.email || '',
              wishlist: [],
            });
          }
        } catch (profileErr) {
          console.warn('Customer profile load warning:', profileErr);
        }
      } catch (err) {
        console.warn('Auth verification failed:', err);
        if (active) {
          setIsAdmin(false);
          setAdminRole(null);
          setAdminAuthError('Unable to verify administrator privileges.');
        }
      } finally {
        if (active) {
          setAuthReady(true);
        }
      }
    });
    return () => {
      active = false;
      unsub();
    };
  }, []);

  const verifyAdminSession = useCallback(async (): Promise<ServerAdminAuthResult> => {
    const current = auth.currentUser;
    if (!current) {
      setIsAdmin(false);
      setAdminRole(null);
      setAdminAuthError('Not signed in.');
      return { authorized: false, role: null, error: 'Not signed in.' };
    }
    const result = await verifyAdminAuthorizationOnServer(current);
    setIsAdmin(result.authorized && Boolean(result.role));
    setAdminRole(result.authorized ? result.role : null);
    setAdminAuthError(result.authorized ? null : result.error || null);
    return result;
  }, []);

  // Auto-seed Firestore on first verified Admin login if collections are empty
  useEffect(() => {
    if (!authReady || !isAdmin || !user) return;
    void seedInitialDatabaseIfEmpty()
      .then((res) => {
        if (res.seeded) {
          notify('Initial ZAD Foods database seeded into Cloud Firestore.', 'info');
        }
      })
      .catch((err) => {
        console.error('Seed check error:', err);
      });
  }, [authReady, isAdmin, user, notify]);

  // Live Firestore subscriptions for public storefront data
  useEffect(() => {
    let loadedSettings = false;
    let loadedProducts = false;
    const finishCheck = () => {
      if (loadedSettings && loadedProducts) setDataLoading(false);
    };

    const unsubSettings = onSnapshot(
      query(
        collection(db, 'settings'),
        where('section', 'in', ['business', 'appearance', 'homepage', 'delivery', 'seo', 'pages'])
      ),
      (snap) => {
        if (!snap.empty) {
          setFirestoreInitialized(true);
          setSettings((prev) => {
            const next = { ...prev };
            snap.docs.forEach((d) => {
              const docData = d.data() as { section: keyof SiteSettingsBundle; data: unknown };
              if (docData.section && docData.data) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (next as any)[docData.section] = {
                  ...INITIAL_SETTINGS[docData.section],
                  ...(docData.data as object),
                };
              }
            });
            return next;
          });
        }
        loadedSettings = true;
        finishCheck();
      },
      (err) => {
        loadedSettings = true;
        finishCheck();
        handleFirestoreError(err, OperationType.LIST, 'settings');
      }
    );

    const unsubCategories = onSnapshot(
      isAdmin
        ? collection(db, 'categories')
        : query(collection(db, 'categories'), where('isActive', '==', true)),
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<Category, 'id'>) }))
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          setCategories(list);
          setFirestoreInitialized(true);
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'categories');
      }
    );

    const unsubPublishedProducts = onSnapshot(
      query(collection(db, 'products'), where('status', '==', 'published')),
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Product, 'id'>) }));
          setPublishedProducts(list);
          setFirestoreInitialized(true);
        }
        loadedProducts = true;
        finishCheck();
      },
      (err) => {
        loadedProducts = true;
        finishCheck();
        handleFirestoreError(err, OperationType.LIST, 'products');
      }
    );

    const unsubReviews = onSnapshot(
      isAdmin
        ? collection(db, 'reviews')
        : query(collection(db, 'reviews'), where('isApproved', '==', true)),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Review, 'id'>) }));
        setReviews(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'reviews');
      }
    );

    return () => {
      unsubSettings();
      unsubCategories();
      unsubPublishedProducts();
      unsubReviews();
    };
  }, [isAdmin]);

  // Admin-only subscription to ALL products (including drafts/archived)
  useEffect(() => {
    if (!authReady || !isAdmin) return;
    const unsubAllProducts = onSnapshot(
      collection(db, 'products'),
      (snap) => {
        if (!snap.empty) {
          setAllProductsAdmin(
            snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Product, 'id'>) }))
          );
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'products');
      }
    );
    return () => unsubAllProducts();
  }, [authReady, isAdmin]);

  const loginWithGoogle = useCallback(
    async (options?: { silent?: boolean }) => {
      try {
        const result = await signInWithPopup(auth, googleProvider);
        if (!options?.silent) {
          notify(lang === 'bn' ? 'সফলভাবে সাইন-ইন সম্পন্ন হয়েছে' : 'Signed in successfully');
        }
        return result.user;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Sign-in cancelled';
        notify(msg, 'error');
        return null;
      }
    },
    [lang, notify]
  );

  const logout = useCallback(async () => {
    await signOut(auth);
    setIsAdmin(false);
    setAdminRole(null);
    setAdminAuthError(null);
    notify(lang === 'bn' ? 'সাইন-আউট সম্পন্ন হয়েছে' : 'Signed out');
  }, [lang, notify]);

  // Cart Actions
  const addToCart = useCallback(
    (product: Product, variant: ProductVariant, quantity = 1) => {
      if (variant.price === null || variant.price === undefined) {
        notify(
          lang === 'bn' ? 'এই পণ্যের মূল্য এখনো নির্ধারিত হয়নি' : 'Price is not set for this variant yet',
          'error'
        );
        return;
      }
      const stockLimit = settings.delivery.stockPolicy.enabled ? variant.stock : 9999;
      if (settings.delivery.stockPolicy.enabled && stockLimit <= 0) {
        notify(lang === 'bn' ? 'দুঃখিত, এই পণ্যটি বর্তমানে স্টকে নেই' : 'Sorry, this variant is out of stock', 'error');
        return;
      }

      const coverImg =
        product.images.find((i) => i.isCover)?.url || product.images[0]?.url || settings.appearance.logoUrl;

      setCart((prev) => {
        const existingIdx = prev.findIndex(
          (i) => i.productId === product.id && i.variantId === variant.id
        );
        if (existingIdx >= 0) {
          const nextQty = Math.min(stockLimit, prev[existingIdx].quantity + quantity);
          const pricing = calculateVariantUnitPrice(variant, nextQty);
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            quantity: nextQty,
            unitPrice: pricing.unitPrice,
            isWholesaleApplied: pricing.isWholesale,
            maxStock: stockLimit,
          };
          return updated;
        }
        const safeQty = Math.min(stockLimit, Math.max(1, quantity));
        const pricing = calculateVariantUnitPrice(variant, safeQty);
        return [
          ...prev,
          {
            productId: product.id,
            productSlug: product.slug,
            productNameBn: product.nameBn,
            productNameEn: product.nameEn,
            imageUrl: coverImg,
            variantId: variant.id,
            variantLabelBn: variant.labelBn,
            variantLabelEn: variant.labelEn,
            quantity: safeQty,
            retailPrice: variant.price!,
            unitPrice: pricing.unitPrice,
            isWholesaleApplied: pricing.isWholesale,
            freeDelivery: Boolean(variant.freeDelivery),
            maxStock: stockLimit,
          },
        ];
      });

      notify(
        lang === 'bn'
          ? `${product.nameBn} কার্টে যুক্ত হয়েছে`
          : `${product.nameEn} added to cart`
      );
    },
    [lang, notify, settings.appearance.logoUrl, settings.delivery.stockPolicy.enabled]
  );

  const updateCartItemQty = useCallback(
    (productId: string, variantId: string, quantity: number) => {
      if (quantity <= 0) {
        setCart((prev) => prev.filter((i) => !(i.productId === productId && i.variantId === variantId)));
        return;
      }
      const product = publishedProducts.find((p) => p.id === productId);
      const variant = product?.variants.find((v) => v.id === variantId);

      setCart((prev) =>
        prev.map((item) => {
          if (item.productId !== productId || item.variantId !== variantId) return item;
          const maxAllowed =
            settings.delivery.stockPolicy.enabled && variant ? variant.stock : item.maxStock;
          const clampedQty = Math.min(Math.max(1, quantity), Math.max(1, maxAllowed));
          const pricing = variant
            ? calculateVariantUnitPrice(variant, clampedQty)
            : { unitPrice: item.retailPrice, isWholesale: false };
          return {
            ...item,
            quantity: clampedQty,
            unitPrice: pricing.unitPrice,
            isWholesaleApplied: pricing.isWholesale,
            maxStock: maxAllowed,
          };
        })
      );
    },
    [publishedProducts, settings.delivery.stockPolicy.enabled]
  );

  const changeCartItemVariant = useCallback(
    (productId: string, oldVariantId: string, newVariant: ProductVariant) => {
      if (newVariant.price === null || newVariant.price === undefined) return;
      setCart((prev) => {
        const current = prev.find((i) => i.productId === productId && i.variantId === oldVariantId);
        if (!current) return prev;
        const maxStock = settings.delivery.stockPolicy.enabled ? newVariant.stock : 9999;
        const clampedQty = Math.min(current.quantity, Math.max(1, maxStock));
        const pricing = calculateVariantUnitPrice(newVariant, clampedQty);

        // Merge if newVariant already exists in cart
        const other = prev.filter((i) => !(i.productId === productId && i.variantId === oldVariantId));
        const dupIdx = other.findIndex((i) => i.productId === productId && i.variantId === newVariant.id);
        if (dupIdx >= 0) {
          const mergedQty = Math.min(maxStock, other[dupIdx].quantity + clampedQty);
          const mergedPricing = calculateVariantUnitPrice(newVariant, mergedQty);
          other[dupIdx] = {
            ...other[dupIdx],
            quantity: mergedQty,
            unitPrice: mergedPricing.unitPrice,
            isWholesaleApplied: mergedPricing.isWholesale,
          };
          return other;
        }

        return [
          ...other,
          {
            ...current,
            variantId: newVariant.id,
            variantLabelBn: newVariant.labelBn,
            variantLabelEn: newVariant.labelEn,
            quantity: clampedQty,
            retailPrice: newVariant.price!,
            unitPrice: pricing.unitPrice,
            isWholesaleApplied: pricing.isWholesale,
            freeDelivery: Boolean(newVariant.freeDelivery),
            maxStock,
          },
        ];
      });
    },
    [settings.delivery.stockPolicy.enabled]
  );

  const removeFromCart = useCallback((productId: string, variantId: string) => {
    setCart((prev) => prev.filter((i) => !(i.productId === productId && i.variantId === variantId)));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const recordProductView = useCallback((productId: string) => {
    setRecentlyViewedIds((prev) => {
      const next = [productId, ...prev.filter((id) => id !== productId)].slice(0, 8);
      try {
        localStorage.setItem(RECENT_SESSION_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const wishlistIds = useMemo(() => customerProfile?.wishlist || [], [customerProfile]);

  const toggleWishlist = useCallback(
    async (productId: string) => {
      if (!user) {
        notify(
          lang === 'bn' ? 'উইশলিস্ট সংরক্ষণ করতে গুগল দিয়ে সাইন-ইন করুন' : 'Sign in with Google to save your wishlist',
          'info'
        );
        return;
      }
      const exists = wishlistIds.includes(productId);
      const nextWishlist = exists
        ? wishlistIds.filter((id) => id !== productId)
        : [...wishlistIds, productId];

      const nextProfile: CustomerProfile = {
        uid: user.uid,
        displayName: customerProfile?.displayName || user.displayName || '',
        email: customerProfile?.email || user.email || '',
        phone: customerProfile?.phone,
        district: customerProfile?.district,
        thana: customerProfile?.thana,
        address: customerProfile?.address,
        wishlist: nextWishlist,
      };
      setCustomerProfile(nextProfile);
      await saveCustomerProfile(nextProfile);
      notify(
        exists
          ? lang === 'bn'
            ? 'উইশলিস্ট থেকে সরানো হয়েছে'
            : 'Removed from wishlist'
          : lang === 'bn'
          ? 'উইশলিস্টে যুক্ত হয়েছে'
          : 'Saved to wishlist'
      );
    },
    [customerProfile, lang, notify, user, wishlistIds]
  );

  const cartCount = useMemo(() => cart.reduce((acc, i) => acc + i.quantity, 0), [cart]);
  const cartSubtotal = useMemo(() => cart.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0), [cart]);

  const value: AppContextValue = {
    lang,
    setLang,
    toggleLang,
    user,
    authReady,
    isAdmin,
    adminRole,
    adminAuthError,
    verifyAdminSession,
    loginWithGoogle,
    logout,
    settings,
    categories,
    products: publishedProducts,
    allProductsAdmin,
    reviews,
    dataLoading,
    firestoreInitialized,
    cart,
    cartCount,
    cartSubtotal,
    cartOpen,
    setCartOpen,
    addToCart,
    updateCartItemQty,
    changeCartItemVariant,
    removeFromCart,
    clearCart,
    recentlyViewedIds,
    recordProductView,
    wishlistIds,
    toggleWishlist,
    customerProfile,
    toasts,
    notify,
    dismissToast,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
