import { CodeBlock, Web2Ext } from "types";
import { NodeProps } from "reactflow";
import { IoMdArrowDropdown, IoMdArrowDropright } from "react-icons/io";
import { MouseEvent, memo, useCallback, useMemo } from "react";
// import debounce from "lodash.debounce";
import { selectCodeBlockState, selectDebug } from "./selector";
import { useTreeNoteStore } from "./store";
import { BiCopy } from "react-icons/bi";
import { BiText } from "react-icons/bi";
import { IoCode } from "react-icons/io5";
// import { LiaEdit } from "react-icons/lia";
import MDX from "../mdx";
import cx from "classnames";
import { vscode } from "../../utils";
import NodeHandles from "./node-handles";

function TreeNode({ id, data }: NodeProps<CodeBlock>) {
  const { showCode } = data;
  const { toggleCode: _toggleCode, activateNode, toggleNodeSelection, updateCodeBlock } = useTreeNoteStore();
  // const { setNodes, getNodes, getEdge } = useReactFlow();

  const { activeNodeId, selectedNodes, rootIds, width } = useTreeNoteStore(selectCodeBlockState);

  const isSelected = selectedNodes.includes(id);
  const isActive = activeNodeId === id;
  const isRoot = rootIds.includes(id);

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
      action: "web2ext-start-text-editor",
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
        action: "web2ext-start-code-range-editor",
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
        action: "web2ext-stop-code-range-editor",
        data: { id: data.id },
      } as Web2Ext.StopCodeRangeEditor);
    }
  }, [data.filePath, data.id, data.pkgPath, data.ranges, data.type, updateCodeBlock, data.isCodeRangeEditing]);
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
            <span className="text-gray-600 hover:text-gray-900 font-medium text-xs mr-2 ">Hide Code</span>
          </>
        ) : (
          <>
            <IoMdArrowDropright className="hover:scale-125" size={16} />
            <span className="text-gray-600 hover:text-gray-900 font-medium text-xs mr-2 ">Show Code</span>
          </>
        )}
      </div>
    ),
    [showCode, toggleCode]
  );
  const debug = useTreeNoteStore(selectDebug);
  const ID = useMemo(() => {
    if (!debug) return;
    return <pre className=" text-xs border-none rounded-sm px-3 bg-gray-300">{id}</pre>;
  }, [id, debug]);

  const { mdx, copyMdx } = useMemo(() => {
    const mdx = data.showCode ? block2MDX(data) : data.text;
    const copyMdx = () => {
      navigator.clipboard.writeText(mdx);
      vscode.postMessage({
        action: "web2ext-show-info",
        data: "MDX code is copied.",
      } as Web2Ext.ShowMsg);
    };
    return { mdx, copyMdx };
  }, [data]);

  return (
    <div>
      <div
        className={cx(
          "border px-4 py-4 bg-white",
          isActive ? "border-gray-600 shadow-lg shadow-gray-900" : "border-gray-300",
          isRoot ? "bg-indigo-100" : "bg-white",
          isSelected ? "!border-blue-600 !shadow-blue-600" : "bg-white"
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
            <BiCopy className="mr-5 cursor-auto text-gray-500 hover:text-gray-900 hover:scale-125" onClick={copyMdx} />

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
          <MDX mdx={mdx} width={width} />
        </div>
      </div>
      <NodeHandles id={id} />
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
