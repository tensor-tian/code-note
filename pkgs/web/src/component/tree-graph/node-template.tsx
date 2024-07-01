import { NodeProps } from "reactflow";
import { TemplateBlock } from "types";
import { memo } from "react";
import MDX from "../mdx";

function TemplateNode({ id, data: { text } }: NodeProps<TemplateBlock>) {
  return (
    <div className="border border-gray-900 text-sm  bg-white hover:bg-gray-900 hover:text-white px-3 py-2 rounded w-[200px]">
      <MDX mdx={text} width={200} id={id} />
    </div>
  );
}

export default memo(TemplateNode);
