import { h, render, rerender } from "preact";
import { assert, assertEqual, createResolvable } from "../src/util";
import { testBrowser } from "../tools/tester";
import * as db from "./db";
import * as nb from "./nb";
import { Notebook } from "./notebook";

testBrowser(async function notebook_NotebookRoot() {
  const mdb = db.enableMock();
  resetPage();
  const el = h(nb.NotebookRoot, { });
  render(el, document.body);
  await flush();
  assertEqual(mdb.counts, { queryLatest: 1 });
  const c = document.body.getElementsByTagName("div")[0];
  assertEqual(c.className, "notebook");
});

testBrowser(async function notebook_Notebook() {
  const mdb = db.enableMock();
  await renderAnonNotebook();
  assertEqual(mdb.counts, { getDoc: 1 });
  // Check that we rendered the title.
  const title = document.querySelectorAll("div.title > h2");
  assertEqual(1, title.length);
  assertEqual("Sample Notebook", title[0].innerHTML);
  // Because we aren't logged in, we shouldn't see an edit button for the title.
  const editButtons = document.getElementsByClassName("edit-title");
  assertEqual(0, editButtons.length);
  // Because we aren't logged in, we shouldn't see any clone button.
  const clones = document.getElementsByClassName("clone");
  assertEqual(0, clones.length);
});

testBrowser(async function notebook_focusNextCell() {
  const notebook = await renderNotebook();
  const cellIds = notebook.state.order;
  const classList1 = document.getElementById(`cell-${cellIds[0]}`).classList;
  const classList2 = document.getElementById(`cell-${cellIds[1]}`).classList;
  await notebook.goTo(cellIds[0]);
  await flush();
  assertEqual(notebook.active, cellIds[0]);
  assert(classList1.contains("notebook-cell-focus"));
  assert(!classList2.contains("notebook-cell-focus"));
  await notebook.cellRefs.get(cellIds[0]).focusNext();
  await flush();
  assertEqual(notebook.active, cellIds[1]);
  assert(!classList1.contains("notebook-cell-focus"));
  assert(classList2.contains("notebook-cell-focus"));
});

testBrowser(async function notebook_progressBar() {
  const notebook = await renderNotebook();
  const cellIds = notebook.state.order;

  const progressBar =
      document.querySelector(".notebook-cell .progress-bar") as HTMLElement;
  assert(progressBar != null);

  // tslint:disable-next-line:ban
  const percent = () => parseFloat(progressBar.style.width);
  const visible = () => progressBar.style.display === "block";

  // Call util.downloadProgress in the notebook sandbox.
  const downloadProgress = async(job, loaded, total, cellNo = 1) => {
    const cellId = cellIds[cellNo - 1];
    const vm = notebook.vm;
    await vm.exec(`import { downloadProgress } from "test_internals";
       await downloadProgress(...${JSON.stringify([job, loaded, total])});`,
       cellId);
    await flush();
  };

  // Should not be visible initially.
  assert(!visible());
  // Start one download job, size not specified yet, will be 10kb.
  await downloadProgress("job1", 0, null);
  assert(visible());
  assertEqual(percent(), 0);
  // Start another, size 30k bytes.
  await downloadProgress("job2", 0, 30e3);
  assert(visible());
  assertEqual(percent(), 0);
  // Make progress on both jobs.
  await downloadProgress("job1", 1e3, 10e3);
  assertEqual(percent(), 100 * 1e3 / 40e3);
  await downloadProgress("job2", 1e3, 30e3);
  assertEqual(percent(), 100 * 2e3 / 40e3);
  await downloadProgress("job2", 15e3, 30e3);
  assertEqual(percent(), 100 * 16e3 / 40e3);
  // Set job1 to 100% from cellId 2.
  await downloadProgress("job1", 10e3, 10e3, 2);
  assertEqual(percent(), 100 * 25e3 / 40e3);
  // Finish job1.
  await downloadProgress("job1", null, null);
  // Since job1 is no longer active, and job2 is half done, the progress bar
  // is now back at 50%.
  // TODO: this is kinda weird.
  assert(visible());
  assertEqual(percent(), 50);
  // Set job2 to 100%.
  await downloadProgress("job2", 30e3, 30e3);
  assert(visible());
  assertEqual(percent(), 100);
  // Remove job2 from cell 2.
  await downloadProgress("job2", null, null, 2);
  assert(!visible());
  assertEqual(percent(), 0);
});

testBrowser(async function notebook_profile() {
  const mdb = db.enableMock();
  await renderProfile("non-existant");
  let avatars = document.querySelectorAll(".avatar");
  assert(avatars.length === 0);
  let notebooks = document.querySelectorAll(".most-recent ol li");
  assert(notebooks.length === 0);
  assertEqual(mdb.counts, { queryProfile: 1 });

  // Try again with a real uid.
  await renderProfile(db.defaultOwner.uid);
  avatars = document.querySelectorAll(".avatar");
  assert(avatars.length === 1);
  notebooks = document.querySelectorAll(".most-recent ol li");
  assert(notebooks.length === 1);
  assertEqual(mdb.counts, { queryProfile: 2 });
});

// Call this to ensure that the DOM has been updated after events.
function flush(): Promise<void> {
  rerender();
  return Promise.resolve();
}

function resetPage() {
  nb.resetNotebook();
  document.body.innerHTML = "";
}

function renderProfile(profileUid: string) {
  const promise = createResolvable();
  resetPage();
  const el = h(nb.NotebookRoot, {
    onReady: promise.resolve,
    profileUid,
  });
  render(el, document.body);
  return promise;
}

function renderAnonNotebook() {
  resetPage();
  return new Promise((resolve) => {
    const el = h(nb.NotebookRoot, {
      nbId: "default",
      onReady: resolve,
    });
    render(el, document.body);
  });
}

async function renderNotebook(): Promise<Notebook> {
  document.body.innerHTML = "";
  let notebook: Notebook;
  const nb = h(Notebook as any, {
    initialDoc: {
      anonymous: true,
      cells: ["let a = 4", "let b = 5"],
      created: new Date(),
      owner: {
        displayName: "Anonymous",
        photoURL: "/static/img/anon_profile.png?",
        uid: "",
      },
      title: "Anonymous Notebook. Changes will not be saved.",
      updated: new Date(),
    },
    ref: ref => notebook = ref
  });
  render(nb, document.body);
  assert(!!notebook);
  await notebook.isReady;
  await flush();
  return notebook;
}
