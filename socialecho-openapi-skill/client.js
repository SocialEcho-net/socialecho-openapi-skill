#!/usr/bin/env node

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
  const v = args[name] ?? fallback;
  if (required && !v) {
    throw new Error(`Missing option: --${name}`);
  }
  return v;
}

export function buildRequestOptions(args) {
  return {
    apiKey: getOption(args, "api-key"),
    baseUrl: getOption(args, "base-url", false, "https://api.socialecho.net"),
    teamId: getOption(args, "team-id", false, ""),
    lang: getOption(args, "lang", false, "zh_CN")
  };
}

function appendQueryParams(urlString, params = {}) {
  const url = new URL(urlString);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      for (const item of value) url.searchParams.append(`${key}[]`, String(item));
    } else {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

/** SocialEcho GET 参数使用 QueryString，且请求不得携带 body。 */
export async function callApi(path, params = {}, options) {
  const { apiKey, baseUrl, teamId, lang } = options;

  const url = appendQueryParams(`${baseUrl.replace(/\/+$/, "")}${path}`, params);

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "X-Lang": lang
  };
  if (teamId) headers["X-Team-Id"] = teamId;

  const resp = await fetch(url, {
    method: "GET",
    headers
  });
  const status = resp.status;
  let resBody;
  try {
    resBody = await resp.json();
  } catch {
    resBody = { parse_error: true };
  }

  const ok = status >= 200 && status <= 299 && resBody?.code === 0;
  return { ok, status, body: resBody, url };
}

/** @deprecated 历史兼容名；新代码请用 parseAccountIdArray */
export function parseCsvIds(raw) {
  if (!raw) return "";
  return String(raw)
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .join(",");
}

/** 将 `1,2,3` 转为整数数组；无输入时返回 `undefined`（可省略该字段） */
export function parseAccountIdArray(raw) {
  if (!raw) return undefined;
  const arr = String(raw)
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n));
  return arr.length ? arr : undefined;
}

export function printAndExit(result) {
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(1);
}
