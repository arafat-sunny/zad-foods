import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Lock, Truck } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { BANGLADESH_DISTRICTS, formatBDT, pickLang } from '../lib/i18n';
import { placeCustomerOrder, saveCustomerProfile } from '../lib/firestoreService';

const BN_TO_EN_DIGITS: Record<string, string> = {
  '০': '0',
  '১': '1',
  '২': '2',
  '৩': '3',
  '৪': '4',
  '৫': '5',
  '৬': '6',
  '৭': '7',
  '৮': '8',
  '৯': '9',
};

function normalizePhoneInput(raw: string): string {
  return raw
    .replace(/[০-৯]/g, (d) => BN_TO_EN_DIGITS[d] ?? d)
    .replace(/[\s\-()]/g, '')
    .trim();
}

function getFriendlyCheckoutError(err: unknown, lang: 'bn' | 'en'): string {
  const raw = err instanceof Error ? err.message : '';
  let parsedError = raw;
  try {
    const parsed = JSON.parse(raw) as { error?: string };
    if (parsed && typeof parsed.error === 'string') {
      parsedError = parsed.error;
    }
  } catch {
    // not JSON
  }

  const lower = parsedError.toLowerCase();
  if (lower.includes('offline') || lower.includes('network') || lower.includes('unavailable')) {
    return lang === 'bn'
      ? 'ইন্টারনেট সংযোগ পাওয়া যাচ্ছে না। অনুগ্রহ করে সংযোগ চেক করে আবার চেষ্টা করুন।'
      : 'Network connection error. Please check your internet connection and try again.';
  }
  if (lower.includes('permission')) {
    return lang === 'bn'
      ? 'অর্ডার জমা দিতে সাময়িক সমস্যা হয়েছে। অনুগ্রহ করে সব তথ্য সঠিকভাবে দিয়ে আবার চেষ্টা করুন।'
      : 'Unable to submit your order right now. Please verify all fields and try again.';
  }
  return lang === 'bn'
    ? 'অর্ডার সম্পন্ন করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন অথবা হোয়াটসঅ্যাপে যোগাযোগ করুন।'
    : 'Could not complete your order. Please try again or contact us on WhatsApp.';
}

