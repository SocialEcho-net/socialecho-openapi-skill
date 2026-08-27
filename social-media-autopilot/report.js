#!/usr/bin/env node
import { buildRequestOptions, callApi, parseArgs, parseCsvIds, printAndExit } from "./client.js";

const args = parseArgs(process.argv);
const options = buildRequestOptions(args);

if (!args["start-date"] || !args["end-date"]) {
  console.error("Usage: ./report.js --api-key <key> --start-date YYYY-MM-DD --end-date YYYY-MM-DD [--base-url https://api.socialecho.net] [--team-id 123] [--lang zh_CN] [--time-type 1] [--group day] [--account-ids 1,2]");
  process.exit(2);
}

const result = await callApi("/v1/report", {
  start_date: args["start-date"],
  end_date: args["end-date"],
  time_type: args["time-type"] ?? 1,
  group: args.group ?? "",
  account_ids: parseCsvIds(args["account-ids"])
}, options, { method: "GET", transport: "query" });

printAndExit(result);
