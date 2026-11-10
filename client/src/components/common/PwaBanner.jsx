import { useState, useEffect } from 'react';
import { Download, RefreshCw, WifiOff, CheckCircle2, X } from 'lucide-react';
import { subscribePwaEvent, applyUpdate, promptInstall, getPwaState } from '../../pwa/pwaManager';

export default function PwaBanner() {
  const [updateAvailable, setUpdateAvailable] = useState(() => getPwaState().isUpdateAvailable);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isOnline, setIsOnline] = useState(() => getPwaState().isOnline);
  const [justReconnected, setJustReconnected] = useState(false);
  const [canInstall, setCanInstall] = useState(() => getPwaState().canInstall);
  const [installDismissed, setInstallDismissed] = useState(() => {
    try {
      return sessionStorage.getItem('finlab-install-dismissed') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    // Event subscriptions
    const unsubUpdate = subscribePwaEvent('updateAvailable', () => {
      setUpdateAvailable(true);
    });

    const unsubInstall = subscribePwaEvent('installable', ({ canInstall }) => {
      setCanInstall(canInstall);
    });

    const unsubInstalled = subscribePwaEvent('installed', () => {
      setCanInstall(false);
    });

    const unsubConn = subscribePwaEvent('connectionChange', ({ isOnline: online }) => {
      setIsOnline(online);
      if (online) {
        setJustReconnected(true);
        const timer = setTimeout(() => {
          setJustReconnected(false);
        }, 4000);
        return () => clearTimeout(timer);
      }
    });

    return () => {
      unsubUpdate();
      unsubInstall();
      unsubInstalled();
      unsubConn();
    };
  }, []);

  const handleUpdate = () => {
    setIsUpdating(true);
    applyUpdate();
  };

  const handleInstall = async () => {
    await promptInstall();
  };

  const dismissInstall = () => {
    setInstallDismissed(true);
    try {
      sessionStorage.setItem('finlab-install-dismissed', 'true');
    } catch {
      // storage unavailable
    }
  };

  return (
    <>
      {/* 1. Offline Notification Bar */}
      {!isOnline && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-0 inset-x-0 z-50 flex items-center justify-between gap-3 bg-amber-500 px-4 py-2.5 text-xs font-semibold text-slate-950 shadow-md backdrop-blur-md transition-all"
        >
          <div className="flex items-center gap-2 mx-auto">
            <WifiOff size={15} className="shrink-0 animate-pulse text-slate-950" />
            <span>
              You are currently offline. Financial data sync is paused for your privacy.
            </span>
          </div>
        </div>
      )}

      {/* 2. Reconnection Toast */}
      {isOnline && justReconnected && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-800 shadow-lg dark:bg-emerald-950/80 dark:text-emerald-200 backdrop-blur-md animate-fade-in"
        >
          <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400" />
          <span>Connection restored. Syncing with FinLab...</span>
        </div>
      )}

      {/* 3. New Version Update Toast */}
      {updateAvailable && (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-50 max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-2xl backdrop-blur-lg animate-in slide-in-from-bottom duration-200"
        >
          <div className="flex items-start gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
              <RefreshCw size={17} className={isUpdating ? 'animate-spin' : ''} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-[var(--text)]">Update Available</h4>
              <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                A new version of FinLab is ready. Update now to receive the latest features and security improvements.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={handleUpdate}
                  className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-[11px] font-semibold text-white shadow-xs hover:opacity-90 active:scale-95 transition-all"
                >
                  {isUpdating ? 'Updating...' : 'Update Now'}
                </button>
                <button
                  type="button"
                  onClick={() => setUpdateAvailable(false)}
                  className="rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] transition"
                >
                  Later
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setUpdateAvailable(false)}
              aria-label="Dismiss update alert"
              className="rounded-md p-1 text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)] transition"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* 4. Android / Browser Install Prompt Banner */}
      {canInstall && !installDismissed && (
        <div
          role="region"
          aria-label="Install FinLab App"
          className="fixed bottom-4 left-4 right-4 sm:left-4 sm:right-auto z-40 max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-xl backdrop-blur-lg transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--primary)] text-white font-bold text-xs">
              FL
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-[var(--text)]">Install FinLab</div>
              <div className="text-[10px] text-[var(--text-secondary)] truncate">
                Add to your home screen for quick offline access
              </div>
            </div>
            <button
              type="button"
              onClick={handleInstall}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-xs hover:opacity-90 active:scale-95 transition"
            >
              <Download size={13} />
              <span>Install</span>
            </button>
            <button
              type="button"
              onClick={dismissInstall}
              aria-label="Dismiss install banner"
              className="rounded-md p-1 text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)] transition"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
