export type Language = 'bn' | 'en';

export type AdminRole = 'owner' | 'manager' | 'staff';

export interface AdminUser {
  uid: string;
  email: string;
  displayName: string;
  role: AdminRole;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface BusinessSettings {
  brandNameBn: string;
  brandNameEn: string;
  taglineBn: string;
  taglineEn: string;
  founderNameBn: string;
  founderNameEn: string;
  phone: string;
  whatsappNumber: string;
  email: string;
  addressBn: string;
  addressEn: string;
  division: string;
  country: string;
  facebookName: string;
  facebookUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
  businessHoursBn: string;
  businessHoursEn: string;
  descriptionBn: string;
  descriptionEn: string;
  footerDescriptionBn: string;
  footerDescriptionEn: string;
  footerCopyrightBn: string;
  footerCopyrightEn: string;
  showWhatsAppButton: boolean;
}

export interface AppearanceSettings {
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontChoice: 'default' | 'modern' | 'editorial';
  borderRadius: 'sharp' | 'rounded' | 'soft';
  buttonStyle: 'solid' | 'pill' | 'outline';
  headerStyle: 'clean' | 'tinted';
  footerStyle: 'dark' | 'light';
}

export interface NavItemConfig {
  id: string;
  labelBn: string;
  labelEn: string;
  path: string;
  enabled: boolean;
  order: number;
}

export interface HeroSlide {
  id: string;
  titleBn: string;
  titleEn: string;
  subtitleBn: string;
  subtitleEn: string;
  primaryCtaBn: string;
  primaryCtaEn: string;
  primaryLink: string;
  secondaryCtaBn: string;
  secondaryCtaEn: string;
  secondaryLink: string;
  desktopImage: string;
  mobileImage: string;
  enabled: boolean;
  order: number;
}

export interface WhyChooseItem {
  id: string;
  icon: 'shield' | 'leaf' | 'shopping' | 'truck' | 'award' | 'heart';
  titleBn: string;
  titleEn: string;
  descBn: string;
  descEn: string;
}

export interface HomepageSettings {
  announcementBar: {
    enabled: boolean;
    textBn: string;
    textEn: string;
    bgColor: string;
    link: string;
  };
  navItems: NavItemConfig[];
  heroSlides: HeroSlide[];
  featuredCategoriesEnabled: boolean;
  featuredCategoriesTitleBn: string;
  featuredCategoriesTitleEn: string;
  featuredProductsEnabled: boolean;
  featuredProductsTitleBn: string;
  featuredProductsTitleEn: string;
  promoBanner: {
    enabled: boolean;
    titleBn: string;
    titleEn: string;
    subtitleBn: string;
    subtitleEn: string;
    ctaBn: string;
    ctaEn: string;
    link: string;
    imageUrl: string;
  };
  whyChooseUs: {
    enabled: boolean;
    headingBn: string;
    headingEn: string;
    items: WhyChooseItem[];
  };
  brandIntro: {
    enabled: boolean;
    headingBn: string;
    headingEn: string;
    descriptionBn: string;
    descriptionEn: string;
    ctaBn: string;
    ctaEn: string;
    imageUrl: string;
  };
  reviewsEnabled: boolean;
  reviewsHeadingBn: string;
  reviewsHeadingEn: string;
  newsletter: {
    enabled: boolean;
    headingBn: string;
    headingEn: string;
    descriptionBn: string;
    descriptionEn: string;
  };
}

export interface ManualPaymentMethod {
  id: string;
  name: string;
  accountNumber: string;
  instructionsBn: string;
  instructionsEn: string;
  enabled: boolean;
}

export interface DeliverySettings {
  insideDhakaCharge: number;
  outsideDhakaCharge: number;
  freeDeliveryThreshold: number;
  deliveryAreas: string[];
  codEnabled: boolean;
  manualPaymentEnabled: boolean;
  manualPaymentMethods: ManualPaymentMethod[];
  deliveryNoteBn: string;
  deliveryNoteEn: string;
  stockPolicy: {
    enabled: boolean;
    deductOn: 'confirmed' | 'delivered';
    restoreOnCancel: boolean;
    lowStockThreshold: number;
  };
}

export interface SeoSettings {
  siteTitleBn: string;
  siteTitleEn: string;
  metaDescriptionBn: string;
  metaDescriptionEn: string;
  keywords: string;
  ogImageUrl: string;
}

export interface PagesSettings {
  aboutUs: {
    headingBn: string;
    headingEn: string;
    introBn: string;
    introEn: string;
    missionBn: string;
    missionEn: string;
    founderNoteBn: string;
    founderNoteEn: string;
  };
  contactUs: {
    headingBn: string;
    headingEn: string;
    introBn: string;
    introEn: string;
  };
  privacyPolicy: {
    titleBn: string;
    titleEn: string;
    contentBn: string;
    contentEn: string;
  };
  terms: {
    titleBn: string;
    titleEn: string;
    contentBn: string;
    contentEn: string;
  };
  returnPolicy: {
    titleBn: string;
    titleEn: string;
    contentBn: string;
    contentEn: string;
  };
}

export interface SiteSettingsBundle {
  business: BusinessSettings;
  appearance: AppearanceSettings;
  homepage: HomepageSettings;
  delivery: DeliverySettings;
  seo: SeoSettings;
  pages: PagesSettings;
}

export interface Category {
  id: string;
  slug: string;
  nameBn: string;
  nameEn: string;
  descriptionBn?: string;
  descriptionEn?: string;
  imageUrl: string;
  order: number;
  isActive: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ProductImage {
  id: string;
  url: string;
  alt: string;
  isCover: boolean;
  order: number;
}

export interface BulkTier {
  minQty: number;
  unitPrice: number;
  labelBn?: string;
  labelEn?: string;
}

export interface ProductVariant {
  id: string;
  labelBn: string;
  labelEn: string;
  weightGrams?: number;
  price: number | null; // null when price is not yet determined (e.g. draft product)
  compareAtPrice?: number | null;
  stock: number;
  sku?: string;
  wholesalePrice?: number | null;
  wholesaleMinQty?: number | null;
  bulkTiers?: BulkTier[];
  freeDelivery?: boolean;
  noteBn?: string;
  noteEn?: string;
}

export type ProductStatus = 'published' | 'draft' | 'archived';

export interface Product {
  id: string;
  slug: string;
  sku: string;
  nameBn: string;
  nameEn: string;
  shortDescBn?: string;
  shortDescEn?: string;
  descBn?: string;
  descEn?: string;
  categoryId: string;
  categorySlug: string;
  status: ProductStatus;
  isFeatured: boolean;
  isBestseller: boolean;
  isNewArrival: boolean;
  isOutOfStock: boolean;
  hasWholesale: boolean;
  wholesaleNoteBn?: string;
  wholesaleNoteEn?: string;
  specialOfferBn?: string;
  specialOfferEn?: string;
  deliveryInfoBn?: string;
  deliveryInfoEn?: string;
  images: ProductImage[];
  variants: ProductVariant[];
  tags: string[];
  seoTitle?: string;
  seoDescription?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CartItem {
  productId: string;
  productSlug: string;
  productNameBn: string;
  productNameEn: string;
  imageUrl: string;
  variantId: string;
  variantLabelBn: string;
  variantLabelEn: string;
  quantity: number;
  retailPrice: number;
  unitPrice: number;
  isWholesaleApplied: boolean;
  freeDelivery: boolean;
  maxStock: number;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'ready_to_ship'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned';

export type PaymentStatus = 'unpaid' | 'paid' | 'pending_verification' | 'refunded';

export interface OrderItem {
  productId: string;
  productNameBn: string;
  productNameEn: string;
  variantId: string;
  variantLabelBn: string;
  variantLabelEn: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  isWholesale: boolean;
  freeDelivery: boolean;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerUid?: string;
  customerName: string;
  phone: string;
  altPhone?: string;
  district: string;
  thana: string;
  address: string;
  notes?: string;
  adminNotes?: string;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  paymentReference?: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  deliveryCharge: number;
  totalAmount: number;
  stockDeducted: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface OrderTracking {
  orderNumber: string;
  status: OrderStatus;
  district: string;
  paymentMethod: string;
  subtotal: number;
  discount: number;
  deliveryCharge: number;
  totalAmount: number;
  itemCount: number;
  itemsSummary: {
    nameBn: string;
    nameEn: string;
    variantBn: string;
    variantEn: string;
    quantity: number;
    lineTotal: number;
  }[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Review {
  id: string;
  customerName: string;
  location?: string;
  rating: number;
  commentBn: string;
  commentEn: string;
  photoUrl?: string;
  productId?: string;
  isApproved: boolean;
  showOnHomepage: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type MediaFolder = 'products' | 'banners' | 'categories' | 'brand' | 'reviews' | 'general';

export interface MediaAsset {
  id: string;
  name: string;
  url: string;
  storagePath?: string;
  folder: MediaFolder;
  alt?: string;
  width?: number;
  height?: number;
  sizeBytes?: number;
  mimeType?: string;
  createdAt?: unknown;
}

export interface Inquiry {
  id: string;
  type: 'wholesale' | 'contact' | 'newsletter';
  name?: string;
  phone?: string;
  email?: string;
  businessName?: string;
  productInterest?: string;
  quantity?: string;
  message?: string;
  status: 'new' | 'contacted' | 'closed';
  createdAt?: unknown;
}

export interface StockLog {
  id: string;
  productId: string;
  productName: string;
  variantId: string;
  variantLabel: string;
  previousStock: number;
  newStock: number;
  change: number;
  reason: string;
  orderNumber?: string;
  actorEmail?: string;
  createdAt?: unknown;
}

export interface CustomerProfile {
  uid: string;
  displayName?: string;
  email?: string;
  phone?: string;
  district?: string;
  thana?: string;
  address?: string;
  wishlist: string[];
  updatedAt?: unknown;
}
