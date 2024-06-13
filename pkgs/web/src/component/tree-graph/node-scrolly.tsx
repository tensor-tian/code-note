import { useTreeNoteStore } from "./store";
import { selectBlockState, selectGroupCodes } from "./selector";

import { NodeProps } from "reactflow";
import { CodeNode, ScrollyCodeBlock, Web2Ext } from "types";
import { CSSProperties, useEffect, useMemo, useRef } from "react";
import NodeHandles from "./node-handles";

import { vscode } from "../../utils";
import MDX from "../mdx";
import NodeBox from "./node-box";
import NodeMenu from "./node-menu";
import { useResizeObserver } from "usehooks-ts";

function ScrollyNode({ id, data }: NodeProps<ScrollyCodeBlock>) {
  const { text } = data;
  const { setGroupTextHeight } = useTreeNoteStore();
  const codes = useTreeNoteStore(selectGroupCodes(id));
  const { isSelected, isActive, isRoot, width, renderAsGroup } = useTreeNoteStore(selectBlockState(id));

  const { mdx, copyMdx } = useMemo(() => {
    if (!renderAsGroup) return { mdx: "", copyMdx: () => {} };
    if (!codes) {
      return { mdx: "", copyMdx: () => {} };
    }
    const mdx = groupCodesMDX(id, codes);

    const copyMdx = () => {
      navigator.clipboard.writeText(mdx);
      vscode.postMessage({
        action: "web2ext-show-info",
        data: "MDX code is copied.",
      } as Web2Ext.ShowMsg);
    };
    return { mdx, copyMdx };
  }, [codes, id, renderAsGroup]);
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
        <MDX mdx={text} width={width} id={"scrolly-text-" + id} />
      </div>
    );
  }, [id, text, width]);
  return (
    <NodeBox
      id={id}
      isSelected={isSelected}
      isActive={isActive}
      isRoot={isRoot}
      className="w-full h-full px-2 py-2 bg-white bg-opacity-0 nowheel"
      style={{ width, "--ch-scrollycoding-sticker-width": Math.max((3 * width) / 5, 420) + "px" } as CSSProperties}
    >
      <NodeMenu data={data} copyMdx={copyMdx} />
      {textContent}
      {mdx.length > 0 && <MDX mdx={mdx} width={width} id={"scrolly-code-" + id} />}
      <NodeHandles id={id} />
    </NodeBox>
  );
}

export default ScrollyNode;

function groupCodesMDX(id: string, codes: CodeNode[]): string {
  return `<CH.Scrollycoding id="${id}" enableScroller={true} >
${codes.map(({ data }) => `\n${data.text}\n\n${data.code}\n`).join("\n---\n")}
</CH.Scrollycoding>
`;
}
