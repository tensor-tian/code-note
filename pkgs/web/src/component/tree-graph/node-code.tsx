import { CodeBlock, Web2Ext } from "types";
import { NodeProps } from "reactflow";
import { MouseEvent as ReactMouseEvent, memo, useCallback, useMemo } from "react";
import { useTreeNoteStore } from "./store";

import MDX from "../mdx";
import { vscode } from "../../utils";
import NodeHandles from "./node-handles";
import NodeBox from "./node-box";
import { useBlockState } from "./hooks";
import NodeMenu from "./node-menu";

function CodeNode({ id, data }: NodeProps<CodeBlock>) {
  const { showCode } = data;
  const { toggleCode: _toggleCode, activateNode, updateCodeBlock } = useTreeNoteStore();
  const { isSelected, isActive, isRoot, width } = useBlockState(id);
  const toggleCode = useCallback(() => {
    _toggleCode(id);
  }, [id, _toggleCode]);
  const onActivate = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
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

  const toggleCodeEditing = useCallback(() => {
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
    <NodeBox
      isActive={isActive}
      isRoot={isRoot}
      isSelected={isSelected}
      onActivate={onActivate}
      className="p-4 nowheel"
      style={{ width }}
    >
      <NodeMenu
        id={id}
        showCode={toggleCode}
        hideCode={toggleCode}
        codeStatus={showCode}
        onStartTextEdit={onStartTextEdit}
        onActivate={onActivate}
        copyMdx={copyMdx}
        isCodeEditing={data.isCodeRangeEditing}
        toggleCodeEditing={toggleCodeEditing}
      />
      <div className="px-1">
        <MDX mdx={mdx} width={width} />
      </div>
      <NodeHandles id={id} />
    </NodeBox>
    // </div>
  );
}

export default memo(CodeNode);

function block2MDX(block: CodeBlock): string {
  const rows = block.rowCount > 50 ? "" : "";
  return `
<CH.Section>


${block.text}

<div className="mt-4"><small>\`${block.filePath}\`</small></div>
<CH.Code ${rows}>

${block.code}

</CH.Code>

</CH.Section>
  `;
}
