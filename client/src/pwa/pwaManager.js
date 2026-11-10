/**
 * FinLab Progressive Web App Manager
 * 
 * Handles:
 * - Service Worker registration and lifecycle
 * - Safe update detection and user prompting
 * - Android Chrome beforeinstallprompt installation handling
 * - Network status monitoring
 */

let registrationInstance = null;
let deferredInstallPrompt = null;
let isUpdateAvailable = false;

// Event listeners registry
const listeners = {
  updateAvailable: new Set(),
  installable: new Set(),
  installed: new Set(),
  connectionChange: new Set(),
};

export function subscribePwaEvent(event, callback) {
  if (listeners[event]) {
    listeners[event].add(callback);
    return () => listeners[event].delete(callback);
  }
  return () => {};
}

function notify(event, payload) {
  if (listeners[event]) {
    listeners[event].forEach((cb) => {
      try {
        cb(payload);
      } catch (err) {
        console.error(`[PWA] Error in ${event} listener:`, err);
      }
    });
  }
}

export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  // Monitor online / offline status
  window.addEventListener('online', () => {
    notify('connectionChange', { isOnline: true });
  });

  window.addEventListener('offline', () => {
    notify('connectionChange', { isOnline: false });
  });

  // Android Chrome PWA Install Prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing automatically on mobile
    e.preventDefault();
    deferredInstallPrompt = e;
    notify('installable', { canInstall: true });
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    notify('installed', { installed: true });
  });

  // Reload page when new controller takes over
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });

  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      registrationInstance = reg;

      // Check if there is already a waiting worker
      if (reg.waiting) {
        isUpdateAvailable = true;
        notify('updateAvailable', { registration: reg, waitingWorker: reg.waiting });
      }

      // Detect newly installed worker waiting to activate
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            isUpdateAvailable = true;
            notify('updateAvailable', { registration: reg, waitingWorker: newWorker });
          }
        });
      });

      // Periodic check for updates every 45 minutes
      setInterval(() => {
        reg.update().catch(() => {});
      }, 45 * 60 * 1000);

      // Check for updates when tab becomes visible again
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          reg.update().catch(() => {});
        }
      });
    } catch (err) {
      console.warn('[PWA] ServiceWorker registration skipped or failed:', err);
    }
  });
}

/**
 * Apply waiting update: Signals the service worker to skipWaiting
 */
export function applyUpdate() {
  if (registrationInstance?.waiting) {
    registrationInstance.waiting.postMessage({ type: 'SKIP_WAITING' });
  } else {
    window.location.reload();
  }
}

/**
 * Prompt user to install FinLab to home screen (Android / Desktop)
 */
export async function promptInstall() {
  if (!deferredInstallPrompt) {
    return { outcome: 'unavailable' };
  }

  deferredInstallPrompt.prompt();
  const choiceResult = await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  notify('installable', { canInstall: false });
  return choiceResult;
}

export function getPwaState() {
  return {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isUpdateAvailable,
    canInstall: Boolean(deferredInstallPrompt),
  };
}

