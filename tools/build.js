#!/usr/bin/env node
const run = require("./run");
const { devWebsiteServer } = require("./dev_website");

if (process.argv.indexOf("clean") >= 0) {
  run.rmrf("./build");
}

devWebsiteServer(true);
