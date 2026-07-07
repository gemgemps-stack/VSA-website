import axios from 'axios';
import { readAccessToken } from './authTokenStorage';

const EXPLICIT_API_BASE_URL = process.env.REACT_APP_API_URL || '';
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

const discoverApiBaseUrl = async () => {
  if (EXPLICIT_API_BASE_URL && isLocalUrl(EXPLICIT_API_BASE_URL)) {
    return EXPLICIT_API_BASE_URL;
  }

  if (resolvedApiBaseUrl && resolvedApiBaseUrl !== EXPLICIT_API_BASE_URL) {
    return resolvedApiBaseUrl;
  }

  if (!resolveApiBaseUrlPromise) {
    resolveApiBaseUrlPromise = (async () => {
      if (preferLocalDiscovery || !EXPLICIT_API_BASE_URL) {
        for (const port of LOCAL_API_PORTS) {
          const candidate = `http://localhost:${port}`;
          if (await probeBaseUrl(candidate)) {
            resolvedApiBaseUrl = candidate;
            return candidate;
          }
        }
      }

      resolvedApiBaseUrl = EXPLICIT_API_BASE_URL || '';
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

// Enable short-lived debug logging to help diagnose 401s on write requests.
// Remove or set to false when issue is resolved.
const DEBUG_API_REQUESTS = true;

let cachedCsrfToken = null;

const fetchCsrfToken = async () => {
  try {
    const response = await api.get('/api/auth/csrf');
    if (response?.data?.token) {
      cachedCsrfToken = response.data.token;
    }
    return cachedCsrfToken;
  } catch (error) {
    return null;
  }
};

api.interceptors.request.use(async (config) => {
  if (!config.baseURL) {
    config.baseURL = await discoverApiBaseUrl();
  }

  const method = (config.method || 'get').toLowerCase();
  const isUnsafeMethod = !['get', 'head', 'options'].includes(method);

  if (isUnsafeMethod) {
    try {
      const csrfToken = await fetchCsrfToken();
      if (csrfToken) {
        config.headers = config.headers || {};
        config.headers['X-XSRF-TOKEN'] = csrfToken;
      }
    } catch (err) {
      // Continue, the request may still fail if CSRF is required.
    }
  }

  // Attach bearer token from storage if present so backend can authorize requests
  try {
    const accessToken = readAccessToken();
    if (accessToken) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
  } catch (err) {
    // ignore storage errors
  }

  if (DEBUG_API_REQUESTS) {
    try {
      const method = (config.method || 'get').toUpperCase();
      const url = `${config.baseURL || ''}${config.url || ''}`;
      const hasAuth = Boolean(config.headers && (config.headers.Authorization || config.headers.authorization));
      const hasXSRF = typeof document !== 'undefined' && document.cookie && document.cookie.split(';').some(c => c.trim().startsWith('XSRF-TOKEN='));
      console.debug('[API DEBUG] Request', { method, url, hasAuth, hasXSRF });
    } catch (e) {
      // swallow debug errors
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (DEBUG_API_REQUESTS && error?.config) {
      console.debug('[API DEBUG] Response error', {
        url: `${error.config.baseURL || ''}${error.config.url || ''}`,
        status: error.response?.status,
        data: error.response?.data,
        requestHeaders: error.config.headers,
      });
    }
    return Promise.reject(error);
  }
);

export default api;
