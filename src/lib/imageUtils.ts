import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from './firebase';
import type { MediaFolder } from '../types';

export interface ProcessedImageResult {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
  mimeType: string;
}

export interface ImageTransformOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  rotation?: number; // 0, 90, 180, 270
  zoom?: number; // 1 to 3
  cropAspect?: number | null; // e.g. 1 for 1:1, 4/3, 16/9, null for original
  offsetX?: number; // -0.5 to 0.5
  offsetY?: number; // -0.5 to 0.5
}

/**
 * Compresses, crops, rotates, and converts an image File or URL to WebP (with JPEG fallback).
 */
export async function processImageWithCanvas(
  source: File | string,
  options: ImageTransformOptions = {}
): Promise<ProcessedImageResult> {
  const {
    maxWidth = 1400,
    maxHeight = 1400,
    quality = 0.84,
    rotation = 0,
    zoom = 1,
    cropAspect = null,
    offsetX = 0,
    offsetY = 0,
  } = options;

  const img = await loadImage(source);
  const rad = ((rotation % 360) * Math.PI) / 180;
  const isRotated90 = Math.abs(rotation % 180) === 90;
  const srcW = isRotated90 ? img.naturalHeight : img.naturalWidth;
  const srcH = isRotated90 ? img.naturalWidth : img.naturalHeight;

  let targetW = srcW;
  let targetH = srcH;

  if (cropAspect && cropAspect > 0) {
    if (srcW / srcH > cropAspect) {
      targetW = Math.round(srcH * cropAspect);
      targetH = srcH;
    } else {
      targetW = srcW;
      targetH = Math.round(srcW / cropAspect);
    }
  }

  const scaleDown = Math.min(1, maxWidth / targetW, maxHeight / targetH);
  const outW = Math.max(1, Math.round(targetW * scaleDown));
  const outH = Math.max(1, Math.round(targetH * scaleDown));

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, outW, outH);

  ctx.save();
  ctx.translate(outW / 2 + offsetX * outW, outH / 2 + offsetY * outH);
  ctx.rotate(rad);
  const drawScale = scaleDown * Math.max(1, zoom);
  ctx.scale(drawScale, drawScale);
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
  ctx.restore();

  const preferredMime = 'image/webp';
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else {
          canvas.toBlob(
            (fallback) => (fallback ? resolve(fallback) : reject(new Error('Image export failed'))),
            'image/jpeg',
            quality
          );
        }
      },
      preferredMime,
      quality
    );
  });

  const dataUrl = await blobToDataUrl(blob);
  return {
    blob,
    dataUrl,
    width: outW,
    height: outH,
    sizeBytes: blob.size,
    mimeType: blob.type || 'image/webp',
  };
}

function loadImage(source: File | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (typeof source !== 'string') {
        URL.revokeObjectURL(img.src);
      }
      resolve(img);
    };
    img.onerror = () => reject(new Error('Could not load image file'));
    img.src = typeof source === 'string' ? source : URL.createObjectURL(source);
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export interface UploadImageOutput {
  url: string;
  storagePath: string;
  width: number;
  height: number;
  sizeBytes: number;
  mimeType: string;
  uploadedToStorage: boolean;
  warning?: string;
}

/**
 * Optimizes image to WebP and uploads to Firebase Storage.
 * If Firebase Storage is not yet initialized/enabled in the Firebase Console,
 * surfaces a clear configuration message rather than failing silently.
 */
export async function uploadOptimizedImage(
  source: File | string,
  folder: MediaFolder,
  fileName: string,
  options: ImageTransformOptions = {}
): Promise<UploadImageOutput> {
  const processed = await processImageWithCanvas(source, options);
  const safeBase = fileName
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .slice(0, 60) || 'image';
  const ext = processed.mimeType === 'image/webp' ? 'webp' : 'jpg';
  const storagePath = `zad-foods/${folder}/${Date.now()}-${safeBase}.${ext}`;

  try {
    const storageRef = ref(storage, storagePath);
    const snapshot = await uploadBytes(storageRef, processed.blob, {
      contentType: processed.mimeType,
      cacheControl: 'public, max-age=31536000',
    });
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return {
      url: downloadUrl,
      storagePath,
      width: processed.width,
      height: processed.height,
      sizeBytes: processed.sizeBytes,
      mimeType: processed.mimeType,
      uploadedToStorage: true,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Firebase Storage upload failed (${msg}). Please verify Firebase Storage is enabled in Firebase Console with authenticated admin write rules, or use an existing Media Library / hosted image URL.`
    );
  }
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
