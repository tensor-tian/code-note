import { Ext2Web, Web2Ext } from "types";
import { Panel, useStore } from "reactflow";
import { isVscode, nanoid, vscode } from "../../utils";
import { selectDebug, selectNoteTitle, useTreeNoteStore } from "./store";

import MDX from "../mdx";
import { useCallback } from "react";

const block: Ext2Web.AddCode["data"] = {
  type: "Code",
  code: `\`\`\`ts src/dispose.ts lineNums=18:32 focus=22[1:32],23:25,26[1:15]
if (this._isDisposed) {
    return;
  }
  this._isDisposed = true;
// mark[3:12]
  disposeAll(this._disposables);
}

protected _register<T extends vscode.Disposable>(value: T): T {
  if (this._isDisposed) {
    value.dispose();
  } else {
    this._disposables.push(value);
  }
  return value;
}
\`\`\`
`,
  rowCount: 15,
  filePath: "src/dispose.ts",
  pkgName: "custom-editor-sample",
  pkgPath:
    "/Users/jinmao/code/vscode/vscode-extension-samples/custom-editor-sample",
  text: `#### \`disposeAll\` dispose by hand 5 [baidu](http://baidu.com)
  
  Emphasis, aka italics, with *asterisks* or _underscores_.

  # h1
  Strong emphasis, aka bold, with **asterisks** or __underscores__.
  
  ## h2
  Combined emphasis with **asterisks and _underscores_**.
  
  ### h3
  Strikethrough uses two tildes. ~~Scratch this.~~

  > Text that is a quote

  #### h4
  Use \`git status\` to list all new or modified files that haven't yet been committed.


- George Washington
* John Adams
+ Thomas Jefferson


1. James Madison
2. James Monroe
3. John Quincy Adams

## h2

1. First list item
   - First nested list item
     - Second nested list item
`,
  showCode: true,
  ranges: [],
  id: "",
};

type Props = {
  addBlock: ({ action, data }: Ext2Web.AddCode) => void;
};

function Menu({ addBlock }: Props) {
  const addDetail = useCallback(() => {
    addBlock({ action: "add-detail", data: { ...block, id: nanoid() } });
  }, [addBlock]);
  const addNext = useCallback(() => {
    addBlock({ action: "add-next", data: { ...block, id: nanoid() } });
  }, [addBlock]);

  const { setKV, toggleGroup, deleteEdge, deleteNode } = useTreeNoteStore();
  const { id, text, type: typ } = useTreeNoteStore(selectNoteTitle);

  const viewport = useStore(
    (s) =>
      `x: ${s.transform[0].toFixed(2)}, y: ${s.transform[1].toFixed(
        2
      )}, zoom: ${s.transform[2].toFixed(2)}`
  );
  const debug = useTreeNoteStore(selectDebug);

  const startEdit = useCallback(() => {
    vscode.postMessage({
      action: "start-text-editor",
      data: { id, text, type: typ },
    } as Web2Ext.StartTextEditor);
  }, [id, text, typ]);

  const toggleDebug = useCallback(() => {
    setKV("debug", !debug);
  }, [debug, setKV]);

  return (
    <>
      <Panel position="top-left" className="border ">
        <div className="px-3">
          <MDX mdx={text} />
        </div>
        <div className="flex justify-between align-middle h-10">
          <button className="btn-blue h-6 mt-1" onClick={startEdit}>
            Edit
          </button>
          {!isVscode && (
            <button className="btn-blue h-6 mt-1" onClick={addDetail}>
              Add Detail
            </button>
          )}
          {!isVscode && (
            <button className="btn-blue h-6 mt-1" onClick={addNext}>
              Add Next
            </button>
          )}
          {
            <button className="btn-blue h-6 mt-1" onClick={toggleDebug}>
              Debug
            </button>
          }
          <button className="btn-blue h-6 mt-1" onClick={deleteEdge}>
            <s>Edge</s>
          </button>
          <button className="btn-blue h-6 mt-1" onClick={deleteNode}>
            <s>Node</s>
          </button>
          <button className="btn-blue h-6 mt-1" onClick={toggleGroup}>
            ScrollyBlock
          </button>

          {debug && (
            <pre className="text-xs m-2 mt-1 h-6 leading-6 border-gray rounded border px-3  bg-gray-300">
              {viewport}
            </pre>
          )}
        </div>
      </Panel>
    </>
  );
}

export default Menu;
