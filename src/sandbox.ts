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

import * as test_internals from "./test_internals";

import { fetchArrayBuffer } from "./fetch";
import * as matplotlib from "./matplotlib";
import { Transpiler } from "./nb_transpiler";
import { setOutputHandler } from "./output_handler";
import { RPC, WindowRPC } from "./rpc";
import { describe, InspectorData, InspectorOptions } from "./serializer";
import { global, globalEval, URL } from "./util";

async function fetchText(url: string) {
  const ab = await fetchArrayBuffer(url);
  const enc = new TextDecoder();
  return enc.decode(ab);
}

const moduleCache: { [name: string]: any } = Object.create(null);

async function importModule(target: string) {
  // Check whether module is a built-in.
  switch (target) {
    case "matplotlib":
      return matplotlib;
    case "test_internals":
      return test_internals;
  }

  // Normalize the URL, and check that it is fully-qualified, otherwise we might
  // end up serving them the default route (index.html) from the server that
  // hosts the notebook, which produces very confusing syntax errors.
  try {
    target = new URL(target).href;
  } catch (e) {
    throw new TypeError(`Invalid module name: '${target}'`);
  }

  // Check whether module is in cache.
  if (target in moduleCache) {
    return moduleCache[target];
  }

  // Import remote module with AMD.
  const source = await fetchText(target);
  let exports = {};
  global.define = function(dependencies, factory) {
    // TODO handle dependencies.
    const e = factory(exports);
    if (e) {
      exports = e;
    }
  };
  global.define.amd = {};
  try {
    globalEval(source);
    moduleCache[target] = exports;
    return exports;
  } finally {
    delete global.define;
  }
}

type CellId = number | string;
let lastExecutedCellId: CellId = null;

const transpiler = new Transpiler();

const channelId = document
  .querySelector("meta[name=rpc-channel-id]")
  .getAttribute("content");
const rpc: RPC = new WindowRPC(window.parent, channelId);
rpc.start({ runCell });

async function runCell(source: string, cellId: CellId): Promise<void> {
  lastExecutedCellId = cellId;
  try {
    const console = new Console(rpc, cellId);
    const transpiledSource = transpiler.transpile(source, `cell${cellId}`);
    const fn = globalEval(transpiledSource);
    const result = await fn(global, importModule, console);
    if (result !== undefined) {
      console.log(result);
    }
  } catch (e) {
    const message = transpiler.formatException(e);
    rpc.call("print", cellId, message);
    // When running tests, rethrow any errors. This ensures that errors
    // occurring during notebook cell evaluation result in test failure.
    if (window.navigator.webdriver) {
      throw e;
    }
  }
}

function guessCellId(error?: Error): number | string {
  const name = transpiler.getEntryPoint(error);
  if (name != null) {
    const m = name.match(/cell([\da-z]+)/);
    if (m) return m[1];
  }
  return lastExecutedCellId;
}

class Console {
  constructor(private rpc: RPC, private cellId: number | string) {}

  private print(data: InspectorData) {
    this.rpc.call("print", this.cellId, data);
  }

  _inspect(value: any, options?: InspectorOptions) {
    options = { showHidden: true, ...options };
    this.print(describe([value], options));
  }

  log(...args: any[]): void {
    this.print(describe(args));
  }

  warn(...args: any[]): void {
    this.print(describe(args));
  }

  error(...args: any[]): void {
    this.print(describe(args));
  }
}

setOutputHandler({
  plot(data: any): void {
    rpc.call("plot", guessCellId(), data);
  },

  print(data: any): void {
    rpc.call("print", guessCellId(), data);
  },

  downloadProgress(data: any): void {
    rpc.call("downloadProgress", guessCellId(), data);
  }
});

window.addEventListener("error", (ev: ErrorEvent) => {
  let cellId, message;
  if (ev.error != null) {
    cellId = guessCellId(ev.error);
    message = transpiler.formatException(ev.error);
  } else {
    cellId = guessCellId();
    message = ev.message;
  }
  rpc.call("print", cellId, message);
});

// TODO: also handle unhandledrejection. This should work in theory, in Chrome
// at least; however I was unable to trigger this event.
