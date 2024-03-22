import { Handle, NodeProps, Position } from "reactflow";
import { memo, useCallback } from "react";

import { Block } from "types";
import type { IsValidConnection } from "reactflow";

function TreeNode({ data, xPos, yPos }: NodeProps<Block>) {
  const isX: IsValidConnection = useCallback(
    (edge) => edge.sourceHandle?.endsWith("right") ?? false,
    []
  );
  const isY: IsValidConnection = useCallback(
    (edge) => edge.sourceHandle?.endsWith("bottom") ?? false,
    []
  );
  return (
    <>
      <Handle
        id={data.id + "-top"}
        type="target"
        isConnectableEnd
        isConnectableStart={false}
        position={Position.Top}
        className="bg-purple border-purple w-2 h-2 -top-1"
        isValidConnection={isY}
      />
      <div className="border border-1px border-black rounded px-2 py-2">
        <span>{data.text}</span>
      </div>
      <Handle
        id={data.id + "-left"}
        type="target"
        isConnectableEnd
        isConnectableStart={false}
        position={Position.Left}
        className="bg-blue border-blue w-2 h-2 -left-1"
        isValidConnection={isX}
      />
      <Handle
        id={data.id + "-right"}
        type="source"
        isConnectableStart
        isConnectableEnd={false}
        position={Position.Right}
        className="bg-blue border-blue w-2 h-2 -right-1"
      />
      <Handle
        id={data.id + "-bottom"}
        type="source"
        position={Position.Bottom}
        isConnectableStart
        isConnectableEnd={false}
        className="bg-purple border-purple w-2 h-2 -bottom-1"
      />
    </>
  );
}

export default memo(TreeNode);
