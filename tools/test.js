#!/usr/bin/env node
const run = require("./run");

process.on("unhandledRejection", e => {
  throw e;
});

(async () => {
  run.sh("node tools/build.js");
  run.tsnode("tools/test_browser.ts use-render");
})();
