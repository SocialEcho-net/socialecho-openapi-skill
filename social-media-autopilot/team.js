#!/usr/bin/env node
import { buildRequestOptions, callApi, parseArgs, printAndExit } from "./client.js";

const args = parseArgs(process.argv);
const options = buildRequestOptions(args);
const result = await callApi("/v1/team", {}, options);
printAndExit(result);
