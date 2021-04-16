#!/usr/bin/env node
const run = require("./run");
const { execSync } = require("child_process");
run.sh("./tools/build.js clean prod");
// pip install awscli
execSync("aws s3 sync build/website/ s3://propelml.org " + " --delete", {
  stdio: "inherit"
});
