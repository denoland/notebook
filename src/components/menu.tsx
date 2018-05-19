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
// TODO
// Files in ./src/components should not depend on db.
import * as db from "../db";
import * as types from "../types";
import { Avatar } from "./avatar";

export interface UserMenuProps {
  userInfo: types.UserInfo;
}

export function UserMenu(props): JSX.Element {
  if (props.userInfo) {
    return (
      <div class="dropdown">
        <Avatar size={32} userInfo={props.userInfo} />
        <div class="dropdown-content">
          <a href="#" onClick={db.active.signOut}>
            Sign out
          </a>
        </div>
      </div>
    );
  }
  return (
    <a href="#" onClick={db.active.signIn}>
      Sign in
    </a>
  );
}
