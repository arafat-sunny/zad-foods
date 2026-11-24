import React, { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  ImagePlus,
  Plus,
  Save,
  Search,
  Trash2,
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { deleteMediaAsset, saveSettingsSection } from '../../lib/firestoreService';
import { formatFileSize } from '../../lib/imageUtils';
import AdminImageUploaderModal from './AdminImageUploaderModal';
import type { HomepageSettings, MediaAsset, PagesSettings } from '../../types';

export default function AdminCmsModule({
  mode,
  mediaLibrary,
}: {
  mode: 'homepage' | 'content' | 'media';
  mediaLibrary: MediaAsset[];
}) {
  const { settings, notify } = useApp();

  const [hp, setHp] = useState<HomepageSettings>(settings.homepage);
  const [pages, setPages] = useState<PagesSettings>(settings.pages);
  const [saving, setSaving] = useState(false);

  // Media Library state
  const [mediaSearch, setMediaSearch] = useState('');
  const [mediaFolder, setMediaFolder] = useState('all');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [pickerCallback, setPickerCallback] = useState<((url: string) => void) | null>(null);
  const [confirmDeleteMedia, setConfirmDeleteMedia] = useState<MediaAsset | null>(null);

  useEffect(() => {
    setHp(settings.homepage);
  }, [settings.homepage]);

  useEffect(() => {
    setPages(settings.pages);
  }, [settings.pages]);

  const openImagePicker = (cb: (url: string) => void) => {
    setPickerCallback(() => cb);
    setUploadModalOpen(true);
  };

  const handleSaveHomepage = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveSettingsSection('homepage', hp);
      notify('Homepage layout and banners saved.');
    } catch {
      notify('Failed to save homepage settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePages = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveSettingsSection('pages', pages);
      notify('Website pages updated.');
    } catch {
      notify('Failed to save website content.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ================= MODE: MEDIA LIBRARY =================
  if (mode === 'media') {
    const filtered = mediaLibrary.filter((m) => {
      if (mediaFolder !== 'all' && m.folder !== mediaFolder) return false;
      if (mediaSearch.trim()) {
        const q = mediaSearch.toLowerCase();
        return m.name.toLowerCase().includes(q) || (m.alt || '').toLowerCase().includes(q);
      }
      return true;
    });

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[#17251B]">Media Library</h2>
            <p className="text-xs text-[#4E6153]">
              Upload, crop, optimize to WebP, organize into folders, and reuse images across the entire site.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setPickerCallback(null);
              setUploadModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#006B35] text-white text-sm font-semibold hover:bg-[#168B35] cursor-pointer"
          >
            <ImagePlus className="w-4 h-4" />
            <span>Upload / Add Media</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-white border border-[#DCE6DC] rounded-xl p-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-[#4E6153] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={mediaSearch}
              onChange={(e) => setMediaSearch(e.target.value)}
              placeholder="Search images by name or alt text..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#DCE6DC] text-sm"
            />
          </div>
          <select
            value={mediaFolder}
            onChange={(e) => setMediaFolder(e.target.value)}
            className="px-3 py-2 rounded-lg border border-[#DCE6DC] bg-white text-sm"
          >
            <option value="all">All Folders ({mediaLibrary.length})</option>
            <option value="products">Products</option>
            <option value="banners">Banners</option>
            <option value="categories">Categories</option>
            <option value="brand">Brand</option>
            <option value="reviews">Reviews</option>
            <option value="general">General</option>
          </select>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((asset) => (
            <div
              key={asset.id}
              className="bg-white border border-[#DCE6DC] rounded-xl overflow-hidden flex flex-col"
            >
              <div className="aspect-[4/3] bg-[#F7FAF5] overflow-hidden">
                <img
                  src={asset.url}
                  alt={asset.alt || asset.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-3 space-y-1.5 flex-1 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-bold text-[#17251B] truncate">{asset.name}</p>
                  <p className="text-[11px] text-[#4E6153] capitalize">
                    {asset.folder}
                    {asset.width && asset.height ? ` · ${asset.width}×${asset.height}` : ''}
                    {asset.sizeBytes ? ` · ${formatFileSize(asset.sizeBytes)}` : ''}
                  </p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-[#EEF5EB]">
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(asset.url);
                      notify('Image URL copied.');
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#006B35] hover:underline cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy URL</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteMedia(asset)}
                    className="text-red-600 hover:bg-red-50 p-1 rounded cursor-pointer"
                    title="Delete asset"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {confirmDeleteMedia && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white border border-[#DCE6DC] rounded-2xl max-w-sm w-full p-6 space-y-4">
              <h3 className="text-base font-bold text-[#17251B]">Delete Media Asset?</h3>
              <p className="text-sm text-[#4E6153]">
                Remove <span className="font-semibold">{confirmDeleteMedia.name}</span> from the
                Media Library?
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteMedia(null)}
                  className="px-4 py-2 rounded-lg border border-[#DCE6DC] text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void deleteMediaAsset(confirmDeleteMedia.id).then(() => {
                      notify('Media asset removed.');
                      setConfirmDeleteMedia(null);
                    })
                  }
                  className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        <AdminImageUploaderModal
          open={uploadModalOpen}
          onClose={() => setUploadModalOpen(false)}
          onSelect={() => notify('Asset saved to Media Library.')}
          mediaLibrary={mediaLibrary}
          defaultFolder="general"
          title="Upload to Media Library"
        />
      </div>
    );
  }

  // ================= MODE: WEBSITE CONTENT MANAGER =================
  if (mode === 'content') {
    return (
      <form onSubmit={handleSavePages} className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#17251B]">Website Content Manager</h2>
            <p className="text-xs text-[#4E6153]">
              Edit About Us, Contact Us, Privacy Policy, Terms &amp; Conditions, and Return Policy in Bangla and English.
            </p>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#006B35] text-white text-sm font-semibold cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save All Pages'}</span>
          </button>
        </div>

        {/* About Us */}
        <div className="bg-white border border-[#DCE6DC] rounded-xl p-6 space-y-4">
          <h3 className="text-base font-bold text-[#17251B] border-b border-[#EEF5EB] pb-2">
            About Us Page
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#4E6153] mb-1">Heading (EN)</label>
              <input
                value={pages.aboutUs.headingEn}
                onChange={(e) =>
                  setPages((p) => ({ ...p, aboutUs: { ...p.aboutUs, headingEn: e.target.value } }))
                }
                className="w-full px-3 py-2 rounded-lg border border-[#DCE6DC] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#4E6153] mb-1">শিরোনাম (বাংলা)</label>
              <input
                value={pages.aboutUs.headingBn}
                onChange={(e) =>
                  setPages((p) => ({ ...p, aboutUs: { ...p.aboutUs, headingBn: e.target.value } }))
                }
                className="w-full px-3 py-2 rounded-lg border border-[#DCE6DC] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#4E6153] mb-1">Intro (EN)</label>
              <textarea
                rows={3}
                value={pages.aboutUs.introEn}
                onChange={(e) =>
                  setPages((p) => ({ ...p, aboutUs: { ...p.aboutUs, introEn: e.target.value } }))
                }
                className="w-full px-3 py-2 rounded-lg border border-[#DCE6DC] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#4E6153] mb-1">পরিচিতি (বাংলা)</label>
              <textarea
                rows={3}
                value={pages.aboutUs.introBn}
                onChange={(e) =>
                  setPages((p) => ({ ...p, aboutUs: { ...p.aboutUs, introBn: e.target.value } }))
                }
                className="w-full px-3 py-2 rounded-lg border border-[#DCE6DC] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#4E6153] mb-1">Mission (EN)</label>
              <textarea
                rows={2}
                value={pages.aboutUs.missionEn}
                onChange={(e) =>
                  setPages((p) => ({ ...p, aboutUs: { ...p.aboutUs, missionEn: e.target.value } }))
                }
                className="w-full px-3 py-2 rounded-lg border border-[#DCE6DC] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#4E6153] mb-1">লক্ষ্য (বাংলা)</label>
              <textarea
                rows={2}
                value={pages.aboutUs.missionBn}
                onChange={(e) =>
                  setPages((p) => ({ ...p, aboutUs: { ...p.aboutUs, missionBn: e.target.value } }))
                }
                className="w-full px-3 py-2 rounded-lg border border-[#DCE6DC] text-sm"
              />
            </div>
          </div>
        </div>

        {/* Policies */}
        {(['privacyPolicy', 'terms', 'returnPolicy'] as const).map((policyKey) => (
          <div key={policyKey} className="bg-white border border-[#DCE6DC] rounded-xl p-6 space-y-4">
            <h3 className="text-base font-bold text-[#17251B] border-b border-[#EEF5EB] pb-2">
              {pages[policyKey].titleEn}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#4E6153] mb-1">Content (EN)</label>
                <textarea
                  rows={4}
                  value={pages[policyKey].contentEn}
                  onChange={(e) =>
                    setPages((p) => ({
                      ...p,
                      [policyKey]: { ...p[policyKey], contentEn: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[#DCE6DC] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#4E6153] mb-1">বিস্তারিত (বাংলা)</label>
                <textarea
                  rows={4}
                  value={pages[policyKey].contentBn}
                  onChange={(e) =>
                    setPages((p) => ({
                      ...p,
                      [policyKey]: { ...p[policyKey], contentBn: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[#DCE6DC] text-sm"
                />
              </div>
            </div>
          </div>
        ))}
      </form>
    );
  }

  // ================= MODE: HOMEPAGE EDITOR =================
  return (
    <form onSubmit={handleSaveHomepage} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#17251B]">Homepage &amp; Navigation Editor</h2>
          <p className="text-xs text-[#4E6153]">
            Control announcement bar, menu labels, hero slider slides, promotional banners, and section visibility.
          </p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#006B35] text-white text-sm font-semibold hover:bg-[#168B35] cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Homepage'}</span>
        </button>
      </div>

      {/* Announcement Bar */}
      <div className="bg-white border border-[#DCE6DC] rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-[#17251B]">Announcement Bar</h3>
          <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={hp.announcementBar.enabled}
              onChange={(e) =>
                setHp((p) => ({
                  ...p,
                  announcementBar: { ...p.announcementBar, enabled: e.target.checked },
                }))
              }
              className="accent-[#006B35]"
            />
            <span>Enabled</span>
          </label>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            value={hp.announcementBar.textEn}
            onChange={(e) =>
              setHp((p) => ({
                ...p,
                announcementBar: { ...p.announcementBar, textEn: e.target.value },
              }))
            }
            placeholder="Announcement text (English)"
            className="px-3 py-2 rounded-lg border border-[#DCE6DC] text-sm"
          />
          <input
            value={hp.announcementBar.textBn}
            onChange={(e) =>
              setHp((p) => ({
                ...p,
                announcementBar: { ...p.announcementBar, textBn: e.target.value },
              }))
            }
            placeholder="ঘোষণা টেক্সট (বাংলা)"
            className="px-3 py-2 rounded-lg border border-[#DCE6DC] text-sm"
          />
          <input
            value={hp.announcementBar.link}
            onChange={(e) =>
              setHp((p) => ({
                ...p,
                announcementBar: { ...p.announcementBar, link: e.target.value },
              }))
            }
            placeholder="Optional Link (e.g. /shop)"
            className="px-3 py-2 rounded-lg border border-[#DCE6DC] text-sm font-mono-num"
          />
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-[#4E6153]">Bar Color:</label>
            <input
              type="color"
              value={hp.announcementBar.bgColor}
              onChange={(e) =>
                setHp((p) => ({
                  ...p,
                  announcementBar: { ...p.announcementBar, bgColor: e.target.value },
                }))
              }
              className="w-10 h-9 rounded border border-[#DCE6DC] cursor-pointer"
            />
            <span className="text-xs font-mono-num">{hp.announcementBar.bgColor}</span>
          </div>
        </div>
      </div>

      {/* Hero Slides */}
      <div className="bg-white border border-[#DCE6DC] rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-[#17251B]">Hero Banner Slides</h3>
          <button
            type="button"
            onClick={() =>
              setHp((p) => ({
                ...p,
                heroSlides: [
                  ...p.heroSlides,
                  {
                    id: `slide-${Date.now()}`,
                    titleBn: 'নতুন ব্যানার শিরোনাম',
                    titleEn: 'New Hero Slide',
                    subtitleBn: '',
                    subtitleEn: '',
                    primaryCtaBn: 'এখনই কিনুন',
                    primaryCtaEn: 'Shop Now',
                    primaryLink: '/shop',
                    secondaryCtaBn: '',
                    secondaryCtaEn: '',
                    secondaryLink: '/shop',
                    desktopImage: '',
                    mobileImage: '',
                    enabled: true,
                    order: p.heroSlides.length + 1,
                  },
                ],
              }))
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#006B35] text-[#006B35] text-xs font-semibold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Slide</span>
          </button>
        </div>

        <div className="space-y-4">
          {hp.heroSlides.map((slide, idx) => (
            <div key={slide.id} className="p-4 rounded-xl border border-[#DCE6DC] bg-[#F7FAF5]/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#006B35]">Slide #{idx + 1}</span>
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={slide.enabled}
                      onChange={(e) =>
                        setHp((p) => ({
                          ...p,
                          heroSlides: p.heroSlides.map((s) =>
                            s.id === slide.id ? { ...s, enabled: e.target.checked } : s
                          ),
                        }))
                      }
                      className="accent-[#006B35]"
                    />
                    <span>Enabled</span>
                  </label>
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => {
                      const next = [...hp.heroSlides];
                      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                      setHp((p) => ({ ...p, heroSlides: next.map((s, i) => ({ ...s, order: i + 1 })) }));
                    }}
                    className="p-1 border border-[#DCE6DC] rounded bg-white disabled:opacity-30 cursor-pointer"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === hp.heroSlides.length - 1}
                    onClick={() => {
                      const next = [...hp.heroSlides];
                      [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
                      setHp((p) => ({ ...p, heroSlides: next.map((s, i) => ({ ...s, order: i + 1 })) }));
                    }}
                    className="p-1 border border-[#DCE6DC] rounded bg-white disabled:opacity-30 cursor-pointer"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  {hp.heroSlides.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setHp((p) => ({
                          ...p,
                          heroSlides: p.heroSlides.filter((s) => s.id !== slide.id),
                        }))
                      }
                      className="p-1 text-red-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  value={slide.titleEn}
                  onChange={(e) =>
                    setHp((p) => ({
                      ...p,
                      heroSlides: p.heroSlides.map((s) =>
                        s.id === slide.id ? { ...s, titleEn: e.target.value } : s
                      ),
                    }))
                  }
                  placeholder="Heading (EN)"
                  className="px-3 py-2 rounded-lg border border-[#DCE6DC] bg-white text-sm"
                />
                <input
                  value={slide.titleBn}
                  onChange={(e) =>
                    setHp((p) => ({
                      ...p,
                      heroSlides: p.heroSlides.map((s) =>
                        s.id === slide.id ? { ...s, titleBn: e.target.value } : s
                      ),
                    }))
                  }
                  placeholder="শিরোনাম (বাংলা)"
                  className="px-3 py-2 rounded-lg border border-[#DCE6DC] bg-white text-sm"
                />
                <input
                  value={slide.subtitleEn}
                  onChange={(e) =>
                    setHp((p) => ({
                      ...p,
                      heroSlides: p.heroSlides.map((s) =>
                        s.id === slide.id ? { ...s, subtitleEn: e.target.value } : s
                      ),
                    }))
                  }
                  placeholder="Subheading (EN)"
                  className="px-3 py-2 rounded-lg border border-[#DCE6DC] bg-white text-sm"
                />
                <input
                  value={slide.subtitleBn}
                  onChange={(e) =>
                    setHp((p) => ({
                      ...p,
                      heroSlides: p.heroSlides.map((s) =>
                        s.id === slide.id ? { ...s, subtitleBn: e.target.value } : s
                      ),
                    }))
                  }
                  placeholder="সাব-শিরোনাম (বাংলা)"
                  className="px-3 py-2 rounded-lg border border-[#DCE6DC] bg-white text-sm"
                />
                <div className="flex items-center gap-2">
                  {slide.desktopImage && (
                    <img
                      src={slide.desktopImage}
                      alt="Slide"
                      className="w-20 h-11 rounded object-cover border border-[#DCE6DC]"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      openImagePicker((url) =>
                        setHp((p) => ({
                          ...p,
                          heroSlides: p.heroSlides.map((s) =>
                            s.id === slide.id ? { ...s, desktopImage: url, mobileImage: s.mobileImage || url } : s
                          ),
                        }))
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#006B35] text-[#006B35] bg-white text-xs font-semibold cursor-pointer"
                  >
                    <ImagePlus className="w-3.5 h-3.5" />
                    <span>Desktop Banner Image</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={slide.primaryCtaEn}
                    onChange={(e) =>
                      setHp((p) => ({
                        ...p,
                        heroSlides: p.heroSlides.map((s) =>
                          s.id === slide.id ? { ...s, primaryCtaEn: e.target.value } : s
                        ),
                      }))
                    }
                    placeholder="Primary CTA (EN)"
                    className="px-2.5 py-2 rounded-lg border border-[#DCE6DC] bg-white text-xs"
                  />
                  <input
                    value={slide.primaryLink}
                    onChange={(e) =>
                      setHp((p) => ({
                        ...p,
                        heroSlides: p.heroSlides.map((s) =>
                          s.id === slide.id ? { ...s, primaryLink: e.target.value } : s
                        ),
                      }))
                    }
                    placeholder="/shop"
                    className="px-2.5 py-2 rounded-lg border border-[#DCE6DC] bg-white text-xs font-mono-num"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section Toggles + Promo Banner + Brand Intro */}
      <div className="bg-white border border-[#DCE6DC] rounded-xl p-6 space-y-5">
        <h3 className="text-base font-bold text-[#17251B]">Homepage Sections Visibility</h3>
        <div className="flex flex-wrap gap-5 text-xs font-semibold">
          {[
            ['featuredCategoriesEnabled', 'Featured Categories'],
            ['featuredProductsEnabled', 'Featured Products'],
            ['reviewsEnabled', 'Customer Reviews'],
          ].map(([key, label]) => (
            <label key={key} className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(hp[key as keyof HomepageSettings])}
                onChange={(e) => setHp((p) => ({ ...p, [key]: e.target.checked }))}
                className="accent-[#006B35] w-4 h-4"
              />
              <span>{label}</span>
            </label>
          ))}
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hp.promoBanner.enabled}
              onChange={(e) =>
                setHp((p) => ({ ...p, promoBanner: { ...p.promoBanner, enabled: e.target.checked } }))
              }
              className="accent-[#006B35] w-4 h-4"
            />
            <span>Promo Banner</span>
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hp.whyChooseUs.enabled}
              onChange={(e) =>
                setHp((p) => ({ ...p, whyChooseUs: { ...p.whyChooseUs, enabled: e.target.checked } }))
              }
              className="accent-[#006B35] w-4 h-4"
            />
            <span>Why Choose Us</span>
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hp.brandIntro.enabled}
              onChange={(e) =>
                setHp((p) => ({ ...p, brandIntro: { ...p.brandIntro, enabled: e.target.checked } }))
              }
              className="accent-[#006B35] w-4 h-4"
            />
            <span>Brand Intro</span>
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hp.newsletter.enabled}
              onChange={(e) =>
                setHp((p) => ({ ...p, newsletter: { ...p.newsletter, enabled: e.target.checked } }))
              }
              className="accent-[#006B35] w-4 h-4"
            />
            <span>Newsletter Section</span>
          </label>
        </div>

        {/* Promo Banner Fields */}
        <div className="pt-4 border-t border-[#EEF5EB] space-y-3">
          <h4 className="text-sm font-bold text-[#17251B]">Promotional Banner</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              value={hp.promoBanner.titleEn}
              onChange={(e) =>
                setHp((p) => ({ ...p, promoBanner: { ...p.promoBanner, titleEn: e.target.value } }))
              }
              placeholder="Promo Title (EN)"
              className="px-3 py-2 rounded-lg border border-[#DCE6DC] text-sm"
            />
            <input
              value={hp.promoBanner.titleBn}
              onChange={(e) =>
                setHp((p) => ({ ...p, promoBanner: { ...p.promoBanner, titleBn: e.target.value } }))
              }
              placeholder="প্রোমো শিরোনাম (বাংলা)"
              className="px-3 py-2 rounded-lg border border-[#DCE6DC] text-sm"
            />
            <textarea
              rows={2}
              value={hp.promoBanner.subtitleEn}
              onChange={(e) =>
                setHp((p) => ({ ...p, promoBanner: { ...p.promoBanner, subtitleEn: e.target.value } }))
              }
              placeholder="Promo Subtitle (EN)"
              className="px-3 py-2 rounded-lg border border-[#DCE6DC] text-sm"
            />
            <div className="flex items-center gap-3">
              {hp.promoBanner.imageUrl && (
                <img
                  src={hp.promoBanner.imageUrl}
                  alt="Promo"
                  className="w-20 h-14 rounded-lg object-cover border border-[#DCE6DC]"
                />
              )}
              <button
                type="button"
                onClick={() =>
                  openImagePicker((url) =>
                    setHp((p) => ({ ...p, promoBanner: { ...p.promoBanner, imageUrl: url } }))
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#006B35] text-[#006B35] text-xs font-semibold cursor-pointer"
              >
                <ImagePlus className="w-4 h-4" />
                <span>Change Promo Image</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <AdminImageUploaderModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSelect={(res) => {
          if (pickerCallback) pickerCallback(res.url);
        }}
        mediaLibrary={mediaLibrary}
        defaultFolder="banners"
        title="Select Banner Image"
      />
    </form>
  );
}
