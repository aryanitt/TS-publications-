/**
 * Central API client with in-memory + sessionStorage caching for GET requests.
 * Configure production API via VITE_API_URL (see .env.example).
 */

const CACHE_PREFIX = "crm_cache:";
const DEFAULT_GET_TTL = 5 * 60 * 1000; // 5 minutes
const memoryCache = new Map();

export function getApiBase() {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl != null && String(envUrl).trim() !== "") {
    return String(envUrl).replace(/\/$/, "");
  }
  // Dev: Vite proxy `/api` → backend. Production: relative `/api` on same domain.
  return "";
}

export function apiUrl(path) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
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
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
  });
  return response;
}

function storeGetCache(key, data, ttl) {
  memoryCache.set(key, { data, expires: Date.now() + ttl });
  writeSession(key, data, ttl);
}

async function revalidateInBackground(url, options, key, ttl) {
  try {
    const response = await performFetch(url, options);
    if (!response.ok) return;
    const data = await response.json();
    storeGetCache(key, data, ttl);
  } catch {
    // silent background refresh
  }
}

/**
 * Cached fetch — returns parsed JSON for GET when cacheTtl > 0.
 */
export async function apiJson(path, options = {}) {
  const {
    cacheTtl = DEFAULT_GET_TTL,
    skipCache = false,
    method = "GET",
    ...fetchOptions
  } = options;

  const url = apiUrl(path);
  const httpMethod = method.toUpperCase();
  const isGet = httpMethod === "GET";
  const key = cacheKey(url);

  if (isGet && !skipCache && cacheTtl > 0) {
    const mem = memoryCache.get(key);
    if (mem && Date.now() < mem.expires) {
      revalidateInBackground(url, { ...fetchOptions, method: httpMethod }, key, cacheTtl);
      return mem.data;
    }
    const stored = readSession(key);
    if (stored != null) {
      storeGetCache(key, stored, cacheTtl);
      revalidateInBackground(url, { ...fetchOptions, method: httpMethod }, key, cacheTtl);
      return stored;
    }
  }

  const response = await performFetch(url, { ...fetchOptions, method: httpMethod });

  let data;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const message = data?.message || data?.error || response.statusText || "Request failed";
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
