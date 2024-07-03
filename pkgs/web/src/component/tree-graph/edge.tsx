import type { EdgeMouseHandler, EdgeProps } from "reactflow";
import { selectActiveEdgeId, selectActiveNodeId, selectEdges } from "./selector";
import { useTreeNoteStore } from "./store";
import { useCallback, useContext, useMemo } from "react";

import { BezierEdge } from "reactflow";
import { useThemeMode } from "../context";

const gray100 = "#f7fafc";
const gray900 = "#1a202c";
const blue400 = "#63b3ed";
const gray600 = "#718096";

const CodeEdge = (props: EdgeProps) => {
  const style = props.style;
  const isActive = useTreeNoteStore(selectActiveEdgeId) === props.id;
  const isSelected = useTreeNoteStore((state) => state.selectedEdge) === props.id;
  const mode = useThemeMode();
  const newStyle = useMemo(() => {
    if (isActive) {
      return {
        stroke: mode === "light" ? gray900 : gray100,
        strokeWidth: 4,
        ...style,
      };
    } else {
      if (isSelected) {
        return {
          stroke: blue400,
          strokeWidth: 2,
          ...style,
        };
      }
      return {
        stroke: mode === "light" ? gray100 : gray600,
        strokeWidth: 1,
        ...style,
      };
    }
  }, [isActive, isSelected, mode, style]);
  return <BezierEdge {...props} style={newStyle} />;
};

export default CodeEdge;

export function useEdge() {
  const edges = useTreeNoteStore(selectEdges);
  const activeNodeId = useTreeNoteStore(selectActiveNodeId);
  const { setKV, onEdgeChange, activateNode } = useTreeNoteStore();
  const onEdgeClick: EdgeMouseHandler = useCallback(
    (_event, edge) => {
      console.log("click edge:", edge);
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
