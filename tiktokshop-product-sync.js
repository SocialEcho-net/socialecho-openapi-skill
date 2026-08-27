#!/usr/bin/env node
import { buildRequestOptions, callJsonPost, getOption, parseArgs, printAndExit } from "./client.js";

const args = parseArgs(process.argv);
if (args.execute !== true) throw new Error("Product sync changes live state; add --execute after authorization");
printAndExit(await callJsonPost(
  "/v1/tiktokshop/products/sync",
  { account_id: Number(getOption(args, "account-id")) },
  buildRequestOptions(args)
));
