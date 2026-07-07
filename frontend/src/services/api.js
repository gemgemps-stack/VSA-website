import axios from 'axios';
import { readAccessToken, writeAccessToken } from './authTokenStorage';

const EXPLICIT_API_BASE_URL = process.env.REACT_APP_API_URL || '';
const AUTH_COOKIE_NAME = 'VSA_AUTH';
const CSRF_COOKIE_NAME = 'XSRF-TOKEN';
const LOCAL_API_PORTS = [8080, 8081, 8082, 8083, 8084, 8085, 8086, 8087, 8088, 8089, 8090];
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1']);
const isBrowserLocalhost =
  typeof window !== 'undefined' && LOCAL_HOSTNAMES.has(window.location.hostname);

const isLocalUrl = (value) => {
  if (!value) {
    return false;
  }

  try {
    const parsed = new URL(value);
    return LOCAL_HOSTNAMES.has(parsed.hostname);
  } catch (error) {
    return false;
  }
};

const preferLocalDiscovery = isBrowserLocalhost && !isLocalUrl(EXPLICIT_API_BASE_URL);
let resolvedApiBaseUrl = EXPLICIT_API_BASE_URL;
let resolveApiBaseUrlPromise = null;

const getHealthUrl = (baseUrl) => `${baseUrl.replace(/\/$/, '')}/api/auth/health`;

const probeBaseUrl = async (baseUrl) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1200);

  try {
    const response = await fetch(getHealthUrl(baseUrl), {
      method: 'GET',
      signal: controller.signal,
    });
    return response.ok;
  } catch (error) {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
};

const shouldAutoLogoutOn401 = (config) => {
  const requestUrl = String(config?.url || '');
  const baseUrl = String(config?.baseURL || '');

  try {
    const resolvedPath = new URL(requestUrl, baseUrl || 'http://localhost').pathname;
    return resolvedPath === '/api/auth/me';
  } catch (error) {
    return requestUrl === '/api/auth/me';
  }
};

const getCookieValue = (name) => {
  if (typeof document === 'undefined') {
    return '';
  }

  const cookies = document.cookie ? document.cookie.split(';') : [];
  const match = cookies.find((cookie) => cookie.trim().startsWith(`${name}=`));
  if (!match) {
    return '';
  }

  return decodeURIComponent(match.split('=').slice(1).join('=').trim());
};

const readAuthCookieToken = () => getCookieValue(AUTH_COOKIE_NAME);

export const buildRequestConfig = (config = {}) => {
  const nextConfig = {
    ...config,
    headers: {
      ...(config.headers || {}),
    },
  };

  const accessToken = readAccessToken() || readAuthCookieToken();
  const csrfToken = getCookieValue(CSRF_COOKIE_NAME);

  if (accessToken) {
    nextConfig.headers.Authorization = `Bearer ${accessToken}`;
  }

  if (csrfToken && !nextConfig.headers['X-XSRF-TOKEN']) {
    nextConfig.headers['X-XSRF-TOKEN'] = csrfToken;
  }

  return nextConfig;
};

const shouldRetryWithoutBearer = (config) => {
  if (config?.__retryWithoutBearer) {
    return false;
  }

  return !shouldAutoLogoutOn401(config);
};

const stripAuthorizationHeader = (headers) => {
  if (!headers) {
    return headers;
  }

  const nextHeaders = { ...headers };
  delete nextHeaders.Authorization;
  delete nextHeaders.authorization;
  return nextHeaders;
};

const discoverApiBaseUrl = async () => {
  // If we already have a resolved URL from EXPLICIT_API_BASE_URL, use it immediately
  if (EXPLICIT_API_BASE_URL && isLocalUrl(EXPLICIT_API_BASE_URL)) {
    return EXPLICIT_API_BASE_URL;
  }

  if (resolvedApiBaseUrl && resolvedApiBaseUrl !== EXPLICIT_API_BASE_URL) {
    return resolvedApiBaseUrl;
  }

  if (!resolveApiBaseUrlPromise) {
    resolveApiBaseUrlPromise = (async () => {
      // Only do local discovery if we're in a browser on localhost and no explicit URL is set
      if (preferLocalDiscovery || !EXPLICIT_API_BASE_URL) {
        for (const port of LOCAL_API_PORTS) {
          const candidate = `http://localhost:${port}`;
          if (await probeBaseUrl(candidate)) {
            resolvedApiBaseUrl = candidate;
            return candidate;
          }
        }
      }

      // Fallback to explicit URL or default
      resolvedApiBaseUrl = EXPLICIT_API_BASE_URL || 'http://localhost:8080';
      return resolvedApiBaseUrl;
    })();
  }

  return resolveApiBaseUrlPromise;
};

const api = axios.create({
  withCredentials: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  if (!config.baseURL) {
    config.baseURL = await discoverApiBaseUrl();
  }

  return buildRequestConfig(config);
});

// Handle unauthorized responses
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const accessToken = readAccessToken() || readAuthCookieToken();

    if (error.response?.status === 401 && accessToken && shouldRetryWithoutBearer(error.config)) {
      writeAccessToken(null);

      const retryConfig = {
        ...error.config,
        __retryWithoutBearer: true,
        headers: stripAuthorizationHeader(error.config?.headers),
      };

      try {
        return await api(retryConfig);
      } catch (retryError) {
        return Promise.reject(retryError);
      }
    }

    if (error.response?.status === 401 && shouldAutoLogoutOn401(error.config)) {
      window.dispatchEvent(new Event('auth:logout'));
    }

    return Promise.reject(error);
  }
);

export default api;
