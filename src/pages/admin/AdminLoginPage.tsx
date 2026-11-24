import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Lock, LogIn, LogOut, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

export default function AdminLoginPage() {
  const {
    user,
    authReady,
    isAdmin,
    adminAuthError,
    verifyAdminSession,
    loginWithGoogle,
    logout,
    settings,
    notify,
  } = useApp();
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showStaffUid, setShowStaffUid] = useState(false);

  // Prevent search engine indexing of the private admin route
  useEffect(() => {
    let robotsMeta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const created = !robotsMeta;
    const prevContent = robotsMeta?.getAttribute('content') || null;
    if (!robotsMeta) {
      robotsMeta = document.createElement('meta');
      robotsMeta.name = 'robots';
      document.head.appendChild(robotsMeta);
    }
    robotsMeta.content = 'noindex, nofollow';

    return () => {
      if (created) {
        robotsMeta?.remove();
      } else if (robotsMeta) {
        if (prevContent !== null) {
          robotsMeta.content = prevContent;
        } else {
          robotsMeta.removeAttribute('content');
        }
      }
    };
  }, []);

  if (authReady && user && isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  const handleAdminSignIn = async () => {
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const signedInUser = await loginWithGoogle({ silent: true });
      if (!signedInUser) return;

      const result = await verifyAdminSession();
      if (result.authorized && result.role) {
        notify('Administrator access verified.');
        navigate('/admin', { replace: true });
      } else {
        const denialMsg =
          result.error || 'Access denied. This account is not an authorized administrator.';
        setErrorMessage(denialMsg);
        notify(denialMsg, 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const displayError = errorMessage || adminAuthError;

  return (
    <div className="min-h-screen bg-[#F7FAF5] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border border-[#DCE6DC] rounded-2xl p-8 space-y-6 shadow-sm">
        <div className="text-center space-y-3">
          <img
            src={settings.appearance.logoUrl}
            alt="ZAD Foods"
            className="h-14 w-auto mx-auto object-contain"
          />
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#006B35] mb-1">
              <Lock className="w-3.5 h-3.5" />
              <span>Private Administrative Portal</span>
            </div>
            <h1 className="font-display text-2xl font-bold text-[#17251B]">
              Administrator Sign In
            </h1>
            <p className="text-sm text-[#4E6153] mt-1">
              Restricted to authorized store administrators only.
            </p>
          </div>
        </div>

        {!authReady || submitting ? (
          <div className="py-6 text-center text-sm text-[#4E6153]">
            Verifying administrator credentials...
          </div>
        ) : !user ? (
          <div className="space-y-4">
            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleAdminSignIn()}
              className="w-full inline-flex items-center justify-center gap-2.5 py-3 px-5 rounded-xl bg-[#006B35] text-white text-sm font-semibold hover:bg-[#168B35] transition-colors disabled:opacity-60 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign in with Authorized Google Account</span>
            </button>
            <div className="p-3.5 rounded-xl bg-[#F7FAF5] border border-[#DCE6DC] text-xs text-[#4E6153] space-y-1">
              <p className="font-semibold text-[#17251B] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#006B35]" />
                <span>Server-Verified Role Authorization</span>
              </p>
              <p>
                Access is strictly verified on the server. Customer accounts and unauthorized emails
                cannot access the management dashboard.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 space-y-2">
              <p className="font-bold flex items-center gap-1.5 text-sm">
                <ShieldAlert className="w-4 h-4 text-red-700" />
                <span>Access Denied</span>
              </p>
              <p>
                Signed in as <span className="font-semibold">{user.email}</span>.{' '}
                {displayError ||
                  'Regular customer accounts do not have permission to access the Admin Dashboard.'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setShowStaffUid(false);
                void logout();
              }}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-[#DCE6DC] text-sm font-semibold text-[#17251B] hover:bg-[#F7FAF5] cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out &amp; Switch Account</span>
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowStaffUid((prev) => !prev)}
                className="text-[11px] text-[#4E6153] hover:text-[#17251B] underline cursor-pointer"
              >
                {showStaffUid ? 'Hide Account Reference ID' : 'Authorized staff awaiting approval?'}
              </button>
              {showStaffUid && (
                <div className="mt-2 p-2.5 rounded-lg bg-[#F7FAF5] border border-[#DCE6DC] text-left space-y-1">
                  <p className="text-[11px] text-[#4E6153]">
                    Share this Account UID with the store owner:
                  </p>
                  <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded border border-[#DCE6DC]">
                    <code className="text-[11px] font-mono-num flex-1 truncate text-[#17251B]">
                      {user.uid}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard.writeText(user.uid);
                        notify('UID copied to clipboard');
                      }}
                      className="text-[#006B35] hover:opacity-80 cursor-pointer"
                      aria-label="Copy UID"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-[#EEF5EB] text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#006B35] hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Storefront</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
