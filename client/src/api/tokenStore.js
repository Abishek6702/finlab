let inMemoryAccessToken = null;

// Kept as 'save_future' as requested
export const TOKEN_STORAGE_KEY = 'save_future';

export const getAccessToken = () => {
  if (inMemoryAccessToken) return inMemoryAccessToken;
  try {
    const fromLocal = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (fromLocal) return fromLocal;
    const fromSession = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (fromSession) {
      localStorage.setItem(TOKEN_STORAGE_KEY, fromSession);
      return fromSession;
    }
  } catch {
    /* Storage may be unavailable in private browsing mode */
  }
  return null;
};

export const setAccessToken = (token) => {
  inMemoryAccessToken = token || null;
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    /* Storage unavailable */
  }
};

export const clearAccessToken = () => {
  inMemoryAccessToken = null;
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    /* Storage unavailable */
  }
};
