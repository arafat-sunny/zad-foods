import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, PackageSearch, Search } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import {
  formatBDT,
  formatFirestoreDate,
  ORDER_STATUS_META,
  pickLang,
} from '../lib/i18n';
import { getOrderTrackingByNumber } from '../lib/firestoreService';
import type { OrderStatus, OrderTracking } from '../types';

const TIMELINE_STEPS: OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'ready_to_ship',
  'shipped',
  'delivered',
];

export default function OrderTrackingPage() {
  const [searchParams] = useSearchParams();
  const { lang } = useApp();
  const [orderInput, setOrderInput] = useState(searchParams.get('id') || '');
  const [tracking, setTracking] = useState<OrderTracking | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const performLookup = async (id: string) => {
    const clean = id.trim().toUpperCase();
    if (!clean) return;
    setLoading(true);
    setNotFound(false);
    try {
      const result = await getOrderTrackingByNumber(clean);
      setTracking(result);
      setNotFound(!result);
    } catch {
      setTracking(null);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const prefilled = searchParams.get('id');
    if (prefilled) {
      setOrderInput(prefilled);
      void performLookup(prefilled);
    }
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void performLookup(orderInput);
  };

  const currentMeta = tracking ? ORDER_STATUS_META[tracking.status] : null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 lg:py-14">
      <div className="text-center mb-8 space-y-2">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#17251B]">
          {lang === 'bn' ? 'আপনার অর্ডার ট্র্যাক করুন' : 'Track Your Order'}
        </h1>
        <p className="text-sm text-[#4E6153]">
          {lang === 'bn'
            ? 'অর্ডার কনফার্মেশন থেকে প্রাপ্ত অর্ডার আইডি (যেমন: ZAD-20261119-1234) লিখুন।'
            : 'Enter the Order ID from your confirmation receipt (e.g. ZAD-20261119-1234).'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5 mb-8">
        <div className="relative flex-1">
          <PackageSearch className="w-4 h-4 text-[#4E6153] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            required
            value={orderInput}
            onChange={(e) => setOrderInput(e.target.value)}
            placeholder="ZAD-YYYYMMDD-XXXX"
            className="w-full pl-10 pr-4 py-3 bg-white border border-[#DCE6DC] rounded-xl text-sm font-mono-num uppercase focus:outline-none focus:border-[#006B35]"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white whitespace-nowrap cursor-pointer"
          style={{ backgroundColor: 'var(--zad-primary)' }}
        >
          <Search className="w-4 h-4" />
          <span>
            {loading
              ? lang === 'bn'
                ? 'খোঁজা হচ্ছে...'
                : 'Searching...'
              : lang === 'bn'
              ? 'অর্ডার খুঁজুন'
              : 'Track Order'}
          </span>
        </button>
      </form>

      {notFound && (
        <div className="bg-white border border-amber-200 rounded-2xl p-8 text-center">
          <p className="text-base font-semibold text-[#17251B] mb-1">
            {lang === 'bn' ? 'এই আইডিতে কোনো অর্ডার পাওয়া যায়নি' : 'Order Not Found'}
          </p>
          <p className="text-sm text-[#4E6153]">
            {lang === 'bn'
              ? 'অনুগ্রহ করে অর্ডার আইডিটি সঠিকভাবে যাচাই করুন অথবা ০১৭৭২১০৩৮৩২ নম্বরে যোগাযোগ করুন।'
              : 'Please double-check your Order ID or contact us at 01772103832.'}
          </p>
        </div>
      )}

      {tracking && currentMeta && (
        <div className="bg-white border border-[#DCE6DC] rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[#EEF5EB]">
            <div>
              <p className="text-xs text-[#4E6153]">{lang === 'bn' ? 'অর্ডার আইডি' : 'Order ID'}</p>
              <p className="text-xl font-bold font-mono-num text-[#17251B]">
                {tracking.orderNumber}
              </p>
              <p className="text-xs text-[#4E6153] mt-0.5">
                {formatFirestoreDate(tracking.createdAt, lang)} · {tracking.district}
              </p>
            </div>
            <div className={`px-3.5 py-1.5 rounded-lg border text-xs font-semibold ${currentMeta.colorClass}`}>
              {pickLang(currentMeta.labelBn, currentMeta.labelEn, lang)}
            </div>
          </div>

          {/* Order Progress Stepper */}
          {currentMeta.stepIndex >= 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
              {TIMELINE_STEPS.map((step, idx) => {
                const done = idx <= currentMeta.stepIndex;
                const meta = ORDER_STATUS_META[step];
                return (
                  <div
                    key={step}
                    className={`p-3 rounded-xl border text-center ${
                      done
                        ? 'border-[#006B35] bg-[#EEF5EB]/70 text-[#006B35]'
                        : 'border-[#EEF5EB] bg-[#F7FAF5] text-[#4E6153]'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full mx-auto mb-1.5 flex items-center justify-center text-xs font-bold ${
                        done ? 'bg-[#006B35] text-white' : 'bg-[#DCE6DC] text-[#4E6153]'
                      }`}
                    >
                      {done ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                    </div>
                    <p className="text-[11px] font-semibold leading-tight">
                      {pickLang(meta.labelBn, meta.labelEn, lang)}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800">
              {lang === 'bn'
                ? `এই অর্ডারটির বর্তমান অবস্থা: ${currentMeta.labelBn}`
                : `This order is currently marked as ${currentMeta.labelEn}.`}
            </div>
          )}

          {/* Items Summary */}
          <div className="space-y-2">
            <h2 className="text-sm font-bold text-[#17251B]">
              {lang === 'bn' ? 'অর্ডারকৃত আইটেম' : 'Items Summary'}
            </h2>
            <div className="divide-y divide-[#EEF5EB] border border-[#DCE6DC] rounded-xl">
              {tracking.itemsSummary.map((item, idx) => (
                <div key={idx} className="p-3.5 flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-[#17251B]">
                      {pickLang(item.nameBn, item.nameEn, lang)}
                    </p>
                    <p className="text-xs text-[#4E6153]">
                      {pickLang(item.variantBn, item.variantEn, lang)} × {item.quantity}
                    </p>
                  </div>
                  <span className="font-mono-num font-semibold">
                    {formatBDT(item.lineTotal, lang)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-[#EEF5EB] flex items-center justify-between text-base font-bold text-[#17251B]">
            <span>
              {lang === 'bn' ? 'মোট প্রদেয়' : 'Total Amount'} ({tracking.paymentMethod})
            </span>
            <span className="font-mono-num text-[#006B35]">
              {formatBDT(tracking.totalAmount, lang)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
