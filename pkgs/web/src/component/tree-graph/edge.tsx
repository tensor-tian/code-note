import { BezierEdge, EdgeProps } from "reactflow";

import { selectEdgeHilight } from "../../service/note-slice";
import { useAppSelector } from "../../service/store";
import { useMemo } from "react";

const Edge = (props: EdgeProps) => {
  const style = props.style;
  const { id } = useAppSelector(selectEdgeHilight);
  const highlight = id === props.id;
  const newStyle = useMemo(() => {
    if (highlight) {
      return {
        stroke: "#1a202c",
        strokeWidth: 2,
        ...style,
      };
    } else {
      return {
        stroke: "#cbd5e0",
        strokeWidth: 1,
        ...style,
      };
    }
  }, [highlight, style]);
  return <BezierEdge {...props} style={newStyle} />;
};

export default Edge;
