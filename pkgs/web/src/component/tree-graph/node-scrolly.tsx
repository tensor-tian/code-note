import { useTreeNoteStore } from "./store";
import { selectBlockState, selectGroupCodes } from "./selector";

import { NodeProps } from "reactflow";
import { CodeNode, ScrollyCodeBlock, Web2Ext } from "types";
import { CSSProperties, useEffect, useMemo, useRef } from "react";
import NodeHandles from "./node-handles";

import { extractInnerContent, unwrap, vscode } from "../../utils";
import MDX from "../mdx";
import NodeBox from "./node-box";
import NodeMenu from "./node-menu";
import { useResizeObserver } from "usehooks-ts";

function ScrollyNode({ id, data }: NodeProps<ScrollyCodeBlock>) {
  const { text } = data;
  const { setGroupTextHeight } = useTreeNoteStore();
  const codes = useTreeNoteStore(selectGroupCodes(id));
  const { isSelected, isActive, isRoot, width, renderAsGroup, lang } = useTreeNoteStore(selectBlockState(id));

  const { mdx, copyMdx, scrollRootHeight } = useMemo(() => {
    let _mdx = text;
    const copyMdx = () => {
      navigator.clipboard.writeText(mdx);
      vscode.postMessage({
        action: "web2ext-show-info",
        data: "MDX code is copied.",
      } as Web2Ext.ShowMsg);
    };
    let scrollRootHeight: number | undefined = undefined;
    if (!renderAsGroup) return { mdx: _mdx, copyMdx };
    if (!codes) {
      return { mdx: "", copyMdx: () => {}, scrollRootHeight: undefined };
    }
    scrollRootHeight = Math.min(800, codes.length * 200 + 50);
    _mdx += "\n\n" + groupCodesMDX(id, codes, scrollRootHeight, lang);
    return { mdx: _mdx, copyMdx, scrollRootHeight };
  }, [codes, id, renderAsGroup, text]);
  const textRef = useRef<HTMLDivElement>(null);
  const { height } = useResizeObserver({
    ref: textRef,
    box: "border-box",
  });
  useEffect(() => {
    if (!renderAsGroup && typeof height === "number" && height > 0) {
      setGroupTextHeight(id, height);
    }
  }, [height, id, renderAsGroup, setGroupTextHeight]);
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
      className="h-full w-full px-2 py-2 bg-white bg-opacity-0 "
      style={style}
    >
      <NodeMenu data={data} copyMdx={copyMdx} />
      {renderAsGroup
        ? mdx.length > 0 && <MDX mdx={mdx} width={width} id={"scrolly-" + id} scrollRootHeight={scrollRootHeight} />
        : mdx.length > 0 && (
            <div ref={textRef}>
              <MDX mdx={mdx} width={width} id={"scrolly-" + id} scrollRootHeight={scrollRootHeight} />
            </div>
          )}
      <NodeHandles id={id} />
    </NodeBox>
  );
}

export default ScrollyNode;

function groupCodesMDX(id: string, codes: CodeNode[], scrollRootHeight: number, lang: string): string {
  const maxRows = codes.reduce((rows, code) => Math.max(rows, code.data.rowCount), 10) + 2;
  const text = codes
    .map(({ data }) => {
      let { inner: langText } = extractInnerContent(data.text, lang, "Lang");
      const text = unwrap(langText, "SectionText");
      return `\n${data.code}\n${text}\n`;
    })
    .join("\n---\n");
  return `<CH.Scrollycoding id="${id}" enableScroller={true} rows={${maxRows}} height={${scrollRootHeight}} >${text}</CH.Scrollycoding>`;
}
