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

// This file contains routines for accessing the firebase database (firestore).
// This is used to save and restore notebooks.
// These routines are run only on the browser.
import { NbInfo, NotebookDoc, UserInfo } from "./types";
import { assert } from "./util";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  Auth,
  signInWithPopup,
  GithubAuthProvider,
  signOut,
} from "firebase/auth";
import {
  FirebaseFirestore,
  CollectionReference,
  collection,
  getFirestore,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  orderBy,
  limit,
  query,
  getDocs,
  where,
  serverTimestamp,
} from "firebase/firestore";

export interface Database {
  getDoc(nbId): Promise<NotebookDoc>;
  updateDoc(nbId: string, doc: NotebookDoc): Promise<void>;
  clone(existingDoc: NotebookDoc): Promise<string>;
  create(): Promise<string>;
  queryProfile(uid: string, limit: number): Promise<NbInfo[]>;
  queryLatest(): Promise<NbInfo[]>;
  signIn(): void;
  signOut(): void;
  subscribeAuthChange(cb: (user: UserInfo) => void): UnsubscribeCb;
}

export interface UnsubscribeCb {
  (): void;
}

// These are shared by all functions and are lazily constructed by lazyInit.
let db: FirebaseFirestore;
let nbCollection: CollectionReference;
let auth: Auth;
const firebaseConfig = {
  apiKey: "AIzaSyCl0QzxMZaerVvUl31wp2eg8Lt4Nv-IVDI",
  authDomain: "deno-notebook.firebaseapp.com",
  projectId: "deno-notebook",
  storageBucket: "deno-notebook.appspot.com",
  messagingSenderId: "613883497521",
  appId: "1:613883497521:web:07c13ba44b5f439ac2d910",
};

class DatabaseFB implements Database {
  async getDoc(nbId): Promise<NotebookDoc> {
    // We have one special doc that is loaded from memory, used for testing and
    // debugging.
    if (nbId === "default") {
      return defaultDoc;
    }
    const docRef = doc(db, "notebooks", nbId);
    const snap = await getDoc(docRef);
    if (snap.exists) {
      return snap.data() as NotebookDoc;
    } else {
      throw Error(`Notebook does not exist ${nbId}`);
    }
  }

  // Caller must catch errors.
  async updateDoc(nbId: string, document: NotebookDoc): Promise<void> {
    if (nbId === "default") return; // Don't save the default doc.
    if (!ownsDoc(auth.currentUser, document)) return;
    const docRef = doc(db, "notebooks", nbId);
    await updateDoc(docRef, {
      cells: document.cells,
      title: document.title || "",
      updated: serverTimestamp(),
    });
  }

  // Attempts to clone the given notebook given the Id.
  // Promise resolves to the id of the new notebook which will be owned by the
  // current user.
  async clone(existingDoc: NotebookDoc): Promise<string> {
    lazyInit();
    const u = auth.currentUser;
    if (!u) throw Error("Cannot clone. User must be logged in.");

    if (existingDoc.cells.length === 0) {
      throw Error("Cannot clone empty notebook.");
    }

    const newDoc = {
      cells: existingDoc.cells,
      created: serverTimestamp(),
      owner: {
        displayName: u.displayName,
        photoURL: u.photoURL,
        uid: u.uid,
      },
      title: "",
      updated: serverTimestamp(),
    };
    console.log({ newDoc });
    const docRef = await addDoc(nbCollection, newDoc);
    return docRef.id;
  }

  async create(): Promise<string> {
    lazyInit();
    const u = auth.currentUser;
    if (!u) return "anonymous";

    const newDoc = {
      cells: [],
      created: serverTimestamp(),
      owner: {
        displayName: u.displayName,
        photoURL: u.photoURL,
        uid: u.uid,
      },
      title: "",
      updated: serverTimestamp(),
    };
    console.log({ newDoc });
    const docRef = await addDoc(nbCollection, newDoc);
    return docRef.id;
  }

  async queryLatest(): Promise<NbInfo[]> {
    lazyInit();
    const q = query(nbCollection, orderBy("updated", "desc"), limit(100));
    const snapshots = await getDocs(q);
    const out = [];
    snapshots.forEach((snap) => {
      const nbId = snap.id;
      const doc = snap.data();
      out.unshift({ nbId, doc });
    });
    return out.reverse();
  }

  async queryProfile(uid: string, queryLimit: number): Promise<NbInfo[]> {
    lazyInit();
    const q = query(
      nbCollection,
      orderBy("updated", "desc"),
      where("owner.uid", "==", uid),
      limit(queryLimit)
    );

    const snapshots = await getDocs(q);
    const out = [];
    snapshots.forEach((snap) => {
      const nbId = snap.id;
      const doc = snap.data();
      out.push({ nbId, doc });
    });
    return out.reverse();
  }

