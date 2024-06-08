import { NodeProps } from "reactflow";
import { TextBlock, Web2Ext } from "types";
import NodeHandles from "./node-handles";
import { memo, useCallback } from "react";
import MDX from "../mdx";
import { useTreeNoteStore } from "./store";
import { vscode } from "../../utils";
import NodeBox from "./node-box";
import { useBlockState } from "./hooks";
import { DefaultNodeDimension } from "./layout";
import NodeMenu from "./node-menu";

function TextNode({ id, data: { text: mdx, type } }: NodeProps<TextBlock>) {
  const { activateNode } = useTreeNoteStore();
  const { isSelected, isActive, isRoot, width } = useBlockState(id);
  const copyMdx = useCallback(() => {
    navigator.clipboard.writeText(mdx);
    vscode.postMessage({
      action: "web2ext-show-info",
      data: "MDX code is copied.",
    } as Web2Ext.ShowMsg);
  }, [mdx]);
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
    <NodeBox onActivate={onActivate} isActive={isActive} isRoot={isRoot} isSelected={isSelected} style={{ width }}>
      <div style={{ width: DefaultNodeDimension.W }} className="p-4">
        <NodeMenu id={id} onStartTextEdit={onStartTextEdit} onActivate={onActivate} copyMdx={copyMdx} />
        <div className="px-1">
          <MDX mdx={mdx} width={width} />
        </div>
        <NodeHandles id={id} />
      </div>
    </NodeBox>
  );
}

export default memo(TextNode);
