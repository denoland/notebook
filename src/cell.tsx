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

/**
 * This module contains the Cell component, which represents
 * a single input/output pair inside a notebook.
 * Cells can be rendered individually, as is done in the docs,
 * or as part of a whole notebook (see Notebook component).
 */

import { Component, h } from "preact";
import { delay } from "../src/util";
import { CodeMirrorComponent } from "./codemirror";

export const cellExecuteQueue: Cell[] = [];

export async function drainExecuteQueue() {
  while (cellExecuteQueue.length > 0) {
    const cell = cellExecuteQueue.shift();
    await cell.run();
  }
}

export const OUTPUT_ID_PREFIX = "output-";

export interface CellProps {
  onDelete?: () => void;
  onInsertCell?: () => void;
  onRun?: (code: string) => void;
  onChange?: (code: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  focusNext?: () => void;

  id: number | string;
  code: string;
  outputDiv?: Element;
  outputHTML?: string;
}

export interface CellState {
  updating: boolean;
  running: boolean;
}

export class Cell extends Component<CellProps, CellState> {
  cm: CodeMirrorComponent;
  parentDiv: Element;
  outputDiv: Element;
  state = {
    running: false,
    updating: false
  };

  get code(): string {
    if (!this.cm) return this.props.code;
    return this.cm.code;
  }

  clickedRun() {
    if (this.props.onRun) this.props.onRun(this.code);
  }

  clickedDelete() {
    if (this.props.onDelete) this.props.onDelete();
  }

  clickedInsertCell() {
    if (this.props.onInsertCell) this.props.onInsertCell();
  }

  codeChanged(code: string) {
    if (this.props.onChange) this.props.onChange(code);
  }

  onFocus() {
    if (this.props.onFocus) this.props.onFocus();
    // Do nothing when component is not mounted.
    if (!this.parentDiv) return;
    this.parentDiv.classList.add("notebook-cell-focus");
  }

  onBlur() {
    if (this.props.onBlur) this.props.onBlur();
    // Do nothing when component is not mounted.
    if (!this.parentDiv) return;
    this.parentDiv.classList.remove("notebook-cell-focus");
  }

  clearOutput() {
    this.outputDiv.innerHTML = "";
  }

  async run() {
    const focus = this.parentDiv.classList.contains("notebook-cell-focus");
    this.clearOutput();
    this.setState({ running: true });
    if (this.props.onRun) await this.props.onRun(this.code);
    this.setState({ updating: true });
    await delay(100);
    this.setState({
      running: false,
      updating: false
    }, () => {
      if (focus) this.focus();
    });
  }

  onChange(code: string) {
    if (this.props.onChange) this.props.onChange(code);
  }

  async focusNext() {
    if (this.props.focusNext) await this.props.focusNext();
  }

  runCellAndFocusNext() {
    this.run();
    this.focusNext();
  }

  async runCellAndInsertBelow() {
    this.run();
    this.clickedInsertCell();
    await delay(100);
    this.focusNext();
  }

  async focus() {
    await delay(100);
    this.cm.focus();
    // FIXME calling cm.focus does not fire onFocus event.
    // Do nothing when component is not mounted.
    if (!this.parentDiv) return;
    this.parentDiv.classList.add("notebook-cell-focus");
  }

  blur() {
    this.cm.blur();
    // Do nothing when component is not mounted.
    if (!this.parentDiv) return;
    this.parentDiv.classList.remove("notebook-cell-focus");
  }

  constructor(props) {
    super(props);
    if (props.outputDiv) {
      this.outputDiv = props.outputDiv;
    } else {
      this.outputDiv = document.createElement("div");
      this.outputDiv.className = "output";
      this.outputDiv.id = OUTPUT_ID_PREFIX + props.id;
    }
    if (props.outputHTML) {
      this.outputDiv.innerHTML = props.outputHTML;
    }
  }

  componentWillMount() {
    if (this.props.outputHTML !== null) {
      cellExecuteQueue.push(this);
    }
  }

  render() {
    const runButton = (
      <button class="run-button" onClick={ this.clickedRun.bind(this) } />
    );

    let deleteButton = null;
    if (this.props.onDelete) {
      deleteButton = (
        <button
          class="delete-button"
          onClick={ this.clickedDelete.bind(this) } />
      );
    }

    let insertButton = null;
    if (this.props.onInsertCell) {
      insertButton = (
        <button
          class="insert-button"
          onClick={ this.clickedInsertCell.bind(this) } />
      );
    }

    const { id, code } = this.props;
    const { updating, running } = this.state;

    const inputClass = ["input"];
    if (updating) inputClass.push("notebook-cell-updating");
    if (running) inputClass.push("notebook-cell-running");

    return (
      <div
        class="notebook-cell"
        ref={ ref => { this.parentDiv = ref; } }
        id={ `cell-${id}` } >
        <div
          class={ inputClass.join(" ") } >
          <CodeMirrorComponent
            id={ id ? String(id) : undefined }
            ref={ ref => { this.cm = ref; } }
            code={ code }
            onFocus={ this.onFocus.bind(this) }
            onBlur={ this.onBlur.bind(this) }
            onChange={ this.onChange.bind(this) }
            onAltEnter={ this.runCellAndInsertBelow.bind(this) }
            onShiftEnter={ this.runCellAndFocusNext.bind(this) }
            onCtrlEnter={ () => { this.run(); } }
          />
          { deleteButton }
          { runButton }
        </div>
        <div class="progress-bar" />
        <div class="output-container" ref={ (div: any) => {
          if (div) div.prepend(this.outputDiv);
        }}>
          { insertButton }
        </div>
      </div>
    );
  }
}
