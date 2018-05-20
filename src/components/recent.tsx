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

import { Component, h } from "preact";
import * as types from "../types";
import { NotebookList } from "./list";
import { NewNotebookButton } from "./new_notebook_button";
import { profileLink } from "./user_title";

export interface RecentProps {
  notebooks: types.NbInfo[];
  userInfo?: types.UserInfo;
  onNewNotebook?: () => void;
  onOpenNotebook?: (nbId: string) => void;
}

export interface RecentState {}

export class Recent extends Component<RecentProps, RecentState> {
  private onNewNotebook() {
    if (this.props.onNewNotebook) this.props.onNewNotebook();
  }

  private onOpenNotebook(nbId: string) {
    if (this.props.onOpenNotebook) this.props.onOpenNotebook(nbId);
  }

  render() {
    // TODO: display the 'your notebooks' link next to the 'recently updated'
    // header, and not above, as if they were tabs. Like this:
    //
    //   [your notebooks] [recently updated]            [+ new notebook]
    //   ---------------------------------------------------------------
    //   |     notebook 1     |     notebok 2     |     notebook 3     |
    //
    // This component also shares a lot of code with the Profile component,
    // we should probably integrate them into a single component.

    let profileLinkEl = null;
    if (this.props.userInfo) {
      profileLinkEl = (
        <div class="nb-listing-header">
          <h2>{profileLink(this.props.userInfo, "Your Notebooks")}</h2>
        </div>
      );
    }

    return (
      <div class="nb-listing">
        {profileLinkEl}
        <div class="nb-listing-header">
          <div class="nb-listing-header-title">
            <h2>Recently Updated</h2>
          </div>
          <div class="nb-listing-header-cta">
            <NewNotebookButton onClick={this.onNewNotebook.bind(this)} />
          </div>
        </div>
        <NotebookList
          showTitle={false}
          notebooks={this.props.notebooks}
          onOpen={this.onOpenNotebook.bind(this)}
        />
      </div>
    );
  }
}
