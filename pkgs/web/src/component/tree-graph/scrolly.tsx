import { useTreeNoteStore } from "./store";
import { selectGroupCodes, selectGroupShowCode } from "./selector";

import { NodeProps } from "reactflow";
import { CodeNode, ScrollyCodeBlock, Web2Ext } from "types";
import { CSSProperties, useCallback, useEffect, useMemo, useRef } from "react";
import NodeHandles from "./node-handles";

import { vscode } from "../../utils";
import MDX from "../mdx";
import { useBlockState } from "./hooks";
import NodeBox from "./node-box";
import NodeMenu from "./node-menu";
import { useResizeObserver } from "usehooks-ts";

function ScrollyNode({ id, data: { type, text, chain, stepIndex, renderAsGroup } }: NodeProps<ScrollyCodeBlock>) {
  const { hideGroupCode, activateNode, toggleRenderAsGroup: _toggleRender, setGroupTextHeight } = useTreeNoteStore();
  const codes = useTreeNoteStore((state) => selectGroupCodes(state, id));
  const showCode = useTreeNoteStore(selectGroupShowCode(id));
  const { isSelected, isActive, isRoot, width } = useBlockState(id);
  const hideCode = useCallback(() => {
    hideGroupCode(id);
  }, [id, hideGroupCode]);

  const onActivate = useCallback(() => {
    if (!renderAsGroup) {
      activateNode(chain[0]);
    } else {
      activateNode(id);
    }
  }, [activateNode, chain, id, renderAsGroup]);

  const toggleRenderMode = useCallback(() => {
    _toggleRender(id);
  }, [id, _toggleRender]);

  const onStartTextEdit = useCallback(() => {
    vscode.postMessage({
      action: "web2ext-start-text-editor",
      data: {
        id,
        text,
        type,
      },
    } as Web2Ext.StartTextEditor);
  }, [id, text, type]);
  console.log("scrolly width:", width);
  const { content: scrollyContent, copyMdx } = useMemo(() => {
    if (!renderAsGroup) return { content: null, copyMdx: () => {} };
    console.log("codes:", codes);
    if (!codes) {
      return { content: null, copyMdx: () => {} };
    }
    const mdx = groupCodesMDX(id, codes);

    const copyMdx = () => {
      navigator.clipboard.writeText(mdx);
      vscode.postMessage({
        action: "web2ext-show-info",
        data: "MDX code is copied.",
      } as Web2Ext.ShowMsg);
    };
    const content = <MDX mdx={mdx} width={width} />;
    return { content, copyMdx };
  }, [codes, id, renderAsGroup, width]);
  const textRef = useRef<HTMLDivElement>(null);
  const { height } = useResizeObserver({
    ref: textRef,
    box: "border-box",
  });
  useEffect(() => {
    if (typeof height === "number") {
      setGroupTextHeight(id, height);
    }
  }, [height, id, setGroupTextHeight]);
  const textContent = useMemo(() => {
    return (
      <div ref={textRef}>
        <MDX mdx={text} width={width} />
      </div>
    );
  }, [text, width]);
  return (
    <NodeBox
      onActivate={onActivate}
      isSelected={isSelected}
      isActive={isActive}
      isRoot={isRoot}
      className="w-full h-full px-2 py-2 bg-white bg-opacity-0"
      style={{ width, "--ch-scrollycoding-sticker-width": Math.max(width / 2, 420) + "px" } as CSSProperties}
    >
      <NodeMenu
        id={id}
        hideCode={hideCode}
        codeStatus={showCode}
        onActivate={onActivate}
        copyMdx={copyMdx}
        onStartTextEdit={onStartTextEdit}
        renderAsGroup={renderAsGroup}
        toggleRenderMode={toggleRenderMode}
      />
      {textContent}
      {scrollyContent}
      <NodeHandles id={id} />
    </NodeBox>
  );
}

export default ScrollyNode;

function groupCodesMDX(id: string, codes: CodeNode[]): string {
  return `<CH.Scrollycoding id="${id}" enableScroller={false} >
${codes.map(({ data }) => `\n${data.text}\n\n${data.code}\n`).join("\n---\n")}
</CH.Scrollycoding>
`;
}
