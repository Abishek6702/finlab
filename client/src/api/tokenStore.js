let inMemoryAccessToken = null;

// Kept as 'save_future' as requested
export const TOKEN_STORAGE_KEY = 'save_future';

export const getAccessToken = () => {
  return inMemoryAccessToken || sessionStorage.getItem(TOKEN_STORAGE_KEY) || null;
};

export const setAccessToken = (token) => {
  inMemoryAccessToken = token || null;
  if (token) {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  }
};

export const clearAccessToken = () => {
  inMemoryAccessToken = null;
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
};
