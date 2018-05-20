/*
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
 * NotebookPreview is a cell showing preview of a notebook.
 * It is used in both profile pages and notebook index.
 */

import { Component, h } from "preact";
import * as db from "../db";
import * as types from "../types";
import { Avatar } from "./avatar";
import { docTitle } from "./common";

export interface NotebookPreviewProps {
  notebook: types.NbInfo;
  showTitle: boolean;
  onClick?: () => void;
}

export class NotebookPreview extends Component<NotebookPreviewProps, {}> {
  onClick() {
    if (this.props.onClick) this.props.onClick();
  }

  render() {
    const { notebook: { doc }, showTitle } = this.props;
    const { title } = doc;
    const code = db.getInputCodes(doc).join("\n\n");
    return (
      <a onClick={this.onClick.bind(this)}>
        <li>
          <div class="code-snippit">{code}</div>
          <div class="blurb">
            {!showTitle ? (
              <div class="blurb-avatar">
                <Avatar userInfo={doc.owner} />
              </div>
            ) : null}
            {!showTitle ? (
              <p class="blurb-name">{doc.owner.displayName}</p>
            ) : null}
            {showTitle ? <p class="blurb-title">{docTitle(title)}</p> : null}
          </div>
        </li>
      </a>
    );
  }
}
