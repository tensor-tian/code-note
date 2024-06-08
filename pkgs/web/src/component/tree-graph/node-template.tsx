import { NodeProps } from "reactflow";
import { TemplateBlock } from "types";
import { memo } from "react";

function TemplateNode({ id, data: { text } }: NodeProps<TemplateBlock>) {
  return (
    <div className="border border-gray-900 text-sm  bg-white hover:bg-gray-900 hover:text-white px-3 py-2 rounded">
      {text}
    </div>
  );
}

export default memo(TemplateNode);
