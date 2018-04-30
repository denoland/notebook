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

import { escape } from "he";
import { RPC, WindowRPC } from "./rpc";
import { randomString } from "../src/util";
import { OutputHandlerDOM } from "../src/output_handler";

function createIframe(rpcChannelId): HTMLIFrameElement {
  const base = new URL("/sandbox", window.document.baseURI).href;
  const html = `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8"/>
        <meta name="rpc-channel-id" content="${escape(rpcChannelId)}"/>
        <base href="${escape(base)}">
        <script async type="text/javascript" src="/sandbox.js">
        </script>
      </head>
      <body>
      </body>
    </html>`;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("sandbox", "allow-scripts");
  iframe.setAttribute("srcdoc", `${html}`);
  // Edge doesn't support "srcdoc", it'll use a data url instead.
  iframe.setAttribute("src", `data:text/html,${html}`);
  iframe.style.display = "none";
  document.body.appendChild(iframe);

  return iframe;
}

export type CellId = number | string;

export class VM {
  private Iframe: HTMLIFrameElement;
  private RPC: RPC;
  readonly id: string;

  constructor(private rpcHandler) {
    this.id = randomString();
  }

  init() {
    if (this.RPC) return;
    this.Iframe = createIframe(this.id);
    this.RPC = new WindowRPC(this.Iframe.contentWindow, this.id);
    this.RPC.start(this.rpcHandler);
  }

  async exec(code: string, id: CellId) {
    this.init();
    await this.RPC.call("runCell", code, id);
  }

  destroy() {
    if (!this.RPC) return;
    this.RPC.stop();
    if (this.Iframe.parentNode) {
      this.Iframe.parentNode.removeChild(this.Iframe);
    }
    this.RPC = null;
    this.Iframe = null;
  }
}

export type LookupCell = (c: CellId) => OutputHandlerDOM;
export function createRPCHandler(handler: OutputHandlerDOM | LookupCell) {
  let lookupCell: LookupCell = handler as LookupCell;
  if (lookupCell instanceof OutputHandlerDOM) {
    lookupCell = (c: string) => handler as OutputHandlerDOM;
  }
  return {
    plot(cellId: CellId, data: any): void {
      const cell = lookupCell(cellId);
      if (!cell) return;
      cell.plot(data);
    },

    print(cellId: CellId, data: any): void {
      const cell = lookupCell(cellId);
      if (!cell) return;
      cell.print(data);
    },

    imshow(cellId: CellId, data: any): void {
      const cell = lookupCell(cellId);
      if (!cell) return;
      cell.imshow(data);
    },

    downloadProgress(cellId: CellId, data: any): void {
      const cell = lookupCell(cellId);
      if (!cell) return;
      cell.downloadProgress(data);
    }
  };
}
