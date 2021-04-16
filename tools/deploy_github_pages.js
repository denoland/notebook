#!/usr/bin/env node

const GH_TOKEN = process.env.GH_TOKEN;
if (!GH_TOKEN) {
  softfail("no github token");
}

// Configuration options.

const SOURCE_REMOTE = "origin";
const SOURCE_BRANCH = "master";
const DEPLOY_REMOTE = `https://${GH_TOKEN}@github.com/propelml/propelml.github.io`;
const DEPLOY_BRANCH = "master";

const COMMIT_NAME = "Propel deploy bot";
const COMMIT_EMAIL = "info@propelml.org";
const COMMIT_MESSAGE = "Auto-build website";

const BUILD_COMMAND = "node tools/build.js clean prod";
const BUILD_DIR = "build/website";

// End of configuraton options.

const exec = require("child_process").execSync;
const resolve = require("path").resolve;

const inherit = { stdio: "inherit" };
const utf8 = { encoding: "utf8" };

let stdout;

// Chdir to project root dir.
const projectRootDir = resolve(__dirname, "..");
process.chdir(projectRootDir);

// Check that working directory is clean.
stdout = exec("git status --porcelain -uno", utf8);
if (stdout.match(/\S/)) {
  fail("git index or working directory not clean");
}

// Fetch source and deploy branches from remote.
exec(`git fetch "${SOURCE_REMOTE}" +"${SOURCE_BRANCH}":SOURCE_HEAD`, inherit);
exec(`git fetch "${DEPLOY_REMOTE}" +"${DEPLOY_BRANCH}":DEPLOY_HEAD`, inherit);

// Get SHA of currently checked-out commit.
stdout = exec("git rev-parse --verify HEAD", utf8);
const headCommit = getSHA(stdout);

// Get SHA of last source branch commit.
stdout = exec("git rev-parse --verify SOURCE_HEAD", utf8);
const sourceCommit = getSHA(stdout);

// Get SHA of the most recent commit on the deploy branch.
stdout = exec(`git rev-parse --verify DEPLOY_HEAD`, utf8);
const lastDeployCommit = getSHA(stdout);

// Determine the committer date from the source commit.
// It will be used as the author/committer date for the deploy commit.
stdout = exec(`git log -n1 --pretty="%ct" ${sourceCommit}`, utf8);
const sourceDate = /^\s*(\d+)\s*$/.exec(stdout)[1];

// Get the tree hash from the last commit on the deploy branch.
// It will be used to check whether the build output actually changed.
stdout = exec(`git log -n1 --pretty="%T" ${sourceCommit}`, utf8);
const lastDeployTree = getSHA(stdout);

// Verify that the most recent source commit is checked out.
if (headCommit !== sourceCommit) {
  softfail(`not on branch ${SOURCE_BRANCH}, or branch not up-to-date`);
}

// Verify that:
//   * The last deploy commit is a merge.
//   * The last deploy commit was generated from one of our ancestors.
stdout = exec(
  `git log --pretty="%H" --no-merges ${sourceCommit}..${lastDeployCommit}`,
  utf8
);
const deployRevs = stdout.split("\n").filter(s => s !== "");
if (deployRevs.length > 1) {
  fail("source branch and deploy branch have diverged");
}

// Verify that the source branch contains new commits that haven't been
// deployed yet.
stdout = exec(
  `git log --pretty="%H" ${lastDeployCommit}..${sourceCommit}`,
  utf8
);
const sourceRevs = stdout.split("\n").filter(s => s !== "");
if (sourceRevs.length === 0) {
  softfail("no new, not-yet-deployed commits on the source branch");
}

// Run the build.
exec(BUILD_COMMAND, inherit);

// Add built output to index.
exec(`git add -f "${BUILD_DIR}"`);

// Generate a tree SHA for the build directory.
stdout = exec(`git write-tree --prefix="${BUILD_DIR}"`, utf8);
const deployTree = getSHA(stdout);

// Remove build output from the index.
exec("git reset");

// Stop if build output didn't change.
if (deployTree === lastDeployTree) {
  softfail("build output unchanged, not deploying");
}

// Create deploy commit.
const env = {
  GIT_AUTHOR_NAME: COMMIT_NAME,
  GIT_AUTHOR_EMAIL: COMMIT_EMAIL,
  GIT_AUTHOR_DATE: sourceDate,
  GIT_COMMITTER_NAME: COMMIT_NAME,
  GIT_COMMITTER_EMAIL: COMMIT_EMAIL,
  GIT_COMMITTER_DATE: sourceDate
};
stdout = exec(
  `git commit-tree ` +
    `${deployTree} ` +
    `-p ${lastDeployCommit} ` +
    `-p ${sourceCommit} ` +
    `-m "${COMMIT_MESSAGE}"`,
  { ...utf8, env: { ...process.env, ...env } }
);
const deployCommit = getSHA(stdout);

// Show diff.
exec(`git diff --stat ${lastDeployCommit}..${deployCommit}`, inherit);

// Push to remote.
exec(`git push "${DEPLOY_REMOTE}" ${deployCommit}:"${DEPLOY_BRANCH}"`, inherit);

function getSHA(stdout) {
  return stdout.match(/^\s*([0-9a-fA-F]{40})\s*$/)[1];
}

function softfail(message) {
  console.error("Notice: " + message);
  process.exit(0);
}

function fail(message) {
  console.error("Error: " + message);
  process.exit(1);
}
