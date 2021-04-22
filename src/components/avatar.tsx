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
import { URL } from "../util";

export interface AvatarProps {
  size?: number;
  userInfo: types.UserInfo;
}

export function Avatar(props: AvatarProps): JSX.Element {
  const size = props.size || 50;
  const photo = new URL(props.userInfo.photoURL, window.location.href);
  photo.searchParams.set("size", size);
  return (
    <img
      class="avatar"
      height={size}
      src={photo.href}
      width={size}
      crossorigin
    />
  );
}
