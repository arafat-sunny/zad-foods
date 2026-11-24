import React, { useEffect, useState } from 'react';
import {
  Check,
  Crop,
  Image as ImageIcon,
  Link2,
  RotateCw,
  Upload,
  X,
  ZoomIn,
} from 'lucide-react';
import { processImageWithCanvas, uploadOptimizedImage, formatFileSize } from '../../lib/imageUtils';
import { saveMediaAsset } from '../../lib/firestoreService';
import type { MediaAsset, MediaFolder } from '../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (result: { url: string; alt: string; name: string }) => void;
  mediaLibrary: MediaAsset[];
  defaultFolder?: MediaFolder;
  title?: string;
}

const ASPECT_OPTIONS: { label: string; value: number | null }[] = [
  { label: 'Original', value: null },
  { label: '1:1 Square', value: 1 },
  { label: '4:3 Product', value: 4 / 3 },
  { label: '16:9 Banner', value: 16 / 9 },
];

export default function AdminImageUploaderModal({
  open,
  onClose,
  onSelect,
  mediaLibrary,
  defaultFolder = 'products',
  title = 'Select or Upload Image',
}: Props) {
  const [tab, setTab] = useState<'library' | 'upload' | 'url'>('library');
  const [folderFilter, setFolderFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Upload + Crop/Rotate/Zoom state
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [previewMeta, setPreviewMeta] = useState<{ w: number; h: number; size: number } | null>(null);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [cropAspect, setCropAspect] = useState<number | null>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [altText, setAltText] = useState('');
  const [uploadFolder, setUploadFolder] = useState<MediaFolder>(defaultFolder);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // External / Hosted URL tab
  const [directUrl, setDirectUrl] = useState('');
  const [directName, setDirectName] = useState('');
  const [directAlt, setDirectAlt] = useState('');

  useEffect(() => {
    if (!file) {
      setPreviewUrl('');
      setPreviewMeta(null);
      return;
    }
    let cancelled = false;
    void processImageWithCanvas(file, {
      maxWidth: 1200,
      maxHeight: 1200,
      quality: 0.85,
      rotation,
      zoom,
      cropAspect,
      offsetX,
      offsetY,
    })
      .then((res) => {
        if (cancelled) return;
        setPreviewUrl(res.dataUrl);
        setPreviewMeta({ w: res.width, h: res.height, size: res.sizeBytes });
      })
      .catch(() => {
        if (!cancelled) setErrorMsg('Could not preview selected image.');
      });
    return () => {
      cancelled = true;
    };
  }, [file, rotation, zoom, cropAspect, offsetX, offsetY]);

  if (!open) return null;

  const filteredMedia = mediaLibrary.filter((m) => {
    if (folderFilter !== 'all' && m.folder !== folderFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        m.name.toLowerCase().includes(q) ||
        (m.alt || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleUploadConfirm = async () => {
    if (!file) return;
    setUploading(true);
    setErrorMsg('');
    try {
      const result = await uploadOptimizedImage(file, uploadFolder, file.name, {
        maxWidth: 1400,
        maxHeight: 1400,
        quality: 0.84,
        rotation,
        zoom,
        cropAspect,
        offsetX,
        offsetY,
      });

      const finalName = file.name.replace(/\.[^/.]+$/, '');
      const finalAlt = altText.trim() || finalName;
      await saveMediaAsset({
        name: finalName,
        url: result.url,
        storagePath: result.storagePath,
        folder: uploadFolder,
        alt: finalAlt,
        width: result.width,
        height: result.height,
        sizeBytes: result.sizeBytes,
        mimeType: result.mimeType,
      });

      onSelect({ url: result.url, alt: finalAlt, name: finalName });
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleUrlConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directUrl.trim()) return;
    setUploading(true);
    setErrorMsg('');
    try {
      const name = directName.trim() || 'Hosted Image';
      const alt = directAlt.trim() || name;
      await saveMediaAsset({
        name,
        url: directUrl.trim(),
        folder: uploadFolder,
        alt,
      });
      onSelect({ url: directUrl.trim(), alt, name });
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save image URL');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55">
      <div className="bg-white border border-[#DCE6DC] rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#DCE6DC] flex items-center justify-between">
          <h3 className="text-lg font-bold text-[#17251B]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#4E6153] hover:bg-[#F7FAF5] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="px-6 pt-3 border-b border-[#EEF5EB] flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTab('library')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
              tab === 'library'
                ? 'border-[#006B35] text-[#006B35]'
                : 'border-transparent text-[#4E6153] hover:text-[#17251B]'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Media Library ({mediaLibrary.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('upload')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
              tab === 'upload'
                ? 'border-[#006B35] text-[#006B35]'
                : 'border-transparent text-[#4E6153] hover:text-[#17251B]'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload &amp; Edit Image</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('url')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
              tab === 'url'
                ? 'border-[#006B35] text-[#006B35]'
                : 'border-transparent text-[#4E6153] hover:text-[#17251B]'
            }`}
          >
            <Link2 className="w-4 h-4" />
            <span>Add Image URL</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 flex-1 overflow-y-auto">
          {tab === 'library' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search media by name or alt text..."
                  className="flex-1 min-w-[200px] px-3.5 py-2 rounded-lg border border-[#DCE6DC] text-sm"
                />
                <select
                  value={folderFilter}
                  onChange={(e) => setFolderFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-[#DCE6DC] bg-white text-sm"
                >
                  <option value="all">All Folders</option>
                  <option value="products">Products</option>
                  <option value="banners">Banners</option>
                  <option value="categories">Categories</option>
                  <option value="brand">Brand &amp; Logo</option>
                  <option value="reviews">Reviews</option>
                  <option value="general">General</option>
                </select>
              </div>

              {filteredMedia.length === 0 ? (
                <p className="text-sm text-[#4E6153] text-center py-12">
                  No media assets found in this folder. Upload a new image or switch folders.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                  {filteredMedia.map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => {
                        onSelect({
                          url: asset.url,
                          alt: asset.alt || asset.name,
                          name: asset.name,
                        });
                        onClose();
                      }}
                      className="group text-left border border-[#DCE6DC] hover:border-[#006B35] rounded-xl overflow-hidden bg-[#F7FAF5] transition-colors cursor-pointer"
                    >
                      <div className="aspect-[4/3] bg-white overflow-hidden">
                        <img
                          src={asset.url}
                          alt={asset.alt || asset.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <div className="p-2.5">
                        <p className="text-xs font-semibold text-[#17251B] truncate">
                          {asset.name}
                        </p>
                        <p className="text-[11px] text-[#4E6153] capitalize">{asset.folder}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'upload' && (
            <div className="space-y-5">
              {errorMsg && (
                <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-7 space-y-3">
                  <label className="block border-2 border-dashed border-[#DCE6DC] hover:border-[#006B35] rounded-xl p-5 text-center cursor-pointer bg-[#F7FAF5]">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={(e) => {
                        const selected = e.target.files?.[0];
                        if (selected) {
                          setFile(selected);
                          setAltText(selected.name.replace(/\.[^/.]+$/, ''));
                          setRotation(0);
                          setZoom(1);
                          setOffsetX(0);
                          setOffsetY(0);
                          setErrorMsg('');
                        }
                      }}
                    />
                    <Upload className="w-6 h-6 text-[#006B35] mx-auto mb-1.5" />
                    <span className="text-sm font-semibold text-[#17251B] block">
                      {file ? file.name : 'Choose image from computer (PNG, JPG, WebP, SVG)'}
                    </span>
                    <span className="text-xs text-[#4E6153]">
                      Automatically compressed and converted to WebP for fast storefront loading
                    </span>
                  </label>

                  {previewUrl && (
                    <div className="border border-[#DCE6DC] rounded-xl overflow-hidden bg-[#F7FAF5] p-3 text-center">
                      <img
                        src={previewUrl}
                        alt="Processed preview"
                        className="max-h-64 mx-auto rounded-lg object-contain"
                      />
                      {previewMeta && (
                        <p className="text-[11px] text-[#4E6153] font-mono-num mt-2">
                          Output: {previewMeta.w}×{previewMeta.h}px · WebP ·{' '}
                          {formatFileSize(previewMeta.size)}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Crop / Rotate / Zoom Controls */}
                <div className="md:col-span-5 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#4E6153] mb-1.5 flex items-center gap-1">
                      <Crop className="w-3.5 h-3.5" />
                      <span>Crop Aspect Ratio</span>
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {ASPECT_OPTIONS.map((opt) => (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() => setCropAspect(opt.value)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${
                            cropAspect === opt.value
                              ? 'border-[#006B35] bg-[#EEF5EB] text-[#006B35]'
                              : 'border-[#DCE6DC] text-[#17251B]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#4E6153]">Rotate</span>
                    <button
                      type="button"
                      onClick={() => setRotation((r) => (r + 90) % 360)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#DCE6DC] text-xs font-semibold hover:border-[#006B35] cursor-pointer"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Rotate 90° ({rotation}°)</span>
                    </button>
                  </div>

                  <div>
                    <label className="flex items-center justify-between text-xs font-semibold text-[#4E6153] mb-1">
                      <span className="inline-flex items-center gap-1">
                        <ZoomIn className="w-3.5 h-3.5" />
                        Zoom
                      </span>
                      <span className="font-mono-num">{zoom.toFixed(1)}×</span>
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={2.5}
                      step={0.1}
                      value={zoom}
                      onChange={(e) => setZoom(parseFloat(e.target.value))}
                      className="w-full accent-[#006B35]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#4E6153]">
                        Pan X
                      </label>
                      <input
                        type="range"
                        min={-0.35}
                        max={0.35}
                        step={0.05}
                        value={offsetX}
                        onChange={(e) => setOffsetX(parseFloat(e.target.value))}
                        className="w-full accent-[#006B35]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#4E6153]">
                        Pan Y
                      </label>
                      <input
                        type="range"
                        min={-0.35}
                        max={0.35}
                        step={0.05}
                        value={offsetY}
                        onChange={(e) => setOffsetY(parseFloat(e.target.value))}
                        className="w-full accent-[#006B35]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                      Alt Text (SEO &amp; Accessibility)
                    </label>
                    <input
                      value={altText}
                      onChange={(e) => setAltText(e.target.value)}
                      placeholder="Describe this image..."
                      className="w-full px-3 py-2 rounded-lg border border-[#DCE6DC] text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                      Save to Folder
                    </label>
                    <select
                      value={uploadFolder}
                      onChange={(e) => setUploadFolder(e.target.value as MediaFolder)}
                      className="w-full px-3 py-2 rounded-lg border border-[#DCE6DC] bg-white text-xs"
                    >
                      <option value="products">Products</option>
                      <option value="banners">Banners</option>
                      <option value="categories">Categories</option>
                      <option value="brand">Brand &amp; Logo</option>
                      <option value="reviews">Reviews</option>
                      <option value="general">General</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    disabled={!file || uploading}
                    onClick={() => void handleUploadConfirm()}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#006B35] text-white text-sm font-semibold disabled:opacity-50 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>{uploading ? 'Uploading to Cloud...' : 'Upload & Use Image'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === 'url' && (
            <form onSubmit={handleUrlConfirm} className="max-w-lg space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                  {errorMsg}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                  Image URL *
                </label>
                <input
                  required
                  value={directUrl}
                  onChange={(e) => setDirectUrl(e.target.value)}
                  placeholder="https://... or /assets/aistudio/..."
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE6DC] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                  Asset Name
                </label>
                <input
                  value={directName}
                  onChange={(e) => setDirectName(e.target.value)}
                  placeholder="e.g. Sukkari Dates 3KG Pack"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE6DC] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#4E6153] mb-1">
                  Alt Text
                </label>
                <input
                  value={directAlt}
                  onChange={(e) => setDirectAlt(e.target.value)}
                  placeholder="Accessible description"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE6DC] text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={uploading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#006B35] text-white text-sm font-semibold cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{uploading ? 'Saving...' : 'Save to Library & Select'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
