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
 * NotebookList component is used in recent.tsx and profile.tsx
 * to render list of notebooks.
 */

import { Component, h } from "preact";
import { NbInfo } from "../types";
import { NotebookPreview } from "./preview";

export interface NotebookListProps {
  // List of notebooks we would like to render.
  notebooks: NbInfo[];
  showTitle: boolean;
  // Will be fired when the user clicks on a notebook preview.
  onOpen?: (nbId: string) => void;
}

export class NotebookList extends Component<NotebookListProps, {}> {
  private onOpen(nb: NbInfo) {
    const id = nb.nbId;
    if (this.props.onOpen) this.props.onOpen(id);
  }

  render() {
    const { notebooks, showTitle } = this.props;
    return (
      <ol class="notebooks-list">
        {notebooks.map((nb: NbInfo) => (
          <NotebookPreview
            key={nb.nbId}
            notebook={nb}
            showTitle={showTitle}
            onClick={this.onOpen.bind(this, nb)}
          />
        ))}
      </ol>
    );
  }
}
