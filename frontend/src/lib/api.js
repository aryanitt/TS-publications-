/**
 * Central API client with in-memory + sessionStorage caching for GET requests.
 * Configure production API via VITE_API_URL (see .env.example).
 */

import { getAuthHeaders } from "./crmContext.js";

const CACHE_PREFIX = "crm_cache:";
const DEFAULT_GET_TTL = 5 * 60 * 1000; // 5 minutes
const memoryCache = new Map();
const inflightGets = new Map();
let lastFetchAt = 0;
const MIN_FETCH_GAP_MS = 120;
const DEFAULT_FETCH_TIMEOUT_MS = 20000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Hostinger backend — used when VITE_API_URL is missing from the Vercel build. */
const PRODUCTION_API_BASE =
  "https://mediumturquoise-capybara-737767.hostingersite.com";

export function getApiBase() {
  // Browser must always use same-origin `/api` (Vercel/Nitro proxy or Vite dev proxy).
  // Direct Hostinger URLs fail in the browser due to CORS even when VITE_API_URL is set in Vercel.
  if (typeof window !== "undefined") {
    return "";
  }
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl != null && String(envUrl).trim() !== "") {
    return String(envUrl).replace(/\/$/, "");
  }
  // SSR / Node must use an absolute backend URL.
  if (import.meta.env.PROD) {
    return PRODUCTION_API_BASE;
  }
  return "http://localhost:5000";
}

/** True when writes should go to the backend (production API or live session). */
export function shouldPersistToApi(usingApi = false) {
  if (usingApi) return true;
  if (getApiBase()) return true;
  // Browser uses same-origin `/api` (Vercel rewrite or Vite dev proxy).
  return typeof window !== "undefined";
}

export function apiUrl(path) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  // Never call Hostinger directly from the browser — always same-origin /api (proxy).
  if (typeof window !== "undefined") {
    return normalized;
  }
  const base = getApiBase();
  return base ? `${base}${normalized}` : normalized;
}

function cacheKey(url) {
  return `${CACHE_PREFIX}${url}`;
}

function readSession(key) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() > parsed.expires) {
      sessionStorage.removeItem(key);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function writeSession(key, data, ttl) {
  try {
    sessionStorage.setItem(
      key,
      JSON.stringify({ data, expires: Date.now() + ttl, savedAt: Date.now() }),
    );
  } catch {
    // sessionStorage full — ignore
  }
}

export function invalidateCache(match = "") {
  const needle = match.toLowerCase();
  for (const key of memoryCache.keys()) {
    if (!needle || key.toLowerCase().includes(needle)) {
      memoryCache.delete(key);
    }
  }
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(CACHE_PREFIX) && (!needle || key.toLowerCase().includes(needle))) {
        sessionStorage.removeItem(key);
      }
    }
  } catch {
    // ignore
  }
}

async function performFetch(url, options = {}) {
  const { timeoutMs = DEFAULT_FETCH_TIMEOUT_MS, ...fetchOptions } = options;
  const method = (fetchOptions.method || "GET").toUpperCase();
  if (method === "GET") {
    const existing = inflightGets.get(url);
    if (existing) return existing;
  }

  const gap = lastFetchAt + MIN_FETCH_GAP_MS - Date.now();
  if (gap > 0) await sleep(gap);
  lastFetchAt = Date.now();

  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeoutId = controller
    ? setTimeout(() => controller.abort(), timeoutMs)
    : null;

  const request = fetch(url, {
    ...fetchOptions,
    signal: controller?.signal,
    headers: {
      Accept: "application/json",
      ...getAuthHeaders(),
      ...(fetchOptions.body && !(fetchOptions.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...fetchOptions.headers,
    },
  }).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });

  if (method === "GET") {
    inflightGets.set(url, request);
    request.finally(() => {
      if (inflightGets.get(url) === request) inflightGets.delete(url);
    });
  }

  try {
    return await request;
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new Error(
        `API request timed out after ${Math.round(timeoutMs / 1000)}s. `
        + "Check that the backend is running and auth routes are deployed.",
      );
    }
    throw err;
  }
}

function storeGetCache(key, data, ttl) {
  memoryCache.set(key, { data, expires: Date.now() + ttl });
  writeSession(key, data, ttl);
}

function formatApiError(data, fallback) {
  if (!data || typeof data !== "object") return fallback;
  const base = data.message || data.error || fallback;
  const fieldErrors = data.errors?.fieldErrors;
  if (!fieldErrors || typeof fieldErrors !== "object") return base;
  const details = Object.entries(fieldErrors)
    .flatMap(([field, messages]) => (
      Array.isArray(messages) ? messages.map((msg) => `${field}: ${msg}`) : []
    ))
    .join("; ");
  return details ? `${base} — ${details}` : base;
}

