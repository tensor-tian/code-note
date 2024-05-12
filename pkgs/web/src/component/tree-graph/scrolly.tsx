import { IoMdArrowDropdown, IoMdArrowDropright } from "react-icons/io";
import {
  actToggleCode,
  actToggleNodeSelection,
  selectIsSeleced,
  selectShowCode,
} from "../../service/note-slice";
import { useAppDispatch, useAppSelector } from "../../service/store";
import { useCallback, useMemo } from "react";

import { NodeProps } from "reactflow";
import { ScrollyCodeBlock } from "types";
import cx from "classnames";

function ScrollyNode({ id, data }: NodeProps<ScrollyCodeBlock>) {
  const dispatch = useAppDispatch();
  const isSelected = useAppSelector(selectIsSeleced(id));
  const showCode = useAppSelector(selectShowCode(id));
  const checkboxId = "scrolly-" + id;
  const toggleCode = useCallback(() => {
    dispatch(actToggleCode(id));
  }, [dispatch, id]);
  const toggleSelection = useCallback(() => {
    dispatch(actToggleNodeSelection(id));
  }, [id, dispatch]);
  const showCodeIcon = useMemo(
    () => (
      <div className="w-100 flex" onClick={toggleCode}>
        {showCode ? (
          <>
            <IoMdArrowDropdown className="hover:scale-125" size={16} />
            <span className="text-gray-600 hover:text-gray-900 font-medium text-xs mr-2 ">
              Hide Code
            </span>
          </>
        ) : (
          <>
            <IoMdArrowDropright className="hover:scale-125" size={16} />
            <span className="text-gray-600 hover:text-gray-900 font-medium text-xs mr-2 ">
              Show Code
            </span>
          </>
        )}
      </div>
    ),
    [showCode, toggleCode]
  );
  return (
    <div className={cx("w-full h-6  px-2 py-2 bg-white bg-opacity-0")}>
      <div className="flex justify-between">
        {showCodeIcon}
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
