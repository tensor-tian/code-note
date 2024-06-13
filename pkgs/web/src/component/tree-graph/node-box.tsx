import cx from "classnames";
import { CSSProperties, useCallback } from "react";
import { useTreeNoteStore } from "./store";
export type NodeBoxProps = React.PropsWithChildren<{
  id: string;
  isActive: boolean;
  isRoot: boolean;
  isSelected: boolean;
  className?: string;
  style: CSSProperties;
}>;

export default function NodeBox({ id, isActive, isRoot, isSelected, children, className, style }: NodeBoxProps) {
  const { activateNode } = useTreeNoteStore();
  const onActivate = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if ((event.target as HTMLDivElement).classList.contains("ignore-click")) {
        return;
      }
      activateNode(id);
    },
    [activateNode, id]
  );
  return (
    <div
      className={cx(
        "border bg-white " + className,
        isActive ? "border-gray-600 shadow-lg shadow-gray-900 nowheel" : "border-gray-300",
        isRoot ? "bg-indigo-100" : "bg-white",
        isSelected ? "!border-blue-600 !shadow-blue-600" : "bg-white"
      )}
      onClick={onActivate}
      style={style}
    >
      {children}
    </div>
  );
}
