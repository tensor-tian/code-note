import {
  ConnectionLineComponentProps,
  getBezierPath,
  useStore,
} from "reactflow";

import { useMemo } from "react";

const useStroke = () => {
  const handleId = useStore((state) => state.connectionHandleId);
  const stroke = useMemo(() => {
    console.log("handleId:", handleId);
    if (handleId?.endsWith("right")) {
      return "#63b3ed";
    } else if (handleId?.endsWith("bottom")) {
      return "#b794f4";
    }
    return "#cbd5e0";
  }, [handleId]);
  return stroke;
};

const ConnectionLine = (props: ConnectionLineComponentProps) => {
  const stroke = useStroke();
  const dAttr = useMemo(() => {
    const [attr] = getBezierPath({
      sourceX: props.fromX,
      sourceY: props.fromY,
      sourcePosition: props.fromPosition,
      targetX: props.toX,
      targetY: props.toY,
      targetPosition: props.toPosition,
    });
    return attr;
  }, [props]);

  return (
    <g>
      <path
        d={dAttr}
        stroke={stroke}
        fill="none"
        strokeWidth={2}
        className="animated"
        style={props.connectionLineStyle}
      />
    </g>
  );
};

export default ConnectionLine;
