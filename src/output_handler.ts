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

import type { InspectorData } from "./serializer";

export type InspectorData = InspectorData;
export type PlotData = Array<Array<{ x: number; y: number }>>;

export interface Progress {
  job: string;
  loaded: number | null;
  total: number | null;
}

export interface OutputHandler {
  plot(data: PlotData): void;
  print(text: InspectorData | string): void;
  downloadProgress(progress: Progress);
}

let activeOutputHandler: OutputHandler | null = null;

export function getOutputHandler(): OutputHandler | null {
  return activeOutputHandler;
}

export function setOutputHandler(handler: OutputHandler): void {
  activeOutputHandler = handler;
}
