// Shared client for calls to the cms.nuwall.co.nz API — centralizes the
// base URL and the shared x-api-key header so each viewer doesn't repeat
// its own fetch/header/error-check boilerplate.
const BASE_URL = 'https://cms.nuwall.co.nz/api';
const API_KEY = 'nk_99b79c6d5168840d0b11a35e1953d2c1b5f38c6d0b6970cbaf0e69abfe8424ff';

export class CmsClient {
  constructor({ baseUrl = BASE_URL, apiKey = API_KEY } = {}) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  // `pathOrUrl` is either a path relative to `baseUrl` (e.g. "/resources")
  // or an already-absolute URL — download/preview links come back from the
  // API itself as full URLs, so callers pass those straight through.
  buildUrl(pathOrUrl, params) {
    const url = new URL(/^https?:\/\//i.test(pathOrUrl) ? pathOrUrl : this.baseUrl + pathOrUrl);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
      });
    }
    return url.toString();
  }

  // Returns the raw Response — for callers that need the headers (filename
  // from content-disposition) or a blob body (downloads/previews) instead
  // of parsed JSON.
  fetchRaw(pathOrUrl, { params, ...options } = {}) {
    return fetch(this.buildUrl(pathOrUrl, params), {
      ...options,
      headers: { 'x-api-key': this.apiKey, ...(options.headers || {}) },
    });
  }

  async get(pathOrUrl, options = {}) {
    const res = await this.fetchRaw(pathOrUrl, options);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }

  postRaw(pathOrUrl, body, options = {}) {
    return this.fetchRaw(pathOrUrl, {
      ...options,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      body: JSON.stringify(body),
    });
  }

  async post(pathOrUrl, body, options = {}) {
    const res = await this.postRaw(pathOrUrl, body, options);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }
}

export const cms = new CmsClient();
