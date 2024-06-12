import { ReactNode, useMemo, useCallback } from "react";
import { IoMdArrowDropright, IoMdArrowDropdown } from "react-icons/io";
import { IconType } from "react-icons";
import cls from "classnames";
import { BiCopy, BiText } from "react-icons/bi";
import { useTreeNoteStore } from "./store";
import { IoCode } from "react-icons/io5";
import { selectBlockState, selectDebug } from "./selector";
import { AiOutlineGroup } from "react-icons/ai";
import { FaRegRectangleList } from "react-icons/fa6";
import { TbViewportNarrow, TbViewportWide } from "react-icons/tb";
import { Block, CodeBlock, Web2Ext } from "types";
import { vscode } from "../../utils";

export type NodeMenuProps = {
  data: Block;
  copyMdx: () => void;
};

export default function NodeMenu({ data, copyMdx }: NodeMenuProps) {
  const { id, text, type: typ } = data;
  const { adjustNodeWidth, activateNode, toggleCodeShow, toggleNodeSelection } = useTreeNoteStore();
  const { isSelected, renderAsGroup, isCodeRangeEditing, isTextEditing, showCode } = useTreeNoteStore(
    selectBlockState(id)
  );
  const debug = useTreeNoteStore(selectDebug);
  const ID = useMemo(() => {
    if (!debug) return;
    return <pre className=" text-xs border-none rounded-sm px-3 bg-gray-300">{id}</pre>;
  }, [id, debug]);
  const onActivate = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if ((event.target as HTMLDivElement).classList.contains("ignore-click")) {
        return;
      }
      activateNode(id);
    },
    [activateNode, id]
  );
  const codeShowElement = useMemo(() => {
    if (typ !== "Code" && typ !== "Scrolly") {
      return null;
    }
    return showCode ? (
      <IconButton Icon={IoMdArrowDropdown} onClick={() => toggleCodeShow(id)}>
        Hide Code
      </IconButton>
    ) : (
      <IconButton Icon={IoMdArrowDropright} onClick={() => toggleCodeShow(id)}>
        Show Code
      </IconButton>
    );
  }, [typ, showCode, toggleCodeShow, id]);

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
        {codeShowElement}

        <TextEditIcon id={id} type={typ} text={text} isTextEditing={isTextEditing} />
        {typ === "Code" ? <CodeEditIcon data={data} isCodeRangeEditing={isCodeRangeEditing} /> : null}
      </div>
      {ID}
      <div className="flex flex-grow justify-end gap-2">
        {typ === "Scrolly" ? <GroupRenderIcon id={id} renderAsGroup={renderAsGroup} /> : null}
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

function GroupRenderIcon({ id, renderAsGroup }: { id: string; renderAsGroup: boolean }) {
  const { toggleRenderAsGroup } = useTreeNoteStore();
  const onClick = useCallback(() => {
    toggleRenderAsGroup(id);
  }, [id, toggleRenderAsGroup]);
  if (renderAsGroup) {
    return (
      <IconButton Icon={AiOutlineGroup} onClick={onClick}>
        Render as Codes
      </IconButton>
    );
  } else {
    return (
      <IconButton Icon={FaRegRectangleList} onClick={onClick}>
        Render as Group
      </IconButton>
    );
  }
}

function TextEditIcon({
  id,
  type: typ,
  text,
  isTextEditing,
}: Pick<Block, "id" | "type" | "text"> & { isTextEditing: boolean }) {
  const onStartTextEdit = useCallback(() => {
    vscode.postMessage({
      action: "web2ext-text-edit-start",
      data: { id, text, type: typ },
    } as Web2Ext.TextEditStart);
  }, [id, text, typ]);
  const onStopTextEdit = useCallback(() => {
    vscode.postMessage({
      action: "web2ext-text-edit-stop",
      data: { id, type: typ },
    } as Web2Ext.TextEditStop);
  }, [id, typ]);
  return (
    <BiText
      onClick={isTextEditing ? onStopTextEdit : onStartTextEdit}
      size={15}
      className="text-gray-500 hover:text-gray-900 hover:scale-110 cursor-auto hover:bg-gray-200"
    />
  );
}
function CodeEditIcon({
  data: { id, type: typ, filePath, pkgPath, ranges },
  isCodeRangeEditing,
}: {
  data: CodeBlock;
  isCodeRangeEditing: boolean;
}) {
  const onClick = useCallback(() => {
    if (isCodeRangeEditing) {
      vscode.postMessage({
        action: "web2ext-code-range-edit-stop",
        data: { id },
      } as Web2Ext.CodeRangeEditStop);
    } else {
      vscode.postMessage({
        action: "web2ext-code-range-edit-start",
        data: {
          id: id,
          type: typ,
          filePath,
          pkgPath,
          ranges,
        },
      } as Web2Ext.CodeRangeEditStart);
    }
  }, [filePath, id, isCodeRangeEditing, pkgPath, ranges, typ]);
  return (
    <IoCode
      className={cls(
        "mr-5 cursor-auto hover:text-gray-900 hover:scale-110 hover:bg-gray-200",
        isCodeRangeEditing ? "text-red scale-110" : "text-gray-500"
      )}
      onClick={onClick}
      size={16}
    />
  );
}
