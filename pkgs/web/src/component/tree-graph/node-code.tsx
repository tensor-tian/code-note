import { CodeBlock, Lang, Web2Ext } from "types";
import { NodeProps } from "reactflow";
import { MouseEvent as ReactMouseEvent, memo, useCallback, useMemo } from "react";
import { useTreeNoteStore } from "./store";

import MDX from "../mdx";
import { vscode } from "../../utils";
import NodeHandles from "./node-handles";
import NodeBox from "./node-box";
import NodeMenu from "./node-menu";
import { selectBlockState } from "./selector";

function CodeNode({ id, data }: NodeProps<CodeBlock>) {
  const { isSelected, isActive, isRoot, width, showCode, lang } = useTreeNoteStore(selectBlockState(id));

  const { mdx, copyMdx } = useMemo(() => {
    const mdx = showCode ? block2MDX(data, lang) : data.text;
    const copyMdx = () => {
      navigator.clipboard.writeText(mdx);
      vscode.postMessage({
        action: "web2ext-show-info",
        data: "MDX code is copied.",
      } as Web2Ext.ShowMsg);
    };
    return { mdx, copyMdx };
  }, [data, lang, showCode]);

  return (
    <NodeBox id={id} isActive={isActive} isRoot={isRoot} isSelected={isSelected} className="p-4" style={{ width }}>
      <NodeMenu data={data} copyMdx={copyMdx} />
      <div className="px-1">
        <MDX mdx={mdx} width={width} id={"code-" + id} />
      </div>
      <NodeHandles id={id} />
    </NodeBox>
    // </div>
  );
}

export default memo(CodeNode);

function cap1stChar(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function extractInnerContent<T extends string>(text: string, category: T, prefix?: string) {
  const tag = prefix ?? "" + cap1stChar(category);
  const ret = text.match(RegExp(`/([\\s\\S]*?)<${tag}>([\\s\\S]*?)<\\/${tag}>([\\s\\S]*?)/gm`));
  const inner = ret ? ret[2] : text;
  const outside = ret ? (ret[1] ?? "") + "\n" + (ret[3] ?? "") : "";
  return {
    inner,
    outside,
  };
}

function block2MDX(block: CodeBlock, lang: Lang): string {
  const rows = block.rowCount > 50 ? "" : "";
  const { inner: langText } = extractInnerContent(block.text, lang, "Lang");
  const { inner: sectionText, outside: text } = extractInnerContent(langText, "sectionText");
  return `
${text}

<CH.Section>

${sectionText}

<div className="source-file-path"><small>source: \`${block.filePath}\`</small></div>
<CH.Code ${rows}>

${block.code}

</CH.Code>

</CH.Section>
  `;
}
