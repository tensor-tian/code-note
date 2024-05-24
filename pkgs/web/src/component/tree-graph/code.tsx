import { CodeBlock, Web2Ext } from "types";
import { Handle, NodeProps, Position, NodeToolbar } from "reactflow";
import { IoMdArrowDropdown, IoMdArrowDropright } from "react-icons/io";
import { MouseEvent, memo, useCallback, useMemo } from "react";
// import debounce from "lodash.debounce";
import {
  selectActiveEdge,
  selectActiveNodeId,
  selectDebug,
  selectRootIds,
  selectSelectedNodes,
  useTreeNoteStore,
} from "./store";

import { BiText } from "react-icons/bi";
import { IoCode } from "react-icons/io5";
import type { IsValidConnection } from "reactflow";
// import { LiaEdit } from "react-icons/lia";
import MDX from "../mdx";
import cx from "classnames";
import { vscode } from "../../utils";

function TreeNode({ id, data }: NodeProps<CodeBlock>) {
  const { showCode } = data;
  const {
    toggleCode: _toggleCode,
    activateNode,
    toggleNodeSelection,
    updateCodeBlock,
  } = useTreeNoteStore();
  // const { setNodes, getNodes, getEdge } = useReactFlow();
  const activeEdge = useTreeNoteStore(selectActiveEdge);
  const activeNodeId = useTreeNoteStore(selectActiveNodeId);
  const selectedNodes = useTreeNoteStore(selectSelectedNodes);
  const rootIds = useTreeNoteStore(selectRootIds);
  const isSelected = selectedNodes.includes(id);
  const isActive = activeNodeId === id;
  const isRoot = rootIds.includes(id);

  const isX: IsValidConnection = useCallback(
    (edge) => edge.sourceHandle?.endsWith("right") ?? false,
    []
  );
  const isY: IsValidConnection = useCallback(
    (edge) => edge.sourceHandle?.endsWith("bottom") ?? false,
    []
  );
  const toggleCode = useCallback(() => {
    _toggleCode(id);
  }, [id, _toggleCode]);
  const onActivate = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if ((event.target as HTMLDivElement).classList.contains("ignore-click")) {
        return;
      }
      activateNode(id);
    },
    [activateNode, id]
  );
  const onStartTextEdit = useCallback(() => {
    console.log("start text edit");
    vscode.postMessage({
      action: "start-text-editor",
      data: {
        id: data.id,
        text: data.text,
        type: data.type,
      },
    } as Web2Ext.StartTextEditor);
  }, [data.id, data.text, data.type]);

  const onCodeRangeEditClick = useCallback(() => {
    if (!data.isCodeRangeEditing) {
      updateCodeBlock(
        {
          id: data.id,
          isCodeRangeEditing: true,
        },
        "startCodeRangeEditor"
      );
      vscode.postMessage({
        action: "start-code-range-editor",
        data: {
          id: data.id,
          type: data.type,
          filePath: data.filePath,
          pkgPath: data.pkgPath,
          ranges: data.ranges,
        },
      } as Web2Ext.StartCodeRangeEditor);
    } else {
      vscode.postMessage({
        action: "stop-code-range-editor",
        data: { id: data.id },
      } as Web2Ext.StopCodeRangeEditor);
    }
  }, [
    data.filePath,
    data.id,
    data.pkgPath,
    data.ranges,
    data.type,
    updateCodeBlock,
    data.isCodeRangeEditing,
  ]);
  const checkboxId = "code-" + id;

  const toggleSelection = useCallback(() => {
    toggleNodeSelection(id);
  }, [id, toggleNodeSelection]);

  const ShowCodeIcon = useMemo(
    () => (
      <div className="w-100 flex" onClick={toggleCode}>
        {showCode ? (
          <>
            <IoMdArrowDropdown className="hover:scale-125" size={16} />
            <span className="text-gray-600 hover:text-gray-900 font-medium text-xs mr-2 ">
              Hide Code
            </span>
          </>
        ) : (
          <>
            <IoMdArrowDropright className="hover:scale-125" size={16} />
            <span className="text-gray-600 hover:text-gray-900 font-medium text-xs mr-2 ">
              Show Code
            </span>
          </>
        )}
      </div>
    ),
    [showCode, toggleCode]
  );
  const debug = useTreeNoteStore(selectDebug);
  const ID = useMemo(() => {
    if (!debug) return;
    return (
      <pre className=" text-xs border-none rounded-sm px-3 bg-gray-300">
        {id}
      </pre>
    );
  }, [id, debug]);

  const idTop = id + "-top";
  const idLeft = id + "-left";
  const idRight = id + "-right";
  const idBottom = id + "-bottom";

  const mdx = useMemo(
    () => (data.showCode ? block2MDX(data) : data.text),
    [data]
  );
  // const Toolbar = useMemo(() => {
  //   return (
  //     <NodeToolbar offset={10} position={Position.Right}>
  //       <button className="btn-gray" onClick={toggleCode}>
  //         {showCode ? "Hide Code" : "Show Code"}
  //       </button>
  //       <button className="btn-gray" onClick={toggleCode}>
  //         {showCode ? "Hide Code" : "Show Code"}
  //       </button>
  //       <button className="btn-gray" onClick={toggleCode}>
  //         {showCode ? "Hide Code" : "Show Code"}
  //       </button>
  //     </NodeToolbar>
  //   );
  // }, [toggleCode, showCode]);
  return (
    <div>
      {/* {Toolbar} */}
      <Handle
        id={idTop}
        type="target"
        isConnectableEnd
        isConnectableStart={false}
        position={Position.Top}
        className={
          activeEdge?.targetHandle === idTop
            ? "code-handle-hl -top-1"
            : "code-handle -top-0.5"
        }
        isValidConnection={isY}
      />
      <div
        className={cx(
          "border px-4 py-4 bg-white",
          isActive
            ? "border-gray-600 shadow-md shadow-gray-900"
            : "border-gray-300",
          isRoot ? "bg-indigo-100" : "bg-white",
          isSelected ? "bg-gray-200" : "bg-white"
        )}
        onClick={onActivate}
      >
        <div className="flex justify-between mb-3">
          {ShowCodeIcon}
          {ID}
          <div className="flex w-30 justify-between">
            <BiText
              className="mr-5 cursor-auto text-gray-500 hover:text-gray-900 hover:scale-125"
              onClick={onStartTextEdit}
            />
            <IoCode
              className={cx(
                "mr-5 cursor-auto hover:text-gray-900 hover:scale-125",
                data.isCodeRangeEditing ? "text-red scale-125" : "text-gray-500"
              )}
              onClick={onCodeRangeEditClick}
            />

            <div className="flex align-baseline px">
              <label
                htmlFor={checkboxId}
                className="ignore-click text-gray-600 hover:text-gray-900 font-medium text-xs mr-2 "
              >
                {isSelected ? "Deselect Block" : "Select Block"}
              </label>
              <input
                id={checkboxId}
                className="ignore-click"
                type="checkbox"
                checked={isSelected}
                onChange={toggleSelection}
              />
            </div>
          </div>
        </div>
        <div className="px-1">
          <MDX mdx={mdx} />
        </div>
      </div>
      <Handle
        id={idLeft}
        type="target"
        isConnectableEnd
        isConnectableStart={false}
        position={Position.Left}
        className={
          activeEdge?.targetHandle === idLeft
            ? "code-handle-hl -left-1"
            : "code-handle -left-0.5"
        }
        isValidConnection={isX}
      />
      <Handle
        id={idRight}
        type="source"
        isConnectableStart
        isConnectableEnd={false}
        position={Position.Right}
        className={
          activeEdge?.sourceHandle === idRight
            ? "code-handle-hl -right-1"
            : "code-handle -right-0.5"
        }
      />
      <Handle
        id={idBottom}
        type="source"
        position={Position.Bottom}
        isConnectableStart
        isConnectableEnd={false}
        className={
          activeEdge?.sourceHandle === idBottom
            ? "code-handle-hl -bottom-1"
            : "code-handle -bottom-0.5"
        }
      />
    </div>
  );
}

export default memo(TreeNode);

function block2MDX(block: CodeBlock): string {
  const rows = block.rowCount > 50 ? "" : "";
  return `
<CH.Section>


${block.text}

<CH.Code rows="${rows}">

${block.code}

</CH.Code>

</CH.Section>
  `;
}
