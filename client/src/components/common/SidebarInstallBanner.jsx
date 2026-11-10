import { useState, useEffect } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { subscribePwaEvent, promptInstall, getPwaState, isStandalone } from '../../pwa/pwaManager';

export default function SidebarInstallBanner({ collapsed = false, mobile = false }) {
  const [canInstall, setCanInstall] = useState(() => getPwaState().canInstall);
  const [standalone, setStandalone] = useState(() => isStandalone());
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem('finlab-sidebar-install-dismissed') === 'true';
    } catch {
      return false;
    }
  });
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    const unsubInstallable = subscribePwaEvent('installable', ({ canInstall: installable }) => {
      setCanInstall(installable);
    });

    const unsubInstalled = subscribePwaEvent('installed', () => {
      setInstalled(true);
      setCanInstall(false);
      setStandalone(true);
    });

    return () => {
      unsubInstallable();
      unsubInstalled();
    };
  }, []);

  // If already running as an installed PWA or dismissed, do not render
  if (standalone || installed || dismissed) {
    return null;
  }

  const handleInstallClick = async () => {
    if (canInstall) {
      await promptInstall();
    } else {
      setShowInstructions(true);
    }
  };

  const handleDismiss = (e) => {
    e.stopPropagation();
    setDismissed(true);
    try {
      sessionStorage.setItem('finlab-sidebar-install-dismissed', 'true');
    } catch {
      // storage unavailable
    }
  };

  // Collapsed Sidebar View (Desktop Icon Only)
  if (collapsed && !mobile) {
    return (
      <div className="mt-auto pt-4 flex justify-center">
        <button
          type="button"
          onClick={handleInstallClick}
          title="Install FinLab App"
          aria-label="Install FinLab App"
          className="relative grid size-10 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition-all shadow-xs"
        >
          <Download size={18} />
          {canInstall && (
            <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-emerald-500 ring-2 ring-[var(--surface)]" />
          )}
        </button>
      </div>
    );
  }

  // Expanded Sidebar View (Full Card Structure)
  return (
    <div className="mt-auto pt-6">
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)]/80 p-3.5 shadow-xs transition-all">
        {/* Top Header Row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[var(--primary)] text-white shadow-xs">
              <Smartphone size={16} />
            </span>
            <div className="min-w-0">
              <div className="text-xs font-bold tracking-tight text-[var(--text)]">
                Install FinLab
              </div>

            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss install card"
            className="rounded-md p-1 text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text)] transition"
          >
            <X size={13} />
          </button>
        </div>

        {/* Instructions / Explanation if direct prompt isn't fired yet */}
        {showInstructions ? (
          <div className="mt-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-[11px] leading-relaxed text-[var(--text-secondary)]">
            <div className="font-semibold text-[var(--text)] mb-1">To install on this device:</div>
            <ol className="list-decimal pl-4 space-y-1">
              <li>Open your browser menu (<strong>⋮</strong> or Share icon)</li>
              <li>Tap <strong>&ldquo;Install app&rdquo;</strong> or <strong>&ldquo;Add to Home screen&rdquo;</strong></li>
            </ol>
            <button
              type="button"
              onClick={() => setShowInstructions(false)}
              className="mt-2 w-full rounded-lg bg-[var(--surface-raised)] py-1 text-center text-[10px] font-semibold text-[var(--text)] hover:bg-[var(--border)] transition"
            >
              Got it
            </button>
          </div>
        ) : (
          /* Install CTA Button */
          <button
            type="button"
            onClick={handleInstallClick}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--primary)] px-2 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:opacity-95 active:scale-[0.98]"
          >
            <Download size={14} />
            <span>Install App</span>
          </button>
        )}
      </div>
    </div>
  );
}
