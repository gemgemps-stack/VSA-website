import { buildRequestConfig } from './api';

describe('buildRequestConfig', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    document.cookie = 'VSA_AUTH=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  });

  it('adds the bearer token and csrf header when available', () => {
    window.localStorage.setItem('verdida:accessToken', 'abc123');
    document.cookie = 'XSRF-TOKEN=csrf-token';

    const config = buildRequestConfig({ headers: {} });

    expect(config.headers.Authorization).toBe('Bearer abc123');
    expect(config.headers['X-XSRF-TOKEN']).toBe('csrf-token');
  });

  it('does not add headers when no auth or csrf values are present', () => {
    const config = buildRequestConfig({ headers: {} });

    expect(config.headers.Authorization).toBeUndefined();
    expect(config.headers['X-XSRF-TOKEN']).toBeUndefined();
  });
});
