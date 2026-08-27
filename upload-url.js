#!/usr/bin/env node
import { buildRequestOptions, callJsonGet, getOption, parseArgs, printAndExit } from "./client.js";

const allowed = new Set([
  "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/bmp",
  "video/mp4", "video/avi", "video/mov", "video/wmv", "video/flv", "video/webm",
  "video/mkv", "video/3gp", "video/quicktime"
]);
const args = parseArgs(process.argv);
const contentType = getOption(args, "content-type");
if (!allowed.has(contentType)) throw new Error(`Unsupported content type: ${contentType}`);
printAndExit(await callJsonGet(
  "/v1/upload/url",
  { content_type: contentType, title: args.title },
  buildRequestOptions(args)
));
