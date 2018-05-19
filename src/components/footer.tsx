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

export function Footer(): JSX.Element {
  return (
    <div class="footer">
      <a href="/references">References</a>
      <a href="/docs">Documentation</a>
      <a href="https://github.com/propelml/propel">GitHub</a>
      <a href="mailto:propelml@gmail.com">Contact</a>
    </div>
  );
}
