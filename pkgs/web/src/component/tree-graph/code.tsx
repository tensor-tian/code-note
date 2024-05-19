import { Handle, NodeProps, Position } from "reactflow";
import { IoMdArrowDropdown, IoMdArrowDropright } from "react-icons/io";
import { MouseEvent, memo, useCallback, useMemo } from "react";
// import debounce from "lodash.debounce";
import {
  selectActiveEdge,
  selectActiveNodeId,
  selectRootIds,
  selectSelectedNodes,
  useTreeNoteStore,
} from "./store";

import { CodeBlock } from "types";
import { EditText } from "react-edit-text";
import type { IsValidConnection } from "reactflow";
import MDX from "../mdx";
import cx from "classnames";

function TreeNode({ id, data }: NodeProps<CodeBlock>) {
  const { text, showCode } = data;
  const {
    updateNodeText,
    toggleCode: _toggleCode,
    activateNode,
    toggleNodeSelection,
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
  const onTextChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      updateNodeText(id, event.target.value);
    },
    [id, updateNodeText]
  );
  const checkboxId = "code-" + id;

  const toggleSelection = useCallback(() => {
    toggleNodeSelection(id);
  }, [id, toggleNodeSelection]);

  const showCodeIcon = useMemo(
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

  const idTop = id + "-top";
  const idLeft = id + "-left";
  const idRight = id + "-right";
  const idBottom = id + "-bottom";
  return (
    <div>
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
          "border rounded px-2 py-2 bg-white",
          isRoot ? "border-red" : isActive ? "border-gray-900" : "border-gray",
          isActive ? "shadow-lg shadow-gray-900" : "",
          isSelected ? "bg-gray-200" : "bg-white"
        )}
        onClick={onActivate}
      >
        <div className="flex justify-between ">
          {showCodeIcon}
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
        <EditText
          value={text}
          className="note-text text-base px-1"
          onChange={onTextChange}
        />
        {showCode ? <MDX block={data} /> : undefined}
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
