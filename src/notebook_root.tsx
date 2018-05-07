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
import {
  Avatar,
  docTitle,
  GlobalHeader,
  Loading,
  normalizeCode,
  profileLink,
  UserMenu,
  UserTitle
} from "./common";
import * as db from "./db";
import { Notebook } from "./notebook";

export function resetNotebook() {
  // TODO
}

// An anonymous notebook doc for when users aren't logged in
const anonDoc = {
  anonymous: true,
  cells: [],
  created: new Date(),
  owner: {
    displayName: "Anonymous",
    photoURL: "/static/img/anon_profile.png?",
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
          <pre>{ normalizeCode(this.props.code) }</pre>
        </div>
      </div>
    );
  }
}

export interface NotebookRootProps {
  userInfo?: db.UserInfo; // The current user who is logged in.
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
  doc?: db.NotebookDoc;
  // If set the most-recent page will be displayed.
  mostRecent?: db.NbInfo[];
  // If set the profile page will be displayed.
  profileLatest?: db.NbInfo[];

  errorMsg?: string;
}

export class NotebookRoot extends Component<NotebookRootProps,
                                            NotebookRootState> {
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
        const profileLatest =
          await db.active.queryProfile(profileUid, 100);
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
    if (this.state.errorMsg || this.state.mostRecent ||
        this.state.profileLatest || this.state.doc) {
      if (this.props.onReady) this.props.onReady();
    }
  }

  async handleNotebookSave(doc: db.NotebookDoc) {
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
            <p>{ this.state.errorMsg }</p>
          </div>
        </div>
      );
    } else if (this.state.profileLatest) {
      body = (
        <Profile
          profileLatest={ this.state.profileLatest }
          userInfo={ this.props.userInfo } />
      );

    } else if (this.state.doc) {
      body = (
        <Notebook
          save={ this.handleNotebookSave.bind(this) }
          clone={ this.handleNotebookClone.bind(this) }
          initialDoc={ this.state.doc }
          ref={ ref => this.notebookRef = ref }
          userInfo={ this.props.userInfo } />
      );
    } else if (this.state.mostRecent) {
      body = (
        <MostRecent
          mostRecent={ this.state.mostRecent }
          userInfo={ this.props.userInfo } />
      );

    } else {
      body = <Loading />;
    }

    return (
      <div class="notebook">
        <GlobalHeader subtitle="Notebook" subtitleLink="/notebook" >
          <UserMenu userInfo={ this.props.userInfo } />
        </GlobalHeader>
        { body }
      </div>
    );
  }
}

export interface MostRecentProps {
  mostRecent: db.NbInfo[];
  userInfo?: db.UserInfo;
}

export interface MostRecentState { }

export class MostRecent extends Component<MostRecentProps, MostRecentState> {
  render() {
    let profileLinkEl = null;
    if (this.props.userInfo) {
      // TODO This is ugly - we're reusing most-recent-header just to get a line
      // break between the link to "Your Notebooks" and "Most Recent".
      profileLinkEl = (
        <div class="most-recent-header">
          <h2>{ profileLink(this.props.userInfo, "Your Notebooks") }</h2>
        </div>
      );
    }

    return (
      <div class="most-recent">
        { profileLinkEl }
        <div class="most-recent-header">
          <div class="most-recent-header-title">
            <h2>Recently Updated</h2>
          </div>
          <div class="most-recent-header-cta">
            { newNotebookButton() }
          </div>
        </div>
        <ol>
          { ...notebookList(this.props.mostRecent) }
        </ol>
      </div>
    );
  }
}

function newNotebookButton() {
  return (
    <button
      class="create-notebook"
      onClick={async() => {
        // Redirect to new notebook.
        const nbId = await db.active.create();
        window.location.href = nbUrl(nbId);
      }} >
      + New Notebook
    </button>
  );
}

export interface ProfileProps {
  profileLatest: db.NbInfo[];
  userInfo?: db.UserInfo;
}

export interface ProfileState { }

export class Profile extends Component<ProfileProps, ProfileState> {
  render() {
    if (this.props.profileLatest.length === 0) {
      return <h1>User has no notebooks</h1>;
    }
    const doc = this.props.profileLatest[0].doc;

    // TODO Profile is reusing the most-recent css class, because it's a very
    // similar layout. The CSS class should be renamed something appropriate
    // for both of them, maybe nb-listing.
    return (
      <div class="most-recent">
        <div class="most-recent-header">
          <UserTitle userInfo={ doc.owner } />
          { newNotebookButton() }
        </div>
        <ol>
          {...notebookList(this.props.profileLatest, {
            showDates: false,
            showName: false,
            showTitle: true,
          })}
        </ol>
      </div>
    );
  }
}

function notebookList(notebooks: db.NbInfo[], {
  showName = true,
  showTitle = false,
  showDates = false,
} = {}): JSX.Element[] {
  return notebooks.map(info => {
    const snippit = db.getInputCodes(info.doc).join("\n\n");
    const href = nbUrl(info.nbId);
    return (
      <a href={ href } >
        <li>
            <div class="code-snippit">{ snippit }</div>
            { notebookBlurb(info.doc, { showName, showTitle, showDates }) }
        </li>
      </a>
    );
  });
}

function notebookBlurb(doc: db.NotebookDoc, {
  showName = true,
  showTitle = false,
  showDates = false,
} = {}): JSX.Element {
  let body = [];
  if (showDates) {
    body = body.concat([
      <div class="date-created">
        <p class="created">
          Created { fmtDate(doc.created) }
        </p>
      </div>,
      <div class="date-updated">
        <p class="updated">
          Updated { fmtDate(doc.updated) }
        </p>
      </div>
    ]);
  }
  if (showName) {
    body = body.concat([
      <div class="blurb-avatar">
        <Avatar userInfo={ doc.owner } />
      </div>,
      <p class="blurb-name">
        { doc.owner.displayName }
      </p>
    ]);
  }
  if (showTitle) {
    body.push(<p class="blurb-title">{ docTitle(doc.title) }</p>);
  }
  return <div class="blurb">{ ...body }</div>;
}

function fmtDate(d: Date): string {
  return d.toISOString();
}

function nbUrl(nbId: string): string {
  // Careful, S3 is finicky about what URLs it serves. So
  // /notebook?nbId=blah  will get redirect to /notebook/
  // because it is a directory with an index.html in it.
  const u = window.location.origin + "/notebook/?nbId=" + nbId;
  return u;
}
