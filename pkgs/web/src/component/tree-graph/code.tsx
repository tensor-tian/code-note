import { Handle, NodeProps, Position } from "reactflow";
import { IoMdArrowDropdown, IoMdArrowDropright } from "react-icons/io";
import { MouseEvent, memo, useCallback, useMemo } from "react";
import {
  actEditNodeText,
  actSetNodeActive,
  actToggleCode,
  actToggleNodeSelection,
  selectHiglightEdge,
  selectIsActiveNode,
  selectIsSeleced,
  selectShowCode,
} from "../../service/note-slice";

import { CodeBlock } from "types";
import { EditText } from "react-edit-text";
import type { IsValidConnection } from "reactflow";
import MDX from "../mdx";
import cx from "classnames";
import { useAppSelector } from "../../service/store";
import { useDispatch } from "react-redux";

function TreeNode({ id, data }: NodeProps<CodeBlock>) {
  const showCode = useAppSelector(selectShowCode(id));
  const isSelected = useAppSelector(selectIsSeleced(id));
  const isActive = useAppSelector(selectIsActiveNode(id));
  const dispatch = useDispatch();
  const isX: IsValidConnection = useCallback(
    (edge) => edge.sourceHandle?.endsWith("right") ?? false,
    []
  );
  const isY: IsValidConnection = useCallback(
    (edge) => edge.sourceHandle?.endsWith("bottom") ?? false,
    []
  );
  const toggleCode = useCallback(() => {
    dispatch(actToggleCode(id));
  }, [id, dispatch]);
  const onActivate = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if ((event.target as HTMLDivElement).classList.contains("ignore-click")) {
        return;
      }
      dispatch(actSetNodeActive(id));
    },
    [id, dispatch]
  );
  const onChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      dispatch(
        actEditNodeText({
          id,
          text: event.target.value,
        })
      );
    },
    [id, dispatch]
  );
  const checkboxId = "code-" + id;
  const toggleSelection = useCallback(() => {
    dispatch(actToggleNodeSelection(id));
  }, [id, dispatch]);

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

  const hl = useAppSelector(selectHiglightEdge);
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
          hl?.targetHandle === idTop
            ? "code-handle-hl -top-1"
            : "code-handle -top-0.5"
        }
        isValidConnection={isY}
      />
      <div
        className={cx(
          "border rounded px-2 py-2 bg-white",
          isActive
            ? "border-gray-900 shadow-lg shadow-gray-900"
            : "border-gray",
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
          value={data.text}
          className="note-text text-base px-1"
          onChange={onChange}
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
          hl?.targetHandle === idLeft
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
          hl?.sourceHandle === idRight
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
          hl?.sourceHandle === idBottom
            ? "code-handle-hl -bottom-1"
            : "code-handle -bottom-0.5"
        }
      />
    </div>
  );
}

export default memo(TreeNode);
