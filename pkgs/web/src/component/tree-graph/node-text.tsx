import { NodeProps } from "reactflow";
import { TextBlock, Web2Ext } from "types";
import NodeHandles from "./node-handles";
import { memo, useCallback } from "react";
import MDX from "../mdx";
import { useTreeNoteStore } from "./store";
import { vscode } from "../../utils";
import NodeBox from "./node-box";
import { DefaultNodeDimension } from "./layout";
import NodeMenu from "./node-menu";
import { selectBlockState } from "./selector";

function TextNode({ id, data }: NodeProps<TextBlock>) {
  const { text: mdx } = data;
  const { activateNode } = useTreeNoteStore();
  const { isSelected, isActive, isRoot, width } = useTreeNoteStore(selectBlockState(id));
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
  return (
    <NodeBox
      onActivate={onActivate}
      isActive={isActive}
      isRoot={isRoot}
      isSelected={isSelected}
      style={{ width }}
      className="nowheel"
    >
      <div style={{ width: DefaultNodeDimension.W }} className="p-4">
        <NodeMenu data={data} copyMdx={copyMdx} />
        <div className="px-1">
          <MDX mdx={mdx} width={width} />
        </div>
        <NodeHandles id={id} />
      </div>
    </NodeBox>
  );
}

export default memo(TextNode);