function parseApiResponseBody(text, contentType) {
  const trimmed = text.trim();
  if (!trimmed) return { parsed: false, data: null };
  const looksJson = contentType.includes("application/json")
    || trimmed.startsWith("{")
    || trimmed.startsWith("[")
    || trimmed === "null";
  if (!looksJson) return { parsed: false, data: null };
  try {
    return { parsed: true, data: JSON.parse(trimmed) };
  } catch {
    return { parsed: false, data: null };
  }
}

function describeNonJsonResponse(status, contentType, preview) {
  if (preview.startsWith("<!DOCTYPE") || preview.startsWith("<html")) {
    if (status === 404) {
      return "Auth API not found (404). Deploy the latest backend with auth routes to Hostinger.";
    }
    return "API request hit the frontend instead of the backend. Check VITE_API_URL.";
  }
  if (status === 429) return "Too many API requests — wait a moment and try again.";
  if (status === 502 || status === 503 || status === 504) {
    return "Backend API is temporarily unavailable. Try again in a few seconds.";
  }
  if (status === 204 || !preview.trim()) {
    return `API returned ${status} with an empty response. Try again.`;
  }
  return `Expected JSON from API but got ${contentType || "unknown type"}`;
}

/**
 * Cached fetch — returns parsed JSON for GET when cacheTtl > 0.
 */
export async function apiJson(path, options = {}) {
  const {
    cacheTtl = DEFAULT_GET_TTL,
    skipCache = false,
    method = "GET",
    timeoutMs,
    _retry429 = 0,
    ...fetchOptions
  } = options;

  const url = apiUrl(path);
  const httpMethod = method.toUpperCase();
  const isGet = httpMethod === "GET";
  const key = cacheKey(url);

  if (isGet && !skipCache && cacheTtl > 0) {
    const mem = memoryCache.get(key);
    if (mem && Date.now() < mem.expires) {
      return mem.data;
    }
    const stored = readSession(key);
    if (stored != null) {
      storeGetCache(key, stored, cacheTtl);
      return stored;
    }
  }

  let response;
  try {
    response = await performFetch(url, { ...fetchOptions, method: httpMethod, timeoutMs });
  } catch (err) {
    const isNetwork = err instanceof TypeError
      || String(err?.message || "").toLowerCase().includes("failed to fetch");
    if (!isNetwork) throw err;
    const target = typeof window !== "undefined"
      ? `${window.location.origin}${apiUrl(path).split("?")[0]}`
      : apiUrl(path);
    throw new Error(
      `Cannot reach the API at ${target}. `
      + (typeof window !== "undefined"
        ? "Redeploy the frontend and ensure VITE_API_URL is empty in Vercel (uses /api proxy). "
          + "If testing locally, start the backend: cd backend && npm run dev"
        : "Check your connection and backend deploy."),
    );
  }

  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();
  const { parsed, data } = parseApiResponseBody(text, contentType);

  if (!parsed) {
    const preview = text.slice(0, 80);
    if (isGet && response.status === 429 && _retry429 < 2) {
      await sleep(2000 * (_retry429 + 1));
      return apiJson(path, {
        cacheTtl,
        skipCache,
        method,
        timeoutMs,
        _retry429: _retry429 + 1,
        ...fetchOptions,
      });
    }
    const err = new Error(describeNonJsonResponse(response.status, contentType, preview));
    err.status = response.status;
    throw err;
  }

  if (!response.ok) {
    if (isGet && response.status === 429 && _retry429 < 2) {
      await sleep(2000 * (_retry429 + 1));
      return apiJson(path, {
        cacheTtl,
        skipCache,
        method,
        timeoutMs,
        _retry429: _retry429 + 1,
        ...fetchOptions,
      });
    }
    const message = formatApiError(data, response.statusText || "Request failed");
    const err = new Error(message);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  if (isGet && cacheTtl > 0) {
    storeGetCache(key, data, cacheTtl);
  } else if (!isGet) {
    invalidateCache(path.split("?")[0].replace(/\/[^/]+$/, "") || "/api");
    invalidateCache(path.split("?")[0]);
  }

  return data;
}

export async function apiGet(path, options = {}) {
  return apiJson(path, { ...options, method: "GET" });
}

export async function apiPost(path, body, options = {}) {
  return apiJson(path, {
    ...options,
    method: "POST",
    body: JSON.stringify(body),
    cacheTtl: 0,
  });
}

export async function apiPut(path, body, options = {}) {
  return apiJson(path, {
    ...options,
    method: "PUT",
    body: JSON.stringify(body),
    cacheTtl: 0,
  });
}

export async function apiPatch(path, body, options = {}) {
  return apiJson(path, {
    ...options,
    method: "PATCH",
    body: JSON.stringify(body),
    cacheTtl: 0,
  });
}

export async function apiDelete(path, options = {}) {
  return apiJson(path, { ...options, method: "DELETE", cacheTtl: 0 });
}

/** Read cached GET payload synchronously (for instant first paint). */
export function readCachedJson(path) {
  const url = apiUrl(path);
  const key = cacheKey(url);
  const mem = memoryCache.get(key);
  if (mem && Date.now() < mem.expires) return mem.data;
  return readSession(key);
}
