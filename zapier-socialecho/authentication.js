const { requestSocialEcho } = require("./utils/socialecho");

const testAuth = async (z, bundle) => {
  return requestSocialEcho(z, bundle, {
    method: "GET",
    path: "/v1/team",
    body: {}
  });
};

// Zapier: connection label must not be a static app name; use a non-sensitive value
// from the account (e.g. team title from GET /v1/team) or return empty to auto-number.
const connectionLabel = async (z, bundle) => {
  const body = await testAuth(z, bundle);
  const title = body && body.data && body.data.title;
  if (title && String(title).trim()) {
    return String(title).trim();
  }
  return "";
};

module.exports = {
  type: "custom",
  test: testAuth,
  fields: [
    {
      key: "team_api_key",
      label: "Team API Key",
      type: "password",
      required: true,
      helpText: "Paste your SocialEcho Team API Key (starts with se_)."
    },
    {
      key: "base_url",
      label: "Base URL",
      type: "string",
      required: false,
      default: "https://api.socialecho.net",
      helpText: "Optional override for self-hosted or staging API."
    },
    {
      key: "lang",
      label: "Language",
      type: "string",
      required: false,
      default: "zh_CN",
      helpText: "Optional response language, for example zh_CN or en."
    }
  ],
  connectionLabel
};
