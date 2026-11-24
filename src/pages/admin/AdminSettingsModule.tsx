import React, { useEffect, useState } from 'react';
import {
  Copy,
  ImagePlus,
  Plus,
  RotateCcw,
  Save,
  Shield,
  Trash2,
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { INITIAL_SETTINGS } from '../../data/initialSeed';
import { BOOTSTRAPPED_OWNER_EMAIL, FIREBASE_CONFIG_META } from '../../lib/firebase';
import {
  deleteAdminUser,
  saveAdminUser,
  saveSettingsSection,
} from '../../lib/firestoreService';
import AdminImageUploaderModal from './AdminImageUploaderModal';
import type {
  AdminRole,
  AdminUser,
  AppearanceSettings,
  BusinessSettings,
  DeliverySettings,
  MediaAsset,
  SeoSettings,
  SiteSettingsBundle,
} from '../../types';

export default function AdminSettingsModule({
  mode,
  mediaLibrary,
  admins,
}: {
  mode: 'appearance' | 'delivery' | 'business' | 'seo' | 'admins';
  mediaLibrary: MediaAsset[];
  admins: AdminUser[];
}) {
  const { settings, user, adminRole, notify } = useApp();
  const [saving, setSaving] = useState(false);

  const [appearance, setAppearance] = useState<AppearanceSettings>(settings.appearance);
  const [delivery, setDelivery] = useState<DeliverySettings>(settings.delivery);
  const [business, setBusiness] = useState<BusinessSettings>(settings.business);
  const [seo, setSeo] = useState<SeoSettings>(settings.seo);

  const [imgModalOpen, setImgModalOpen] = useState(false);
  const [imgTarget, setImgTarget] = useState<'logo' | 'favicon' | 'og'>('logo');

  // Admin Users Form
  const [newAdminUid, setNewAdminUid] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<AdminRole>('manager');

  useEffect(() => {
    setAppearance(settings.appearance);
    setDelivery(settings.delivery);
    setBusiness(settings.business);
    setSeo(settings.seo);
  }, [settings]);

  const handleSave = async <K extends 'appearance' | 'delivery' | 'business' | 'seo'>(
    section: K,
    data: SiteSettingsBundle[K]
  ) => {
    setSaving(true);
    try {
      await saveSettingsSection(section, data);
      notify(`Saved ${section} settings.`);
    } catch {
      notify(`Failed to save ${section} settings.`, 'error');
    } finally {
      setSaving(false);
    }
  };

  // ================= MODE: APPEARANCE =================
  if (mode === 'appearance') {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSave('appearance', appearance);
        }}
        className="space-y-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[#17251B]">Website Appearance &amp; Branding</h2>
            <p className="text-xs text-[#4E6153]">
              Replace logo/favicon and customize brand colors, corner radius, header, and footer themes.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAppearance(INITIAL_SETTINGS.appearance)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#DCE6DC] bg-white text-xs font-semibold cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset ZAD Palette</span>
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#006B35] text-white text-sm font-semibold cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Appearance'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-[#DCE6DC] rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-[#17251B]">Brand Logo &amp; Favicon</h3>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#F7FAF5] border border-[#DCE6DC] rounded-xl">
                <img
                  src={appearance.logoUrl}
                  alt="ZAD Logo"
                  className="h-14 w-auto object-contain"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setImgTarget('logo');
                  setImgModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#006B35] text-[#006B35] text-xs font-semibold cursor-pointer"
              >
                <ImagePlus className="w-4 h-4" />
                <span>Replace Logo (PNG / SVG / WebP)</span>
              </button>
            </div>

            <div className="flex items-center gap-4 pt-2 border-t border-[#EEF5EB]">
              <img
                src={appearance.faviconUrl}
                alt="Favicon"
                className="w-10 h-10 rounded-lg border border-[#DCE6DC] object-contain p-1"
              />
              <button
                type="button"
                onClick={() => {
                  setImgTarget('favicon');
                  setImgModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#DCE6DC] text-xs font-semibold cursor-pointer"
              >
                <ImagePlus className="w-3.5 h-3.5" />
                <span>Change Favicon</span>
              </button>
            </div>
          </div>

          <div className="bg-white border border-[#DCE6DC] rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-[#17251B]">Brand Color Palette</h3>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  ['primaryColor', 'Primary Dark Green'],
                  ['secondaryColor', 'Secondary Green'],
                  ['accentColor', 'Bright Leaf Accent'],
                  ['backgroundColor', 'Page Background'],
                  ['textColor', 'Dark Text'],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2.5">
                  <input
                    type="color"
                    value={appearance[key]}
                    onChange={(e) => setAppearance((p) => ({ ...p, [key]: e.target.value }))}
                    className="w-10 h-9 rounded border border-[#DCE6DC] cursor-pointer"
                  />
                  <div>
                    <p className="text-xs font-semibold text-[#17251B]">{label}</p>
                    <p className="text-[11px] font-mono-num text-[#4E6153]">{appearance[key]}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-[#DCE6DC] rounded-xl p-6 space-y-4 md:col-span-2">
            <h3 className="text-sm font-bold text-[#17251B]">Layout &amp; Surface Styles</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                  Border Radius
                </label>
                <select
                  value={appearance.borderRadius}
                  onChange={(e) =>
                    setAppearance((p) => ({
                      ...p,
                      borderRadius: e.target.value as AppearanceSettings['borderRadius'],
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[#DCE6DC] bg-white text-sm"
                >
                  <option value="sharp">Sharp (4px)</option>
                  <option value="rounded">Rounded (12px)</option>
                  <option value="soft">Soft (20px)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                  Header Style
                </label>
                <select
                  value={appearance.headerStyle}
                  onChange={(e) =>
                    setAppearance((p) => ({
                      ...p,
                      headerStyle: e.target.value as AppearanceSettings['headerStyle'],
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[#DCE6DC] bg-white text-sm"
                >
                  <option value="clean">Crisp White</option>
                  <option value="tinted">Soft Botanical Green</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                  Footer Style
                </label>
                <select
                  value={appearance.footerStyle}
                  onChange={(e) =>
                    setAppearance((p) => ({
                      ...p,
                      footerStyle: e.target.value as AppearanceSettings['footerStyle'],
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[#DCE6DC] bg-white text-sm"
                >
                  <option value="dark">Deep Forest Green</option>
                  <option value="light">Light Clean White</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                  Typography Style
                </label>
                <select
                  value={appearance.fontChoice}
                  onChange={(e) =>
                    setAppearance((p) => ({
                      ...p,
                      fontChoice: e.target.value as AppearanceSettings['fontChoice'],
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[#DCE6DC] bg-white text-sm"
                >
                  <option value="default">Fraunces + Hind Siliguri</option>
                  <option value="modern">Plus Jakarta + Hind Siliguri</option>
                  <option value="editorial">Editorial Botanical</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <AdminImageUploaderModal
          open={imgModalOpen}
          onClose={() => setImgModalOpen(false)}
          onSelect={(res) => {
            if (imgTarget === 'logo') setAppearance((p) => ({ ...p, logoUrl: res.url }));
            if (imgTarget === 'favicon') setAppearance((p) => ({ ...p, faviconUrl: res.url }));
          }}
          mediaLibrary={mediaLibrary}
          defaultFolder="brand"
          title="Select Brand Image"
        />
      </form>
    );
  }

  // ================= MODE: DELIVERY & STOCK SETTINGS =================
  if (mode === 'delivery') {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSave('delivery', delivery);
        }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#17251B]">
              Delivery, Payment &amp; Inventory Policy
            </h2>
            <p className="text-xs text-[#4E6153]">
              Configure delivery rates across Bangladesh, Cash on Delivery, manual payment methods, and stock deduction rules.
            </p>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#006B35] text-white text-sm font-semibold cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Delivery Settings'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-[#DCE6DC] rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-[#17251B]">Delivery Charges (BDT ৳)</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                  Inside Dhaka
                </label>
                <input
                  type="number"
                  min={0}
                  value={delivery.insideDhakaCharge}
                  onChange={(e) =>
                    setDelivery((p) => ({ ...p, insideDhakaCharge: Number(e.target.value) || 0 }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[#DCE6DC] text-sm font-mono-num"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                  Outside Dhaka
                </label>
                <input
                  type="number"
                  min={0}
                  value={delivery.outsideDhakaCharge}
                  onChange={(e) =>
                    setDelivery((p) => ({ ...p, outsideDhakaCharge: Number(e.target.value) || 0 }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[#DCE6DC] text-sm font-mono-num"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                  Free Above (৳)
                </label>
                <input
                  type="number"
                  min={0}
                  value={delivery.freeDeliveryThreshold}
                  onChange={(e) =>
                    setDelivery((p) => ({
                      ...p,
                      freeDeliveryThreshold: Number(e.target.value) || 0,
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[#DCE6DC] text-sm font-mono-num"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                Delivery Instructions (EN)
              </label>
              <input
                value={delivery.deliveryNoteEn}
                onChange={(e) => setDelivery((p) => ({ ...p, deliveryNoteEn: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[#DCE6DC] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                ডেলিভারি নির্দেশনা (বাংলা)
              </label>
              <input
                value={delivery.deliveryNoteBn}
                onChange={(e) => setDelivery((p) => ({ ...p, deliveryNoteBn: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[#DCE6DC] text-sm"
              />
            </div>
          </div>

          <div className="bg-white border border-[#DCE6DC] rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-[#17251B]">Inventory &amp; Stock Policy</h3>
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={delivery.stockPolicy.enabled}
                onChange={(e) =>
                  setDelivery((p) => ({
                    ...p,
                    stockPolicy: { ...p.stockPolicy, enabled: e.target.checked },
                  }))
                }
                className="accent-[#006B35]"
              />
              <span>Enable Stock Enforcement on Storefront</span>
            </label>
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={delivery.stockPolicy.restoreOnCancel}
                onChange={(e) =>
                  setDelivery((p) => ({
                    ...p,
                    stockPolicy: { ...p.stockPolicy, restoreOnCancel: e.target.checked },
                  }))
                }
                className="accent-[#006B35]"
              />
              <span>Auto-Restore Stock When Order Cancelled/Returned</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                  Deduct Stock When Status Becomes
                </label>
                <select
                  value={delivery.stockPolicy.deductOn}
                  onChange={(e) =>
                    setDelivery((p) => ({
                      ...p,
                      stockPolicy: {
                        ...p.stockPolicy,
                        deductOn: e.target.value as 'confirmed' | 'delivered',
                      },
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[#DCE6DC] bg-white text-sm"
                >
                  <option value="confirmed">Confirmed</option>
                  <option value="delivered">Delivered</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                  Low-Stock Alert Threshold
                </label>
                <input
                  type="number"
                  min={1}
                  value={delivery.stockPolicy.lowStockThreshold}
                  onChange={(e) =>
                    setDelivery((p) => ({
                      ...p,
                      stockPolicy: {
                        ...p.stockPolicy,
                        lowStockThreshold: Math.max(1, Number(e.target.value) || 10),
                      },
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[#DCE6DC] text-sm font-mono-num"
                />
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="bg-white border border-[#DCE6DC] rounded-xl p-6 space-y-4 md:col-span-2">
            <h3 className="text-sm font-bold text-[#17251B]">Payment Methods</h3>
            <div className="flex flex-wrap gap-6">
              <label className="inline-flex items-center gap-2 text-sm font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={delivery.codEnabled}
                  onChange={(e) => setDelivery((p) => ({ ...p, codEnabled: e.target.checked }))}
                  className="accent-[#006B35]"
                />
                <span>Cash on Delivery (COD)</span>
              </label>
              <label className="inline-flex items-center gap-2 text-sm font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={delivery.manualPaymentEnabled}
                  onChange={(e) =>
                    setDelivery((p) => ({ ...p, manualPaymentEnabled: e.target.checked }))
                  }
                  className="accent-[#006B35]"
                />
                <span>Enable Manual Payment Methods (bKash / Nagad)</span>
              </label>
            </div>

            {delivery.manualPaymentEnabled && (
              <div className="space-y-3 pt-2">
                {delivery.manualPaymentMethods.map((m, idx) => (
                  <div
                    key={m.id}
                    className="p-4 rounded-xl border border-[#DCE6DC] bg-[#F7FAF5] grid grid-cols-1 sm:grid-cols-4 gap-3 items-center"
                  >
                    <input
                      value={m.name}
                      onChange={(e) => {
                        const next = [...delivery.manualPaymentMethods];
                        next[idx] = { ...m, name: e.target.value };
                        setDelivery((p) => ({ ...p, manualPaymentMethods: next }));
                      }}
                      placeholder="Method Name"
                      className="px-3 py-2 rounded-lg border border-[#DCE6DC] bg-white text-sm"
                    />
                    <input
                      value={m.accountNumber}
                      onChange={(e) => {
                        const next = [...delivery.manualPaymentMethods];
                        next[idx] = { ...m, accountNumber: e.target.value };
                        setDelivery((p) => ({ ...p, manualPaymentMethods: next }));
                      }}
                      placeholder="Account Number (01XXXXXXXXX)"
                      className="px-3 py-2 rounded-lg border border-[#DCE6DC] bg-white text-sm font-mono-num"
                    />
                    <input
                      value={m.instructionsEn}
                      onChange={(e) => {
                        const next = [...delivery.manualPaymentMethods];
                        next[idx] = { ...m, instructionsEn: e.target.value };
                        setDelivery((p) => ({ ...p, manualPaymentMethods: next }));
                      }}
                      placeholder="Instructions"
                      className="px-3 py-2 rounded-lg border border-[#DCE6DC] bg-white text-sm"
                    />
                    <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={m.enabled}
                        onChange={(e) => {
                          const next = [...delivery.manualPaymentMethods];
                          next[idx] = { ...m, enabled: e.target.checked };
                          setDelivery((p) => ({ ...p, manualPaymentMethods: next }));
                        }}
                        className="accent-[#006B35]"
                      />
                      <span>Active at Checkout</span>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </form>
    );
  }

  // ================= MODE: BUSINESS SETTINGS =================
  if (mode === 'business') {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSave('business', business);
        }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#17251B]">Business Information</h2>
            <p className="text-xs text-[#4E6153]">
              Update contact details, email, address, WhatsApp number, social links, and footer text.
            </p>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#006B35] text-white text-sm font-semibold cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Business Info'}</span>
          </button>
        </div>

        <div className="bg-white border border-[#DCE6DC] rounded-xl p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {(
            [
              ['brandNameEn', 'Brand Name (EN)'],
              ['brandNameBn', 'ব্র্যান্ডের নাম (বাংলা)'],
              ['taglineEn', 'Tagline (EN)'],
              ['taglineBn', 'ট্যাগলাইন (বাংলা)'],
              ['founderNameEn', 'Founder & Owner (EN)'],
              ['founderNameBn', 'প্রতিষ্ঠাতা ও স্বত্বাধিকারী (বাংলা)'],
              ['phone', 'Phone Number'],
              ['whatsappNumber', 'WhatsApp Number (BD +880 auto-prefixed)'],
              ['email', 'Business Email (Leave blank until ready)'],
              ['facebookUrl', 'Facebook Page URL'],
              ['addressEn', 'Address (EN)'],
              ['addressBn', 'ঠিকানা (বাংলা)'],
              ['businessHoursEn', 'Business Hours (EN)'],
              ['businessHoursBn', 'সেবার সময় (বাংলা)'],
              ['footerCopyrightEn', 'Footer Copyright (EN)'],
              ['footerCopyrightBn', 'কপিরাইট (বাংলা)'],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-[#4E6153] mb-1">{label}</label>
              <input
                value={business[key]}
                onChange={(e) => setBusiness((p) => ({ ...p, [key]: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[#DCE6DC] text-sm"
              />
            </div>
          ))}

          <div className="md:col-span-2 pt-2">
            <label className="inline-flex items-center gap-2 text-sm font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={business.showWhatsAppButton}
                onChange={(e) =>
                  setBusiness((p) => ({ ...p, showWhatsAppButton: e.target.checked }))
                }
                className="accent-[#006B35]"
              />
              <span>Show Floating WhatsApp Contact Button on Storefront</span>
            </label>
          </div>
        </div>
      </form>
    );
  }

  // ================= MODE: SEO SETTINGS =================
  if (mode === 'seo') {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSave('seo', seo);
        }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#17251B]">SEO &amp; Social Sharing</h2>
            <p className="text-xs text-[#4E6153]">
              Manage page titles, meta descriptions, search keywords, and Open Graph share image.
            </p>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#006B35] text-white text-sm font-semibold cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save SEO Settings'}</span>
          </button>
        </div>

        <div className="bg-white border border-[#DCE6DC] rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                Site Title (EN)
              </label>
              <input
                value={seo.siteTitleEn}
                onChange={(e) => setSeo((p) => ({ ...p, siteTitleEn: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[#DCE6DC] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                সাইট শিরোনাম (বাংলা)
              </label>
              <input
                value={seo.siteTitleBn}
                onChange={(e) => setSeo((p) => ({ ...p, siteTitleBn: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[#DCE6DC] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                Meta Description (EN)
              </label>
              <textarea
                rows={3}
                value={seo.metaDescriptionEn}
                onChange={(e) => setSeo((p) => ({ ...p, metaDescriptionEn: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[#DCE6DC] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                মেটা বিবরণ (বাংলা)
              </label>
              <textarea
                rows={3}
                value={seo.metaDescriptionBn}
                onChange={(e) => setSeo((p) => ({ ...p, metaDescriptionBn: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[#DCE6DC] text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#4E6153] mb-1">
              Search Keywords (comma separated)
            </label>
            <input
              value={seo.keywords}
              onChange={(e) => setSeo((p) => ({ ...p, keywords: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-[#DCE6DC] text-sm"
            />
          </div>
          <div className="flex items-center gap-4">
            {seo.ogImageUrl && (
              <img
                src={seo.ogImageUrl}
                alt="OG Share"
                className="w-28 h-16 rounded-lg object-cover border border-[#DCE6DC]"
              />
            )}
            <button
              type="button"
              onClick={() => {
                setImgTarget('og');
                setImgModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#006B35] text-[#006B35] text-xs font-semibold cursor-pointer"
            >
              <ImagePlus className="w-4 h-4" />
              <span>Change Social Share Image</span>
            </button>
          </div>
        </div>

        <AdminImageUploaderModal
          open={imgModalOpen}
          onClose={() => setImgModalOpen(false)}
          onSelect={(res) => setSeo((p) => ({ ...p, ogImageUrl: res.url }))}
          mediaLibrary={mediaLibrary}
          defaultFolder="banners"
          title="Select Social Sharing Image"
        />
      </form>
    );
  }

  // ================= MODE: ADMIN USERS & SECURITY =================
  const isOwner = adminRole === 'owner' || user?.email === BOOTSTRAPPED_OWNER_EMAIL;

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminUid.trim() || !newAdminEmail.trim()) return;
    try {
      await saveAdminUser({
        uid: newAdminUid.trim(),
        email: newAdminEmail.trim(),
        displayName: newAdminName.trim() || newAdminEmail.trim(),
        role: newAdminRole,
      });
      setNewAdminUid('');
      setNewAdminEmail('');
      setNewAdminName('');
      notify('Authorized admin added.');
    } catch {
      notify('Failed to add admin user. Ensure you have Owner permissions.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#17251B] flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#006B35]" />
          <span>Admin Users &amp; Security</span>
        </h2>
        <p className="text-xs text-[#4E6153]">
          Role-based admin access powered by Firebase Authentication and Cloud Firestore Security Rules.
        </p>
      </div>

      {/* Connected Firebase Project Summary */}
      <div className="bg-white border border-[#DCE6DC] rounded-xl p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div>
          <p className="text-[#4E6153]">Firebase Project ID</p>
          <p className="font-mono-num font-bold text-[#17251B] mt-0.5">
            {FIREBASE_CONFIG_META.projectId}
          </p>
        </div>
        <div>
          <p className="text-[#4E6153]">Firestore Database</p>
          <p className="font-mono-num font-bold text-[#17251B] mt-0.5 truncate">
            {FIREBASE_CONFIG_META.firestoreDatabaseId}
          </p>
        </div>
        <div>
          <p className="text-[#4E6153]">Your Admin UID</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <code className="font-mono-num font-bold text-[#006B35] truncate">
              {user?.uid || '—'}
            </code>
            {user?.uid && (
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(user.uid);
                  notify('UID copied');
                }}
                className="text-[#4E6153] hover:text-[#006B35] cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Authorized Admins List */}
      <div className="bg-white border border-[#DCE6DC] rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#EEF5EB]">
          <h3 className="text-sm font-bold text-[#17251B]">Authorized Administrators</h3>
        </div>
        <div className="divide-y divide-[#EEF5EB]">
          {admins.map((adm) => (
            <div key={adm.uid} className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-[#17251B]">{adm.displayName}</p>
                <p className="text-xs text-[#4E6153]">
                  {adm.email} · <span className="font-mono-num">{adm.uid}</span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase text-[#006B35] bg-[#EEF5EB] px-2.5 py-1 rounded">
                  {adm.role}
                </span>
                {isOwner && adm.uid !== user?.uid && (
                  <button
                    type="button"
                    onClick={() =>
                      void deleteAdminUser(adm.uid).then(() => notify('Admin removed.'))
                    }
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                    title="Revoke access"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add New Authorized Admin (Owner Only) */}
      {isOwner && (
        <form
          onSubmit={handleAddAdmin}
          className="bg-white border border-[#DCE6DC] rounded-xl p-6 space-y-4"
        >
          <h3 className="text-sm font-bold text-[#17251B]">Authorize Staff / Manager Account</h3>
          <p className="text-xs text-[#4E6153]">
            Have your team member sign in once at the private admin portal (<code>/irfaner-dokan</code>) to obtain their Firebase User UID, then authorize them below.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input
              required
              value={newAdminUid}
              onChange={(e) => setNewAdminUid(e.target.value)}
              placeholder="Firebase User UID *"
              className="px-3 py-2 rounded-lg border border-[#DCE6DC] text-sm font-mono-num"
            />
            <input
              required
              type="email"
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
              placeholder="Google Email *"
              className="px-3 py-2 rounded-lg border border-[#DCE6DC] text-sm"
            />
            <input
              required
              value={newAdminName}
              onChange={(e) => setNewAdminName(e.target.value)}
              placeholder="Display Name *"
              className="px-3 py-2 rounded-lg border border-[#DCE6DC] text-sm"
            />
            <select
              value={newAdminRole}
              onChange={(e) => setNewAdminRole(e.target.value as AdminRole)}
              className="px-3 py-2 rounded-lg border border-[#DCE6DC] bg-white text-sm"
            >
              <option value="manager">Manager</option>
              <option value="staff">Staff</option>
              <option value="owner">Owner</option>
            </select>
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#006B35] text-white text-sm font-semibold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Grant Admin Access</span>
          </button>
        </form>
      )}
    </div>
  );
}
