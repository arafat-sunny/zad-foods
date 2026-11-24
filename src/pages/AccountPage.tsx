import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, LogIn, LogOut, Package, Save, User } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import {
  BANGLADESH_DISTRICTS,
  formatBDT,
  formatFirestoreDate,
  ORDER_STATUS_META,
  pickLang,
} from '../lib/i18n';
import { fetchCustomerOrders, saveCustomerProfile } from '../lib/firestoreService';
import ProductCard from '../components/store/ProductCard';
import type { Order } from '../types';

export default function AccountPage() {
  const {
    lang,
    user,
    authReady,
    loginWithGoogle,
    logout,
    customerProfile,
    wishlistIds,
    products,
    notify,
  } = useApp();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [district, setDistrict] = useState('Dhaka');
  const [thana, setThana] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    if (!customerProfile) return;
    setDisplayName(customerProfile.displayName || user?.displayName || '');
    setPhone(customerProfile.phone || '');
    setDistrict(customerProfile.district || 'Dhaka');
    setThana(customerProfile.thana || '');
    setAddress(customerProfile.address || '');
  }, [customerProfile, user]);

  useEffect(() => {
    if (!user) return;
    setLoadingOrders(true);
    void fetchCustomerOrders(user.uid)
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoadingOrders(false));
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    try {
      await saveCustomerProfile({
        uid: user.uid,
        displayName,
        email: user.email || '',
        phone,
        district,
        thana,
        address,
        wishlist: wishlistIds,
      });
      notify(lang === 'bn' ? 'প্রোফাইল তথ্য সংরক্ষিত হয়েছে' : 'Profile saved');
    } catch {
      notify(lang === 'bn' ? 'সংরক্ষণ ব্যর্থ হয়েছে' : 'Failed to save profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  if (!authReady) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center text-sm text-[#4E6153]">
        {lang === 'bn' ? 'লোড হচ্ছে...' : 'Loading account...'}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16">
        <div className="bg-white border border-[#DCE6DC] rounded-2xl p-8 text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-[#EEF5EB] text-[#006B35] flex items-center justify-center mx-auto">
            <User className="w-7 h-7" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-[#17251B]">
              {lang === 'bn' ? 'আমার অ্যাকাউন্ট' : 'Customer Account'}
            </h1>
            <p className="text-sm text-[#4E6153] mt-1.5">
              {lang === 'bn'
                ? 'অর্ডার ইতিহাস, উইশলিস্ট এবং সংরক্ষিত ঠিকানা দেখতে গুগল দিয়ে সাইন-ইন করুন।'
                : 'Sign in with Google to view your order history, saved shipping address, and wishlist.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loginWithGoogle()}
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-lg text-sm font-semibold text-white cursor-pointer"
            style={{ backgroundColor: 'var(--zad-primary)' }}
          >
            <LogIn className="w-4 h-4" />
            <span>{lang === 'bn' ? 'গুগল দিয়ে সাইন-ইন করুন' : 'Sign in with Google'}</span>
          </button>
        </div>
      </div>
    );
  }

  const wishlistProducts = products.filter((p) => wishlistIds.includes(p.id));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#DCE6DC]">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#17251B]">
            {user.displayName || user.email}
          </h1>
          <p className="text-sm text-[#4E6153]">{user.email}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void logout()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#DCE6DC] bg-white text-sm font-medium text-[#17251B] hover:border-red-300 hover:text-red-700 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>{lang === 'bn' ? 'সাইন-আউট' : 'Sign Out'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Saved Shipping Address */}
        <form
          onSubmit={handleSaveProfile}
          className="lg:col-span-5 bg-white border border-[#DCE6DC] rounded-2xl p-6 space-y-4 h-fit"
        >
          <h2 className="text-base font-bold text-[#17251B]">
            {lang === 'bn' ? 'সংরক্ষিত ডেলিভারি ঠিকানা' : 'Saved Delivery Profile'}
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                {lang === 'bn' ? 'পূর্ণ নাম' : 'Full Name'}
              </label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-[#DCE6DC] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                {lang === 'bn' ? 'মোবাইল নম্বর' : 'Mobile Number'}
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="w-full px-3.5 py-2 rounded-lg border border-[#DCE6DC] text-sm font-mono-num"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                  {lang === 'bn' ? 'জেলা' : 'District'}
                </label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#DCE6DC] text-sm bg-white"
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
                  {lang === 'bn' ? 'থানা / এলাকা' : 'Area / Thana'}
                </label>
                <input
                  value={thana}
                  onChange={(e) => setThana(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#DCE6DC] text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                {lang === 'bn' ? 'বিস্তারিত ঠিকানা' : 'Full Address'}
              </label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-[#DCE6DC] text-sm"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={savingProfile}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white cursor-pointer"
            style={{ backgroundColor: 'var(--zad-primary)' }}
          >
            <Save className="w-4 h-4" />
            <span>{savingProfile ? 'Saving...' : lang === 'bn' ? 'সংরক্ষণ করুন' : 'Save Address'}</span>
          </button>
        </form>

        {/* Order History */}
        <div className="lg:col-span-7 bg-white border border-[#DCE6DC] rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-[#17251B] flex items-center gap-2">
            <Package className="w-4 h-4 text-[#006B35]" />
            <span>{lang === 'bn' ? 'আমার অর্ডার ইতিহাস' : 'My Order History'}</span>
          </h2>

          {loadingOrders ? (
            <p className="text-sm text-[#4E6153] py-6">
              {lang === 'bn' ? 'অর্ডার লোড হচ্ছে...' : 'Loading orders...'}
            </p>
          ) : orders.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-[#4E6153] mb-3">
                {lang === 'bn' ? 'আপনি এখনো কোনো অর্ডার করেননি।' : 'No orders placed under this account yet.'}
              </p>
              <Link to="/shop" className="text-sm font-semibold text-[#006B35] hover:underline">
                {lang === 'bn' ? 'পণ্য দেখুন →' : 'Start Shopping →'}
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[#EEF5EB]">
              {orders.map((ord) => {
                const meta = ORDER_STATUS_META[ord.status];
                return (
                  <div key={ord.id} className="py-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-mono-num font-bold text-sm text-[#17251B]">
                        {ord.orderNumber}
                      </p>
                      <p className="text-xs text-[#4E6153]">
                        {formatFirestoreDate(ord.createdAt, lang)} · {ord.items.length}{' '}
                        {lang === 'bn' ? 'আইটেম' : 'items'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded border ${meta.colorClass}`}>
                        {pickLang(meta.labelBn, meta.labelEn, lang)}
                      </span>
                      <span className="font-mono-num font-bold text-sm text-[#17251B]">
                        {formatBDT(ord.totalAmount, lang)}
                      </span>
                      <Link
                        to={`/track-order?id=${encodeURIComponent(ord.orderNumber)}`}
                        className="text-xs font-semibold text-[#006B35] hover:underline"
                      >
                        {lang === 'bn' ? 'ট্র্যাক' : 'Track'}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Wishlist */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold text-[#17251B] flex items-center gap-2">
          <Heart className="w-5 h-5 text-[#006B35]" />
          <span>{lang === 'bn' ? 'সংরক্ষিত পণ্য (উইশলিস্ট)' : 'Saved Wishlist'}</span>
        </h2>
        {wishlistProducts.length === 0 ? (
          <p className="text-sm text-[#4E6153]">
            {lang === 'bn' ? 'আপনার উইশলিস্টে এখনো কোনো পণ্য নেই।' : 'No products saved in your wishlist yet.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {wishlistProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
