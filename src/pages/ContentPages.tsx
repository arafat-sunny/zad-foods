import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Facebook, Mail, MapPin, MessageCircle, Phone, Send } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { formatWhatsAppLink, pickLang } from '../lib/i18n';
import { submitInquiry } from '../lib/firestoreService';
import { SafeImage } from '../components/store/StoreLayout';

export function AboutPage() {
  const { lang, settings } = useApp();
  const { pages, business, homepage } = settings;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16 space-y-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7 space-y-4">
          <p className="text-xs font-semibold text-[#006B35] tracking-wide">
            {pickLang(business.brandNameBn, business.brandNameEn, lang)} ·{' '}
            {pickLang(business.taglineBn, business.taglineEn, lang)}
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#17251B]">
            {pickLang(pages.aboutUs.headingBn, pages.aboutUs.headingEn, lang)}
          </h1>
          <p className="text-base text-[#4E6153] leading-relaxed whitespace-pre-line">
            {pickLang(pages.aboutUs.introBn, pages.aboutUs.introEn, lang)}
          </p>
        </div>
        <div className="lg:col-span-5">
          <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-[#DCE6DC] bg-white">
            <SafeImage
              src={homepage.brandIntro.imageUrl || settings.appearance.logoUrl}
              alt="ZAD Foods"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-[#DCE6DC] rounded-2xl p-6 sm:p-8 space-y-3">
          <h2 className="font-display text-xl font-bold text-[#17251B]">
            {lang === 'bn' ? 'আমাদের লক্ষ্য' : 'Our Mission'}
          </h2>
          <p className="text-sm sm:text-base text-[#4E6153] leading-relaxed whitespace-pre-line">
            {pickLang(pages.aboutUs.missionBn, pages.aboutUs.missionEn, lang)}
          </p>
        </div>
        <div className="bg-white border border-[#DCE6DC] rounded-2xl p-6 sm:p-8 space-y-3">
          <h2 className="font-display text-xl font-bold text-[#17251B]">
            {lang === 'bn' ? 'প্রতিষ্ঠাতার বার্তা' : 'From the Founder'}
          </h2>
          <p className="text-sm sm:text-base text-[#4E6153] leading-relaxed whitespace-pre-line">
            {pickLang(pages.aboutUs.founderNoteBn, pages.aboutUs.founderNoteEn, lang)}
          </p>
          <p className="text-xs font-semibold text-[#006B35] pt-2">
            {pickLang(business.founderNameBn, business.founderNameEn, lang)} ·{' '}
            {pickLang(business.addressBn, business.addressEn, lang)}
          </p>
        </div>
      </div>
    </div>
  );
}

export function ContactPage() {
  const { lang, settings, notify } = useApp();
  const { business, pages } = settings;

  const [inquiryType, setInquiryType] = useState<'contact' | 'wholesale'>('contact');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await submitInquiry({
        type: inquiryType,
        name,
        phone,
        email: email || undefined,
        businessName: inquiryType === 'wholesale' ? businessName : undefined,
        quantity: inquiryType === 'wholesale' ? quantity : undefined,
        message,
      });
      notify(
        lang === 'bn'
          ? 'আপনার বার্তাটি সফলভাবে পাঠানো হয়েছে। আমরা শীঘ্রই যোগাযোগ করব।'
          : 'Your message has been sent. We will respond shortly.'
      );
      setName('');
      setPhone('');
      setEmail('');
      setBusinessName('');
      setQuantity('');
      setMessage('');
    } catch {
      notify(lang === 'bn' ? 'বার্তা পাঠাতে সমস্যা হয়েছে' : 'Failed to send message', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
      <div className="mb-10 max-w-2xl">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#17251B]">
          {pickLang(pages.contactUs.headingBn, pages.contactUs.headingEn, lang)}
        </h1>
        <p className="text-sm sm:text-base text-[#4E6153] mt-2">
          {pickLang(pages.contactUs.introBn, pages.contactUs.introEn, lang)}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Contact Details */}
        <div className="lg:col-span-5 bg-white border border-[#DCE6DC] rounded-2xl p-6 sm:p-8 space-y-5 h-fit">
          <h2 className="text-lg font-bold text-[#17251B]">
            {lang === 'bn' ? 'সরাসরি যোগাযোগ' : 'Direct Contact'}
          </h2>
          <div className="space-y-4 text-sm text-[#4E6153]">
            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 text-[#006B35] mt-1 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-[#17251B]">
                  {lang === 'bn' ? 'ফোন ও হোয়াটসঅ্যাপ' : 'Phone & WhatsApp'}
                </p>
                <a href={`tel:${business.phone}`} className="font-mono-num text-[#006B35] font-semibold">
                  {business.phone}
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-[#006B35] mt-1 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-[#17251B]">
                  {lang === 'bn' ? 'ঠিকানা' : 'Location'}
                </p>
                <p>{pickLang(business.addressBn, business.addressEn, lang)}</p>
              </div>
            </div>

            {business.email && (
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-[#006B35] mt-1 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-[#17251B]">Email</p>
                  <a href={`mailto:${business.email}`} className="hover:underline">
                    {business.email}
                  </a>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 text-[#006B35] mt-1 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-[#17251B]">
                  {lang === 'bn' ? 'সেবার সময়' : 'Business Hours'}
                </p>
                <p>{pickLang(business.businessHoursBn, business.businessHoursEn, lang)}</p>
              </div>
            </div>

            {business.facebookUrl && (
              <div className="flex items-start gap-3">
                <Facebook className="w-4 h-4 text-[#006B35] mt-1 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-[#17251B]">Facebook</p>
                  <a
                    href={business.facebookUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#006B35] hover:underline"
                  >
                    {business.facebookName || 'ZAD Foods'}
                  </a>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-[#EEF5EB]">
            <a
              href={formatWhatsAppLink(business.whatsappNumber || business.phone)}
              target="_blank"
              rel="noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#168B35] text-white text-sm font-semibold hover:bg-[#006B35] transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{lang === 'bn' ? 'হোয়াটসঅ্যাপে মেসেজ দিন' : 'Chat on WhatsApp'}</span>
            </a>
          </div>
        </div>

        {/* Contact / Wholesale Form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 bg-white border border-[#DCE6DC] rounded-2xl p-6 sm:p-8 space-y-4"
        >
          <div className="flex items-center gap-2 p-1 bg-[#F7FAF5] border border-[#DCE6DC] rounded-lg w-fit">
            <button
              type="button"
              onClick={() => setInquiryType('contact')}
              className={`px-3.5 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                inquiryType === 'contact'
                  ? 'bg-white text-[#006B35] shadow-sm'
                  : 'text-[#4E6153] hover:text-[#17251B]'
              }`}
            >
              {lang === 'bn' ? 'সাধারণ যোগাযোগ' : 'General Inquiry'}
            </button>
            <button
              type="button"
              onClick={() => setInquiryType('wholesale')}
              className={`px-3.5 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                inquiryType === 'wholesale'
                  ? 'bg-white text-[#006B35] shadow-sm'
                  : 'text-[#4E6153] hover:text-[#17251B]'
              }`}
            >
              {lang === 'bn' ? 'পাইকারি অর্ডার অনুসন্ধান' : 'Wholesale Inquiry'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                {lang === 'bn' ? 'আপনার নাম *' : 'Full Name *'}
              </label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE6DC] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                {lang === 'bn' ? 'মোবাইল নম্বর *' : 'Phone Number *'}
              </label>
              <input
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE6DC] text-sm font-mono-num"
              />
            </div>
            <div className={inquiryType === 'wholesale' ? '' : 'sm:col-span-2'}>
              <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                {lang === 'bn' ? 'ইমেইল (ঐচ্ছিক)' : 'Email (Optional)'}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE6DC] text-sm"
              />
            </div>

            {inquiryType === 'wholesale' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                    {lang === 'bn' ? 'দোকান / প্রতিষ্ঠানের নাম' : 'Business / Shop Name'}
                  </label>
                  <input
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE6DC] text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                    {lang === 'bn' ? 'আগ্রহী পণ্য ও পরিমাণ' : 'Products & Estimated Quantity'}
                  </label>
                  <input
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="e.g. Ten Nuts Mini Pack 25g — 300 pcs"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE6DC] text-sm"
                  />
                </div>
              </>
            )}

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                {lang === 'bn' ? 'আপনার বার্তা *' : 'Your Message *'}
              </label>
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE6DC] text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={sending}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-white cursor-pointer"
            style={{ backgroundColor: 'var(--zad-primary)' }}
          >
            <Send className="w-4 h-4" />
            <span>
              {sending
                ? lang === 'bn'
                  ? 'পাঠানো হচ্ছে...'
                  : 'Sending...'
                : lang === 'bn'
                ? 'বার্তা পাঠান'
                : 'Send Message'}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}

export function PolicyPage({ kind }: { kind: 'privacyPolicy' | 'terms' | 'returnPolicy' }) {
  const { lang, settings } = useApp();
  const section = settings.pages[kind];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 lg:py-16">
      <div className="bg-white border border-[#DCE6DC] rounded-2xl p-8 sm:p-10 space-y-5">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#17251B]">
          {pickLang(section.titleBn, section.titleEn, lang)}
        </h1>
        <div className="text-sm sm:text-base text-[#4E6153] leading-relaxed whitespace-pre-line">
          {pickLang(section.contentBn, section.contentEn, lang)}
        </div>
      </div>
    </div>
  );
}

export function NotFoundPage() {
  const { lang } = useApp();
  return (
    <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-4">
      <p className="font-mono-num text-5xl font-bold text-[#006B35]">404</p>
      <h1 className="font-display text-2xl font-bold text-[#17251B]">
        {lang === 'bn' ? 'দুঃখিত, পৃষ্ঠাটি পাওয়া যায়নি' : 'Page Not Found'}
      </h1>
      <p className="text-sm text-[#4E6153]">
        {lang === 'bn'
          ? 'আপনি যে পৃষ্ঠাটি খুঁজছেন তা সরানো হয়েছে বা ঠিকানাটি সঠিক নয়।'
          : 'The page you are looking for does not exist or has been moved.'}
      </p>
      <div className="pt-2 flex items-center justify-center gap-3">
        <Link
          to="/"
          className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white"
          style={{ backgroundColor: 'var(--zad-primary)' }}
        >
          {lang === 'bn' ? 'হোম পেজে যান' : 'Go Home'}
        </Link>
        <Link
          to="/shop"
          className="px-5 py-2.5 rounded-lg text-sm font-semibold border border-[#DCE6DC] bg-white text-[#17251B]"
        >
          {lang === 'bn' ? 'শপ দেখুন' : 'Visit Shop'}
        </Link>
      </div>
    </div>
  );
}
