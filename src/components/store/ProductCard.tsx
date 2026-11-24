import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { formatBDT, pickLang } from '../../lib/i18n';
import { SafeImage } from './StoreLayout';
import type { Product } from '../../types';

export default function ProductCard({ product }: { product: Product }) {
  const { lang, categories, addToCart, wishlistIds, toggleWishlist, settings } = useApp();

  const coverImage =
    product.images.find((i) => i.isCover)?.url || product.images[0]?.url || '';
  const category = categories.find((c) => c.id === product.categoryId);
  const pricedVariants = product.variants.filter(
    (v) => v.price !== null && v.price !== undefined
  );
  const defaultVariant = pricedVariants[0] || product.variants[0];
  const minPrice =
    pricedVariants.length > 0
      ? Math.min(...pricedVariants.map((v) => v.price as number))
      : null;
  const compareAt = defaultVariant?.compareAtPrice;
  const totalStock = product.variants.reduce((acc, v) => acc + (v.stock || 0), 0);
  const outOfStock =
    product.isOutOfStock || (settings.delivery.stockPolicy.enabled && totalStock <= 0);
  const isWishlisted = wishlistIds.includes(product.id);

  const variantLabels = product.variants
    .map((v) => pickLang(v.labelBn, v.labelEn, lang))
    .slice(0, 2)
    .join(' / ');

  return (
    <article className="zad-card-hover group bg-white border border-[#DCE6DC] rounded-xl overflow-hidden flex flex-col">
      {/* Product Photography (4:3 Uniform Aspect Ratio) */}
      <div className="relative aspect-[4/3] bg-[#F2F7F0] overflow-hidden">
        <Link to={`/product/${product.slug}`} className="block w-full h-full">
          <SafeImage
            src={coverImage}
            alt={pickLang(product.nameBn, product.nameEn, lang)}
            fallbackLabel={pickLang(product.nameBn, product.nameEn, lang)}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
          />
        </Link>

        {/* Wishlist Toggle */}
        <button
          type="button"
          onClick={() => void toggleWishlist(product.id)}
          aria-label={lang === 'bn' ? 'উইশলিস্টে যোগ করুন' : 'Toggle wishlist'}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm border border-[#DCE6DC] flex items-center justify-center text-[#17251B] hover:text-[#006B35] transition-colors cursor-pointer"
        >
          <Heart
            className={`w-4 h-4 ${isWishlisted ? 'fill-[#006B35] text-[#006B35]' : ''}`}
          />
        </button>

        {outOfStock && (
          <div className="absolute bottom-2.5 left-2.5 bg-[#17251B]/85 text-white text-xs font-medium px-2.5 py-1 rounded">
            {lang === 'bn' ? 'স্টক শেষ' : 'Out of Stock'}
          </div>
        )}
      </div>

      {/* Clean Unboxed Metadata & Purchase Actions */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col">
        <div className="flex items-center gap-1.5 text-xs text-[#4E6153] mb-1.5 truncate">
          <span>
            {category
              ? pickLang(category.nameBn, category.nameEn, lang)
              : product.categorySlug}
          </span>
          {variantLabels && (
            <>
              <span aria-hidden="true">·</span>
              <span className="truncate">{variantLabels}</span>
            </>
          )}
        </div>

        <Link to={`/product/${product.slug}`} className="block">
          <h3 className="text-base font-semibold text-[#17251B] group-hover:text-[#006B35] transition-colors line-clamp-2 leading-snug">
            {pickLang(product.nameBn, product.nameEn, lang)}
          </h3>
        </Link>

        {/* Special Offer or Wholesale Quiet Notice */}
        {(product.specialOfferBn || product.specialOfferEn) && (
          <p className="mt-1.5 text-xs font-medium text-[#006B35] line-clamp-1">
            {pickLang(product.specialOfferBn, product.specialOfferEn, lang)}
          </p>
        )}

        <div className="mt-auto pt-4 flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span className="text-base sm:text-lg font-bold text-[#17251B] font-mono-num">
              {pricedVariants.length > 1 && (
                <span className="text-xs font-normal text-[#4E6153] mr-1">
                  {lang === 'bn' ? 'শুরু' : 'From'}
                </span>
              )}
              {formatBDT(minPrice, lang)}
            </span>
            {compareAt && minPrice && compareAt > minPrice && (
              <span className="text-xs text-[#4E6153] line-through font-mono-num">
                {formatBDT(compareAt, lang)}
              </span>
            )}
          </div>

          <span
            className={`text-xs font-medium ${
              outOfStock ? 'text-red-600' : 'text-[#168B35]'
            }`}
          >
            {outOfStock
              ? lang === 'bn'
                ? 'স্টক নেই'
                : 'Sold Out'
              : lang === 'bn'
              ? 'স্টকে আছে'
              : 'In Stock'}
          </span>
        </div>

        <div className="mt-3.5 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={outOfStock || !defaultVariant || defaultVariant.price === null}
            onClick={() => {
              if (defaultVariant) addToCart(product, defaultVariant, 1);
            }}
            className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold text-white disabled:opacity-45 disabled:cursor-not-allowed transition-opacity hover:opacity-95 whitespace-nowrap cursor-pointer"
            style={{ backgroundColor: 'var(--zad-primary)' }}
          >
            <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
            <span>{lang === 'bn' ? 'কার্টে নিন' : 'Add to Cart'}</span>
          </button>

          <Link
            to={`/product/${product.slug}`}
            className="inline-flex items-center justify-center py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold border border-[#DCE6DC] text-[#17251B] hover:border-[#006B35] hover:text-[#006B35] transition-colors whitespace-nowrap"
          >
            {lang === 'bn' ? 'বিস্তারিত' : 'View Details'}
          </Link>
        </div>
      </div>
    </article>
  );
}
