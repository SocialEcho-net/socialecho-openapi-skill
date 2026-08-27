import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const query = (name, schema, required = false, description = "") => ({
  name,
  in: "query",
  required,
  description,
  schema
});
const get = (operationId, summary, parameters = []) => ({
  operationId,
  summary,
  parameters,
  responses: { "200": { $ref: "#/components/responses/Success" } },
  security: [{ bearerAuth: [] }]
});
const post = (operationId, summary, schema) => ({
  operationId,
  summary,
  requestBody: {
    required: true,
    content: { "application/json": { schema } }
  },
  responses: { "200": { $ref: "#/components/responses/Success" } },
  security: [{ bearerAuth: [] }]
});

const accountId = query("account_id", { type: "integer", minimum: 1 }, true);
const accountIds = query(
  "account_ids[]",
  { type: "array", items: { type: "integer", minimum: 1 } },
  false,
  "Repeat the bracketed key for each account ID."
);
const commonHeaders = [
  { name: "X-Lang", in: "header", required: false, schema: { type: "string", enum: ["zh_CN", "en"], default: "zh_CN" } },
  { name: "X-Team-Id", in: "header", required: false, schema: { type: "integer" } }
];

const spec = {
  openapi: "3.0.3",
  info: {
    title: "SocialEcho Social Media OpenAPI",
    version: "2.1.0",
    description: "Team API Key integration for SocialEcho. GET parameters use QueryString and GET requests must not include a body. Success requires HTTP 2xx and JSON code 0."
  },
  servers: [{ url: "https://api.socialecho.net", description: "Production" }],
  paths: {
    "/v1/team": { get: get("getTeam", "Get current team", commonHeaders) },
    "/v1/account": { get: get("listAccounts", "List social media accounts", [
      ...commonHeaders,
      query("page", { type: "integer", minimum: 1, default: 1 }),
      query("type", { type: "integer", enum: [1, 2], default: 1 })
    ]) },
    "/v1/oauth/links": { get: get("getOauthLinks", "Get platform authorization links", commonHeaders) },
    "/v1/article": { get: get("listArticles", "List articles", [
      ...commonHeaders,
      query("page", { type: "integer", minimum: 1, default: 1 }),
      accountIds
    ]) },
    "/v1/report": { get: get("getReport", "Get report data", [
      ...commonHeaders,
      query("start_date", { type: "string", format: "date" }, true),
      query("end_date", { type: "string", format: "date" }, true),
      query("time_type", { type: "integer", enum: [1, 2] }, true),
      query("group", { type: "string", enum: ["day", "app", "account"] }),
      accountIds
    ]) },
    "/v1/upload/url": { get: get("getUploadUrl", "Create an OSS upload URL", [
      ...commonHeaders,
      query("content_type", { type: "string", maxLength: 100 }, true),
      query("title", { type: "string", maxLength: 255 })
    ]) },
    "/v1/reddit/communities": { get: get("listRedditCommunities", "List Reddit communities", [...commonHeaders, accountId]) },
    "/v1/pinterest/boards": { get: get("listPinterestBoards", "List Pinterest boards", [...commonHeaders, accountId]) },
    "/v1/tiktokshop/products": { get: get("listTiktokShopProducts", "List TikTok Shop products", [
      ...commonHeaders,
      accountId,
      query("page", { type: "integer", minimum: 1, default: 1 }),
      query("per_page", { type: "integer", minimum: 1, maximum: 100, default: 20 }),
      query("keyword", { type: "string", maxLength: 500 })
    ]) },
    "/v1/tiktokshop/products/sync": { post: post("syncTiktokShopProducts", "Submit TikTok Shop product sync", {
      type: "object",
      required: ["account_id"],
      properties: { account_id: { type: "integer", minimum: 1 } }
    }) },
    "/v1/tiktokshop/music/genres": { get: get("listTikTokShopMusicGenres", "List TikTok commercial music genres", commonHeaders) },
    "/v1/tiktokshop/music/trending": { get: get("listTikTokShopTrendingMusic", "List TikTok commercial trending music", [
      ...commonHeaders,
      accountId,
      query("country_code", { type: "string", minLength: 2, maxLength: 2 }),
      query("genre", { type: "string", maxLength: 80 }),
      query("date_range", { type: "string", enum: ["1DAY", "7DAY", "30DAY", "90DAY"] })
    ]) },
    "/v1/publish/article": { post: post("publishArticle", "Publish cross-platform article", { $ref: "#/components/schemas/PublishPayload" }) }
  },
  components: {
    securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "Team API Key" } },
    responses: {
      Success: {
        description: "HTTP 2xx with code 0",
        content: { "application/json": { schema: { $ref: "#/components/schemas/Response" } } }
      }
    },
    schemas: {
      Response: {
        type: "object",
        required: ["code", "message"],
        properties: {
          code: { type: "integer", enum: [0] },
          message: { type: "string" },
          data: {},
          request_id: { type: "string" },
          meta: { type: "object", additionalProperties: true }
        }
      },
      SelectedMusic: {
        type: "object",
        required: ["url", "uuid", "cover", "title", "artist", "duration", "selection", "music_volume", "original_sound_volume"],
        properties: {
          url: { type: "string", format: "uri" },
          uuid: { type: "string" },
          cover: { type: "string", format: "uri" },
          title: { type: "string" },
          artist: { type: "string" },
          duration: { type: "number", minimum: 0 },
          selection: { type: "string", enum: ["trending_clip", "full_track"] },
          music_volume: { type: "integer", minimum: 0, maximum: 100 },
          original_sound_volume: { type: "integer", minimum: 0, maximum: 100 }
        }
      },
      PublishPayload: {
        type: "object",
        required: ["account_id", "type", "status", "comment", "extra", "attachments"],
        properties: {
          account_id: { type: "integer", minimum: 1 },
          type: { type: "string" },
          status: { type: "integer", enum: [0, 1] },
          scheduled_at: { type: "string" },
          comment: { type: "array", items: { type: "string" } },
          content: { type: "string" },
          extra: {
            type: "object",
            properties: { music: { $ref: "#/components/schemas/SelectedMusic" } },
            additionalProperties: true
          },
          attachments: { type: "array", items: { type: "object", required: ["url"], properties: { url: { type: "string", format: "uri" } }, additionalProperties: true } }
        }
      }
    }
  }
};

const output = `${JSON.stringify(spec, null, 2)}\n`;
for (const relative of [
  "openapi.json",
  "openapi.yaml",
  "默认模块.openapi.json",
  "socialecho-skills/openapi.json",
  "socialecho-skills/openapi.yaml"
]) {
  const target = resolve(root, relative);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, output, "utf8");
}
