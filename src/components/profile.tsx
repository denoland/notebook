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
 * This is where Profile component is defined.
 * It can be used to render profile of a user.
 */

import { Component, h } from "preact";
import * as types from "../types";
import { NotebookList } from "./list";
import { NewNotebookButton } from "./new_notebook_button";
import { UserTitle } from "./user_title";

export interface ProfileProps {
  userInfo: types.UserInfo;
  notebooks: types.NbInfo[];
  onNewNotebook?: () => void;
  onOpenNotebook?: (nbId: string) => void;
}

export class Profile extends Component<ProfileProps, {}> {
  private onNewNotebook() {
    if (this.props.onNewNotebook) this.props.onNewNotebook();
  }

  private onOpenNotebook(nbId: string) {
    if (this.props.onOpenNotebook) this.props.onOpenNotebook(nbId);
  }

  render() {
    if (this.props.notebooks.length === 0) {
      return <h1>User has no notebooks.</h1>;
    }
    const doc = this.props.notebooks[0].doc;

    return (
      <div class="nb-listing">
        <div class="nb-listing-header">
          <UserTitle userInfo={doc.owner} />
          <NewNotebookButton onClick={this.onNewNotebook.bind(this)} />
        </div>
        <ol>
          <NotebookList
            showTitle={true}
            notebooks={this.props.notebooks}
            onOpen={this.onOpenNotebook.bind(this)}
          />
        </ol>
      </div>
    );
  }
}
