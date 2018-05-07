#!/usr/bin/env node
/*
   Pre-generates static html.

     ./tools/dev_website.js prod 

   prod flag: minimized output

     ./tools/dev_website.js gendoc 

   gendoc flag: rebuild docs.json

     ./tools/dev_website.js build prod

   build production website and exit.
*/
const run = require("./run");
const fs = require("fs");
const Bundler = require("parcel-bundler");
require("ts-node").register({ typeCheck: true });

const prodFlag = process.argv.indexOf("prod") >= 0;
exports.prodFlag = prodFlag;

let wdir = "build/dev_website/";
exports.wdir = wdir;

async function bundler(build) {
  run.mkdir("build");
  run.mkdir(wdir);
  run.mkdir(wdir + "src"); // Needed for npy_test
  run.symlink(run.root + "/src/", wdir + "static");
  run.symlink(run.root + "/src/img", wdir + "img");
  run.symlink(run.root + "/deps/data/", wdir + "data");
  // Needed for npy_test
  run.symlink(run.root + "/src/testdata/", wdir + "src/testdata");

  const opts = {
    autoinstall: false,
    cache: true,
    hmr: false,
    logLevel: process.env.CI ? 1 : 3,
    minify: prodFlag,
    outDir: wdir,
    production: prodFlag,
    publicUrl: "/",
    watch: !build
  };

  let b = new Bundler("src/sandbox.ts", opts);
  await b.bundle();

  b = new Bundler("tools/test_website.ts", opts);
  await b.bundle();

  const indexBunder = new Bundler("src/index.html", opts);
  return indexBunder;
}

const port = 8080;
async function devWebsiteServer(build = false) {
  const b = await bundler(build);
  if (build) await b.bundle();
  return await b.serve(port);
}
exports.devWebsiteServer = devWebsiteServer;

if (require.main === module) {
  devWebsiteServer(false);
  console.log(`Propel http://localhost:${port}/`);
}
