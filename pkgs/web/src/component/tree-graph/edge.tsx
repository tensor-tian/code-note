import type { EdgeMouseHandler, EdgeProps } from "reactflow";
import { selectActiveNodeId, selectEdges, useTreeNoteStore } from "./store";
import { useCallback, useMemo } from "react";

import { BezierEdge } from "reactflow";

const CodeEdge = (props: EdgeProps) => {
  const style = props.style;
  const isActive = useTreeNoteStore((state) => state.activeEdgeId) === props.id;
  const isSelected =
    useTreeNoteStore((state) => state.selectedEdge) === props.id;
  const newStyle = useMemo(() => {
    if (isActive) {
      return {
        stroke: "#1a202c",
        strokeWidth: 2,
        ...style,
      };
    } else {
      if (isSelected) {
        return {
          stroke: "#1a202c",
          strokeWidth: 2,
          ...style,
        };
      }
      return {
        stroke: "#cbd5e0",
        strokeWidth: 1,
        ...style,
      };
    }
  }, [isActive, isSelected, style]);
  return <BezierEdge {...props} style={newStyle} />;
};

export default CodeEdge;

export function useEdge() {
  const edges = useTreeNoteStore(selectEdges);
  const activeNodeId = useTreeNoteStore(selectActiveNodeId);
  const { setKV, onEdgeChange, activateNode } = useTreeNoteStore();
  const onEdgeClick: EdgeMouseHandler = useCallback(
    (_event, edge) => {
      setKV("selectedEdge", edge.id);
      if (activeNodeId === edge.source) {
        activateNode(edge.target);
      } else if (activeNodeId === edge.target) {
        activateNode(edge.source);
      }
    },
    [setKV, activateNode, activeNodeId]
  );
  const onEdgeMouseEnter: EdgeMouseHandler = useCallback(
    (_event, edge) => setKV("activeEdgeId", edge.id),
    [setKV]
  );
  const onEdgeMouseLeave: EdgeMouseHandler = useCallback(() => {
    setKV("activeEdgeId", "");
  }, [setKV]);
  return {
    edges,
    onEdgeClick,
    onEdgeMouseEnter,
    onEdgeMouseLeave,
    onEdgeChange,
  };
}
