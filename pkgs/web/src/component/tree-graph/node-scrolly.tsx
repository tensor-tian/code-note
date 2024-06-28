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
    let _mdx = text;
    const copyMdx = () => {
      navigator.clipboard.writeText(mdx);
      vscode.postMessage({
        action: "web2ext-show-info",
        data: "MDX code is copied.",
      } as Web2Ext.ShowMsg);
    };
    if (!renderAsGroup) return { mdx: _mdx, copyMdx };
    if (!codes) {
      return { mdx: "", copyMdx: () => {} };
    }
    _mdx += "\n\n" + groupCodesMDX(id, codes);
    return { mdx: _mdx, copyMdx };
  }, [codes, id, renderAsGroup, text]);
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
  const stickerWidth = Math.max((3 * width) / 5, 420);
  const contentWidth = width - stickerWidth;
  const style = {
    width,
    "--ch-scrollycoding-sticker-width": stickerWidth + "px",
    "--ch-scrollycoding-content-width": contentWidth + "px",
  } as CSSProperties;
  return (
    <NodeBox
      id={id}
      isSelected={isSelected}
      isActive={isActive}
      isRoot={isRoot}
      className="px-2 py-2 bg-white bg-opacity-0 "
      style={style}
    >
      <NodeMenu data={data} copyMdx={copyMdx} />
      {mdx.length > 0 && <MDX mdx={mdx} width={width} id={"scrolly-" + id} />}
      <NodeHandles id={id} />
    </NodeBox>
  );
}

export default ScrollyNode;

function groupCodesMDX(id: string, codes: CodeNode[]): string {
  const maxRows = codes.reduce((rows, code) => Math.max(rows, code.data.rowCount), 10) + 2;
  if (id === "3k") {
    console.log("scrolly coding rows:", id, maxRows);
  }
  return `<CH.Scrollycoding id="${id}" enableScroller={true} rows={${maxRows}} >
${codes.map(({ data }) => `\n${data.text}\n\n${data.code}\n`).join("\n---\n")}
</CH.Scrollycoding>
`;
}
