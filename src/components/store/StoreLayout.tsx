import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  ChevronRight,
  Facebook,
  Globe,
  Home,
  Info,
  Instagram,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Minus,
  PackageSearch,
  Phone,
  Plus,
  Search,
  ShoppingBag,
  Store,
  Trash2,
  User,
  X,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { formatBDT, formatWhatsAppLink, pickLang } from '../../lib/i18n';
import { OfflineIndicator, PWAInstallButton } from '../pwa/PWAInstallControls';

export function SafeImage({
  src,
  alt,
  className = '',
  fallbackLabel,
}: {
  src?: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[#EEF5EB] text-[#006B35]/70 select-none ${className}`}
        role="img"
        aria-label={alt}
      >
        <ShoppingBag className="w-8 h-8 mb-1.5 opacity-60" />
        <span className="text-xs font-medium px-3 text-center line-clamp-2">
          {fallbackLabel || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

export default function StoreLayout() {
  const {
    lang,
    toggleLang,
    settings,
    categories,
    cart,
    cartCount,
    cartSubtotal,
    cartOpen,
    setCartOpen,
    updateCartItemQty,
    removeFromCart,
    user,
    toasts,
    dismissToast,
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const { business, appearance, homepage } = settings;
  const navItems = [...homepage.navItems]
    .filter(
      (n) =>
        n.enabled &&
        !n.path.startsWith('/admin') &&
        !n.path.startsWith('/irfaner-dokan')
    )
    .sort((a, b) => a.order - b.order);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchTerm.trim();
    setSearchOpen(false);
    setMobileMenuOpen(false);
    navigate(q ? `/shop?q=${encodeURIComponent(q)}` : '/shop');
  };

  const whatsappUrl = formatWhatsAppLink(
    business.whatsappNumber || business.phone,
    lang === 'bn'
      ? 'আসসালামু আলাইকুম, আমি ZAD Foods-এর পণ্য সম্পর্কে জানতে চাই।'
      : 'Hello ZAD Foods, I would like to inquire about your products.'
  );

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: 'var(--zad-bg)', color: 'var(--zad-text)' }}
    >
      {/* Slim Editable Announcement Bar */}
      {homepage.announcementBar.enabled && (
        <div
          className="no-print text-white text-xs sm:text-sm py-2 px-4 text-center"
          style={{ backgroundColor: homepage.announcementBar.bgColor || 'var(--zad-primary)' }}
        >
          {homepage.announcementBar.link ? (
            <Link
              to={homepage.announcementBar.link}
              className="hover:underline underline-offset-2 font-medium inline-flex items-center gap-1.5"
            >
              <span>
                {pickLang(
                  homepage.announcementBar.textBn,
                  homepage.announcementBar.textEn,
                  lang
                )}
              </span>
              <ChevronRight className="w-3.5 h-3.5 shrink-0" />
            </Link>
          ) : (
            <span className="font-medium">
              {pickLang(homepage.announcementBar.textBn, homepage.announcementBar.textEn, lang)}
            </span>
          )}
        </div>
      )}

      {/* Clean Single-Row 3-Zone Header */}
      <header
        className={`no-print sticky top-0 z-40 border-b border-[#DCE6DC] backdrop-blur-md ${
          appearance.headerStyle === 'tinted' ? 'bg-[#F0F7EE]/95' : 'bg-white/95'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 lg:h-[72px] flex items-center justify-between gap-3 lg:gap-8">
          {/* Zone 1: Official ZAD Foods Logo (Original Proportions Preserved) */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden min-h-[44px] min-w-[44px] -ml-2 flex items-center justify-center text-[#17251B] hover:text-[#006B35] rounded-lg cursor-pointer"
            >
              <Menu className="w-6 h-6" />
            </button>
            <Link to="/" className="flex items-center shrink-0 focus:outline-none">
              <img
                src={appearance.logoUrl}
                alt={pickLang(business.brandNameBn, business.brandNameEn, lang)}
                referrerPolicy="no-referrer"
                className="h-10 sm:h-11 lg:h-13 w-auto object-contain"
              />
            </Link>
          </div>

          {/* Zone 2: Clean Single-Line Typography Navigation */}
          <nav className="hidden lg:flex items-center gap-7 text-[15px] font-medium text-[#17251B]/85">
            {navItems.map((item) => {
              const active =
                item.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.path.split('?')[0]);
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`whitespace-nowrap shrink-0 py-1 transition-colors border-b-2 ${
                    active
                      ? 'border-[#006B35] text-[#006B35] font-semibold'
                      : 'border-transparent hover:text-[#006B35]'
                  }`}
                >
                  {pickLang(item.labelBn, item.labelEn, lang)}
                </Link>
              );
            })}
          </nav>

          {/* Zone 3: Right Utility Actions & Primary Cart Action */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setSearchOpen((v) => !v)}
              aria-label={lang === 'bn' ? 'পণ্য খুঁজুন' : 'Search products'}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-[#17251B] hover:bg-[#EEF5EB] hover:text-[#006B35] transition-colors cursor-pointer"
            >
              <Search className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={toggleLang}
              aria-label="Switch Language"
              className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs sm:text-sm font-semibold text-[#17251B] hover:bg-[#EEF5EB] hover:text-[#006B35] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Globe className="w-4 h-4 text-[#006B35]" />
              <span>{lang === 'bn' ? 'EN' : 'বাংলা'}</span>
            </button>

            <PWAInstallButton variant="header" />

            <Link
              to="/track-order"
              aria-label={lang === 'bn' ? 'অর্ডার ট্র্যাক' : 'Track Order'}
              title={lang === 'bn' ? 'অর্ডার ট্র্যাক' : 'Track Order'}
              className="hidden lg:inline-flex p-2.5 rounded-lg text-[#17251B] hover:bg-[#EEF5EB] hover:text-[#006B35] transition-colors"
            >
              <PackageSearch className="w-5 h-5" />
            </Link>

            <Link
              to="/account"
              aria-label={lang === 'bn' ? 'অ্যাকাউন্ট' : 'Customer Account'}
              title={lang === 'bn' ? 'অ্যাকাউন্ট' : 'Account'}
              className="hidden lg:inline-flex p-2.5 rounded-lg text-[#17251B] hover:bg-[#EEF5EB] hover:text-[#006B35] transition-colors"
            >
              <User className="w-5 h-5" />
            </Link>

            <button
              type="button"
              onClick={() => setCartOpen(true)}
              aria-label={lang === 'bn' ? 'শপিং কার্ট' : 'Shopping Cart'}
              className="hidden lg:inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              style={{ backgroundColor: 'var(--zad-primary)' }}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{lang === 'bn' ? 'কার্ট' : 'Cart'}</span>
              <span className="font-mono-num text-xs bg-white/20 px-1.5 py-0.5 rounded">
                {cartCount}
              </span>
            </button>
          </div>
        </div>

        {/* Expandable Search Bar */}
        {searchOpen && (
          <div className="border-t border-[#DCE6DC] bg-white px-4 py-3">
            <form
              onSubmit={handleSearchSubmit}
              className="max-w-2xl mx-auto flex items-center gap-2"
            >
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#4E6153] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  autoFocus
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={
                    lang === 'bn'
                      ? 'মধু, হানি নাটস, সুক্কারী খেজুর, টেন নাটস খুঁজুন...'
                      : 'Search honey, honey nuts, Sukkari dates, Ten Nuts...'
                  }
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#DCE6DC] text-sm focus:outline-none focus:border-[#006B35]"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white whitespace-nowrap shrink-0 cursor-pointer"
                style={{ backgroundColor: 'var(--zad-primary)' }}
              >
                {lang === 'bn' ? 'খুঁজুন' : 'Search'}
              </button>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                aria-label="Close search"
                className="p-2.5 text-[#4E6153] hover:text-[#17251B] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </form>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Clean Brand Footer */}
      <footer
        className={`no-print mt-16 border-t pb-20 lg:pb-0 ${
          appearance.footerStyle === 'light'
            ? 'bg-white border-[#DCE6DC] text-[#17251B]'
            : 'bg-[#102418] border-[#1F3A2A] text-white/90'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            {/* Brand Column */}
            <div className="space-y-4">
              <Link to="/" className="inline-block bg-white rounded-xl p-2.5">
                <img
                  src={appearance.logoUrl}
                  alt={business.brandNameEn}
                  referrerPolicy="no-referrer"
                  className="h-12 w-auto object-contain"
                />
              </Link>
              <p
                className={`text-sm leading-relaxed ${
                  appearance.footerStyle === 'light' ? 'text-[#4E6153]' : 'text-white/75'
                }`}
              >
                {pickLang(business.footerDescriptionBn, business.footerDescriptionEn, lang)}
              </p>
              <p
                className={`text-xs font-medium ${
                  appearance.footerStyle === 'light' ? 'text-[#006B35]' : 'text-[#9FE254]'
                }`}
              >
                {pickLang(business.taglineBn, business.taglineEn, lang)}
              </p>
              <div className="pt-1">
                <PWAInstallButton variant="footer" />
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-sm font-semibold mb-4 tracking-wide">
                {lang === 'bn' ? 'প্রয়োজনীয় লিংক' : 'Quick Links'}
              </h3>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <Link to="/shop" className="hover:underline opacity-85 hover:opacity-100">
                    {lang === 'bn' ? 'সকল পণ্য' : 'All Products'}
                  </Link>
                </li>
                <li>
                  <Link to="/about" className="hover:underline opacity-85 hover:opacity-100">
                    {lang === 'bn' ? 'আমাদের সম্পর্কে' : 'About Us'}
                  </Link>
                </li>
                <li>
                  <Link to="/track-order" className="hover:underline opacity-85 hover:opacity-100">
                    {lang === 'bn' ? 'অর্ডার ট্র্যাক করুন' : 'Track Your Order'}
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="hover:underline opacity-85 hover:opacity-100">
                    {lang === 'bn' ? 'যোগাযোগ ও পাইকারি অর্ডার' : 'Contact & Wholesale'}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Categories */}
            <div>
              <h3 className="text-sm font-semibold mb-4 tracking-wide">
                {lang === 'bn' ? 'পণ্য ক্যাটাগরি' : 'Product Categories'}
              </h3>
              <ul className="space-y-2.5 text-sm">
                {categories
                  .filter((c) => c.isActive)
                  .slice(0, 6)
                  .map((cat) => (
                    <li key={cat.id}>
                      <Link
                        to={`/category/${cat.slug}`}
                        className="hover:underline opacity-85 hover:opacity-100"
                      >
                        {pickLang(cat.nameBn, cat.nameEn, lang)}
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="text-sm font-semibold mb-4 tracking-wide">
                {lang === 'bn' ? 'যোগাযোগের ঠিকানা' : 'Contact Information'}
              </h3>
              <ul className="space-y-3 text-sm opacity-85">
                <li className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-[#7CCB19]" />
                  <span>{pickLang(business.addressBn, business.addressEn, lang)}</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 shrink-0 text-[#7CCB19]" />
                  <a href={`tel:${business.phone}`} className="font-mono-num hover:underline">
                    {business.phone}
                  </a>
                </li>
                {business.email && (
                  <li className="flex items-center gap-2.5">
                    <Mail className="w-4 h-4 shrink-0 text-[#7CCB19]" />
                    <a href={`mailto:${business.email}`} className="hover:underline break-all">
                      {business.email}
                    </a>
                  </li>
                )}
                {business.facebookUrl && (
                  <li className="flex items-center gap-2.5">
                    <Facebook className="w-4 h-4 shrink-0 text-[#7CCB19]" />
                    <a
                      href={business.facebookUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline"
                    >
                      {business.facebookName || 'ZAD Foods'}
                    </a>
                  </li>
                )}
                {business.instagramUrl && (
                  <li className="flex items-center gap-2.5">
                    <Instagram className="w-4 h-4 shrink-0 text-[#7CCB19]" />
                    <a
                      href={business.instagramUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline"
                    >
                      Instagram
                    </a>
                  </li>
                )}
              </ul>
            </div>
          </div>

          <div
            className={`mt-10 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs ${
              appearance.footerStyle === 'light'
                ? 'border-[#DCE6DC] text-[#4E6153]'
                : 'border-white/10 text-white/60'
            }`}
          >
            <p>{pickLang(business.footerCopyrightBn, business.footerCopyrightEn, lang)}</p>
            <div className="flex flex-wrap items-center gap-4">
              <Link to="/privacy-policy" className="hover:underline">
                {lang === 'bn' ? 'গোপনীয়তা নীতি' : 'Privacy Policy'}
              </Link>
              <span aria-hidden="true">·</span>
              <Link to="/terms" className="hover:underline">
                {lang === 'bn' ? 'শর্তাবলী' : 'Terms & Conditions'}
              </Link>
              <span aria-hidden="true">·</span>
              <Link to="/return-policy" className="hover:underline">
                {lang === 'bn' ? 'রিটার্ন ও রিফান্ড' : 'Return & Refund'}
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Contact Button (Positioned safely above mobile bottom nav) */}
      {business.showWhatsAppButton && (business.whatsappNumber || business.phone) && (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="Contact ZAD Foods on WhatsApp"
          className={`no-print fixed right-4 lg:bottom-5 lg:right-5 z-30 inline-flex items-center gap-2 px-3.5 py-3 lg:px-4 rounded-full bg-[#168B35] text-white shadow-lg hover:bg-[#006B35] transition-transform hover:scale-[1.03] ${
            location.pathname.startsWith('/product/') ? 'bottom-[132px]' : 'bottom-[74px]'
          }`}
        >
          <MessageCircle className="w-5 h-5" />
          <span className="hidden sm:inline text-sm font-semibold">WhatsApp</span>
        </a>
      )}

      {/* Mobile App-Style Fixed Bottom Navigation Bar */}
      <nav
        aria-label={lang === 'bn' ? 'মোবাইল নেভিগেশন' : 'Mobile Navigation'}
        className="no-print lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#DCE6DC] pb-safe shadow-[0_-4px_18px_rgba(0,0,0,0.05)]"
      >
        <div className="grid grid-cols-5 items-center h-[60px] max-w-lg mx-auto">
          {/* 1. Home */}
          {(() => {
            const active = location.pathname === '/';
            return (
              <Link
                to="/"
                className={`relative flex flex-col items-center justify-center min-h-[48px] transition-colors ${
                  active ? 'text-[#006B35]' : 'text-[#4E6153] hover:text-[#17251B]'
                }`}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-7 h-0.5 rounded-full bg-[#006B35]" />
                )}
                <Home className="w-[21px] h-[21px]" strokeWidth={active ? 2.4 : 1.9} />
                <span className={`text-[11px] leading-tight mt-1 ${active ? 'font-bold' : 'font-medium'}`}>
                  {lang === 'bn' ? 'হোম' : 'Home'}
                </span>
              </Link>
            );
          })()}

          {/* 2. Shop */}
          {(() => {
            const active =
              location.pathname.startsWith('/shop') ||
              location.pathname.startsWith('/category') ||
              location.pathname.startsWith('/product');
            return (
              <Link
                to="/shop"
                className={`relative flex flex-col items-center justify-center min-h-[48px] transition-colors ${
                  active ? 'text-[#006B35]' : 'text-[#4E6153] hover:text-[#17251B]'
                }`}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-7 h-0.5 rounded-full bg-[#006B35]" />
                )}
                <Store className="w-[21px] h-[21px]" strokeWidth={active ? 2.4 : 1.9} />
                <span className={`text-[11px] leading-tight mt-1 ${active ? 'font-bold' : 'font-medium'}`}>
                  {lang === 'bn' ? 'শপ' : 'Shop'}
                </span>
              </Link>
            );
          })()}

          {/* 3. Cart (opens slide-over cart drawer with live badge) */}
          {(() => {
            const active =
              cartOpen ||
              location.pathname.startsWith('/cart') ||
              location.pathname.startsWith('/checkout');
            return (
              <button
                type="button"
                onClick={() => setCartOpen(true)}
                aria-label={lang === 'bn' ? 'শপিং কার্ট' : 'Shopping Cart'}
                className={`relative flex flex-col items-center justify-center min-h-[48px] transition-colors cursor-pointer ${
                  active ? 'text-[#006B35]' : 'text-[#4E6153] hover:text-[#17251B]'
                }`}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-7 h-0.5 rounded-full bg-[#006B35]" />
                )}
                <span className="relative inline-flex">
                  <ShoppingBag className="w-[21px] h-[21px]" strokeWidth={active ? 2.4 : 1.9} />
                  {cartCount > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#006B35] text-white text-[10px] font-bold font-mono-num flex items-center justify-center leading-none">
                      {cartCount > 99 ? '99+' : cartCount}
                    </span>
                  )}
                </span>
                <span className={`text-[11px] leading-tight mt-1 ${active ? 'font-bold' : 'font-medium'}`}>
                  {lang === 'bn' ? 'কার্ট' : 'Cart'}
                </span>
              </button>
            );
          })()}

          {/* 4. Track Order */}
          {(() => {
            const active = location.pathname.startsWith('/track-order');
            return (
              <Link
                to="/track-order"
                className={`relative flex flex-col items-center justify-center min-h-[48px] transition-colors ${
                  active ? 'text-[#006B35]' : 'text-[#4E6153] hover:text-[#17251B]'
                }`}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-7 h-0.5 rounded-full bg-[#006B35]" />
                )}
                <PackageSearch className="w-[21px] h-[21px]" strokeWidth={active ? 2.4 : 1.9} />
                <span className={`text-[11px] leading-tight mt-1 ${active ? 'font-bold' : 'font-medium'}`}>
                  {lang === 'bn' ? 'ট্র্যাক' : 'Track'}
                </span>
              </Link>
            );
          })()}

          {/* 5. Account */}
          {(() => {
            const active = location.pathname.startsWith('/account');
            return (
              <Link
                to="/account"
                className={`relative flex flex-col items-center justify-center min-h-[48px] transition-colors ${
                  active ? 'text-[#006B35]' : 'text-[#4E6153] hover:text-[#17251B]'
                }`}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-7 h-0.5 rounded-full bg-[#006B35]" />
                )}
                <User className="w-[21px] h-[21px]" strokeWidth={active ? 2.4 : 1.9} />
                <span className={`text-[11px] leading-tight mt-1 ${active ? 'font-bold' : 'font-medium'}`}>
                  {lang === 'bn' ? 'অ্যাকাউন্ট' : 'Account'}
                </span>
              </Link>
            );
          })()}
        </div>
      </nav>

      {/* Offline Status Indicator */}
      <OfflineIndicator />

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="no-print fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-80 max-w-[85vw] bg-white h-full flex flex-col shadow-xl">
            <div className="p-4 border-b border-[#DCE6DC] flex items-center justify-between">
              <img
                src={appearance.logoUrl}
                alt="ZAD Foods"
                className="h-10 w-auto object-contain"
              />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
                className="p-2 rounded-lg text-[#4E6153] hover:bg-[#F7FAF5]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-3 rounded-lg text-base font-medium text-[#17251B] hover:bg-[#EEF5EB] hover:text-[#006B35]"
                >
                  {pickLang(item.labelBn, item.labelEn, lang)}
                </Link>
              ))}

              <div className="pt-4 mt-4 border-t border-[#DCE6DC] space-y-2">
                <PWAInstallButton
                  variant="drawer"
                  onAfterAction={() => setMobileMenuOpen(false)}
                />
                <Link
                  to="/track-order"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-[#4E6153] hover:bg-[#EEF5EB]"
                >
                  <PackageSearch className="w-4 h-4" />
                  <span>{lang === 'bn' ? 'অর্ডার ট্র্যাক করুন' : 'Track Order'}</span>
                </Link>
                <Link
                  to="/account"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-[#4E6153] hover:bg-[#EEF5EB]"
                >
                  <User className="w-4 h-4" />
                  <span>
                    {user
                      ? user.displayName || user.email
                      : lang === 'bn'
                      ? 'আমার অ্যাকাউন্ট'
                      : 'My Account'}
                  </span>
                </Link>
              </div>
            </div>

            <div className="p-4 border-t border-[#DCE6DC] bg-[#F7FAF5] text-xs text-[#4E6153] flex items-center justify-between">
              <span className="font-mono-num">{business.phone}</span>
              <button
                type="button"
                onClick={toggleLang}
                className="font-semibold text-[#006B35] underline"
              >
                {lang === 'bn' ? 'Switch to English' : 'বাংলায় দেখুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slide-Over Cart Drawer */}
      {cartOpen && (
        <div className="no-print fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/40" onClick={() => setCartOpen(false)} />
          <div className="relative w-full max-w-md bg-white h-full flex flex-col shadow-2xl">
            <div className="px-5 py-4 border-b border-[#DCE6DC] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#006B35]" />
                <h2 className="text-lg font-bold text-[#17251B]">
                  {lang === 'bn' ? 'আপনার কার্ট' : 'Your Cart'}{' '}
                  <span className="text-sm font-normal text-[#4E6153] font-mono-num">
                    ({cartCount})
                  </span>
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setCartOpen(false)}
                aria-label="Close cart"
                className="p-2 rounded-lg text-[#4E6153] hover:bg-[#F7FAF5] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <ShoppingBag className="w-12 h-12 text-[#DCE6DC] mb-4" />
                <p className="text-base font-semibold text-[#17251B] mb-1">
                  {lang === 'bn' ? 'আপনার কার্ট খালি রয়েছে' : 'Your cart is empty'}
                </p>
                <p className="text-sm text-[#4E6153] mb-6">
                  {lang === 'bn'
                    ? 'মানসম্মত মধু, বাদাম, খেজুর ও হানি নাটস দেখতে শপে যান।'
                    : 'Browse our quality nuts, honey, dates, and honey nuts.'}
                </p>
                <Link
                  to="/shop"
                  onClick={() => setCartOpen(false)}
                  className="px-5 py-2.5 rounded-lg text-white text-sm font-semibold"
                  style={{ backgroundColor: 'var(--zad-primary)' }}
                >
                  {lang === 'bn' ? 'পণ্য দেখুন' : 'Browse Shop'}
                </Link>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto divide-y divide-[#EEF5EB] px-5">
                  {cart.map((item) => (
                    <div key={`${item.productId}-${item.variantId}`} className="py-4 flex gap-3.5">
                      <SafeImage
                        src={item.imageUrl}
                        alt={pickLang(item.productNameBn, item.productNameEn, lang)}
                        className="w-20 h-20 rounded-lg object-cover border border-[#DCE6DC] shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            to={`/product/${item.productSlug}`}
                            onClick={() => setCartOpen(false)}
                            className="text-sm font-semibold text-[#17251B] hover:text-[#006B35] line-clamp-2"
                          >
                            {pickLang(item.productNameBn, item.productNameEn, lang)}
                          </Link>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.productId, item.variantId)}
                            aria-label="Remove item"
                            className="text-[#4E6153] hover:text-red-600 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <p className="text-xs text-[#4E6153] mt-0.5">
                          {pickLang(item.variantLabelBn, item.variantLabelEn, lang)}
                          {item.isWholesaleApplied && (
                            <span className="text-[#006B35] font-medium">
                              {' '}
                              · {lang === 'bn' ? 'পাইকারি মূল্য প্রযোজ্য' : 'Wholesale rate applied'}
                            </span>
                          )}
                          {item.freeDelivery && (
                            <span className="text-[#006B35] font-medium">
                              {' '}
                              · {lang === 'bn' ? 'ফ্রি ডেলিভারি' : 'Free delivery'}
                            </span>
                          )}
                        </p>

                        <div className="mt-2.5 flex items-center justify-between">
                          <div className="inline-flex items-center border border-[#DCE6DC] rounded-lg">
                            <button
                              type="button"
                              onClick={() =>
                                updateCartItemQty(item.productId, item.variantId, item.quantity - 1)
                              }
                              className="px-2.5 py-1 text-[#17251B] hover:bg-[#F7FAF5] cursor-pointer"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="px-3 text-sm font-mono-num font-semibold">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                updateCartItemQty(item.productId, item.variantId, item.quantity + 1)
                              }
                              className="px-2.5 py-1 text-[#17251B] hover:bg-[#F7FAF5] cursor-pointer"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="text-right">
                            <p className="text-sm font-bold text-[#17251B] font-mono-num">
                              {formatBDT(item.unitPrice * item.quantity, lang)}
                            </p>
                            {item.unitPrice < item.retailPrice && (
                              <p className="text-[11px] text-[#4E6153] line-through font-mono-num">
                                {formatBDT(item.retailPrice * item.quantity, lang)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-5 border-t border-[#DCE6DC] bg-[#F7FAF5] space-y-3">
                  <div className="flex items-center justify-between text-base font-bold text-[#17251B]">
                    <span>{lang === 'bn' ? 'সাবটোটাল' : 'Subtotal'}</span>
                    <span className="font-mono-num">{formatBDT(cartSubtotal, lang)}</span>
                  </div>
                  <p className="text-xs text-[#4E6153]">
                    {lang === 'bn'
                      ? 'ডেলিভারি চার্জ চেকআউট ধাপে জেলা অনুযায়ী হিসাব করা হবে।'
                      : 'Delivery charges are calculated at checkout based on district.'}
                  </p>
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <Link
                      to="/cart"
                      onClick={() => setCartOpen(false)}
                      className="text-center py-2.5 px-4 rounded-lg border border-[#006B35] text-[#006B35] text-sm font-semibold hover:bg-[#006B35]/5 transition-colors"
                    >
                      {lang === 'bn' ? 'কার্ট দেখুন' : 'View Cart'}
                    </Link>
                    <Link
                      to="/checkout"
                      onClick={() => setCartOpen(false)}
                      className="text-center py-2.5 px-4 rounded-lg text-white text-sm font-semibold hover:opacity-95 transition-opacity"
                      style={{ backgroundColor: 'var(--zad-primary)' }}
                    >
                      {lang === 'bn' ? 'অর্ডার করুন' : 'Checkout'}
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="no-print fixed top-20 right-4 z-50 flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)] pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-2.5 px-4 py-3 rounded-xl border shadow-lg text-sm bg-white ${
              toast.type === 'error'
                ? 'border-red-200 text-red-800'
                : toast.type === 'info'
                ? 'border-sky-200 text-sky-900'
                : 'border-[#006B35]/30 text-[#17251B]'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
            ) : toast.type === 'info' ? (
              <Info className="w-4 h-4 text-sky-600 mt-0.5 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-[#006B35] mt-0.5 shrink-0" />
            )}
            <span className="flex-1 leading-snug">{toast.message}</span>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="text-[#4E6153] hover:text-[#17251B] cursor-pointer"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