  signIn() {
    lazyInit();
    const provider = new GithubAuthProvider();
    signInWithPopup(auth, provider);
  }

  signOut() {
    lazyInit();
    signOut(auth);
  }

  subscribeAuthChange(cb: (user: UserInfo) => void): UnsubscribeCb {
    lazyInit();
    return onAuthStateChanged(auth, cb);
  }
}

export class DatabaseMock implements Database {
  private currentUser: UserInfo = null;
  private docs: { [key: string]: NotebookDoc };
  counts = {};
  inc(method) {
    if (method in this.counts) {
      this.counts[method] += 1;
    } else {
      this.counts[method] = 1;
    }
  }

  constructor() {
    assert(defaultDoc != null);
    this.docs = { default: Object.assign({}, defaultDoc) };
  }

  async getDoc(nbId: string): Promise<NotebookDoc> {
    this.inc("getDoc");
    if (this.docs[nbId] === null) {
      throw Error("getDoc called with bad nbId " + nbId);
    }
    return this.docs[nbId];
  }

  async updateDoc(nbId: string, doc: NotebookDoc): Promise<void> {
    this.inc("updateDoc");
    this.docs[nbId] = Object.assign(this.docs[nbId], doc);
  }

  async clone(existingDoc: NotebookDoc): Promise<string> {
    this.inc("clone");
    return "clonedNbId";
  }

  async create(): Promise<string> {
    this.inc("create");
    return "createdNbId";
  }

  async queryProfile(uid: string, limit: number): Promise<NbInfo[]> {
    this.inc("queryProfile");
    if (uid === defaultOwner.uid) {
      return [{ nbId: "default", doc: defaultDoc }];
    } else {
      return [];
    }
  }

  async queryLatest(): Promise<NbInfo[]> {
    this.inc("queryLatest");
    return [];
  }

  signIn() {
    this.inc("signIn");
    this.currentUser = defaultOwner;
    this.makeAuthChangeCallbacks();
  }

  signOut(): void {
    this.inc("signOut");
    this.currentUser = null;
    this.makeAuthChangeCallbacks();
  }

  private authChangeCallbacks = [];
  private makeAuthChangeCallbacks() {
    for (const cb of this.authChangeCallbacks) {
      cb(this.currentUser);
    }
  }

  subscribeAuthChange(cb: (user: UserInfo) => void): UnsubscribeCb {
    this.inc("subscribeAuthChange");
    this.authChangeCallbacks.push(cb);
    return () => {
      const i = this.authChangeCallbacks.indexOf(cb);
      this.authChangeCallbacks.splice(i, 1);
    };
  }
}

export let active: Database = null;

export function enableFirebase() {
  active = new DatabaseFB();
}

export function enableMock(): DatabaseMock {
  const d = new DatabaseMock();
  active = d;
  return d;
}

export function ownsDoc(userInfo: UserInfo, doc: NotebookDoc): boolean {
  return userInfo && userInfo.uid === doc.owner.uid;
}

function lazyInit() {
  if (db == null) {
    const firebaseApp = initializeApp(firebaseConfig);
    db = getFirestore(firebaseApp);
    auth = getAuth(firebaseApp);
    nbCollection = collection(db, "notebooks");
  }
  return true;
}

export const defaultOwner: UserInfo = Object.freeze({
  displayName: "default owner",
  photoURL: "https://avatars1.githubusercontent.com/u/80?v=4",
  uid: "abc",
});

const testdataUrl = `${location.origin}/repo/src/testdata`;
const defaultDocCells: ReadonlyArray<string> = Object.freeze([
  ` console.log("Hello"); `,
  ` 1 + 2 `,
  `import * as vegalite from "${testdataUrl}/vega-lite@2.js"`,
  `import * as tf from "${testdataUrl}/tfjs@0.10.0.js"
   tf.tensor([1, 2, 3]);
  `,
]);

export const defaultDoc: NotebookDoc = Object.freeze({
  cells: defaultDocCells.slice(0).map((c) => c.trim()),
  created: new Date(),
  owner: Object.assign({}, defaultOwner),
  title: "Sample Notebook",
  updated: new Date(),
});

// To bridge the old and new NotebookDoc scheme.
// In the old NotebookDoc we only had `doc.cells`, in the new
// scheme we have `cellDocs`.
export function getInputCodes(doc: NotebookDoc): string[] {
  if (doc.cells != null) {
    return doc.cells;
  } else if (doc.cellDocs != null) {
    return doc.cellDocs.map((cellDoc) => cellDoc.input);
  } else {
    return [];
  }
}
