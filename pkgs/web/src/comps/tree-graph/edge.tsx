import { BezierEdge, EdgeProps } from "reactflow";

import { useMemo } from "react";

const Edge = (props: EdgeProps) => {
  const handleId = props.sourceHandleId;
  const style = props.style;
  const newStyle = useMemo(() => {
    if (handleId?.endsWith("right")) {
      return {
        stroke: "#63b3ed",
        strokeWidth: 2,
        ...style,
      };
    } else if (handleId?.endsWith("bottom")) {
      return {
        stroke: "#b794f4",
        strokeWidth: 2,
        ...style,
      };
    }
    return style;
  }, [handleId, style]);

  return <BezierEdge {...props} style={newStyle} />;
};

export default Edge;
