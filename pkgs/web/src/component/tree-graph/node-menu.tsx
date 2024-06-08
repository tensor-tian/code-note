import { ReactNode, useMemo, useRef, MouseEvent, useCallback } from "react";
import { IoMdArrowDropright, IoMdArrowDropdown } from "react-icons/io";
import { IconType } from "react-icons";
import cls from "classnames";
import { BiCopy, BiText } from "react-icons/bi";
import { useBlockState } from "./hooks";
import { useTreeNoteStore } from "./store";
import { IoCode } from "react-icons/io5";
import { selectDebug } from "./selector";
import { AiOutlineGroup } from "react-icons/ai";
import { FaRegRectangleList } from "react-icons/fa6";
import { TbViewportNarrow, TbViewportWide } from "react-icons/tb";

export type NodeMenuProps = {
  id: string;
  showCode?: () => void;
  hideCode?: () => void;
  codeStatus?: boolean;
  onActivate: (event: MouseEvent<HTMLDivElement>) => void;
  // nodeType: Web2Ext.StartTextEditor["data"]["type"];
  onStartTextEdit: () => void;
  isCodeEditing?: boolean;
  toggleCodeEditing?: () => void;
  copyMdx: () => void;
  renderAsGroup?: boolean;
  toggleRenderMode?: () => void;
};

export default function NodeMenu({
  id,
  showCode,
  hideCode,
  codeStatus,
  onActivate,
  copyMdx,
  onStartTextEdit,
  isCodeEditing,
  toggleCodeEditing,
  renderAsGroup,
  toggleRenderMode,
}: NodeMenuProps) {
  const { adjustNodeWidth } = useTreeNoteStore();
  const { isSelected } = useBlockState(id);
  const debug = useTreeNoteStore(selectDebug);
  const ID = useMemo(() => {
    if (!debug) return;
    return <pre className=" text-xs border-none rounded-sm px-3 bg-gray-300">{id}</pre>;
  }, [id, debug]);
  const expandCode = useMemo(() => {
    if (typeof codeStatus !== "boolean") {
      // text
      return null;
    } else if (codeStatus) {
      return (
        <IconButton Icon={IoMdArrowDropdown} onClick={hideCode}>
          Hide Code
        </IconButton>
      );
    } else {
      return (
        <IconButton Icon={IoMdArrowDropright} onClick={showCode}>
          Show Code
        </IconButton>
      );
    }
  }, [codeStatus, hideCode, showCode]);
  const groupRenderMode = useMemo(() => {
    if (typeof renderAsGroup === "undefined") return null;
    if (renderAsGroup) {
      return (
        <IconButton Icon={AiOutlineGroup} onClick={toggleRenderMode}>
          Render as Codes
        </IconButton>
      );
    } else {
      return (
        <IconButton Icon={FaRegRectangleList} onClick={toggleRenderMode}>
          Render as Group
        </IconButton>
      );
    }
  }, [renderAsGroup, toggleRenderMode]);
  const { toggleNodeSelection } = useTreeNoteStore();

  const toggleSelection = useCallback(() => {
    toggleNodeSelection(id);
  }, [id, toggleNodeSelection]);

  const widen = useCallback(() => {
    adjustNodeWidth(id, true);
  }, [id, adjustNodeWidth]);
  const narrow = useCallback(() => {
    adjustNodeWidth(id, false);
  }, [id, adjustNodeWidth]);

  const checkboxId = "node-menu-" + id;
  return (
    <div className="flex align-baseline text-gray-600 font-medium text-xs" onClick={onActivate}>
      <div className="flex flex-grow justify-start gap-2">
        {expandCode}

        <BiText
          onClick={onStartTextEdit}
          size={15}
          className="text-gray-500 hover:text-gray-900 hover:scale-110 cursor-auto hover:bg-gray-200"
        />
        <IoCode
          className={cls(
            "mr-5 cursor-auto hover:text-gray-900 hover:scale-110 hover:bg-gray-200",
            isCodeEditing ? "text-red scale-110" : "text-gray-500"
          )}
          onClick={toggleCodeEditing}
          size={16}
        />
      </div>
      {ID}
      <div className="flex flex-grow justify-end gap-2">
        {groupRenderMode}
        <IconButton Icon={TbViewportWide} onClick={widen} />
        <IconButton Icon={TbViewportNarrow} onClick={narrow} />
        <BiCopy
          className="cursor-auto text-gray-500 hover:text-gray-900 hover:scale-110 hover:bg-gray-200"
          onClick={copyMdx}
          size={16}
        />
        <div className="flex justify-end align-baseline px hover:bg-gray-200 w-[105px]">
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

type Props = {
  Icon: IconType;
  onClick?: () => void;
  children?: string | ReactNode;
};
function IconButton({ Icon, onClick, children }: Props) {
  return (
    <div
      className="ignore-click flex text-xs hover:text-gray-900  hover:bg-gray-200 cursor-auto text-gray-600 bg-white rounded-sm pr-2 gap-1"
      onClick={onClick}
    >
      <Icon size={16} />
      <span>{children}</span>
    </div>
  );
}
