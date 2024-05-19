import { EdgeLabelRenderer, useNodes } from "reactflow";
import {
  selectActiveNodeId,
  selectSelectedNodes,
  useTreeNoteStore,
} from "./store";

import { Node } from "types";

export default function NodeInspector() {
  const nodes: Node[] = useNodes();

  const selectedNodes = new Set(useTreeNoteStore(selectSelectedNodes));
  const activeNodeId = useTreeNoteStore(selectActiveNodeId);
  return (
    <EdgeLabelRenderer>
      <div className="react-flow__devtools-nodeinspector">
        {nodes.map((node) => {
          const x = node.positionAbsolute?.x || 0;
          const y = node.positionAbsolute?.y || 0;
          const width = node.width || 0;
          const height = node.height || 0;
          const selected = selectedNodes.has(node.id);
          const isActive = activeNodeId === node.id;

          return (
            <NodeInfo
              key={node.id}
              id={node.id}
              selected={selected}
              active={isActive}
              type={node.type || "default"}
              x={x}
              y={y}
              width={width}
              height={height}
            />
          );
        })}
      </div>
    </EdgeLabelRenderer>
  );
}

type NodeInfoProps = {
  id: string;
  type: string;
  selected: boolean;
  active: boolean;
  x: number;
  y: number;
  width?: number;
  height?: number;
};

function NodeInfo({
  id,
  type,
  selected,
  active,
  x,
  y,
  width,
  height,
}: NodeInfoProps) {
  if (!width || !height) {
    return null;
  }

  return (
    <div
      className="react-flow__devtools-nodeinfo"
      style={{
        position: "absolute",
        transform: `translate(${x + 10}px, ${y + 50}px)`,
        width: width - 20,
        backgroundColor: "white",
        zIndex: 10,
      }}
    >
      <div>id: {id}</div>
      <div>type: {type}</div>
      <div>selected: {selected ? "true" : "false"}</div>
      <div>active: {active ? "true" : "false"}</div>
      <div>
        position: {x.toFixed(1)}, {y.toFixed(1)}
      </div>
      <div>
        dimensions: {width} × {height}
      </div>
    </div>
  );
}
