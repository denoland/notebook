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

import { h } from "preact";
// TODO None of component in ./src/components should depend on ./src/db.ts.
import * as db from "../db";
import { nbUrl } from "./common";

export function newNotebookButton(): JSX.Element {
  return (
    <button
      class="create-notebook"
      onClick={async () => {
        // Redirect to new notebook.
        const nbId = await db.active.create();
        window.location.href = nbUrl(nbId);
      }}
    >
      + New Notebook
    </button>
  );
}
