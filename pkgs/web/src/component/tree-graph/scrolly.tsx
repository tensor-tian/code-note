import { selectGroupShowCode, useTreeNoteStore } from "./store";

import { IoMdArrowDropdown } from "react-icons/io";
import { NodeProps } from "reactflow";
import { ScrollyCodeBlock } from "types";
import cx from "classnames";
import { useCallback } from "react";

function ScrollyNode({ id, data }: NodeProps<ScrollyCodeBlock>) {
  const { selectedNodes, toggleNodeSelection, hideGroupCode } =
    useTreeNoteStore();

  console.log("scrolly node id:", id);
  const isSelected = selectedNodes.includes(id);
  const showCode = useTreeNoteStore(selectGroupShowCode(id));
  const checkboxId = "scrolly-" + id;
  const hideCode = useCallback(() => {
    hideGroupCode(id);
  }, [id, hideGroupCode]);

  const toggleSelection = useCallback(() => {
    toggleNodeSelection(id);
  }, [toggleNodeSelection, id]);

  return (
    <div className={cx("w-full h-6  px-2 py-2 bg-white bg-opacity-0")}>
      <div className="flex justify-between">
        {showCode && (
          <div className="w-100 flex" onClick={hideCode}>
            <IoMdArrowDropdown className="hover:scale-125" size={16} />
            <span className="text-gray-600 hover:text-gray-900 font-medium text-xs mr-2 ">
              Hide Code
            </span>
          </div>
        )}
        <div className="flex align-baseline">
          <label
            htmlFor={checkboxId}
            className="ignore-click text-gray-600 hover:text-gray-900 font-medium text-xs mr-2 "
          >
            {isSelected ? "Deselect Block" : "Select Block"}
          </label>
          <input
            id={checkboxId}
            className="ignore-click"
            type="checkbox"
            checked={isSelected}
            onChange={toggleSelection}
          />
        </div>
      </div>
    </div>
  );
}

export default ScrollyNode;
