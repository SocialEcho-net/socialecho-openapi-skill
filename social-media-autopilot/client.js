#!/usr/bin/env node

import http from "node:http";
import https from "node:https";

export function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
}

export function getOption(args, name, required = true, fallback = "") {
  const value = args[name] ?? fallback;
  if (required && (value === "" || value === undefined || value === null)) {
    throw new Error(`Missing option: --${name}`);
  }
  return value;
}

export function getIntegerOption(args, name, required = true, fallback) {
  const raw = args[name] ?? fallback;
  if (raw === undefined || raw === "") {
    if (required) throw new Error(`Missing option: --${name}`);
    return undefined;
  }

  const value = Number(raw);
  if (!Number.isSafeInteger(value)) {
    throw new Error(`Invalid integer option: --${name}`);
  }
  return value;
}

function cleanParams(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

function buildQuery(params) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(cleanParams(params))) {
    if (Array.isArray(value)) {
      for (const item of value) query.append(`${key}[]`, String(item));
    } else {
      query.set(key, String(value));
    }
  }
  return query.toString();
}

function positiveInteger(raw, fallback, optionName) {
  const value = raw === undefined ? fallback : Number(raw);
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`Invalid positive integer option: --${optionName}`);
  }
  return value;
}

export function buildRequestOptions(args) {
  return {
    apiKey: getOption(args, "api-key"),
    baseUrl: getOption(args, "base-url", false, "https://api.socialecho.net").replace(/\/$/, ""),
    teamId: getOption(args, "team-id", false, ""),
    lang: getOption(args, "lang", false, "zh_CN"),
    timeoutMs: positiveInteger(args["timeout-ms"], 30000, "timeout-ms"),
    maxAttempts: positiveInteger(args["max-attempts"], 3, "max-attempts")
  };
}

function parseRetryAfter(value) {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? undefined : Math.max(0, timestamp - Date.now());
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requestOnce(url, method, headers, payload, timeoutMs) {
  return new Promise((resolve, reject) => {
    const transport = url.protocol === "https:" ? https : http;
    const request = transport.request(url, { method, headers }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf8");
        let body;
        try {
          body = raw ? JSON.parse(raw) : {};
        } catch {
          body = { parse_error: true, raw };
        }
        resolve({ status: response.statusCode ?? 0, headers: response.headers, body });
      });
    });

    request.setTimeout(timeoutMs, () => request.destroy(new Error(`Request timed out after ${timeoutMs}ms`)));
    request.on("error", reject);
    if (payload !== undefined) request.write(payload);
    request.end();
  });
}

export async function callApi(path, params = {}, options, requestConfig = {}) {
  const { apiKey, baseUrl, teamId, lang, timeoutMs, maxAttempts } = options;
  const method = requestConfig.method ?? "GET";
  const transport = requestConfig.transport ?? (method === "GET" ? "query" : "body");
  const cleanedParams = cleanParams(params);
  const url = new URL(`${baseUrl}${path}`);

  let payload;
  if (transport === "query") {
    const query = buildQuery(cleanedParams);
    if (query) url.search = query;
  } else if (transport === "body") {
    payload = JSON.stringify(cleanedParams);
  }

  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${apiKey}`,
    "X-Lang": lang
  };
  if (teamId) headers["X-Team-Id"] = teamId;
  if (payload !== undefined) {
    headers["Content-Type"] = "application/json";
    headers["Content-Length"] = Buffer.byteLength(payload);
  }

  const retryableStatuses = new Set([429, 502, 503, 504]);
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await requestOnce(url, method, headers, payload, timeoutMs);
      const ok = response.status >= 200 && response.status <= 299 && response.body?.code === 0;
      const result = {
        ok,
        status: response.status,
        code: response.body?.code,
        request_id: response.body?.request_id ?? response.headers["x-request-id"],
        body: response.body,
        url: url.toString(),
        attempt
      };

      if (ok || !retryableStatuses.has(response.status) || attempt === maxAttempts) return result;

      const retryAfterMs = parseRetryAfter(response.headers["retry-after"]);
      const delayMs = Math.min(retryAfterMs ?? 1000 * 2 ** (attempt - 1), 30000);
      await wait(delayMs);
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts) break;
      await wait(1000 * 2 ** (attempt - 1));
    }
  }

  return {
    ok: false,
    status: 0,
    body: { error: { type: "network_error", reason: lastError?.message ?? "Unknown network error" } },
    url: url.toString(),
    attempt: maxAttempts
  };
}

export function parseCsvIds(raw) {
  if (!raw) return [];
  return String(raw)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => {
      const id = Number(value);
      if (!Number.isSafeInteger(id) || id < 1) throw new Error(`Invalid account ID: ${value}`);
      return id;
    });
}

export function printAndExit(result) {
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}
