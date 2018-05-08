#!/usr/bin/env node
const run = require("./run");

process.on("unhandledRejection", e => {
  throw e;
});

(async () => {
  run.sh("node tools/build.js");

  // Web browser tests
  run.tsnode("tools/test_browser.ts use-render");

  run.tsnode("tools/jasmine_shim_test.ts");
})();
