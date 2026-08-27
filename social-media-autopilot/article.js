#!/usr/bin/env node
import { buildRequestOptions, callApi, parseArgs, parseCsvIds, printAndExit } from "./client.js";

const args = parseArgs(process.argv);
const options = buildRequestOptions(args);
const page = args.page ?? 1;
const accountIds = parseCsvIds(args["account-ids"]);

const result = await callApi("/v1/article", {
  page,
  account_ids: accountIds
}, options, { method: "GET", transport: "query" });

printAndExit(result);
