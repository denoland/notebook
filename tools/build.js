#!/usr/bin/env node

const usage = `
Usage:
  node build.js [clean] [prod] [serve]
Options:
  clean   Clean output directory first.
  prod    Build for production (minified). Default is not to minify.
  serve   Serve at http://localhost:8080/ and watch for changes.
`;

const wdir = "build/website/";

const run = require("./run");
const fs = require("fs");
const http = require("http");
const path = require("path");
const Bundler = require("parcel-bundler");
const url = require("url");

exports.build = build;
exports.buildAndServe = buildAndServe;

if (require.main === module) {
  const options = {};
  let serve = false;

  for (const arg of process.argv.slice(2)) {
    switch (arg) {
      case "clean":
        run.rmrf("build");
        break;
      case "prod":
        options.production = true;
        break;
      case "serve":
        serve = true;
        break;
      default:
        console.error(`Unknown command: '${arg}'${usage}`);
        process.exit(1);
    }
  }

  if (serve) {
    buildAndServe(options);
  } else {
    build(options);
  }
}

function makeBundle(options = {}) {
  run.mkdir("build");
  run.mkdir(wdir);

  if (!options.production) {
    // The symlink to the source repository root is only needed for tests.
    run.symlink(run.root, wdir + "repo");
  }

  options = {
    autoinstall: false,
    cache: true,
    hmr: false,
    logLevel: process.env.CI ? 1 : 3,
    minify: !!options.production,
    outDir: wdir,
    publicUrl: "/",
    sourceMaps: !options.production,
    watch: false,
    ...options
  };

  const entryPoints = ["src/index.html", "src/notebook.html", "src/sandbox.ts"];
  if (!options.production) {
    entryPoints.push("src/test.html");
  }

  return new Bundler(entryPoints, options);
}

function buildAndServe(options = {}) {
  const { port } = { port: 8080, ...options };
  console.log(`Server listening on http://localhost:${port}/`);

  const bundler = makeBundle({ watch: true, ...options });
  const middleware = bundler.middleware();

  const server = http.createServer((req, res) => {
    const u = url.parse(req.url);
    if (u.pathname === "/") {
      // Rewrite requests for / to /index.html.
      u.pathname = "/index.html";
    } else if (path.extname(u.pathname) === "") {
      // Add .html to paths without an extension.
      u.pathname += ".html";
    }
    req.url = url.format(u);
    // Let the parcel built-in webserver handle the rest.
    return middleware(req, res);
  });
  server.listen(port);

  return server;
}

function build(options = {}) {
  makeBundle(options).bundle();
}