export default function CheckoutPage() {
  const { lang, cart, cartSubtotal, settings, clearCart, notify, user, customerProfile } = useApp();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(customerProfile?.displayName || user?.displayName || '');
  const [phone, setPhone] = useState(customerProfile?.phone || '');
  const [altPhone, setAltPhone] = useState('');
  const [district, setDistrict] = useState(customerProfile?.district || 'Dhaka');
  const [thana, setThana] = useState(customerProfile?.thana || '');
  const [address, setAddress] = useState(customerProfile?.address || '');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!customerProfile && !user) return;
    setFullName((prev) => prev || customerProfile?.displayName || user?.displayName || '');
    setPhone((prev) => prev || customerProfile?.phone || '');
    setDistrict((prev) => (prev === 'Dhaka' && customerProfile?.district ? customerProfile.district : prev));
    setThana((prev) => prev || customerProfile?.thana || '');
    setAddress((prev) => prev || customerProfile?.address || '');
  }, [customerProfile, user]);

  const activeManualMethods = useMemo(
    () =>
      settings.delivery.manualPaymentEnabled
        ? settings.delivery.manualPaymentMethods.filter((m) => m.enabled && m.accountNumber.trim())
        : [],
    [settings.delivery]
  );

  const [paymentMethod, setPaymentMethod] = useState<string>(
    settings.delivery.codEnabled
      ? 'Cash on Delivery'
      : activeManualMethods[0]?.name || 'Cash on Delivery'
  );
  const [paymentReference, setPaymentReference] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const hasFreeDeliveryItem = cart.some((item) => item.freeDelivery);
  const meetsFreeThreshold =
    settings.delivery.freeDeliveryThreshold > 0 &&
    cartSubtotal >= settings.delivery.freeDeliveryThreshold;

  const deliveryCharge = useMemo(() => {
    if (cart.length === 0) return 0;
    if (hasFreeDeliveryItem || meetsFreeThreshold) return 0;
    return district === 'Dhaka'
      ? settings.delivery.insideDhakaCharge
      : settings.delivery.outsideDhakaCharge;
  }, [cart.length, district, hasFreeDeliveryItem, meetsFreeThreshold, settings.delivery]);

  const totalRetail = cart.reduce((acc, i) => acc + i.retailPrice * i.quantity, 0);
  const discount = Math.max(0, totalRetail - cartSubtotal);
  const totalPayable = cartSubtotal + deliveryCharge;

  if (cart.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold text-[#17251B] mb-2">
          {lang === 'bn' ? 'চেকআউটের জন্য কার্টে কোনো পণ্য নেই' : 'No Items in Cart for Checkout'}
        </h1>
        <Link
          to="/shop"
          className="inline-flex mt-4 px-5 py-2.5 rounded-lg text-sm font-semibold text-white"
          style={{ backgroundColor: 'var(--zad-primary)' }}
        >
          {lang === 'bn' ? 'শপে যান' : 'Go to Shop'}
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const trimmedName = fullName.trim();
    const cleanPhone = normalizePhoneInput(phone);
    const cleanAltPhone = normalizePhoneInput(altPhone);
    const trimmedThana = thana.trim();
    const trimmedAddress = address.trim();

    if (trimmedName.length < 2) {
      setFormError(
        lang === 'bn'
          ? 'অনুগ্রহ করে আপনার পূর্ণ নাম লিখুন (কমপক্ষে ২ অক্ষর)।'
          : 'Please enter your full name (at least 2 characters).'
      );
      return;
    }

    if (cleanPhone.length < 10 || cleanPhone.length > 20) {
      setFormError(
        lang === 'bn'
          ? 'অনুগ্রহ করে সঠিক বাংলাদেশি মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)।'
          : 'Please enter a valid Bangladeshi mobile number (e.g. 017XXXXXXXX).'
      );
      return;
    }

    if (trimmedThana.length < 2) {
      setFormError(
        lang === 'bn'
          ? 'অনুগ্রহ করে আপনার এলাকা বা থানার নাম লিখুন।'
          : 'Please enter your area or thana name.'
      );
      return;
    }

    if (trimmedAddress.length < 4) {
      setFormError(
        lang === 'bn'
          ? 'অনুগ্রহ করে বিস্তারিত ডেলিভারি ঠিকানা লিখুন।'
          : 'Please enter your full delivery address.'
      );
      return;
    }

    const isManual = paymentMethod !== 'Cash on Delivery';
    if (isManual && !paymentReference.trim()) {
      setFormError(
        lang === 'bn'
          ? 'ম্যানুয়াল পেমেন্টের জন্য ট্রানজেকশন আইডি (TrxID) লিখুন।'
          : 'Please enter the Transaction ID (TrxID) for manual payment.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const orderItems = cart.map((item) => ({
        productId: item.productId,
        productNameBn: item.productNameBn,
        productNameEn: item.productNameEn,
        variantId: item.variantId,
        variantLabelBn: item.variantLabelBn,
        variantLabelEn: item.variantLabelEn,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.unitPrice * item.quantity,
        isWholesale: Boolean(item.isWholesaleApplied),
        freeDelivery: Boolean(item.freeDelivery),
      }));

      const orderNumber = await placeCustomerOrder({
        customerName: trimmedName,
        phone: cleanPhone,
        altPhone: cleanAltPhone || undefined,
        district,
        thana: trimmedThana,
        address: trimmedAddress,
        notes: notes.trim() || undefined,
        paymentMethod,
        paymentReference: paymentReference.trim() || undefined,
        items: orderItems,
        subtotal: cartSubtotal,
        discount,
        deliveryCharge,
        totalAmount: totalPayable,
      });

      // Save customer shipping details to their profile if signed in
      if (user) {
        void saveCustomerProfile({
          uid: user.uid,
          displayName: trimmedName,
          email: user.email || '',
          phone: cleanPhone,
          district,
          thana: trimmedThana,
          address: trimmedAddress,
          wishlist: customerProfile?.wishlist || [],
        }).catch(() => undefined);
      }

      const receiptSnapshot = {
        orderNumber,
        customerName: trimmedName,
        phone: cleanPhone,
        district,
        thana: trimmedThana,
        address: trimmedAddress,
        paymentMethod,
        items: orderItems,
        subtotal: cartSubtotal,
        discount,
        deliveryCharge,
        totalAmount: totalPayable,
      };
      try {
        sessionStorage.setItem(`zad_order_${orderNumber}`, JSON.stringify(receiptSnapshot));
      } catch {
        // ignore
      }

      clearCart();
      notify(lang === 'bn' ? 'অর্ডার সফলভাবে সম্পন্ন হয়েছে!' : 'Order placed successfully!');
      navigate(`/order-confirmation/${orderNumber}`, { state: receiptSnapshot });
    } catch (err) {
      setFormError(getFriendlyCheckoutError(err, lang));
      notify(lang === 'bn' ? 'অর্ডার জমা দিতে সমস্যা হয়েছে' : 'Could not place order', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedManualObj = activeManualMethods.find((m) => m.name === paymentMethod);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#17251B] mb-8">
        {lang === 'bn' ? 'চেকআউট ও ডেলিভারি তথ্য' : 'Checkout & Delivery Details'}
      </h1>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Shipping & Payment Form */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-[#DCE6DC] rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-bold text-[#17251B] pb-2 border-b border-[#EEF5EB]">
              {lang === 'bn' ? '১. গ্রাহকের তথ্য' : '1. Customer Information'}
            </h2>

            {formError && (
              <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs sm:text-sm text-red-700">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                  {lang === 'bn' ? 'পূর্ণ নাম *' : 'Full Name *'}
                </label>
                <input
                  required
                  minLength={2}
                  maxLength={160}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={lang === 'bn' ? 'আপনার পূর্ণ নাম লিখুন' : 'Enter your full name'}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE6DC] text-sm focus:outline-none focus:border-[#006B35]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                  {lang === 'bn' ? 'মোবাইল নম্বর *' : 'Mobile Number *'}
                </label>
                <input
                  required
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="017XXXXXXXX"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE6DC] text-sm font-mono-num focus:outline-none focus:border-[#006B35]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                  {lang === 'bn' ? 'বিকল্প মোবাইল নম্বর (ঐচ্ছিক)' : 'Alternative Mobile (Optional)'}
                </label>
                <input
                  type="tel"
                  value={altPhone}
                  onChange={(e) => setAltPhone(e.target.value)}
                  placeholder="018XXXXXXXX"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE6DC] text-sm font-mono-num focus:outline-none focus:border-[#006B35]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                  {lang === 'bn' ? 'জেলা *' : 'District *'}
                </label>
                <select
                  required
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE6DC] bg-white text-sm focus:outline-none focus:border-[#006B35]"
                >
                  {BANGLADESH_DISTRICTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                  {lang === 'bn' ? 'এলাকা / থানা *' : 'Area / Thana *'}
                </label>
                <input
                  required
                  minLength={2}
                  maxLength={120}
                  value={thana}
                  onChange={(e) => setThana(e.target.value)}
                  placeholder={lang === 'bn' ? 'যেমন: মিরপুর-১৪, ধানমন্ডি' : 'e.g. Mirpur-14, Dhanmondi'}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE6DC] text-sm focus:outline-none focus:border-[#006B35]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                  {lang === 'bn' ? 'পূর্ণ ডেলিভারি ঠিকানা *' : 'Full Delivery Address *'}
                </label>
                <textarea
                  required
                  rows={2}
                  minLength={4}
                  maxLength={600}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={
                    lang === 'bn'
                      ? 'বাড়ি নং, রোড নং, ব্লক/সেক্টর ও বিস্তারিত ঠিকানা'
                      : 'House #, Road #, Block/Sector, landmark'
                  }
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE6DC] text-sm focus:outline-none focus:border-[#006B35]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                  {lang === 'bn' ? 'অর্ডার নোট (ঐচ্ছিক)' : 'Order Notes (Optional)'}
                </label>
                <input
                  maxLength={600}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={
                    lang === 'bn'
                      ? 'ডেলিভারির সময় বা বিশেষ কোনো নির্দেশনা থাকলে লিখুন'
                      : 'Any delivery timing or packing instructions'
                  }
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE6DC] text-sm focus:outline-none focus:border-[#006B35]"
                />
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-white border border-[#DCE6DC] rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-bold text-[#17251B] pb-2 border-b border-[#EEF5EB]">
              {lang === 'bn' ? '২. পেমেন্ট পদ্ধতি' : '2. Payment Method'}
            </h2>

            <div className="space-y-2.5">
              {settings.delivery.codEnabled && (
                <label
                  className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                    paymentMethod === 'Cash on Delivery'
                      ? 'border-[#006B35] bg-[#EEF5EB]/60'
                      : 'border-[#DCE6DC] hover:border-[#006B35]/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="Cash on Delivery"
                    checked={paymentMethod === 'Cash on Delivery'}
                    onChange={() => setPaymentMethod('Cash on Delivery')}
                    className="mt-1 accent-[#006B35]"
                  />
                  <div>
                    <p className="text-sm font-semibold text-[#17251B]">
                      {lang === 'bn' ? 'ক্যাশ অন ডেলিভারি (Cash on Delivery)' : 'Cash on Delivery (COD)'}
                    </p>
                    <p className="text-xs text-[#4E6153] mt-0.5">
                      {lang === 'bn'
                        ? 'পণ্য হাতে পেয়ে ডেলিভারি ম্যানের কাছে নগদ টাকা পরিশোধ করুন।'
                        : 'Pay in cash when your order arrives at your doorstep.'}
                    </p>
                  </div>
                </label>
              )}

              {activeManualMethods.map((method) => (
                <label
                  key={method.id}
                  className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                    paymentMethod === method.name
                      ? 'border-[#006B35] bg-[#EEF5EB]/60'
                      : 'border-[#DCE6DC] hover:border-[#006B35]/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method.name}
                    checked={paymentMethod === method.name}
                    onChange={() => setPaymentMethod(method.name)}
                    className="mt-1 accent-[#006B35]"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#17251B]">{method.name}</p>
                    <p className="text-xs font-mono-num font-semibold text-[#006B35] mt-0.5">
                      {method.accountNumber}
                    </p>
                    <p className="text-xs text-[#4E6153] mt-1">
                      {pickLang(method.instructionsBn, method.instructionsEn, lang)}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            {selectedManualObj && (
              <div className="pt-2">
                <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                  {lang === 'bn'
                    ? 'পেমেন্ট ট্রানজেকশন আইডি (TrxID) / প্রেরকের নম্বর *'
                    : 'Transaction ID (TrxID) / Sender Number *'}
                </label>
                <input
                  required
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="e.g. 9G5H2K8M1P"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE6DC] text-sm font-mono-num"
                />
              </div>
            )}
          </div>
        </div>

        {/* Right: Order Summary */}
        <aside className="lg:col-span-5 bg-white border border-[#DCE6DC] rounded-2xl p-6 space-y-5 lg:sticky lg:top-24">
          <h2 className="text-base font-bold text-[#17251B] pb-3 border-b border-[#EEF5EB]">
            {lang === 'bn' ? 'অর্ডার বিবরণ' : 'Order Review'}
          </h2>

          <div className="divide-y divide-[#EEF5EB] max-h-72 overflow-y-auto pr-1">
            {cart.map((item) => (
              <div
                key={`${item.productId}-${item.variantId}`}
                className="py-3 flex items-start justify-between gap-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-[#17251B] line-clamp-1">
                    {pickLang(item.productNameBn, item.productNameEn, lang)}
                  </p>
                  <p className="text-xs text-[#4E6153]">
                    {pickLang(item.variantLabelBn, item.variantLabelEn, lang)} ×{' '}
                    <span className="font-mono-num">{item.quantity}</span>
                  </p>
                </div>
                <span className="font-mono-num font-semibold text-[#17251B] shrink-0">
                  {formatBDT(item.unitPrice * item.quantity, lang)}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-[#EEF5EB] space-y-2 text-sm">
            <div className="flex justify-between text-[#4E6153]">
              <span>{lang === 'bn' ? 'সাবটোটাল' : 'Subtotal'}</span>
              <span className="font-mono-num font-semibold text-[#17251B]">
                {formatBDT(cartSubtotal, lang)}
              </span>
            </div>

            {discount > 0 && (
              <div className="flex justify-between text-[#006B35]">
                <span>{lang === 'bn' ? 'পাইকারি ছাড়' : 'Wholesale Discount'}</span>
                <span className="font-mono-num font-semibold">−{formatBDT(discount, lang)}</span>
              </div>
            )}

            <div className="flex justify-between text-[#4E6153]">
              <span className="inline-flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-[#006B35]" />
                <span>
                  {lang === 'bn' ? `ডেলিভারি (${district})` : `Delivery (${district})`}
                </span>
              </span>
              <span className="font-mono-num font-semibold text-[#17251B]">
                {deliveryCharge === 0
                  ? lang === 'bn'
                    ? 'ফ্রি'
                    : 'Free'
                  : formatBDT(deliveryCharge, lang)}
              </span>
            </div>

            {(hasFreeDeliveryItem || meetsFreeThreshold) && (
              <p className="text-xs text-[#006B35] font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  {hasFreeDeliveryItem
                    ? lang === 'bn'
                      ? 'বিশেষ অফারে ফ্রি হোম ডেলিভারি প্রযোজ্য হয়েছে!'
                      : 'Free Home Delivery applied via product special offer!'
                    : lang === 'bn'
                    ? 'ফ্রি ডেলিভারি সীমা পূর্ণ হয়েছে!'
                    : 'Free Delivery threshold reached!'}
                </span>
              </p>
            )}

            <div className="pt-3 border-t border-[#EEF5EB] flex justify-between text-lg font-bold text-[#17251B]">
              <span>{lang === 'bn' ? 'মোট প্রদেয়' : 'Total Payable'}</span>
              <span className="font-mono-num text-[#006B35]">
                {formatBDT(totalPayable, lang)}
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 px-5 rounded-lg text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2 cursor-pointer"
            style={{ backgroundColor: 'var(--zad-primary)' }}
          >
            <Lock className="w-4 h-4" />
            <span>
              {submitting
                ? lang === 'bn'
                  ? 'অর্ডার সংরক্ষণ হচ্ছে...'
                  : 'Placing Order...'
                : lang === 'bn'
                ? `অর্ডার নিশ্চিত করুন (${formatBDT(totalPayable, lang)})`
                : `Confirm Order (${formatBDT(totalPayable, lang)})`}
            </span>
          </button>

          <p className="text-[11px] text-[#4E6153] text-center">
            {pickLang(settings.delivery.deliveryNoteBn, settings.delivery.deliveryNoteEn, lang)}
          </p>
        </aside>
      </form>
    </div>
  );
}
