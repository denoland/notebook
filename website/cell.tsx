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

import { h, Component } from "preact";
import { CodeMirrorComponent } from "./codemirror";
import { VM, createRPCHandler } from "./vm";
import { delay } from "../src/util";
import { OutputHandlerDOM } from "../src/output_handler";

const cellExecuteQueue: Cell[] = [];

export async function drainExecuteQueue() {
  while (cellExecuteQueue.length > 0) {
    const cell = cellExecuteQueue.shift();
    await cell.run();
  }
}

export interface CellProps {
  onDelete?: () => void;
  onInsertCell?: () => void;
  onRun?: () => void;
  onChange?: (code: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  id?: number | string;
  focusNext?: () => void;

  focused?: boolean;
  status?: null | "running" | "updating";

  code: string;
  outputDiv: Element;
  autoRun?: boolean;
}

export class Cell extends Component<CellProps, {}> {
  cm: CodeMirrorComponent;
  autoRun: boolean = true;

  clickedRun() {
    if (this.props.onRun) this.props.onRun();
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
  }

  onBlur() {
    if (this.props.onBlur) this.props.onBlur();
  }

  async run() {
    if (this.props.onRun) await this.props.onRun();
  }

  onChange(code: string) {
    if (this.props.onChange) this.props.onChange(code);
  }

  focusNext() {
    if (this.props.focusNext) this.props.focusNext();
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
  }

  blur() {
    this.cm.blur();
  }

  constructor(props) {
    super();
    if (props.autoRun !== undefined) {
      this.autoRun = props.autoRun;
    }
  }

  componentWillMount() {
    if (this.autoRun) {
      cellExecuteQueue.push(this);
    }
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.focused !== this.props.focused) {
      if (nextProps.focused) this.focus();
      else this.blur();
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

    const { id, outputDiv, code, status, focused} = this.props;
    const inputClass = [ "input" ];
    if (status) {
      inputClass.push("notebook-cell-" + status);
    }

    return (
      <div
        class={ "notebook-cell " + (focused ? "notebook-cell-focus" : "")}
        id={ `cell-${id}` } >
        <div
          class={ inputClass.join(" ") } >
          <CodeMirrorComponent
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
        <div class="output-container" ref={ div => {
          if (div) div.prepend(outputDiv);
        }}>
          { insertButton }
        </div>
      </div>
    );
  }
}

// All codes below are for doc's cell.
interface SCellProps {
  code: string;
  id: string | number;
  outputHTML?: string;
  vm?: VM;
  autoRun?: boolean;
}

interface SCellState {
  code: string;
  focused: boolean;
  status: null | "running" | "updating";
}

export class StandaloneCell extends Component<SCellProps, SCellState> {
  readonly id: number;
  outputDiv: Element;
  outputHTML?: string;
  outputHandler: OutputHandlerDOM;
  vm: VM;
  destroyVM: boolean;

  constructor(props) {
    super(props);
    this.id = props.id;
    this.outputHTML = props.outputHTML;
    this.state = {
      code: props.code,
      focused: false,
      status: null
    };
    if (this.props.vm) this.vm = this.props.vm;
  }

  componentWillUnMount() {
    if (this.destroyVM) {
      this.vm.destroy();
      this.vm = null;
    }
  }

  handleCodeChange(newCode: string) {
    this.setState({ code: newCode });
  }

  toggleFocus(focused: boolean) {
    this.setState({ focused });
  }

  clearOutput() {
    this.outputDiv.innerHTML = "";
  }

  async run() {
    // TODO move all these works to Cell class
    this.clearOutput();
    this.setState({ status: "running" });
    // TODO(@qti3e) I think it's better to wrap code in a function.
    // to prevent possible bugs with having duplicate var names in
    // docs.
    await this.vm.exec(this.state.code, this.id);
    this.setState({ status: "updating" });
    await delay(100);
    this.setState({ status: null });
  }

  initOutputDiv() {
    if (this.outputDiv) return;
    // TODO DRY; Maybe move outputHandler logic to Cell class?
    this.outputDiv = document.createElement("div");
    this.outputDiv.className = "output";
    this.outputDiv.id = "output" + this.id;
    this.outputHandler = new OutputHandlerDOM(this.outputDiv);
    if (!this.vm) {
      const rpcHandler = createRPCHandler(this.outputHandler);
      this.vm = new VM(rpcHandler);
      this.destroyVM = true;
    }
    if (this.outputHTML) {
      this.outputDiv.innerHTML = this.outputHTML;
    }
  }

  render() {
    this.initOutputDiv();

    return (
      <Cell
        id={ this.id }
        code={ this.state.code }
        onChange={ this.handleCodeChange.bind(this) }
        outputDiv={ this.outputDiv }
        onFocus={ () => this.toggleFocus(true) }
        onBlur={ () => this.toggleFocus(false) }
        focused={ this.state.focused }
        onRun={ this.run.bind(this) }
        status={ this.state.status }
        autoRun={ this.props.autoRun }
      />
    );
  }
}
