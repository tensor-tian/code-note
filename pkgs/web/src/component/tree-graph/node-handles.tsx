import { Handle, IsValidConnection, Position } from "reactflow";
import { useTreeNoteStore } from "./store";
import { selectActiveEdge, selectSelectedEdge } from "./selector";
import { useCallback } from "react";
import cx from "classnames";
import { useThemeMode } from "../hooks";

type Props = {
  id: string;
};
export default function NodeHandles({ id }: Props) {
  const activeEdge = useTreeNoteStore(selectActiveEdge);
  const selectedEdge = useTreeNoteStore(selectSelectedEdge);
  const mode = useThemeMode();
  const isX: IsValidConnection = useCallback((edge) => edge.sourceHandle?.endsWith("right") ?? false, []);
  const isY: IsValidConnection = useCallback((edge) => edge.sourceHandle?.endsWith("bottom") ?? false, []);

  const idTop = id + "-top";
  const idLeft = id + "-left";
  const idRight = id + "-right";
  const idBottom = id + "-bottom";

  return (
    <>
      <Handle
        id={idTop}
        type="target"
        isConnectableEnd
        isConnectableStart={false}
        position={Position.Top}
        className={cx(
          "code-handle -top-0.5",
          activeEdge?.targetHandle === idTop
            ? "code-handle-hl -top-1"
            : selectedEdge?.targetHandle === idTop
            ? "!bg-blue !border-blue"
            : "bg-gray-900"
        )}
        isValidConnection={isY}
      />
      <Handle
        id={idLeft}
        type="target"
        isConnectableEnd
        isConnectableStart={false}
        position={Position.Left}
        className={cx(
          "code-handle -left-0.5",
          activeEdge?.targetHandle === idLeft
            ? "code-handle-hl -left-1"
            : selectedEdge?.targetHandle === idLeft
            ? "!bg-blue !border-blue"
            : "bg-gray-900"
        )}
        isValidConnection={isX}
      />
      <Handle
        id={idRight}
        type="source"
        isConnectableStart
        isConnectableEnd={false}
        position={Position.Right}
        className={cx(
          "code-handle -right-0.5",
          activeEdge?.sourceHandle === idRight
            ? "code-handle-hl -right-1"
            : selectedEdge?.sourceHandle === idRight
            ? "!bg-blue !border-blue"
            : "bg-gray-900"
        )}
      />
      <Handle
        id={idBottom}
        type="source"
        position={Position.Bottom}
        isConnectableStart
        isConnectableEnd={false}
        className={cx(
          "code-handle -bottom-0.5",
          activeEdge?.sourceHandle === idBottom
            ? "code-handle-hl -bottom-1"
            : selectedEdge?.sourceHandle === idBottom
            ? "!bg-blue !border-blue"
            : "bg-gray-900"
        )}
      />
    </>
  );
}
