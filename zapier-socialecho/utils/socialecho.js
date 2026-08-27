const toNonEmptyString = (value) => {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  return text ? text : undefined;
};

const parseJsonMaybe = (value, fieldName) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (typeof value === "object") {
    return value;
  }
  try {
    return JSON.parse(String(value));
  } catch (error) {
    throw new Error(`Invalid JSON in '${fieldName}': ${error.message}`);
  }
};

const parseCsvIntArray = (value) => {
  const text = toNonEmptyString(value);
  if (!text) return undefined;
  const array = text
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => !Number.isNaN(item));
  return array.length ? array : undefined;
};

const normalizeBaseUrl = (bundle) => {
  const fromAuth = toNonEmptyString(bundle.authData?.base_url);
  return (fromAuth || "https://api.socialecho.net").replace(/\/+$/, "");
};

const buildHeaders = (bundle, method) => {
  const key = toNonEmptyString(bundle.authData?.team_api_key);
  if (!key) {
    throw new Error("Missing team_api_key in authData.");
  }

  const lang = toNonEmptyString(bundle.authData?.lang) || "zh_CN";
  const headers = {
    Authorization: `Bearer ${key}`,
    "X-Lang": lang
  };
  if (method !== "GET") headers["Content-Type"] = "application/json";
  return headers;
};

const throwBusinessError = (z, response) => {
  const payload = response.data || {};
  const message =
    payload.message ||
    payload.msg ||
    `SocialEcho API failed with HTTP ${response.status}`;
  const businessCode = payload.code;

  throw new z.errors.Error(
    message,
    "SocialEchoApiError",
    response.status || businessCode || 500
  );
};

const toQueryParams = (body) => {
  if (!body || typeof body !== "object") return {};
  const params = {};
  for (const [key, value] of Object.entries(body)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      params[`${key}[]`] = value;
      continue;
    }
    if (typeof value === "object") {
      params[key] = JSON.stringify(value);
      continue;
    }
    params[key] = value;
  }
  return params;
};

const requestSocialEcho = async (z, bundle, config) => {
  const method = config.method.toUpperCase();
  const url = `${normalizeBaseUrl(bundle)}${config.path}`;
  const body = config.body || {};
  const options = {
    method,
    url,
    headers: buildHeaders(bundle, method),
    skipThrowForStatus: true
  };

  if (method === "GET") {
    options.params = toQueryParams(body);
  } else {
    options.body = body;
  }

  const response = await z.request(options);

  if (response.status !== 200) {
    throwBusinessError(z, response);
  }

  const code = response.data?.code;
  if (code !== 0) {
    throwBusinessError(z, response);
  }

  return response.data;
};

const validateSelectedMusic = (extra) => {
  const music = extra && typeof extra === "object" ? extra.music : undefined;
  if (!music || music.selection === "none") return;
  const fields = [
    "url", "uuid", "cover", "title", "artist", "duration",
    "selection", "music_volume", "original_sound_volume"
  ];
  const missing = fields.filter((field) => music[field] === undefined || music[field] === null || music[field] === "");
  if (missing.length) throw new Error(`Selected extra.music is missing: ${missing.join(", ")}`);
};

module.exports = {
  parseJsonMaybe,
  parseCsvIntArray,
  requestSocialEcho,
  toNonEmptyString,
  validateSelectedMusic
};
