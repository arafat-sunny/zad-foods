import React, { useState } from 'react';
import { Download, MoreVertical, Share, Smartphone, WifiOff, X } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

interface PWAInstallButtonProps {
  variant?: 'header' | 'drawer' | 'footer';
  onAfterAction?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
  onAfterAction,
}) => {
  const { lang, settings, notify } = useApp();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted) {
        notify(
          lang === 'bn'
            ? 'ZAD Foods অ্যাপ হোম স্ক্রিনে যুক্ত হয়েছে!'
            : 'ZAD Foods app added to your home screen!'
        );
        onAfterAction?.();
      }
      return;
    }
    setShowGuide(true);
  };

  const buttonNode =
    variant === 'drawer' ? (
      <button
        type="button"
        onClick={() => void handleClick()}
        className="w-full flex items-center justify-between gap-3 p-3.5 rounded-xl bg-[#EEF5EB] border border-[#006B35]/20 text-left hover:bg-[#E4F0E0] transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-[#006B35] text-white flex items-center justify-center shrink-0">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#17251B] truncate">
              {lang === 'bn' ? 'অ্যাপ ইনস্টল করুন' : 'Install ZAD Foods App'}
            </p>
            <p className="text-[11px] text-[#4E6153] truncate">
              {lang === 'bn'
                ? 'APK ছাড়াই হোম স্ক্রিনে রাখুন'
                : 'Add to home screen — no APK needed'}
            </p>
          </div>
        </div>
        <Download className="w-4 h-4 text-[#006B35] shrink-0" />
      </button>
    ) : variant === 'footer' ? (
      <button
        type="button"
        onClick={() => void handleClick()}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold text-white hover:opacity-95 transition-opacity whitespace-nowrap shrink-0 cursor-pointer"
        style={{ backgroundColor: 'var(--zad-primary)' }}
      >
        <Download className="w-4 h-4" />
        <span>{lang === 'bn' ? 'হোম স্ক্রিনে অ্যাপ ইনস্টল করুন' : 'Install App on Home Screen'}</span>
      </button>
    ) : (
      <button
        type="button"
        onClick={() => void handleClick()}
        aria-label={lang === 'bn' ? 'অ্যাপ ইনস্টল করুন' : 'Install App'}
        className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg border border-[#006B35]/30 bg-[#EEF5EB] text-[#006B35] hover:bg-[#E2EFE0] text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Download className="w-4 h-4 shrink-0" />
        <span>{lang === 'bn' ? 'অ্যাপ' : 'App'}</span>
      </button>
    );

  return (
    <>
      {buttonNode}

      {showGuide && (
        <div className="no-print fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4">
          <div
            className="fixed inset-0"
            onClick={() => setShowGuide(false)}
            aria-hidden="true"
          />
          <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl border border-[#DCE6DC] p-6 pb-safe shadow-2xl space-y-5">
            {/* Drag affordance on mobile */}
            <div className="w-10 h-1 bg-[#DCE6DC] rounded-full mx-auto sm:hidden -mt-2 mb-1" />

            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <img
                  src={settings.appearance.logoUrl || '/pwa-192x192.png'}
                  alt="ZAD Foods"
                  className="w-12 h-12 rounded-xl object-contain border border-[#DCE6DC] bg-white p-1 shrink-0"
                />
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#17251B]">
                    {lang === 'bn' ? 'হোম স্ক্রিনে ZAD Foods অ্যাপ' : 'Install ZAD Foods App'}
                  </h3>
                  <p className="text-xs text-[#4E6153]">
                    {lang === 'bn'
                      ? 'কোনো APK ডাউনলোড ছাড়াই সরাসরি অ্যাপ হিসেবে ব্যবহার করুন'
                      : 'Use like a native app from your home screen — no APK required'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Close install guide"
                className="p-2 rounded-lg text-[#4E6153] hover:bg-[#F7FAF5] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isIOS ? (
              <ol className="space-y-3 text-sm text-[#17251B] bg-[#F7FAF5] border border-[#DCE6DC] rounded-xl p-4">
                <li className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-[#006B35] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <span>
                    {lang === 'bn' ? (
                      <>
                        Safari ব্রাউজারের নিচে{' '}
                        <span className="inline-flex items-center gap-1 font-semibold text-[#006B35]">
                          <Share className="w-3.5 h-3.5" /> Share
                        </span>{' '}
                        বাটনে ট্যাপ করুন।
                      </>
                    ) : (
                      <>
                        Tap the{' '}
                        <span className="inline-flex items-center gap-1 font-semibold text-[#006B35]">
                          <Share className="w-3.5 h-3.5" /> Share
                        </span>{' '}
                        button in Safari toolbar.
                      </>
                    )}
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-[#006B35] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <span>
                    {lang === 'bn' ? (
                      <>
                        নিচে স্ক্রল করে <strong>Add to Home Screen</strong> সিলেক্ট করুন।
                      </>
                    ) : (
                      <>
                        Scroll down and tap <strong>Add to Home Screen</strong>.
                      </>
                    )}
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-[#006B35] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <span>
                    {lang === 'bn' ? (
                      <>
                        উপরে ডান পাশে <strong>Add</strong> চাপুন — সাথে সাথে হোম স্ক্রিনে অ্যাপ আইকন চলে আসবে।
                      </>
                    ) : (
                      <>
                        Tap <strong>Add</strong> — ZAD Foods will appear right on your home screen.
                      </>
                    )}
                  </span>
                </li>
              </ol>
            ) : (
              <ol className="space-y-3 text-sm text-[#17251B] bg-[#F7FAF5] border border-[#DCE6DC] rounded-xl p-4">
                <li className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-[#006B35] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <span>
                    {lang === 'bn' ? (
                      <>
                        Chrome বা ব্রাউজারের উপরে ডান পাশে মেনু আইকনে (
                        <MoreVertical className="w-3.5 h-3.5 inline text-[#006B35]" />) ট্যাপ করুন।
                      </>
                    ) : (
                      <>
                        Open this site in Chrome and tap the browser menu (
                        <MoreVertical className="w-3.5 h-3.5 inline text-[#006B35]" />).
                      </>
                    )}
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-[#006B35] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <span>
                    {lang === 'bn' ? (
                      <>
                        <strong>Install app</strong> অথবা <strong>Add to Home screen</strong> অপশনে ট্যাপ করুন।
                      </>
                    ) : (
                      <>
                        Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.
                      </>
                    )}
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-[#006B35] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <span>
                    {lang === 'bn' ? (
                      <>
                        <strong>Install</strong> কনফার্ম করুন। এরপর হোম স্ক্রিন থেকে সরাসরি ফুল-স্ক্রিন অ্যাপ হিসেবে ব্যবহার করতে পারবেন।
                      </>
                    ) : (
                      <>
                        Confirm <strong>Install</strong> to launch ZAD Foods full-screen directly from your home screen.
                      </>
                    )}
                  </span>
                </li>
              </ol>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white cursor-pointer"
              style={{ backgroundColor: 'var(--zad-primary)' }}
            >
              {lang === 'bn' ? 'বুঝেছি' : 'Got it'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const { lang } = useApp();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="no-print fixed bottom-[72px] lg:bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>
        {lang === 'bn'
          ? 'অফলাইন মোড — সংরক্ষিত ডেটা দেখানো হচ্ছে'
          : 'Offline Mode — Showing cached data'}
      </span>
    </div>
  );
};
