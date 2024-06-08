import { NodeProps } from "reactflow";
import { TextBlock, Web2Ext } from "types";
import NodeHandles from "./node-handles";
import { memo, useCallback } from "react";
import MDX from "../mdx";
import { useTreeNoteStore } from "./store";
import { vscode } from "../../utils";
import { BiCopy, BiText } from "react-icons/bi";
import NodeBox from "./node-box";
import { useBlockState } from "./hooks";

function TextNode({ id, data: { text: mdx, type } }: NodeProps<TextBlock>) {
  const { toggleNodeSelection, activateNode } = useTreeNoteStore();
  const { isSelected, isActive, isRoot, width } = useBlockState(id);
  const copyMdx = useCallback(() => {
    navigator.clipboard.writeText(mdx);
    vscode.postMessage({
      action: "web2ext-show-info",
      data: "MDX code is copied.",
    } as Web2Ext.ShowMsg);
  }, [mdx]);
  const checkboxId = `text-${id}-checkbox`;
  const toggleSelection = useCallback(() => {
    toggleNodeSelection(id);
  }, [id, toggleNodeSelection]);
  const onActivate = useCallback(() => {
    activateNode(id);
  }, [id, activateNode]);
  const onStartTextEdit = useCallback(() => {
    console.log("start text edit");
    vscode.postMessage({
      action: "web2ext-start-text-editor",
      data: {
        id,
        text: mdx,
        type,
      },
    } as Web2Ext.StartTextEditor);
  }, [id, mdx, type]);
  return (
    <NodeBox onActivate={onActivate} isActive={isActive} isRoot={isRoot} isSelected={isSelected}>
      <div style={{ width }} className="p-4">
        <div className="flex justify-end mb-3">
          <BiText
            className="mr-5 cursor-auto text-gray-500 hover:text-gray-900 hover:scale-125"
            onClick={onStartTextEdit}
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
        <div>
          <MDX mdx={mdx} />
        </div>
        <NodeHandles id={id} />
      </div>
    </NodeBox>
  );
}

export default memo(TextNode);
