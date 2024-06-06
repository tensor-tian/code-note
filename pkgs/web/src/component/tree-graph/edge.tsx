import type { EdgeMouseHandler, EdgeProps } from "reactflow";
import { selectActiveEdgeId, selectActiveNodeId, selectEdges } from "./selector";
import { useTreeNoteStore } from "./store";
import { useCallback, useMemo } from "react";

import { BezierEdge } from "reactflow";

const CodeEdge = (props: EdgeProps) => {
  const style = props.style;
  const isActive = useTreeNoteStore(selectActiveEdgeId) === props.id;
  const isSelected = useTreeNoteStore((state) => state.selectedEdge) === props.id;
  const newStyle = useMemo(() => {
    if (isActive) {
      return {
        stroke: "#1a202c",
        strokeWidth: 4,
        ...style,
      };
    } else {
      if (isSelected) {
        return {
          stroke: "#63b3ed",
          strokeWidth: 2,
          ...style,
        };
      }
      return {
        stroke: "#1a202c",
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
  const onEdgeMouseEnter: EdgeMouseHandler = useCallback((_event, edge) => setKV("activeEdgeId", edge.id), [setKV]);
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
