import { Edge, Ext2Web, GroupNode, Node } from "types";
import { Panel, ReactFlowState, useReactFlow, useStore } from "reactflow";
import { selectNoteTitle, useTreeNoteStore } from "./store";

import Markdown from "react-markdown";
import { isGroupNode } from "./layout";
import { nanoid } from "../../utils";
import { useCallback } from "react";

const block: Ext2Web.AddCode["data"] = {
  type: "Code",
  code: `if (this._isDisposed) {
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
`,
  rows: 15,
  file: "src/dispose.ts",
  focus: "22[1:32],23:25,26[1:15]",
  lineNums: "18:32",
  lang: "ts",
  project:
    "/Users/jinmao/code/vscode/vscode-extension-samples/custom-editor-sample",
  text: "`disposeAll` dispose by hand 5",
  showCode: true,
};

type Props = {
  addBlock: ({ action, data }: Ext2Web.AddCode) => void;
};

function Menu({ addBlock }: Props) {
  const addDetail = useCallback(() => {
    addBlock({ action: "add-detail", data: { ...block } });
  }, [addBlock]);
  const addNext = useCallback(() => {
    addBlock({ action: "add-next", data: { ...block } });
  }, [addBlock]);

  const { toggleGroup, deleteEdge, deleteNode } = useTreeNoteStore();
  const title = useTreeNoteStore(selectNoteTitle);

  const viewport = useStore(
    (s) =>
      `x: ${s.transform[0].toFixed(2)}, y: ${s.transform[1].toFixed(
        2
      )}, zoom: ${s.transform[2].toFixed(2)}`
  );

  return (
    <>
      <Panel position="top-left" className="border ">
        <div className="px-3">
          <Markdown>{title}</Markdown>
        </div>
        <div className="flex justify-between align-middle h-10">
          <pre className="text-xs m-2 mt-1 h-6 leading-6 border-gray-400 rounded border px-3 text-gray-700">
            {viewport}
          </pre>
          <button className="btn-blue h-6 mt-1" onClick={addDetail}>
            Add Detail
          </button>
          <button className="btn-blue h-6 mt-1" onClick={addNext}>
            Add Next
          </button>
          <button className="btn-blue h-6 mt-1" onClick={deleteEdge}>
            Del Edge
          </button>
          <button className="btn-blue h-6 mt-1" onClick={deleteNode}>
            Del Node
          </button>
          <button className="btn-blue h-6 mt-1" onClick={toggleGroup}>
            ScrollyBlock
          </button>
        </div>
      </Panel>
    </>
  );
}

export default Menu;
