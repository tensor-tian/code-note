import { NodeProps } from "reactflow";
import { TemplateBlock } from "types";
import { memo } from "react";

function TemplateNode({ id, data: { text } }: NodeProps<TemplateBlock>) {
  return <div className="border border-gray-900 text-base font-bold bg-green-300 px-3 py-2">{text}</div>;
}

export default memo(TemplateNode);
