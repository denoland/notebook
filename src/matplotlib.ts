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

import { getOutputHandler, PlotData } from "./output_handler";
import { isTensor } from "./util";

export function plot(...args) {
  if (!getOutputHandler()) {
    console.warn("plot: no output handler");
    return;
  }

  const xs = [];
  const ys = [];
  let state = "x";
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (state) {
      case "x":
        xs.push(arg);
        state = "y";
        break;

      case "y":
        ys.push(arg);
        state = "x";
        break;
    }
  }

  const nSeries = Math.min(xs.length, ys.length);
  const data: PlotData = [];
  for (let i = 0; i < nSeries; ++i) {
    // TODO line = $.stack([xs[i], ys[i]], 1)
    const xv = isTensor(xs[i]) ? xs[i].dataSync() : xs[i];
    const yv = isTensor(ys[i]) ? ys[i].dataSync() : ys[i];
    const nPoints = Math.min(xv.length, yv.length);
    const line = [];
    for (let j = 0; j < nPoints; ++j) {
      line.push({ x: xv[j], y: yv[j] });
    }
    data.push(line);
  }

  getOutputHandler().plot(data);
}

export function linspace(start: number, stop: number, num: number): number[] {
  const d = (stop - start) / (num - 1);
  const values = new Array(num);
  for (let i = 0; i <= num - 1; ++i) {
    values[i] = start + i * d;
  }
  return values;
}
