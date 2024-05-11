import { CodeBlock, MessageDataAddBlock } from "types";
import { Panel, ReactFlowState, useStore } from "reactflow";
import {
  deleteEdge,
  selectNote,
  toggleSrollyBlock,
} from "../../service/note-slice";
import { useAppDispatch, useAppSelector } from "../../service/store";

import Markdown from "react-markdown";
import { useCallback } from "react";

const block: Omit<CodeBlock, "id"> = {
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
  file: "src/dispose.ts",
  focus: "22[1:32],23:25,26[1:15]",
  lineNums: "18:32",
  lang: "ts",
  project:
    "/Users/jinmao/code/vscode/vscode-extension-samples/custom-editor-sample",
  text: "`disposeAll` dispose by hand 5",
};
const transformSelector = (state: ReactFlowState) => state.transform;
type Props = {
  addBlock: (
    action: MessageDataAddBlock["action"],
    data: Omit<CodeBlock, "id">
  ) => void;
};

function Menu({ addBlock }: Props) {
  const note = useAppSelector(selectNote);
  const dispatch = useAppDispatch();
  const addDetail = useCallback(() => {
    addBlock("add-detail", { ...block });
  }, [addBlock]);
  const addNext = useCallback(() => {
    addBlock("add-next", { ...block });
  }, [addBlock]);
  const toggleScrolly = useCallback(() => {
    dispatch(toggleSrollyBlock());
  }, [dispatch]);
  const delEdge = useCallback(() => {
    dispatch(deleteEdge());
  }, [dispatch]);
  const [x, y, zoom] = useStore(transformSelector);
  return (
    <>
      <Panel position="top-left" className="border ">
        <div className="px-3">
          <Markdown>{note.text}</Markdown>
        </div>
        <div className="flex justify-between align-middle h-10">
          <pre className="text-xs m-2 mt-1 h-6 leading-6 border-gray-400 rounded border px-3 text-gray-700">{`x: ${x.toFixed(
            2
          )}, y: ${y.toFixed(2)}, zoom: ${zoom.toFixed(2)}`}</pre>
          <button className="btn-blue h-6 mt-1" onClick={addDetail}>
            Add Detail
          </button>
          <button className="btn-blue h-6 mt-1" onClick={addNext}>
            Add Next
          </button>
          <button className="btn-blue h-6 mt-1" onClick={delEdge}>
            Del Edge
          </button>
          <button className="btn-blue h-6 mt-1">Del Node</button>
          <button className="btn-blue h-6 mt-1" onClick={toggleScrolly}>
            ScrollyBlock
          </button>
        </div>
      </Panel>
    </>
  );
}

export default Menu;
