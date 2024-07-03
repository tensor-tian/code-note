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
      let ignore = false;
      const boxElm = event.currentTarget;
      for (let elm = event.target as HTMLElement; elm !== boxElm; elm = elm.parentElement as HTMLElement) {
        if (elm.classList.contains("ignore-activate")) {
          ignore = true;
          break;
        }
      }
      if (ignore) {
        return;
      }
      activateNode(id);
    },
    [activateNode, id]
  );
  return (
    <div
      className={cx(
        "node-box  border cn-bg",
        isActive
          ? "nowheel border-gray-600 shadow-md shadow-gray-900 dark:border-gray-300 dark:shadow-gray-300"
          : "border-gray-300 dark:border-gray-600",
        isRoot ? "!bg-red-100" : "bg-white",
        isSelected && "!border-blue-600 !shadow-blue-600",
        className
      )}
      onClick={onActivate}
      style={style}
    >
      {children}
    </div>
  );
}
