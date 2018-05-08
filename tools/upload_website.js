#!/usr/bin/env node
const run = require("./run");
const { execSync } = require("child_process");
run.sh("./tools/dev_website.js prod build");
// pip install awscli
execSync(
  "aws s3 sync build/dev_website/ s3://propelml.org " +
    "--follow-symlinks --delete",
  { stdio: "inherit" }
);
