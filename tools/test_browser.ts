/*!
   Copyright 2018 Propel http://propel.site/.  All rights reserved.
   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
 */
import * as puppeteer from "puppeteer";
import { format } from "util";
import "../src/util"; // Makes node crash on unhandled promise rejection.
import { exitOnFail } from "./tester";

// For some reason ts-node blows up if any typescript files are imported
// after importing a .javascript file, so we do this last.
import { buildAndServe } from "./build.js";

let serveFlag = false;
const i = process.argv.indexOf("serve");
if (i >= 0) {
  serveFlag = true;
  process.argv.splice(i, 1); // delete flag;
}

// Allow people to filter the tests from the command-line.
// Example: ts-node ./tools/test_browser.ts concat
const filterExpr: string | null =
  process.argv.length > 2 ? process.argv[2] : null;

// The PP_TEST_DEBUG environment variable can be used to run the tests in
// debug mode. When debug mode is enabled...
//   - the browser runs in interactive (not headless) mode.
//   - tabs stay open after running the tests.
//   - the built-in webserver remains online after running the tests.
// Hit 'enter' in the terminal to stop the webserver and exit the browser.
const debug = !!process.env.PP_TEST_DEBUG;

// Run headless only if CI env var is set.
const headless = process.env.CI != null;

interface Test {
  path: string;
  doneMsg: RegExp;
  timeout: number;
}

// This special webpage runs the tests in the browser.
// If a filter is supplied, it is the only page loaded.
const propelTests: Test = {
  path: "test.html",
  doneMsg: /DONE/,
  timeout: 2 * 60 * 1000
};

const TESTS: Test[] = [
  // This page loads and runs all the webpack'ed unit tests.
  // The test harness logs "DONE bla bla" to the console when done.
  // If this message doesn't appear, or an unhandled error is thrown on the
  // page, the test fails.
  propelTests
];

(async () => {
  let passed = 0,
    failed = 0;

  let port, server;
  if (serveFlag) {
    server = buildAndServe({ port: 0, watch: false });
    port = server.address().port;
  } else {
    port = 8080;
  }

  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    headless
  });

  for (let i = 0; i < TESTS.length; i++) {
    const test = TESTS[i];
    if (await runTest(browser, port, test)) {
      passed++;
    } else {
      failed++;
      if (exitOnFail) break;
    }
  }

  if (debug) {
    await new Promise(res => process.stdin.once("data", res));
  }

  await browser.close();

  console.log(`DONE. passed: ${passed}, failed: ${failed}`);
  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
})();

function prefix(s: string, prefix: string): string {
  return prefix + s.replace(/\n/g, "\n" + prefix);
}

// `doneMsg` may be a string or a regex. If it is specified, the web page
// must have a matching message logged to the console, otherwise the test
// is considered to have failed. If doneMsg is set to null, the test
// will be considered to have passed if no errors are thrown before the
// time-out expires.
async function runTest(browser, port, { path, doneMsg, timeout }: Test) {
  let pass, fail;
  const promise = new Promise((res, rej) => {
    pass = res;
    fail = rej;
  });
  let timer = null;

  let url = `http://localhost:${port}/${path}`;
  if (filterExpr) {
    url += "&filter=" + filterExpr;
  }
  console.log("TEST", url);

  const page = await browser.newPage();
  page.on("load", onLoad);
  page.on("console", onMessage);
  page.on("response", onResponse);
  page.on("pageerror", onError);
  page.goto(url, { timeout: 0 });

  try {
    await promise;
    console.log(`PASS: ${url}\n`);
    return true;
  } catch (err) {
    console.log(err.message); // Stack trace is useless here.
    console.log(`FAIL: ${url}\n`);
    return false;
  } finally {
    if (!debug) await page.close();
    cancelTimer();
  }

  function onLoad() {
    restartTimer();
  }

  function onError(browserError) {
    const err = new Error(prefix(browserError.message, "> "));
    fail(err);
  }

  function onResponse(res) {
    // Puppeteer sets res.ok if the HTTP status is in the 2xx range.
    // Additionally we want to treat status 304 ("Not Modified") as a success.
    if (!(res.ok || res.status === 304)) {
      fail(new Error(`HTTP ${res.status}: ${res.url}`));
    }
  }

  function onTimeOut() {
    fail(new Error(`Timeout (${timeout}ms)`));
  }

  function onMessage(msg) {
    const values = msg.args.map(v =>
      v._remoteObject.value !== undefined
        ? v._remoteObject.value
        : `[[${v._remoteObject.type}]]`
    );
    const text = format.apply(null, values);

    console.log(prefix(text, "> "));

    if (text.match(/FAIL/g)) {
      fail(doneMsg);
    } else if (text.match(doneMsg)) {
      pass();
    } else {
      restartTimer();
    }
  }

  function restartTimer() {
    cancelTimer();
    timer = setTimeout(onTimeOut, timeout);
  }

  function cancelTimer() {
    if (timer != null) {
      clearTimeout(timer);
      timer = null;
    }
  }
}
