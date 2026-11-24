import React, { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { CheckCircle2, MessageCircle, PackageSearch, Printer } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { formatBDT, formatWhatsAppLink, pickLang } from '../lib/i18n';
import { getOrderTrackingByNumber } from '../lib/firestoreService';
import type { OrderItem } from '../types';

interface ReceiptState {
  orderNumber: string;
  customerName?: string;
  phone?: string;
  district: string;
  thana?: string;
  address?: string;
  paymentMethod: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  deliveryCharge: number;
  totalAmount: number;
}

export default function OrderConfirmationPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const location = useLocation();
  const { lang, settings } = useApp();

  const [receipt, setReceipt] = useState<ReceiptState | null>(() => {
    const state = location.state as ReceiptState | null;
    if (state?.orderNumber) return state;
    if (orderId) {
      try {
        const cached = sessionStorage.getItem(`zad_order_${orderId}`);
        if (cached) return JSON.parse(cached) as ReceiptState;
      } catch {
        // ignore
      }
    }
    return null;
  });

  useEffect(() => {
    if (receipt || !orderId) return;
    void getOrderTrackingByNumber(orderId).then((track) => {
      if (!track) return;
      setReceipt({
        orderNumber: track.orderNumber,
        district: track.district,
        paymentMethod: track.paymentMethod,
        subtotal: track.subtotal,
        discount: track.discount,
        deliveryCharge: track.deliveryCharge,
        totalAmount: track.totalAmount,
        items: track.itemsSummary.map((s, idx) => ({
          productId: String(idx),
          productNameBn: s.nameBn,
          productNameEn: s.nameEn,
          variantId: String(idx),
          variantLabelBn: s.variantBn,
          variantLabelEn: s.variantEn,
          quantity: s.quantity,
          unitPrice: s.lineTotal / Math.max(1, s.quantity),
          lineTotal: s.lineTotal,
          isWholesale: false,
          freeDelivery: false,
        })),
      });
    });
  }, [orderId, receipt]);

  const orderNo = receipt?.orderNumber || orderId || '';
  const whatsappText = receipt
    ? `Assalamu Alaikum ZAD Foods! I just placed order #${orderNo}.\nTotal: BDT ${receipt.totalAmount}\nDistrict: ${receipt.district}\nPayment: ${receipt.paymentMethod}`
    : `Hello ZAD Foods, confirming my order #${orderNo}`;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 lg:py-14">
      <div className="bg-white border border-[#DCE6DC] rounded-2xl p-6 sm:p-10 space-y-6">
        <div className="text-center space-y-3 pb-6 border-b border-[#EEF5EB]">
          <div className="w-14 h-14 rounded-full bg-[#EEF5EB] text-[#006B35] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#17251B]">
            {lang === 'bn' ? 'আপনার অর্ডারটি নিশ্চিত হয়েছে!' : 'Thank You! Your Order is Received'}
          </h1>
          <p className="text-sm text-[#4E6153]">
            {lang === 'bn'
              ? 'আপনার অর্ডার নম্বরটি সংরক্ষণ করে রাখুন। আমাদের টিম শীঘ্রই কল করে ডেলিভারি নিশ্চিত করবে।'
              : 'Please save your Order ID below. Our team will verify and dispatch your order shortly.'}
          </p>
          <div className="inline-block px-5 py-2.5 rounded-xl bg-[#F7FAF5] border border-[#DCE6DC]">
            <span className="text-xs text-[#4E6153] block">
              {lang === 'bn' ? 'অর্ডার আইডি' : 'Order ID'}
            </span>
            <span className="text-lg sm:text-xl font-bold font-mono-num text-[#006B35]">
              {orderNo}
            </span>
          </div>
        </div>

        {receipt && (
          <>
            {receipt.customerName && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-[#F7FAF5] p-4 rounded-xl border border-[#EEF5EB]">
                <div>
                  <p className="text-xs text-[#4E6153]">{lang === 'bn' ? 'গ্রাহক' : 'Customer'}</p>
                  <p className="font-semibold text-[#17251B]">{receipt.customerName}</p>
                  {receipt.phone && <p className="font-mono-num text-xs">{receipt.phone}</p>}
                </div>
                <div>
                  <p className="text-xs text-[#4E6153]">
                    {lang === 'bn' ? 'ডেলিভারি ঠিকানা' : 'Delivery Address'}
                  </p>
                  <p className="text-[#17251B]">
                    {[receipt.address, receipt.thana, receipt.district].filter(Boolean).join(', ')}
                  </p>
                  <p className="text-xs text-[#006B35] font-medium mt-0.5">
                    {receipt.paymentMethod}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h2 className="text-sm font-bold text-[#17251B]">
                {lang === 'bn' ? 'অর্ডারকৃত পণ্যসমূহ' : 'Ordered Products'}
              </h2>
              <div className="divide-y divide-[#EEF5EB] border border-[#DCE6DC] rounded-xl">
                {receipt.items.map((item, idx) => (
                  <div key={idx} className="p-3.5 flex items-center justify-between gap-3 text-sm">
                    <div>
                      <p className="font-semibold text-[#17251B]">
                        {pickLang(item.productNameBn, item.productNameEn, lang)}
                      </p>
                      <p className="text-xs text-[#4E6153]">
                        {pickLang(item.variantLabelBn, item.variantLabelEn, lang)} ×{' '}
                        <span className="font-mono-num">{item.quantity}</span>
                      </p>
                    </div>
                    <span className="font-mono-num font-semibold text-[#17251B]">
                      {formatBDT(item.lineTotal, lang)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 text-sm pt-2 border-t border-[#EEF5EB]">
              <div className="flex justify-between text-[#4E6153]">
                <span>{lang === 'bn' ? 'সাবটোটাল' : 'Subtotal'}</span>
                <span className="font-mono-num">{formatBDT(receipt.subtotal, lang)}</span>
              </div>
              {receipt.discount > 0 && (
                <div className="flex justify-between text-[#006B35]">
                  <span>{lang === 'bn' ? 'ছাড়' : 'Discount'}</span>
                  <span className="font-mono-num">−{formatBDT(receipt.discount, lang)}</span>
                </div>
              )}
              <div className="flex justify-between text-[#4E6153]">
                <span>{lang === 'bn' ? 'ডেলিভারি চার্জ' : 'Delivery Charge'}</span>
                <span className="font-mono-num">
                  {receipt.deliveryCharge === 0
                    ? lang === 'bn'
                      ? 'ফ্রি'
                      : 'Free'
                    : formatBDT(receipt.deliveryCharge, lang)}
                </span>
              </div>
              <div className="flex justify-between text-base font-bold text-[#17251B] pt-2 border-t border-[#EEF5EB]">
                <span>{lang === 'bn' ? 'সর্বমোট' : 'Total Amount'}</span>
                <span className="font-mono-num text-[#006B35]">
                  {formatBDT(receipt.totalAmount, lang)}
                </span>
              </div>
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="no-print flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-[#EEF5EB]">
          <Link
            to={`/track-order?id=${encodeURIComponent(orderNo)}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: 'var(--zad-primary)' }}
          >
            <PackageSearch className="w-4 h-4" />
            <span>{lang === 'bn' ? 'অর্ডার ট্র্যাক করুন' : 'Track Order'}</span>
          </Link>

          <a
            href={formatWhatsAppLink(
              settings.business.whatsappNumber || settings.business.phone,
              whatsappText
            )}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold border border-[#168B35] text-[#168B35] hover:bg-[#EEF5EB]"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{lang === 'bn' ? 'হোয়াটসঅ্যাপে কনফার্ম করুন' : 'Confirm on WhatsApp'}</span>
          </a>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border border-[#DCE6DC] text-[#17251B] hover:bg-[#F7FAF5] cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>{lang === 'bn' ? 'রসিদ প্রিন্ট' : 'Print Receipt'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
