#!/usr/bin/env node
const run = require("./run");
const { execSync } = require("child_process");
run.sh("./tools/website.js prod build");
// pip install awscli
execSync(
  "aws s3 sync build/website/ s3://propelml.org " +
    "--follow-symlinks --delete",
  { stdio: "inherit" }
);
