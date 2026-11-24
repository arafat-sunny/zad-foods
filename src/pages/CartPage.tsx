import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { formatBDT, pickLang } from '../lib/i18n';
import { SafeImage } from '../components/store/StoreLayout';

export default function CartPage() {
  const {
    lang,
    cart,
    products,
    cartSubtotal,
    settings,
    updateCartItemQty,
    changeCartItemVariant,
    removeFromCart,
  } = useApp();

  const totalRetail = cart.reduce((acc, item) => acc + item.retailPrice * item.quantity, 0);
  const wholesaleSavings = Math.max(0, totalRetail - cartSubtotal);
  const hasFreeDeliveryItem = cart.some((item) => item.freeDelivery);
  const meetsFreeThreshold =
    settings.delivery.freeDeliveryThreshold > 0 &&
    cartSubtotal >= settings.delivery.freeDeliveryThreshold;
  const estDelivery =
    hasFreeDeliveryItem || meetsFreeThreshold ? 0 : settings.delivery.insideDhakaCharge;

  if (cart.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <ShoppingBag className="w-14 h-14 text-[#DCE6DC] mx-auto mb-4" />
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#17251B] mb-2">
          {lang === 'bn' ? 'আপনার শপিং কার্ট খালি' : 'Your Shopping Cart is Empty'}
        </h1>
        <p className="text-sm text-[#4E6153] mb-6">
          {lang === 'bn'
            ? 'মানসম্মত বাদাম, মধু, খেজুর এবং হানি নাটস যুক্ত করুন।'
            : 'Explore our collection of natural honey, dates, nuts, and honey nuts.'}
        </p>
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-white"
          style={{ backgroundColor: 'var(--zad-primary)' }}
        >
          <span>{lang === 'bn' ? 'শপিং শুরু করুন' : 'Continue Shopping'}</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#17251B] mb-8">
        {lang === 'bn' ? 'শপিং কার্ট' : 'Shopping Cart'}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Cart Items Table */}
        <div className="lg:col-span-8 bg-white border border-[#DCE6DC] rounded-2xl divide-y divide-[#EEF5EB]">
          {cart.map((item) => {
            const productObj = products.find((p) => p.id === item.productId);
            const availableVariants =
              productObj?.variants.filter((v) => v.price !== null && v.price !== undefined) || [];

            return (
              <div
                key={`${item.productId}-${item.variantId}`}
                className="p-4 sm:p-6 flex flex-col sm:flex-row gap-4 sm:items-center"
              >
                <SafeImage
                  src={item.imageUrl}
                  alt={pickLang(item.productNameBn, item.productNameEn, lang)}
                  className="w-24 h-24 rounded-xl object-cover border border-[#DCE6DC] shrink-0"
                />

                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      to={`/product/${item.productSlug}`}
                      className="text-base font-semibold text-[#17251B] hover:text-[#006B35]"
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

                  {/* Variant Switcher Inside Cart */}
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    {availableVariants.length > 1 ? (
                      <select
                        value={item.variantId}
                        onChange={(e) => {
                          const target = availableVariants.find((v) => v.id === e.target.value);
                          if (target) changeCartItemVariant(item.productId, item.variantId, target);
                        }}
                        className="px-2.5 py-1.5 rounded-lg border border-[#DCE6DC] bg-[#F7FAF5] text-[#17251B] text-xs font-medium"
                      >
                        {availableVariants.map((v) => (
                          <option key={v.id} value={v.id}>
                            {pickLang(v.labelBn, v.labelEn, lang)} — {formatBDT(v.price, lang)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-[#4E6153]">
                        {pickLang(item.variantLabelBn, item.variantLabelEn, lang)}
                      </span>
                    )}

                    {item.isWholesaleApplied && (
                      <span className="text-[#006B35] font-semibold">
                        · {lang === 'bn' ? 'পাইকারি মূল্য প্রযোজ্য' : 'Wholesale Rate Active'}
                      </span>
                    )}
                    {item.freeDelivery && (
                      <span className="text-[#006B35] font-semibold">
                        · {lang === 'bn' ? 'ফ্রি হোম ডেলিভারি' : 'Free Home Delivery'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="inline-flex items-center border border-[#DCE6DC] rounded-lg">
                      <button
                        type="button"
                        onClick={() =>
                          updateCartItemQty(item.productId, item.variantId, item.quantity - 1)
                        }
                        className="px-3 py-1.5 hover:bg-[#F7FAF5] cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-3 text-sm font-mono-num font-bold">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() =>
                          updateCartItemQty(item.productId, item.variantId, item.quantity + 1)
                        }
                        className="px-3 py-1.5 hover:bg-[#F7FAF5] cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-right font-mono-num">
                      <p className="text-base font-bold text-[#17251B]">
                        {formatBDT(item.unitPrice * item.quantity, lang)}
                      </p>
                      <p className="text-xs text-[#4E6153]">
                        {formatBDT(item.unitPrice, lang)} × {item.quantity}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Cart Summary */}
        <aside className="lg:col-span-4 bg-white border border-[#DCE6DC] rounded-2xl p-6 space-y-4 lg:sticky lg:top-24">
          <h2 className="text-lg font-bold text-[#17251B] border-b border-[#EEF5EB] pb-3">
            {lang === 'bn' ? 'অর্ডার সারসংক্ষেপ' : 'Order Summary'}
          </h2>

          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between text-[#4E6153]">
              <span>{lang === 'bn' ? 'সাবটোটাল' : 'Subtotal'}</span>
              <span className="font-mono-num font-semibold text-[#17251B]">
                {formatBDT(cartSubtotal, lang)}
              </span>
            </div>

            {wholesaleSavings > 0 && (
              <div className="flex justify-between text-[#006B35]">
                <span>{lang === 'bn' ? 'পাইকারি সাশ্রয়' : 'Wholesale Savings'}</span>
                <span className="font-mono-num font-semibold">
                  −{formatBDT(wholesaleSavings, lang)}
                </span>
              </div>
            )}

            <div className="flex justify-between text-[#4E6153]">
              <span>
                {lang === 'bn' ? 'আনুমানিক ডেলিভারি (ঢাকা)' : 'Est. Delivery (Dhaka)'}
              </span>
              <span className="font-mono-num font-semibold text-[#17251B]">
                {estDelivery === 0 ? (lang === 'bn' ? 'ফ্রি' : 'Free') : formatBDT(estDelivery, lang)}
              </span>
            </div>

            <div className="pt-3 border-t border-[#EEF5EB] flex justify-between text-base font-bold text-[#17251B]">
              <span>{lang === 'bn' ? 'সর্বমোট' : 'Estimated Total'}</span>
              <span className="font-mono-num text-[#006B35]">
                {formatBDT(cartSubtotal + estDelivery, lang)}
              </span>
            </div>
          </div>

          <Link
            to="/checkout"
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-lg text-sm font-semibold text-white hover:opacity-95 transition-opacity"
            style={{ backgroundColor: 'var(--zad-primary)' }}
          >
            <span>{lang === 'bn' ? 'চেকআউটে এগিয়ে যান' : 'Proceed to Checkout'}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            to="/shop"
            className="block text-center text-xs font-semibold text-[#006B35] hover:underline pt-1"
          >
            {lang === 'bn' ? '← আরও পণ্য যোগ করুন' : '← Continue Shopping'}
          </Link>
        </aside>
      </div>
    </div>
  );
}
