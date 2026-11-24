import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageCircle,
  Minus,
  Package,
  Plus,
  ShoppingBag,
  Truck,
  X,
  ZoomIn,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import {
  calculateVariantUnitPrice,
  formatBDT,
  formatWhatsAppLink,
  pickLang,
} from '../lib/i18n';
import { submitInquiry } from '../lib/firestoreService';
import ProductCard from '../components/store/ProductCard';
import { SafeImage } from '../components/store/StoreLayout';

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const {
    lang,
    products,
    categories,
    settings,
    addToCart,
    recordProductView,
    wishlistIds,
    toggleWishlist,
    notify,
  } = useApp();

  const product = useMemo(() => products.find((p) => p.slug === slug), [products, slug]);
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [wholesaleModalOpen, setWholesaleModalOpen] = useState(false);

  // Wholesale inquiry state
  const [wName, setWName] = useState('');
  const [wPhone, setWPhone] = useState('');
  const [wBusiness, setWBusiness] = useState('');
  const [wQty, setWQty] = useState('30+');
  const [wMsg, setWMsg] = useState('');
  const [wSubmitting, setWSubmitting] = useState(false);

  useEffect(() => {
    if (!product) return;
    recordProductView(product.id);
    const firstPriced =
      product.variants.find((v) => v.price !== null && v.price !== undefined) ||
      product.variants[0];
    setSelectedVariantId(firstPriced?.id || '');
    setQuantity(1);
    setActiveImageIdx(0);
    setZoomed(false);
  }, [product, recordProductView]);

  if (!product) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold text-[#17251B] mb-2">
          {lang === 'bn' ? 'পণ্যটি খুঁজে পাওয়া যায়নি' : 'Product Not Found'}
        </h1>
        <p className="text-sm text-[#4E6153] mb-6">
          {lang === 'bn'
            ? 'এই পণ্যটি বর্তমানে উপলব্ধ নয় বা সরানো হয়েছে।'
            : 'This product may have been removed or is currently in draft.'}
        </p>
        <Link
          to="/shop"
          className="inline-flex px-5 py-2.5 rounded-lg text-sm font-semibold text-white"
          style={{ backgroundColor: 'var(--zad-primary)' }}
        >
          {lang === 'bn' ? 'শপে ফিরে যান' : 'Return to Shop'}
        </Link>
      </div>
    );
  }

  const images = [...product.images].sort((a, b) => a.order - b.order);
  const currentImg = images[activeImageIdx] || images[0];
  const category = categories.find((c) => c.id === product.categoryId);
  const selectedVariant =
    product.variants.find((v) => v.id === selectedVariantId) || product.variants[0];

  const stockEnabled = settings.delivery.stockPolicy.enabled;
  const maxStock = selectedVariant
    ? stockEnabled
      ? selectedVariant.stock
      : 9999
    : 0;
  const isOutOfStock =
    product.isOutOfStock || !selectedVariant || (stockEnabled && maxStock <= 0);

  const pricing = selectedVariant
    ? calculateVariantUnitPrice(selectedVariant, quantity)
    : { unitPrice: 0, isWholesale: false };

  const lineTotal = pricing.unitPrice * quantity;
  const isWishlisted = wishlistIds.includes(product.id);

  const relatedProducts = products
    .filter((p) => p.id !== product.id && p.categoryId === product.categoryId)
    .slice(0, 3);

  const handleAddToCart = () => {
    if (!selectedVariant || selectedVariant.price === null) return;
    addToCart(product, selectedVariant, quantity);
  };

  const handleBuyNow = () => {
    if (!selectedVariant || selectedVariant.price === null) return;
    addToCart(product, selectedVariant, quantity);
    navigate('/checkout');
  };

  const handleWholesaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWSubmitting(true);
    try {
      await submitInquiry({
        type: 'wholesale',
        name: wName,
        phone: wPhone,
        businessName: wBusiness,
        productInterest: `${product.nameEn} (${selectedVariant?.labelEn || ''})`,
        quantity: wQty,
        message: wMsg,
      });
      notify(
        lang === 'bn'
          ? 'আপনার পাইকারি অনুসন্ধান সফলভাবে জমা হয়েছে! আমরা শীঘ্রই যোগাযোগ করব।'
          : 'Wholesale inquiry submitted! Our team will contact you shortly.'
      );
      setWholesaleModalOpen(false);
      setWName('');
      setWPhone('');
      setWBusiness('');
      setWMsg('');
    } catch {
      notify(lang === 'bn' ? 'জমা দিতে সমস্যা হয়েছে' : 'Failed to submit inquiry', 'error');
    } finally {
      setWSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 pb-36 lg:pb-12">
      {/* Breadcrumb */}
      <nav className="flex items-center flex-wrap gap-1.5 text-xs text-[#4E6153] mb-6">
        <Link to="/" className="hover:text-[#006B35]">
          {lang === 'bn' ? 'হোম' : 'Home'}
        </Link>
        <span>/</span>
        <Link to="/shop" className="hover:text-[#006B35]">
          {lang === 'bn' ? 'শপ' : 'Shop'}
        </Link>
        {category && (
          <>
            <span>/</span>
            <Link to={`/category/${category.slug}`} className="hover:text-[#006B35]">
              {pickLang(category.nameBn, category.nameEn, lang)}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-[#17251B] font-medium">
          {pickLang(product.nameBn, product.nameEn, lang)}
        </span>
      </nav>

      {/* Main 2-Column Sticky PDP Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left: Product Image Gallery with Zoom & Mobile Swipe */}
        <div className="lg:col-span-6 lg:sticky lg:top-24 space-y-3">
          <div
            className="relative aspect-[4/3] bg-white border border-[#DCE6DC] rounded-2xl overflow-hidden group select-none"
            onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
            onTouchEnd={(e) => {
              if (touchStartX === null || images.length <= 1) return;
              const delta = e.changedTouches[0].clientX - touchStartX;
              if (Math.abs(delta) > 40) {
                setActiveImageIdx((prev) =>
                  delta < 0
                    ? (prev + 1) % images.length
                    : (prev - 1 + images.length) % images.length
                );
              }
              setTouchStartX(null);
            }}
          >
            <SafeImage
              src={currentImg?.url}
              alt={currentImg?.alt || pickLang(product.nameBn, product.nameEn, lang)}
              fallbackLabel={pickLang(product.nameBn, product.nameEn, lang)}
              className={`w-full h-full object-cover transition-transform duration-300 ${
                zoomed ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in'
              }`}
            />

            {currentImg?.url && (
              <button
                type="button"
                onClick={() => setZoomed((z) => !z)}
                aria-label="Toggle image zoom"
                className="absolute bottom-3 right-3 p-2 rounded-lg bg-white/90 border border-[#DCE6DC] text-[#17251B] hover:text-[#006B35] cursor-pointer"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            )}

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setActiveImageIdx((prev) => (prev - 1 + images.length) % images.length)
                  }
                  aria-label="Previous image"
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 border border-[#DCE6DC] text-[#17251B] hover:text-[#006B35] cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveImageIdx((prev) => (prev + 1) % images.length)}
                  aria-label="Next image"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 border border-[#DCE6DC] text-[#17251B] hover:text-[#006B35] cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          {/* Thumbnail Strip */}
          {images.length > 1 && (
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
              {images.map((img, idx) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => {
                    setActiveImageIdx(idx);
                    setZoomed(false);
                  }}
                  className={`w-20 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition-colors cursor-pointer ${
                    idx === activeImageIdx ? 'border-[#006B35]' : 'border-[#DCE6DC] opacity-75 hover:opacity-100'
                  }`}
                >
                  <SafeImage src={img.url} alt={img.alt} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Contiguous Purchase Module */}
        <div className="lg:col-span-6 bg-white border border-[#DCE6DC] rounded-2xl p-6 sm:p-8 space-y-6">
          <div>
            <div className="flex items-center justify-between gap-2 text-xs text-[#4E6153] mb-2">
              <span>
                {category ? pickLang(category.nameBn, category.nameEn, lang) : product.categorySlug}
                {' · '}
                <span className="font-mono-num">SKU: {selectedVariant?.sku || product.sku}</span>
              </span>
              <button
                type="button"
                onClick={() => void toggleWishlist(product.id)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4E6153] hover:text-[#006B35] cursor-pointer"
              >
                <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-[#006B35] text-[#006B35]' : ''}`} />
                <span>{lang === 'bn' ? 'সংরক্ষণ' : 'Save'}</span>
              </button>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#17251B]">
              {pickLang(product.nameBn, product.nameEn, lang)}
            </h1>

            {(product.shortDescBn || product.shortDescEn) && (
              <p className="text-sm text-[#4E6153] mt-2 leading-relaxed">
                {pickLang(product.shortDescBn, product.shortDescEn, lang)}
              </p>
            )}
          </div>

          {/* Live Price Display */}
          <div className="pt-4 border-t border-[#EEF5EB]">
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="text-3xl font-bold text-[#006B35] font-mono-num">
                {selectedVariant?.price !== null && selectedVariant?.price !== undefined
                  ? formatBDT(pricing.unitPrice, lang)
                  : formatBDT(null, lang)}
              </span>

              {selectedVariant?.compareAtPrice &&
                selectedVariant.price &&
                selectedVariant.compareAtPrice > selectedVariant.price && (
                  <span className="text-base text-[#4E6153] line-through font-mono-num">
                    {formatBDT(selectedVariant.compareAtPrice, lang)}
                  </span>
                )}

              {pricing.isWholesale && selectedVariant?.price && (
                <span className="text-xs font-semibold text-[#006B35] bg-[#EEF5EB] px-2.5 py-1 rounded">
                  {lang === 'bn'
                    ? `পাইকারি মূল্য প্রযোজ্য (খুচরা ${formatBDT(selectedVariant.price, lang)})`
                    : `Wholesale Applied (Retail ${formatBDT(selectedVariant.price, lang)})`}
                </span>
              )}
            </div>

            <div className="mt-2 flex items-center gap-3 text-xs">
              <span
                className={`font-semibold ${isOutOfStock ? 'text-red-600' : 'text-[#168B35]'}`}
              >
                {isOutOfStock
                  ? lang === 'bn'
                    ? 'বর্তমানে স্টকে নেই'
                    : 'Currently Out of Stock'
                  : stockEnabled
                  ? lang === 'bn'
                    ? `স্টকে আছে (${maxStock} টি উপলব্ধ)`
                    : `In Stock (${maxStock} available)`
                  : lang === 'bn'
                  ? 'স্টকে আছে'
                  : 'In Stock'}
              </span>
              {selectedVariant?.freeDelivery && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-semibold text-[#006B35] inline-flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5" />
                    {lang === 'bn' ? 'ফ্রি হোম ডেলিভারি' : 'Free Home Delivery'}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Special Offer Callout (e.g., Sukkari Dates 3 KG Free Home Delivery) */}
          {(product.specialOfferBn || product.specialOfferEn) && (
            <div className="p-3.5 rounded-xl bg-[#EEF5EB] border border-[#006B35]/20 flex items-start gap-2.5">
              <Check className="w-4 h-4 text-[#006B35] mt-0.5 shrink-0" />
              <p className="text-sm font-medium text-[#17251B]">
                {pickLang(product.specialOfferBn, product.specialOfferEn, lang)}
              </p>
            </div>
          )}

          {/* Weight / Size Variant Selector */}
          {product.variants.length > 0 && (
            <div className="space-y-2.5">
              <label className="block text-sm font-semibold text-[#17251B]">
                {lang === 'bn' ? 'ওজন / সাইজ নির্বাচন করুন' : 'Select Weight / Pack Size'}
              </label>
              <div className="flex flex-wrap gap-2.5">
                {product.variants.map((variant) => {
                  const active = variant.id === selectedVariant?.id;
                  const unavailable =
                    variant.price === null || (stockEnabled && variant.stock <= 0);
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => {
                        setSelectedVariantId(variant.id);
                        setQuantity(1);
                      }}
                      className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors text-left cursor-pointer ${
                        active
                          ? 'border-[#006B35] bg-[#EEF5EB] text-[#006B35]'
                          : 'border-[#DCE6DC] bg-white text-[#17251B] hover:border-[#006B35]/60'
                      } ${unavailable ? 'opacity-60' : ''}`}
                    >
                      <div className="font-semibold">
                        {pickLang(variant.labelBn, variant.labelEn, lang)}
                      </div>
                      <div className="text-xs font-mono-num opacity-85">
                        {formatBDT(variant.price, lang)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity Stepper & Live Total */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#4E6153]">
                {lang === 'bn' ? 'পরিমাণ' : 'Quantity'}
              </label>
              <div className="inline-flex items-center border border-[#DCE6DC] rounded-lg bg-white">
                <button
                  type="button"
                  disabled={quantity <= 1}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-3.5 py-2.5 text-[#17251B] hover:bg-[#F7FAF5] disabled:opacity-40 cursor-pointer"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, maxStock)}
                  value={quantity}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value, 10);
                    if (Number.isNaN(parsed)) return;
                    setQuantity(Math.min(Math.max(1, parsed), Math.max(1, maxStock)));
                  }}
                  aria-label="Quantity"
                  className="w-16 text-center text-sm font-bold font-mono-num focus:outline-none"
                />
                <button
                  type="button"
                  disabled={quantity >= maxStock}
                  onClick={() => setQuantity((q) => Math.min(maxStock, q + 1))}
                  className="px-3.5 py-2.5 text-[#17251B] hover:bg-[#F7FAF5] disabled:opacity-40 cursor-pointer"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {selectedVariant?.price !== null && selectedVariant?.price !== undefined && (
              <div className="text-right">
                <p className="text-xs text-[#4E6153]">{lang === 'bn' ? 'মোট মূল্য' : 'Total'}</p>
                <p className="text-xl font-bold text-[#17251B] font-mono-num">
                  {formatBDT(lineTotal, lang)}
                </p>
              </div>
            )}
          </div>

          {/* Primary Purchase CTAs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              disabled={isOutOfStock || selectedVariant?.price === null}
              onClick={handleAddToCart}
              className="inline-flex items-center justify-center gap-2 py-3 px-5 rounded-lg text-sm font-semibold border border-[#006B35] text-[#006B35] hover:bg-[#EEF5EB] disabled:opacity-45 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{lang === 'bn' ? 'কার্টে যুক্ত করুন' : 'Add to Cart'}</span>
            </button>

            <button
              type="button"
              disabled={isOutOfStock || selectedVariant?.price === null}
              onClick={handleBuyNow}
              className="inline-flex items-center justify-center gap-2 py-3 px-5 rounded-lg text-sm font-semibold text-white hover:opacity-95 disabled:opacity-45 disabled:cursor-not-allowed transition-opacity cursor-pointer"
              style={{ backgroundColor: 'var(--zad-primary)' }}
            >
              <span>{lang === 'bn' ? 'এখনই অর্ডার করুন' : 'Buy Now'}</span>
            </button>
          </div>

          {/* Wholesale Pricing Table (when applicable) */}
          {product.hasWholesale && (
            <div className="pt-5 border-t border-[#EEF5EB] space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-[#17251B] inline-flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-[#006B35]" />
                  <span>{lang === 'bn' ? 'পাইকারি মূল্য তালিকা' : 'Wholesale & Bulk Pricing'}</span>
                </h2>
                <button
                  type="button"
                  onClick={() => setWholesaleModalOpen(true)}
                  className="text-xs font-semibold text-[#006B35] underline cursor-pointer"
                >
                  {lang === 'bn' ? 'পাইকারি অনুসন্ধান ফর্ম' : 'Wholesale Inquiry'}
                </button>
              </div>

              <div className="overflow-x-auto border border-[#DCE6DC] rounded-lg">
                <table className="w-full text-xs sm:text-sm text-left">
                  <thead className="bg-[#F7FAF5] text-[#4E6153] border-b border-[#DCE6DC]">
                    <tr>
                      <th className="py-2 px-3 font-semibold">{lang === 'bn' ? 'সাইজ' : 'Pack'}</th>
                      <th className="py-2 px-3 font-semibold">{lang === 'bn' ? 'খুচরা' : 'Retail'}</th>
                      <th className="py-2 px-3 font-semibold">{lang === 'bn' ? 'পাইকারি' : 'Wholesale'}</th>
                      <th className="py-2 px-3 font-semibold">{lang === 'bn' ? 'ন্যূনতম' : 'Min Qty'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF5EB] font-mono-num">
                    {product.variants.map((v) => (
                      <React.Fragment key={v.id}>
                        <tr>
                          <td className="py-2 px-3 font-sans font-medium">
                            {pickLang(v.labelBn, v.labelEn, lang)}
                          </td>
                          <td className="py-2 px-3">{formatBDT(v.price, lang)}</td>
                          <td className="py-2 px-3 font-semibold text-[#006B35]">
                            {v.wholesalePrice ? formatBDT(v.wholesalePrice, lang) : '—'}
                          </td>
                          <td className="py-2 px-3">
                            {v.wholesaleMinQty
                              ? `${v.wholesaleMinQty} ${lang === 'bn' ? 'পিস' : 'pcs'}`
                              : '—'}
                          </td>
                        </tr>
                        {v.bulkTiers?.map((tier, idx) => (
                          <tr key={`${v.id}-tier-${idx}`} className="bg-[#F7FAF5]/60">
                            <td className="py-2 px-3 font-sans text-xs text-[#006B35]">
                              {pickLang(tier.labelBn, tier.labelEn, lang) ||
                                `${pickLang(v.labelBn, v.labelEn, lang)} Bulk`}
                            </td>
                            <td className="py-2 px-3">—</td>
                            <td className="py-2 px-3 font-bold text-[#006B35]">
                              {formatBDT(tier.unitPrice, lang)}
                            </td>
                            <td className="py-2 px-3">
                              {tier.minQty}+ {lang === 'bn' ? 'পিস' : 'pcs'}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              {(product.wholesaleNoteBn || product.wholesaleNoteEn) && (
                <p className="text-xs text-[#4E6153]">
                  {pickLang(product.wholesaleNoteBn, product.wholesaleNoteEn, lang)}
                </p>
              )}

              {selectedVariant?.wholesaleMinQty && quantity < selectedVariant.wholesaleMinQty && (
                <button
                  type="button"
                  onClick={() =>
                    setQuantity(Math.min(maxStock, selectedVariant.wholesaleMinQty || 30))
                  }
                  className="text-xs font-semibold text-[#006B35] hover:underline cursor-pointer"
                >
                  {lang === 'bn'
                    ? `→ পাইকারি মূল্যের জন্য পরিমাণ ${selectedVariant.wholesaleMinQty} পিস করুন`
                    : `→ Set quantity to ${selectedVariant.wholesaleMinQty} pcs for wholesale rate`}
                </button>
              )}
            </div>
          )}

          {/* Delivery Info & WhatsApp Quick Order */}
          <div className="pt-4 border-t border-[#EEF5EB] space-y-2 text-xs text-[#4E6153]">
            <p className="flex items-start gap-2">
              <Truck className="w-4 h-4 text-[#006B35] shrink-0 mt-0.5" />
              <span>
                {pickLang(
                  product.deliveryInfoBn || settings.delivery.deliveryNoteBn,
                  product.deliveryInfoEn || settings.delivery.deliveryNoteEn,
                  lang
                )}
              </span>
            </p>
            <a
              href={formatWhatsAppLink(
                settings.business.whatsappNumber || settings.business.phone,
                `Order inquiry: ${product.nameEn} - ${selectedVariant?.labelEn || ''} x ${quantity}`
              )}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-[#006B35] font-semibold hover:underline pt-1"
            >
              <MessageCircle className="w-4 h-4" />
              <span>
                {lang === 'bn'
                  ? 'হোয়াটসঅ্যাপে এই পণ্য সম্পর্কে জিজ্ঞাসা করুন'
                  : 'Ask about this product on WhatsApp'}
              </span>
            </a>
          </div>
        </div>
      </div>

      {/* Product Description */}
      {(product.descBn || product.descEn) && (
        <section className="mt-12 bg-white border border-[#DCE6DC] rounded-2xl p-6 sm:p-8">
          <h2 className="font-display text-xl font-bold text-[#17251B] mb-3">
            {lang === 'bn' ? 'পণ্যের বিবরণ' : 'Product Description'}
          </h2>
          <p className="text-sm sm:text-base text-[#4E6153] leading-relaxed whitespace-pre-line max-w-4xl">
            {pickLang(product.descBn, product.descEn, lang)}
          </p>
        </section>
      )}

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="mt-14">
          <h2 className="font-display text-2xl font-bold text-[#17251B] mb-6">
            {lang === 'bn' ? 'সম্পর্কিত পণ্যসমূহ' : 'Related Products'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Mobile Sticky Bottom Buy Bar (Positioned flush above Mobile Bottom Nav) */}
      <div className="lg:hidden fixed bottom-[60px] inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#DCE6DC] px-4 py-2.5 flex items-center justify-between gap-3 shadow-md">
        <div>
          <p className="text-[11px] text-[#4E6153]">
            {selectedVariant ? pickLang(selectedVariant.labelBn, selectedVariant.labelEn, lang) : ''}
          </p>
          <p className="text-base font-bold text-[#006B35] font-mono-num">
            {formatBDT(lineTotal, lang)}
          </p>
        </div>
        <button
          type="button"
          disabled={isOutOfStock || selectedVariant?.price === null}
          onClick={handleBuyNow}
          className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 cursor-pointer"
          style={{ backgroundColor: 'var(--zad-primary)' }}
        >
          {lang === 'bn' ? 'এখনই কিনুন' : 'Buy Now'}
        </button>
      </div>

      {/* Wholesale Inquiry Modal */}
      {wholesaleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white border border-[#DCE6DC] rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#17251B]">
                {lang === 'bn' ? 'পাইকারি অর্ডার অনুসন্ধান' : 'Wholesale Order Inquiry'}
              </h3>
              <button
                type="button"
                onClick={() => setWholesaleModalOpen(false)}
                className="p-1.5 text-[#4E6153] hover:text-[#17251B] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleWholesaleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                  {lang === 'bn' ? 'আপনার নাম *' : 'Your Name *'}
                </label>
                <input
                  required
                  value={wName}
                  onChange={(e) => setWName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-[#DCE6DC] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                  {lang === 'bn' ? 'মোবাইল নম্বর *' : 'Mobile Number *'}
                </label>
                <input
                  required
                  value={wPhone}
                  onChange={(e) => setWPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="w-full px-3.5 py-2 rounded-lg border border-[#DCE6DC] text-sm font-mono-num"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                    {lang === 'bn' ? 'দোকান / প্রতিষ্ঠানের নাম' : 'Shop / Business Name'}
                  </label>
                  <input
                    value={wBusiness}
                    onChange={(e) => setWBusiness(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-[#DCE6DC] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                    {lang === 'bn' ? 'আনুমানিক পরিমাণ' : 'Estimated Quantity'}
                  </label>
                  <input
                    value={wQty}
                    onChange={(e) => setWQty(e.target.value)}
                    placeholder="e.g. 100 pcs"
                    className="w-full px-3.5 py-2 rounded-lg border border-[#DCE6DC] text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                  {lang === 'bn' ? 'বিস্তারিত বার্তা' : 'Details / Requirements'}
                </label>
                <textarea
                  rows={3}
                  value={wMsg}
                  onChange={(e) => setWMsg(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-[#DCE6DC] text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setWholesaleModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#DCE6DC] text-sm font-medium cursor-pointer"
                >
                  {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={wSubmitting}
                  className="px-5 py-2 rounded-lg text-sm font-semibold text-white cursor-pointer"
                  style={{ backgroundColor: 'var(--zad-primary)' }}
                >
                  {wSubmitting
                    ? lang === 'bn'
                      ? 'পাঠানো হচ্ছে...'
                      : 'Sending...'
                    : lang === 'bn'
                    ? 'জমা দিন'
                    : 'Submit Inquiry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
