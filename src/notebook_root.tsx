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

// Propel Notebooks.
// Note that this is rendered and executed server-side using JSDOM and then is
// re-rendered client-side. The Propel code in the cells are executed
// server-side so the results can be displayed even if javascript is disabled.

import { Component, h } from "preact";
import { normalizeCode } from "./components/common";
import { GlobalHeader } from "./components/header";
import { Loading } from "./components/loading";
import { UserMenu } from "./components/menu";
import { Notebook } from "./components/notebook";
import { Profile } from "./components/profile";
import { Recent } from "./components/recent";
import * as db from "./db";
import * as types from "./types";

// An anonymous notebook doc for when users aren't logged in
const anonDoc = {
  anonymous: true,
  cells: [],
  created: new Date(),
  owner: {
    displayName: "Anonymous",
    photoURL: require("url:./img/anon_profile.png"),
    uid: "",
  },
  title: "Anonymous Notebook",
  updated: new Date(),
};

export interface FixedProps {
  code: string;
}

// FixedCell is for non-executing notebook-lookalikes. Usually will be used for
// non-javascript code samples.
// TODO share more code with Cell.
export class FixedCell extends Component<FixedProps, {}> {
  render() {
    // Render as a pre in case people don't have javascript turned on.
    return (
      <div class="notebook-cell">
        <div class="input">
          <pre>{normalizeCode(this.props.code)}</pre>
        </div>
      </div>
    );
  }
}

export interface NotebookRootProps {
  userInfo?: types.UserInfo; // The current user who is logged in.
  // If nbId is specified, it will be queried, and set in doc.
  nbId?: string;
  // If profileId is specified, it will be queried.
  profileUid?: string;
  // If neither nbId nor profileUid is specified, NotebookRoot will
  // use the current URL's query string to search fo nbId and profile.
  // If those are not found, NotebookRoot will query the most recent.
  onReady: () => void;
}

export interface NotebookRootState {
  // Same as in props, but after checking window.location.
  nbId?: string;
  profileUid?: string;

  // If set a Notebook for this doc will be displayed.
  doc?: types.NotebookDoc;
  // If set the most-recent page will be displayed.
  mostRecent?: types.NbInfo[];
  // If set the profile page will be displayed.
  profileLatest?: types.NbInfo[];

  errorMsg?: string;
}

export class NotebookRoot extends Component<
  NotebookRootProps,
  NotebookRootState
> {
  notebookRef?: Notebook; // Hook for testing.
  isCloningInProgress: boolean;

  constructor(props) {
    super(props);
    let nbId;
    if (this.props.nbId) {
      nbId = this.props.nbId;
    } else {
      const matches = window.location.search.match(/nbId=(\w+)/);
      nbId = matches ? matches[1] : null;
    }
    let profileUid;
    if (this.props.profileUid) {
      profileUid = this.props.profileUid;
    } else {
      const matches = window.location.search.match(/profile=(\w+)/);
      profileUid = matches ? matches[1] : null;
    }
    this.state = { nbId, profileUid };
  }

  async componentWillMount() {
    // Here is where we query firebase for all sorts of messages.
    const { nbId, profileUid } = this.state;
    try {
      if (nbId) {
        // nbId specified. Query the the notebook.
        const doc = await (nbId === "anonymous"
          ? Promise.resolve(anonDoc)
          : db.active.getDoc(nbId));
        this.setState({ doc });
      } else if (profileUid) {
        // profileUid specified. Query the profile.
        const profileLatest = await db.active.queryProfile(profileUid, 100);
        this.setState({ profileLatest });
      } else {
        // Neither specified. Show the most-recent.
        // TODO potentially these two queries can be combined into one.
        const mostRecent = await db.active.queryLatest();
        this.setState({ mostRecent });
      }
    } catch (e) {
      this.setState({ errorMsg: e.message });
    }
  }

  async componentDidUpdate() {
    // Call the onReady callback for testing.
    if (
      this.state.errorMsg ||
      this.state.mostRecent ||
      this.state.profileLatest ||
      this.state.doc
    ) {
      if (this.props.onReady) this.props.onReady();
    }
  }

  private async onNewNotebook() {
    const nbId = await db.active.create();
    window.location.href = nbUrl(nbId);
  }

  private async onOpenNotebook(nbId: string) {
    window.location.href = nbUrl(nbId);
  }

  private async handleNotebookSave(doc: types.NotebookDoc) {
    this.setState({ doc });
    if (doc.anonymous) return;
    if (!this.props.userInfo) return;
    if (this.props.userInfo.uid !== doc.owner.uid) return;
    try {
      await db.active.updateDoc(this.state.nbId, doc);
    } catch (e) {
      // TODO
      console.log(e);
    }
  }

  async handleNotebookClone() {
    if (this.isCloningInProgress) return;
    this.isCloningInProgress = true;
    const cloneId = await db.active.clone(this.state.doc);
    // Redirect to new notebook.
    window.location.href = nbUrl(cloneId);
  }

  render() {
    let body;
    if (this.state.errorMsg) {
      body = (
        <div class="notification-screen">
          <div class="notebook-container">
            <p class="error-header">Error</p>
            <p>{this.state.errorMsg}</p>
          </div>
        </div>
      );
    } else if (this.state.profileLatest) {
      body = (
        <Profile
          notebooks={this.state.profileLatest}
          userInfo={this.props.userInfo}
          onNewNotebook={this.onNewNotebook.bind(this)}
          onOpenNotebook={this.onOpenNotebook.bind(this)}
        />
      );
    } else if (this.state.doc) {
      body = (
        <Notebook
          save={this.handleNotebookSave.bind(this)}
          clone={this.handleNotebookClone.bind(this)}
          initialDoc={this.state.doc}
          ref={(ref) => (this.notebookRef = ref)}
          userInfo={this.props.userInfo}
        />
      );
    } else if (this.state.mostRecent) {
      body = (
        <Recent
          notebooks={this.state.mostRecent}
          userInfo={this.props.userInfo}
          onNewNotebook={this.onNewNotebook.bind(this)}
          onOpenNotebook={this.onOpenNotebook.bind(this)}
        />
      );
    } else {
      body = <Loading />;
    }

    return (
      <div class="notebook">
        <GlobalHeader subtitle="Notebook" subtitleLink="/propel/notebook">
          <UserMenu userInfo={this.props.userInfo} />
        </GlobalHeader>
        {body}
      </div>
    );
  }
}

function nbUrl(nbId: string): string {
  const u = window.location.origin + "/propel/notebook?nbId=" + nbId;
  return u;
}
