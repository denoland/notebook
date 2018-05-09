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
 * This module contains the Notebook component,
 * which contains many Cell components.
 */

import { Component, h } from "preact";
import { Cell, drainExecuteQueue, OUTPUT_ID_PREFIX } from "./cell";
import { docTitle, UserTitle } from "./common";
import * as db from "./db";
import { OutputHandlerDOM } from "./output_handler";
import * as types from "./types";
import { createResolvable, IS_WEB, randomString, Resolvable } from "./util";
import { createRPCHandler, VM } from "./vm";

const newNotebookText = "// New Notebook. Insert code here.";
const DEFAULT_TITLE = IS_WEB && document.title;

export interface NotebookProps {
  save?: (doc: types.NotebookDoc) => void;
  initialDoc?: types.NotebookDoc;
  userInfo?: types.UserInfo; // Info about currently logged in user.
  clone?: () => void;
}

export interface NotebookState {
  // Cells data
  codes: Map<string, string>;
  outputDivs: Map<string, Element>;
  outputHandlers: Map<string, OutputHandlerDOM>;

  order: string[];

  editingTitle: boolean;
  title: string;
}

export class Notebook extends Component<NotebookProps, NotebookState> {
  state = {
    codes: new Map<string, string>(),
    editingTitle: false,
    outputDivs: new Map<string, Element>(),
    outputHandlers: new Map<string, OutputHandlerDOM>(),

    order: [],
    title: ""
  };
  // Save component refs
  cellRefs = new Map<string, Cell>();
  // Save current focused Cell to be used in focusNextCell.
  active: string;
  vm: VM;
  // Check if user opend this notebook for first time.
  newNotebook: boolean;
  isReady: Resolvable<void> = createResolvable();

  componentWillMount() {
    const rpcHandler = createRPCHandler((id: string) =>
      this.state.outputHandlers.get(id)
    );
    this.vm = new VM(rpcHandler);
  }

  componentWillUnmount() {
    document.title = DEFAULT_TITLE;
    this.vm.destroy();
  }

  clearOutput(cellId: string) {
    this.cellRefs.get(cellId).clearOutput();
  }

  async componentDidMount() {
    const { title } = this.props.initialDoc;
    document.title = `${DEFAULT_TITLE} | ${title}`;
    this.setState({ title });
    const cells = this.props.initialDoc.cells;
    if (cells.length === 0) {
      this.newNotebook = true;
      cells.push(newNotebookText);
    }
    for (let i = 0; i < cells.length; ++i) {
      await this.insertCell(i, cells[i]);
    }
    await drainExecuteQueue();
    this.isReady.resolve();
  }

  /**
   * insertCell returns a promise that resolves to the newly inserted cell id.
   */
  async insertCell(position: number, code = ""): Promise<string> {
    const promise = createResolvable();
    const id = randomString();
    this.setState(state => {
      const outputDiv = document.createElement("div");
      outputDiv.className = "output";
      outputDiv.id = OUTPUT_ID_PREFIX + id;

      // Insert data.
      state.codes.set(id, code);
      state.outputDivs.set(id, outputDiv);
      state.outputHandlers.set(id, new OutputHandlerDOM(outputDiv));

      state.order.splice(position, 0, id);
      promise.resolve();
      return state;
    });
    await promise;
    return id;
  }

  onInsertCellClicked(cellId: string) {
    const pos = this.state.order.indexOf(cellId);
    this.insertCell(pos + 1);
  }

  onDeleteClicked(cellId: string) {
    this.setState((state: NotebookState) => {
      this.cellRefs.delete(cellId);
      state.codes.delete(cellId);
      state.outputDivs.delete(cellId);
      state.outputHandlers.delete(cellId);
      const pos = this.state.order.indexOf(cellId);
      state.order.splice(pos, 1);
      return state;
    });
  }

  onChange(cellId: string, newCode: string) {
    // Note: No need to call render() here.
    this.state.codes.set(cellId, newCode);
  }

  async onRun(cellId: string) {
    this.save();
    await this.vm.exec(this.state.codes.get(cellId), cellId);
  }

  onFocus(cellId: string) {
    this.active = cellId;
  }

  onBlur(cellId: string) {
    if (this.active === cellId) this.active = null;
  }

  async focusNext(cellId: string) {
    const index = this.state.order.indexOf(cellId) + 1;
    if (!this.state.order[index]) return;
    await this.goTo(this.state.order[index]);
  }

  async goTo(cellId: string) {
    if (this.active === cellId) return;
    const cell = this.cellRefs.get(cellId);
    if (!cell) return;
    if (this.active) {
      const prevCell = this.cellRefs.get(this.active);
      if (prevCell) prevCell.blur();
    }
    await cell.focus();
    this.active = cellId;
  }

  onClone() {
    if (this.props.clone) this.props.clone();
  }

  save() {
    if (!this.props.save) return;
    const cells = [];
    for (const key of this.state.order) {
      cells.push(this.state.codes.get(key));
    }
    if (this.newNotebook) {
      if (cells[0].startsWith(newNotebookText)) {
        cells[0] = cells[0].slice(newNotebookText.length);
      }
    }
    const doc = {
      ...this.props.initialDoc,
      cells,
      title: this.state.title,
      updated: new Date()
    };
    this.props.save(doc);
  }

  handleTitleChange(event) {
    this.setState({ title: event.currentTarget.value });
  }

  renderCells() {
    const { order, codes, outputDivs } = this.state;
    return order.map(id => {
      const code = codes.get(id);
      const outputDiv = outputDivs.get(id);
      return (
        <Cell
          ref={ref => {
            this.cellRefs.set(id, ref);
          }}
          key={id}
          id={id}
          code={code}
          outputDiv={outputDiv}
          onDelete={this.onDeleteClicked.bind(this, id)}
          onInsertCell={this.onInsertCellClicked.bind(this, id)}
          onRun={this.onRun.bind(this, id)}
          onFocus={this.onFocus.bind(this, id)}
          onBlur={this.onBlur.bind(this, id)}
          focusNext={this.focusNext.bind(this, id)}
          onChange={this.onChange.bind(this, id)}
        />
      );
    });
  }

  render() {
    const { title, editingTitle } = this.state;
    const { initialDoc, userInfo } = this.props;
    const titleEdit = (
      <div class="title">
        <input
          class="title-input"
          onChange={this.handleTitleChange.bind(this)}
          value={title}
        />
        <button
          class="save-title green-button"
          onClick={() => {
            this.setState({ editingTitle: false });
            document.title = `${DEFAULT_TITLE} | ${title}`;
            this.save();
          }}
        >
          Save
        </button>
        <button
          class="cancel-edit-title"
          onClick={() => this.setState({ editingTitle: false })}
        >
          Cancel
        </button>
      </div>
    );

    const editButton = (
      <button
        class="edit-title"
        onClick={() => this.setState({ editingTitle: true })}
      >
        Edit
      </button>
    );

    const titleDisplay = (
      <div class="title">
        <h2 class={title && title.length ? "" : "untitled"} value={title}>
          {docTitle(title)}
        </h2>
        {db.ownsDoc(userInfo, initialDoc) ? editButton : null}
      </div>
    );

    const cloneButton =
      this.props.userInfo == null ? (
        ""
      ) : (
        <button class="green-button" onClick={() => this.onClone()}>
          Clone
        </button>
      );

    return (
      <div class="notebook-container">
        <UserTitle userInfo={initialDoc.owner} />
        <div class="notebook-header">
          {editingTitle ? titleEdit : titleDisplay}
          {cloneButton}
        </div>
        {this.renderCells()}
      </div>
    );
  }
}
