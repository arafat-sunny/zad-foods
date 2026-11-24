import React, { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { pickLang } from '../lib/i18n';
import ProductCard from '../components/store/ProductCard';

type SortOption = 'featured' | 'newest' | 'price-asc' | 'price-desc';

export default function ShopPage() {
  const { slug: routeCategorySlug } = useParams<{ slug?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { lang, products, categories, recentlyViewedIds } = useApp();

  const initialQuery = searchParams.get('q') || '';
  const initialFeatured = searchParams.get('featured') === 'true';

  const [queryText, setQueryText] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState<string>(routeCategorySlug || 'all');
  const [sortBy, setSortBy] = useState<SortOption>(initialFeatured ? 'featured' : 'featured');
  const [wholesaleOnly, setWholesaleOnly] = useState(false);

  // Sync if user navigates between /category/:slug links
  React.useEffect(() => {
    setSelectedCategory(routeCategorySlug || 'all');
  }, [routeCategorySlug]);

  React.useEffect(() => {
    setQueryText(searchParams.get('q') || '');
  }, [searchParams]);

  const activeCategories = categories.filter((c) => c.isActive);
  const currentCategoryObj = activeCategories.find((c) => c.slug === selectedCategory);

  const getMinPrice = (p: (typeof products)[number]) => {
    const prices = p.variants
      .map((v) => v.price)
      .filter((n): n is number => n !== null && n !== undefined);
    return prices.length > 0 ? Math.min(...prices) : Number.MAX_SAFE_INTEGER;
  };

  const filteredProducts = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    const list = products.filter((p) => {
      if (selectedCategory !== 'all' && p.categorySlug !== selectedCategory) return false;
      if (wholesaleOnly && !p.hasWholesale) return false;
      if (q) {
        const hay = [p.nameBn, p.nameEn, p.shortDescBn, p.shortDescEn, p.sku, ...p.tags]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'price-asc') return getMinPrice(a) - getMinPrice(b);
      if (sortBy === 'price-desc') return getMinPrice(b) - getMinPrice(a);
      if (sortBy === 'newest') {
        return Number(b.isNewArrival) - Number(a.isNewArrival);
      }
      return Number(b.isFeatured) - Number(a.isFeatured);
    });
  }, [products, selectedCategory, wholesaleOnly, queryText, sortBy]);

  const recentlyViewed = useMemo(
    () =>
      recentlyViewedIds
        .map((id) => products.find((p) => p.id === id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
        .slice(0, 3),
    [recentlyViewedIds, products]
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      {/* Page Header */}
      <div className="border-b border-[#DCE6DC] pb-6 mb-8">
        <div className="flex items-center gap-2 text-xs text-[#4E6153] mb-2">
          <Link to="/" className="hover:text-[#006B35]">
            {lang === 'bn' ? 'হোম' : 'Home'}
          </Link>
          <span>/</span>
          <span>
            {currentCategoryObj
              ? pickLang(currentCategoryObj.nameBn, currentCategoryObj.nameEn, lang)
              : lang === 'bn'
              ? 'সকল পণ্য'
              : 'All Products'}
          </span>
        </div>

        <h1 className="font-display text-2xl sm:text-4xl font-bold text-[#17251B]">
          {currentCategoryObj
            ? pickLang(currentCategoryObj.nameBn, currentCategoryObj.nameEn, lang)
            : lang === 'bn'
            ? 'আমাদের সকল পণ্য'
            : 'All Natural Products'}
        </h1>
        {currentCategoryObj && (currentCategoryObj.descriptionBn || currentCategoryObj.descriptionEn) && (
          <p className="text-sm text-[#4E6153] mt-2 max-w-2xl">
            {pickLang(currentCategoryObj.descriptionBn, currentCategoryObj.descriptionEn, lang)}
          </p>
        )}
      </div>

      {/* Filter & Search Toolbar */}
      <div className="space-y-4 mb-8">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#4E6153] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={queryText}
              onChange={(e) => {
                setQueryText(e.target.value);
                if (!e.target.value && searchParams.has('q')) {
                  searchParams.delete('q');
                  setSearchParams(searchParams);
                }
              }}
              placeholder={
                lang === 'bn' ? 'পণ্যের নাম লিখে খুঁজুন...' : 'Search by product name or keyword...'
              }
              className="w-full pl-10 pr-9 py-2.5 bg-white border border-[#DCE6DC] rounded-lg text-sm focus:outline-none focus:border-[#006B35]"
            />
            {queryText && (
              <button
                type="button"
                onClick={() => setQueryText('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4E6153] hover:text-[#17251B] cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sort & Wholesale Filter */}
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-[#17251B] cursor-pointer select-none px-3 py-2 bg-white border border-[#DCE6DC] rounded-lg">
              <input
                type="checkbox"
                checked={wholesaleOnly}
                onChange={(e) => setWholesaleOnly(e.target.checked)}
                className="accent-[#006B35] w-4 h-4"
              />
              <span className="whitespace-nowrap">
                {lang === 'bn' ? 'পাইকারি সুবিধাযুক্ত' : 'Wholesale Available'}
              </span>
            </label>

            <div className="inline-flex items-center gap-2 bg-white border border-[#DCE6DC] rounded-lg px-3 py-2">
              <SlidersHorizontal className="w-4 h-4 text-[#4E6153]" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                aria-label="Sort products"
                className="text-sm bg-transparent text-[#17251B] focus:outline-none cursor-pointer"
              >
                <option value="featured">
                  {lang === 'bn' ? 'জনপ্রিয় পণ্য' : 'Featured'}
                </option>
                <option value="newest">
                  {lang === 'bn' ? 'নতুন পণ্য' : 'Newest Arrivals'}
                </option>
                <option value="price-asc">
                  {lang === 'bn' ? 'মূল্য: কম থেকে বেশি' : 'Price: Low to High'}
                </option>
                <option value="price-desc">
                  {lang === 'bn' ? 'মূল্য: বেশি থেকে কম' : 'Price: High to Low'}
                </option>
              </select>
            </div>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-[#006B35] text-white'
                : 'bg-white border border-[#DCE6DC] text-[#17251B] hover:border-[#006B35]'
            }`}
          >
            {lang === 'bn' ? 'সকল ক্যাটাগরি' : 'All Categories'} ({products.length})
          </button>
          {activeCategories.map((cat) => {
            const count = products.filter((p) => p.categorySlug === cat.slug).length;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.slug)}
                className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  selectedCategory === cat.slug
                    ? 'bg-[#006B35] text-white'
                    : 'bg-white border border-[#DCE6DC] text-[#17251B] hover:border-[#006B35]'
                }`}
              >
                {pickLang(cat.nameBn, cat.nameEn, lang)} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Product Grid or Empty State */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white border border-[#DCE6DC] rounded-2xl p-12 text-center">
          <p className="text-lg font-semibold text-[#17251B] mb-2">
            {lang === 'bn' ? 'কোনো পণ্য পাওয়া যায়নি' : 'No matching products found'}
          </p>
          <p className="text-sm text-[#4E6153] mb-6">
            {lang === 'bn'
              ? 'অনুগ্রহ করে অন্য ক্যাটাগরি বা সার্চ শব্দ চেষ্টা করুন।'
              : 'Try clearing your filters or searching with a different keyword.'}
          </p>
          <button
            type="button"
            onClick={() => {
              setQueryText('');
              setSelectedCategory('all');
              setWholesaleOnly(false);
            }}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white cursor-pointer"
            style={{ backgroundColor: 'var(--zad-primary)' }}
          >
            {lang === 'bn' ? 'ফিল্টার রিসেট করুন' : 'Reset Filters'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {/* Recently Viewed Products */}
      {recentlyViewed.length > 0 && (
        <section className="mt-16 pt-10 border-t border-[#DCE6DC]">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-[#17251B] mb-6">
            {lang === 'bn' ? 'সম্প্রতি দেখা পণ্য' : 'Recently Viewed'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentlyViewed.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
