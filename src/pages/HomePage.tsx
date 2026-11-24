import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  ChevronLeft,
  ChevronRight,
  Heart,
  Leaf,
  ShieldCheck,
  ShoppingBag,
  Star,
  Truck,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { pickLang } from '../lib/i18n';
import { submitInquiry } from '../lib/firestoreService';
import ProductCard from '../components/store/ProductCard';
import { SafeImage } from '../components/store/StoreLayout';
import type { WhyChooseItem } from '../types';

function WhyIcon({ icon }: { icon: WhyChooseItem['icon'] }) {
  const cls = 'w-5 h-5 text-[#006B35]';
  switch (icon) {
    case 'award':
      return <Award className={cls} />;
    case 'leaf':
      return <Leaf className={cls} />;
    case 'shopping':
      return <ShoppingBag className={cls} />;
    case 'truck':
      return <Truck className={cls} />;
    case 'heart':
      return <Heart className={cls} />;
    default:
      return <ShieldCheck className={cls} />;
  }
}

export default function HomePage() {
  const { lang, settings, categories, products, reviews, notify } = useApp();
  const { homepage } = settings;

  const activeSlides = [...homepage.heroSlides]
    .filter((s) => s.enabled)
    .sort((a, b) => a.order - b.order);

  const [slideIndex, setSlideIndex] = useState(0);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    if (activeSlides.length <= 1) return;
    const timer = window.setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % activeSlides.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [activeSlides.length]);

  const currentSlide = activeSlides[slideIndex % Math.max(1, activeSlides.length)];
  const activeCategories = categories.filter((c) => c.isActive);
  const featuredProducts = products.filter((p) => p.isFeatured);
  const displayFeatured = featuredProducts.length > 0 ? featuredProducts : products.slice(0, 6);
  const homepageReviews = reviews.filter((r) => r.isApproved && r.showOnHomepage);

  const handleNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    setSubscribing(true);
    try {
      await submitInquiry({
        type: 'newsletter',
        email: newsletterEmail.trim(),
      });
      setNewsletterEmail('');
      notify(
        lang === 'bn'
          ? 'ধন্যবাদ! আপনি সফলভাবে সাবস্ক্রাইব করেছেন।'
          : 'Thank you for subscribing to ZAD Foods updates.'
      );
    } catch {
      notify(
        lang === 'bn' ? 'সাবস্ক্রিপশন ব্যর্থ হয়েছে, আবার চেষ্টা করুন।' : 'Subscription failed. Please try again.',
        'error'
      );
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <div>
      {/* C. Hero Banner / Slider */}
      {currentSlide && (
        <section className="relative bg-[#0E291B] text-white overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
              {/* Left Copy Column */}
              <div className="lg:col-span-5 flex flex-col justify-center space-y-5">
                <p className="text-xs sm:text-sm font-medium tracking-wide text-[#9FE254]">
                  {pickLang(settings.business.brandNameBn, settings.business.brandNameEn, lang)} ·{' '}
                  {pickLang(settings.business.addressBn, settings.business.addressEn, lang)}
                </p>

                <h1 className="font-display text-3xl sm:text-4xl lg:text-[44px] leading-[1.16] font-bold text-white max-w-xl">
                  {pickLang(currentSlide.titleBn, currentSlide.titleEn, lang)}
                </h1>

                <p className="text-sm sm:text-base text-white/80 leading-relaxed max-w-lg">
                  {pickLang(currentSlide.subtitleBn, currentSlide.subtitleEn, lang)}
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Link
                    to={currentSlide.primaryLink || '/shop'}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-[#102418] bg-[#7CCB19] hover:bg-[#8EDB2C] transition-colors whitespace-nowrap"
                  >
                    <span>{pickLang(currentSlide.primaryCtaBn, currentSlide.primaryCtaEn, lang)}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  {currentSlide.secondaryCtaEn && (
                    <Link
                      to={currentSlide.secondaryLink || '/shop'}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold text-white border border-white/25 hover:bg-white/10 transition-colors whitespace-nowrap"
                    >
                      {pickLang(currentSlide.secondaryCtaBn, currentSlide.secondaryCtaEn, lang)}
                    </Link>
                  )}
                </div>

                {/* Slide Switcher Controls */}
                {activeSlides.length > 1 && (
                  <div className="pt-4 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setSlideIndex((prev) => (prev - 1 + activeSlides.length) % activeSlides.length)
                      }
                      aria-label="Previous slide"
                      className="p-2 rounded-lg border border-white/20 hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-1.5">
                      {activeSlides.map((s, idx) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setSlideIndex(idx)}
                          aria-label={`Slide ${idx + 1}`}
                          className={`h-1.5 rounded-full transition-all cursor-pointer ${
                            idx === slideIndex ? 'w-7 bg-[#7CCB19]' : 'w-2 bg-white/35'
                          }`}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSlideIndex((prev) => (prev + 1) % activeSlides.length)}
                      aria-label="Next slide"
                      className="p-2 rounded-lg border border-white/20 hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Right Campaign Photography Frame */}
              <div className="lg:col-span-7">
                <div className="relative rounded-2xl overflow-hidden border border-white/15 aspect-[16/9] lg:aspect-auto lg:h-full min-h-[240px] sm:min-h-[340px] bg-[#163825]">
                  <SafeImage
                    src={currentSlide.desktopImage || currentSlide.mobileImage}
                    alt={pickLang(currentSlide.titleBn, currentSlide.titleEn, lang)}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* G. Why Choose ZAD Foods — Clean 4-Column Strip Directly Anchoring Trust */}
      {homepage.whyChooseUs.enabled && homepage.whyChooseUs.items.length > 0 && (
        <section className="border-b border-[#DCE6DC] bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
              {homepage.whyChooseUs.items.map((item) => (
                <div key={item.id} className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-[#EEF5EB] flex items-center justify-center shrink-0">
                    <WhyIcon icon={item.icon} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#17251B]">
                      {pickLang(item.titleBn, item.titleEn, lang)}
                    </h3>
                    <p className="text-xs text-[#4E6153] mt-1 leading-relaxed">
                      {pickLang(item.descBn, item.descEn, lang)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* D. Featured Categories */}
      {homepage.featuredCategoriesEnabled && activeCategories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="flex items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#17251B]">
                {pickLang(
                  homepage.featuredCategoriesTitleBn,
                  homepage.featuredCategoriesTitleEn,
                  lang
                )}
              </h2>
            </div>
            <Link
              to="/shop"
              className="text-sm font-semibold text-[#006B35] hover:underline inline-flex items-center gap-1 whitespace-nowrap"
            >
              <span>{lang === 'bn' ? 'সব দেখুন' : 'View All'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-5">
            {activeCategories.map((cat) => (
              <Link
                key={cat.id}
                to={`/category/${cat.slug}`}
                className="zad-card-hover group bg-white border border-[#DCE6DC] rounded-xl overflow-hidden flex flex-col"
              >
                <div className="aspect-square bg-[#EEF5EB] overflow-hidden">
                  <SafeImage
                    src={cat.imageUrl}
                    alt={pickLang(cat.nameBn, cat.nameEn, lang)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-3 text-center">
                  <h3 className="text-sm font-semibold text-[#17251B] group-hover:text-[#006B35] line-clamp-1">
                    {pickLang(cat.nameBn, cat.nameEn, lang)}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* E. Featured Products */}
      {homepage.featuredProductsEnabled && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <div className="flex items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#17251B]">
                {pickLang(
                  homepage.featuredProductsTitleBn,
                  homepage.featuredProductsTitleEn,
                  lang
                )}
              </h2>
              <p className="text-sm text-[#4E6153] mt-1">
                {lang === 'bn'
                  ? 'খুচরা ও পাইকারি — সারাদেশে হোম ডেলিভারি'
                  : 'Retail and wholesale availability with nationwide home delivery'}
              </p>
            </div>
            <Link
              to="/shop"
              className="text-sm font-semibold text-[#006B35] hover:underline inline-flex items-center gap-1 whitespace-nowrap"
            >
              <span>{lang === 'bn' ? 'সকল পণ্য' : 'Shop All'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayFeatured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* F. Editable Promotional Banner */}
      {homepage.promoBanner.enabled && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white border border-[#DCE6DC] rounded-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
            <div className="lg:col-span-6 p-8 sm:p-10 lg:p-12 flex flex-col justify-center space-y-4">
              <p className="text-xs font-semibold text-[#006B35] tracking-wide">
                {pickLang(settings.business.brandNameBn, settings.business.brandNameEn, lang)}
              </p>
              <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-[#17251B]">
                {pickLang(homepage.promoBanner.titleBn, homepage.promoBanner.titleEn, lang)}
              </h2>
              <p className="text-sm sm:text-base text-[#4E6153] leading-relaxed">
                {pickLang(homepage.promoBanner.subtitleBn, homepage.promoBanner.subtitleEn, lang)}
              </p>
              <div className="pt-2">
                <Link
                  to={homepage.promoBanner.link || '/shop'}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-white hover:opacity-95 transition-opacity"
                  style={{ backgroundColor: 'var(--zad-primary)' }}
                >
                  <span>{pickLang(homepage.promoBanner.ctaBn, homepage.promoBanner.ctaEn, lang)}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
            <div className="lg:col-span-6 bg-[#EEF5EB] min-h-[260px] sm:min-h-[340px]">
              <SafeImage
                src={homepage.promoBanner.imageUrl}
                alt={pickLang(homepage.promoBanner.titleBn, homepage.promoBanner.titleEn, lang)}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </section>
      )}

      {/* H. Brand Introduction */}
      {homepage.brandIntro.enabled && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-5">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-[#DCE6DC] bg-[#EEF5EB]">
                <SafeImage
                  src={homepage.brandIntro.imageUrl}
                  alt={pickLang(homepage.brandIntro.headingBn, homepage.brandIntro.headingEn, lang)}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="lg:col-span-7 space-y-4">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#17251B]">
                {pickLang(homepage.brandIntro.headingBn, homepage.brandIntro.headingEn, lang)}
              </h2>
              <p className="text-base text-[#4E6153] leading-relaxed">
                {pickLang(
                  homepage.brandIntro.descriptionBn,
                  homepage.brandIntro.descriptionEn,
                  lang
                )}
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-4">
                <Link
                  to="/about"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[#006B35] text-[#006B35] text-sm font-semibold hover:bg-[#006B35] hover:text-white transition-colors"
                >
                  <span>{pickLang(homepage.brandIntro.ctaBn, homepage.brandIntro.ctaEn, lang)}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <span className="text-xs text-[#4E6153]">
                  {pickLang(settings.business.founderNameBn, settings.business.founderNameEn, lang)}{' '}
                  · {pickLang(settings.business.addressBn, settings.business.addressEn, lang)}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* I. Dynamic Customer Reviews (Only renders real Admin-approved reviews — NO fake reviews) */}
      {homepage.reviewsEnabled && homepageReviews.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#17251B] mb-8">
            {pickLang(homepage.reviewsHeadingBn, homepage.reviewsHeadingEn, lang)}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {homepageReviews.map((review) => (
              <div
                key={review.id}
                className="bg-white border border-[#DCE6DC] rounded-xl p-6 flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center gap-1 text-amber-500 mb-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${i < review.rating ? 'fill-amber-500' : 'text-[#DCE6DC]'}`}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-[#17251B] leading-relaxed">
                    “{pickLang(review.commentBn, review.commentEn, lang)}”
                  </p>
                </div>
                <div className="flex items-center gap-3 pt-2 border-t border-[#EEF5EB]">
                  {review.photoUrl && (
                    <SafeImage
                      src={review.photoUrl}
                      alt={review.customerName}
                      className="w-9 h-9 rounded-full object-cover border border-[#DCE6DC]"
                    />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-[#17251B]">{review.customerName}</p>
                    {review.location && (
                      <p className="text-xs text-[#4E6153]">{review.location}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* J. Configurable Newsletter Section */}
      {homepage.newsletter.enabled && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="bg-[#EEF5EB] border border-[#DCE6DC] rounded-2xl p-8 sm:p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="max-w-xl">
              <h2 className="font-display text-2xl font-bold text-[#17251B]">
                {pickLang(homepage.newsletter.headingBn, homepage.newsletter.headingEn, lang)}
              </h2>
              <p className="text-sm text-[#4E6153] mt-1.5">
                {pickLang(
                  homepage.newsletter.descriptionBn,
                  homepage.newsletter.descriptionEn,
                  lang
                )}
              </p>
            </div>
            <form
              onSubmit={handleNewsletter}
              className="flex flex-col sm:flex-row gap-2.5 w-full lg:w-auto lg:min-w-[380px]"
            >
              <input
                type="email"
                required
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder={lang === 'bn' ? 'আপনার ইমেইল ঠিকানা' : 'Enter your email address'}
                className="flex-1 px-4 py-2.5 rounded-lg bg-white border border-[#DCE6DC] text-sm focus:outline-none focus:border-[#006B35]"
              />
              <button
                type="submit"
                disabled={subscribing}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white whitespace-nowrap disabled:opacity-60 cursor-pointer"
                style={{ backgroundColor: 'var(--zad-primary)' }}
              >
                {subscribing
                  ? lang === 'bn'
                    ? 'অপেক্ষা করুন...'
                    : 'Saving...'
                  : lang === 'bn'
                  ? 'সাবস্ক্রাইব'
                  : 'Subscribe'}
              </button>
            </form>
          </div>
        </section>
      )}
    </div>
  );
}
