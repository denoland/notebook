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
import * as types from "../types";
import { Avatar } from "./avatar";

export function profileLink(
  u: types.UserInfo,
  text: string = null,
): JSX.Element {
  const href = window.location.origin + "/propel/notebook?profile=" + u.uid;
  return (
    <a class="profile-link" href={href}>
      {text ? text : u.displayName}
    </a>
  );
}

export interface UserTitleProps {
  userInfo: types.UserInfo;
}

export function UserTitle(props: UserTitleProps): JSX.Element {
  return (
    <div class="nb-listing-header-title">
      <Avatar userInfo={props.userInfo} />
      <h2>{profileLink(props.userInfo)}</h2>
    </div>
  );
}
