const ACCESS_TOKEN_STORAGE_KEY = 'verdida:accessToken';

export const readAccessToken = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  } catch (error) {
    return null;
  }
};

export const writeAccessToken = (token) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (token) {
      window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    }
  } catch (error) {
    // Ignore storage failures so auth still works in restricted browsers.
  }
};
