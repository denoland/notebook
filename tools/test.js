#!/usr/bin/env node
const run = require("./run");

// `test_browser serve` automatically builds.
run.tsnode("tools/test_browser.ts serve");
