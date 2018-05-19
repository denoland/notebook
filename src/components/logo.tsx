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

export interface PropelLogoProps {
  subtitle?: string;
  subtitleLink?: string;
}

export function PropelLogo(props: PropelLogoProps): JSX.Element {
  // tslint:disable-next-line:variable-name
  let Subtitle = null;
  if (props.subtitle) {
    Subtitle = (
      <h2>
        <a href={props.subtitleLink || "/"}>{props.subtitle}</a>
      </h2>
    );
  }
  return (
    <div class="propel-logo">
      <div class="logo">
        <svg
          height={24}
          viewBox="0 0 24 24"
          width={24}
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx={12} cy={12} r={12} />
        </svg>
      </div>
      <div class="global-title">
        <div class="global-main-title">
          <h1>
            <a href="/">Propel</a>
          </h1>
        </div>
        <div class="global-sub-title">{Subtitle}</div>
      </div>
    </div>
  );
}
