import cx from "classnames";
import { MouseEvent as ReactMouseEvent } from "react";
export type NodeBoxProps = React.PropsWithChildren<{
  isActive: boolean;
  isRoot: boolean;
  isSelected: boolean;
  onActivate: (event: ReactMouseEvent<HTMLDivElement>) => void;
  className?: string;
}>;

export default function NodeBox({ isActive, isRoot, isSelected, onActivate, children, className }: NodeBoxProps) {
  return (
    <div
      className={cx(
        "border bg-white " + className,
        isActive ? "border-gray-600 shadow-lg shadow-gray-900" : "border-gray-300",
        isRoot ? "bg-indigo-100" : "bg-white",
        isSelected ? "!border-blue-600 !shadow-blue-600" : "bg-white"
      )}
      onClick={onActivate}
    >
      {children}
    </div>
  );
}
