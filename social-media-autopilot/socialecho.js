#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import {
  buildRequestOptions,
  callApi,
  getIntegerOption,
  getOption,
  parseArgs,
  parseCsvIds,
  printAndExit
} from "./client.js";

const aliases = new Map([
  ["account", "accounts"],
  ["article", "articles"],
  ["music-genres", "tiktokshop-music-genres"],
  ["music-trending", "tiktokshop-music-trending"],
  ["products", "tiktokshop-products"],
  ["product-sync", "tiktokshop-product-sync"],
  ["publish", "publish-article"]
]);

function usage() {
  return `Usage: node socialecho.js <command> --api-key <key> [options]

Commands:
  team                         Get current team
  accounts                     List authorized or competitor accounts
  oauth-links                  Get platform authorization links
  articles                     List articles
  report                       Query report data
  upload-url                   Create an OSS upload URL
  reddit-communities           List Reddit communities
  pinterest-boards             List Pinterest boards
  tiktokshop-products          List TikTok Shop products
  tiktokshop-product-sync      Queue product sync (requires --execute)
  tiktokshop-music-genres      List TikTok Shop music genres
  tiktokshop-music-trending    Query TikTok Shop trending music
  publish-article              Submit a publish payload (requires --execute)

Global options:
  --base-url <url>             Default: https://api.socialecho.net
  --lang <zh_CN|en>            Default: zh_CN
  --team-id <id>               Optional legacy team context header
  --timeout-ms <ms>            Default: 30000
  --max-attempts <count>       Default: 3`;
}

function requireExecute(args, command) {
  if (args.execute !== true) {
    throw new Error(`${command} changes live state; rerun with --execute after explicit user authorization`);
  }
}

const selectedMusicFields = [
  "url",
  "uuid",
  "cover",
  "title",
  "artist",
  "duration",
  "selection",
  "music_volume",
  "original_sound_volume"
];

function validateSelectedMusic(payload) {
  const music = payload?.extra?.music;
  if (music === undefined || music === null) return payload;
  if (typeof music !== "object" || Array.isArray(music)) {
    throw new Error("extra.music must be an object");
  }

  const selection = music.selection;
  if (selection === "none") return payload;
  if (!new Set(["trending_clip", "full_track"]).has(selection)) {
    throw new Error("extra.music.selection must be none, trending_clip, or full_track");
  }

  const missing = selectedMusicFields.filter((field) => {
    const value = music[field];
    return value === undefined || value === null || (typeof value === "string" && value.trim() === "");
  });
  if (missing.length > 0) {
    throw new Error(`Selected extra.music must include all fields; missing: ${missing.join(", ")}`);
  }

  for (const field of ["music_volume", "original_sound_volume"]) {
    if (!Number.isInteger(music[field]) || music[field] < 0 || music[field] > 100) {
      throw new Error(`extra.music.${field} must be an integer between 0 and 100`);
    }
  }
  if (!Number.isFinite(music.duration) || music.duration < 0) {
    throw new Error("extra.music.duration must be a non-negative number");
  }

  return payload;
}

async function readPublishPayload(args) {
  const payloadFile = args["payload-file"];
  const payloadJson = args["payload-json"];
  if ((payloadFile && payloadJson) || (!payloadFile && !payloadJson)) {
    throw new Error("Provide exactly one of --payload-file or --payload-json");
  }
  const payload = JSON.parse(payloadFile ? await readFile(payloadFile, "utf8") : payloadJson);
  return validateSelectedMusic(payload);
}

async function buildCommand(command, args) {
  switch (command) {
    case "team":
      return ["/v1/team", {}, { method: "GET", transport: "query" }];
    case "accounts":
      return [
        "/v1/account",
        { page: getIntegerOption(args, "page", false, 1), type: getIntegerOption(args, "type", false, 1) },
        { method: "GET", transport: "query" }
      ];
    case "oauth-links":
      return ["/v1/oauth/links", {}, { method: "GET", transport: "none" }];
    case "articles":
      return [
        "/v1/article",
        { page: getIntegerOption(args, "page", false, 1), account_ids: parseCsvIds(args["account-ids"]) },
        { method: "GET", transport: "query" }
      ];
    case "report":
      return [
        "/v1/report",
        {
          start_date: getOption(args, "start-date"),
          end_date: getOption(args, "end-date"),
          time_type: getIntegerOption(args, "time-type", false, 1),
          group: args.group,
          account_ids: parseCsvIds(args["account-ids"])
        },
        { method: "GET", transport: "query" }
      ];
    case "upload-url":
      return [
        "/v1/upload/url",
        { content_type: getOption(args, "content-type"), title: args.title },
        { method: "GET", transport: "query" }
      ];
    case "reddit-communities":
      return [
        "/v1/reddit/communities",
        { account_id: getIntegerOption(args, "account-id") },
        { method: "GET", transport: "query" }
      ];
    case "pinterest-boards":
      return [
        "/v1/pinterest/boards",
        { account_id: getIntegerOption(args, "account-id") },
        { method: "GET", transport: "query" }
      ];
    case "tiktokshop-products":
      return [
        "/v1/tiktokshop/products",
        {
          account_id: getIntegerOption(args, "account-id"),
          page: getIntegerOption(args, "page", false, 1),
          per_page: getIntegerOption(args, "per-page", false, 20),
          keyword: args.keyword
        },
        { method: "GET", transport: "query" }
      ];
    case "tiktokshop-product-sync":
      requireExecute(args, command);
      return [
        "/v1/tiktokshop/products/sync",
        { account_id: getIntegerOption(args, "account-id") },
        { method: "POST", transport: "body" }
      ];
    case "tiktokshop-music-genres":
      return ["/v1/tiktokshop/music/genres", {}, { method: "GET", transport: "query" }];
    case "tiktokshop-music-trending":
      return [
        "/v1/tiktokshop/music/trending",
        {
          account_id: getIntegerOption(args, "account-id"),
          country_code: args["country-code"],
          genre: args.genre,
          date_range: args["date-range"]
        },
        { method: "GET", transport: "query" }
      ];
    case "publish-article":
      requireExecute(args, command);
      return ["/v1/publish/article", await readPublishPayload(args), { method: "POST", transport: "body" }];
    default:
      throw new Error(`Unknown command: ${command || "(missing)"}\n\n${usage()}`);
  }
}

try {
  const rawCommand = process.argv[2];
  if (!rawCommand || rawCommand === "--help" || rawCommand === "-h") {
    console.log(usage());
  } else {
    const args = parseArgs(process.argv);
    const command = aliases.get(rawCommand) ?? rawCommand;
    const options = buildRequestOptions(args);
    const [path, params, requestConfig] = await buildCommand(command, args);
    printAndExit(await callApi(path, params, options, requestConfig));
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 2;
}
