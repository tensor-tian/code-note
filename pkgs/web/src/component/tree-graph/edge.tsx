import { BezierEdge, EdgeProps } from "reactflow";

import { selectHiglightEdge } from "../../service/note-slice";
import { useAppSelector } from "../../service/store";
import { useMemo } from "react";

const CodeEdge = (props: EdgeProps) => {
  const style = props.style;
  const highlight = useAppSelector(selectHiglightEdge);
  const hl = highlight?.id === props.id;
  const newStyle = useMemo(() => {
    if (hl) {
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
  }, [hl, style]);
  return <BezierEdge {...props} style={newStyle} />;
};

export default CodeEdge;
