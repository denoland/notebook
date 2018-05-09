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

// This file contains common types we use across the project.

export interface UserInfo {
  displayName: string;
  photoURL: string;
  uid: string;
}

export interface CellDoc {
  id: string;
  input: string;
  outputHTML: null | string;
}

// Defines the scheme of the notebooks collection.
export interface NotebookDoc {
  anonymous?: boolean;
  cells?: string[];
  cellDocs?: CellDoc[]; // Coming soon.
  owner: UserInfo;
  title: string;
  updated: Date;
  created: Date;
}

export interface NbInfo {
  nbId: string;
  doc: NotebookDoc;
}
