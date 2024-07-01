import { ReactNode, useMemo, useCallback, MouseEvent as ReactMouseEvent } from "react";
import { IoMdArrowDropright, IoMdArrowDropdown } from "react-icons/io";
import { IconType } from "react-icons";
import cls from "classnames";
import { BiCopy, BiText } from "react-icons/bi";
import { FaTextSlash } from "react-icons/fa6";
import { useTreeNoteStore } from "./store";
// import { IoCode } from "react-icons/io5";
import { selectBlockState, selectDebug } from "./selector";
import { AiOutlineGroup } from "react-icons/ai";
import { FaRegRectangleList } from "react-icons/fa6";
import { TbViewportNarrow, TbViewportWide } from "react-icons/tb";
import { Block, CodeBlock, Web2Ext } from "types";
import { vscode, vscodeMessage } from "../../utils";
import { MdCodeOff, MdCode } from "react-icons/md";
import { BsFillEyeFill as EyeOpen, BsEyeSlash as EyeClosed } from "react-icons/bs";
import { BiSolidShare as ShareBack } from "react-icons/bi";

export type NodeMenuProps = {
  data: Block;
  copyMdx: () => void;
};

export default function NodeMenu({ data, copyMdx }: NodeMenuProps) {
  const { id, text, type: typ } = data;
  const { adjustNodeWidth, activateNode, toggleCodeShow, toggleNodeSelection, toggleNodeShare, historyBack } =
    useTreeNoteStore();
  const { isSelected, renderAsGroup, codeRangeEditingNode, textEditing, showCode, historyTop, shared } =
    useTreeNoteStore(selectBlockState(id));

  const onActivate = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.stopPropagation();
      if ((event.target as HTMLDivElement).classList.contains("ignore-activate")) {
        return;
      }
      console.log("trigger activate: ", id);
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
  const hideWidthButtons = typ === "Scrolly" && !renderAsGroup;

  const toggleShare = useCallback(
    (e: ReactMouseEvent) => {
      e.stopPropagation();
      toggleNodeShare(id);
    },
    [toggleNodeShare, id]
  );

  const showHistoryBack = historyTop === id;
  const historyBackElement = useMemo(() => {
    console.log("show history back:", showHistoryBack);
    if (!showHistoryBack) {
      return null;
    }
    const onClick = (event: React.MouseEvent) => {
      event.stopPropagation();
      historyBack();
    };
    return (
      <IconButton
        Icon={ShareBack}
        onClick={onClick}
        className={cls("ignore-activate pr-0  text-gray-500  hover:text-gray-900 hover:scale-110 hover:bg-gray-200")}
      />
    );
  }, [showHistoryBack, historyBack]);

  const checkboxId = "node-menu-" + id;
  return (
    <div className="flex align-baseline text-gray-600 font-medium text-xs" onClick={onActivate}>
      <div className="flex flex-grow justify-start gap-2">
        {codeShowElement}
        <TextEditIcon id={id} type={typ} text={text} textEditing={textEditing} />
        {typ === "Code" ? <CodeEditIcon data={data} codeRangeEditingNode={codeRangeEditingNode} /> : null}
        <IconButton
          Icon={shared ? EyeOpen : EyeClosed}
          onClick={toggleShare}
          className={cls(shared && "text-gray-900", "pr-0 ignore-activate")}
        />
        {historyBackElement}
      </div>
      <pre className=" text-xs border-none rounded-sm px-1 bg-gray-100 text-gray-900 absolute left-1/2 -translate-x-1/2">
        {id}
      </pre>
      <div className="flex flex-grow justify-end gap-2">
        {typ === "Scrolly" ? <GroupRenderIcon id={id} renderAsGroup={renderAsGroup} /> : null}
        <IconButton Icon={TbViewportWide} onClick={widen} hide={hideWidthButtons} />
        <IconButton Icon={TbViewportNarrow} onClick={narrow} hide={hideWidthButtons} />
        <BiCopy
          className="cursor-pointer text-gray-500 hover:text-gray-900 hover:scale-110 hover:bg-gray-200"
          onClick={copyMdx}
          size={16}
        />
        <div className="flex justify-end align-baseline px hover:bg-gray-200 w-[110px]">
          <label
            htmlFor={checkboxId}
            className="ignore-activate text-gray-600 hover:text-gray-900 font-medium text-xs mr-2 cursor-pointer "
          >
            {isSelected ? "Deselect Block" : "Select Block"}
          </label>
          <input
            id={checkboxId}
            className="ignore-activate"
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
  onClick?: (event: React.MouseEvent) => void;
  children?: string | ReactNode;
  hide?: boolean;
  className?: string | false;
};

function IconButton({ Icon, onClick, children, hide, className }: Props) {
  return (
    <div
      className={cls(
        "ignore-activate flex text-xs hover:text-gray-900  hover:bg-gray-200 cursor-pointer text-gray-600 bg-white rounded-sm pr-2 gap-1 hover:scale-110",
        hide && "hidden",
        className
      )}
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
  textEditing,
}: Pick<Block, "id" | "type" | "text"> & { textEditing: { id: string; type: string } | undefined }) {
  const isTextEditing = textEditing?.id === id && textEditing.type === typ;
  const available = typeof textEditing === "undefined";
  const startTextEdit = useCallback(() => {
    if (available) {
      vscode.postMessage({
        action: "web2ext-text-edit-start",
        data: { id, text, type: typ },
      } as Web2Ext.TextEditStart);
    } else {
      vscodeMessage.warn("A text editor is already open, close it before open a new one.");
    }
  }, [id, text, typ, available]);
  const stopTextEdit = useCallback(() => {
    vscode.postMessage({
      action: "web2ext-text-edit-stop",
      data: { id, type: typ },
    } as Web2Ext.TextEditStop);
  }, [id, typ]);
  if (isTextEditing) {
    return (
      <FaTextSlash
        onClick={stopTextEdit}
        size={15}
        className="text-red hover:scale-110 cursor-pointer hover:bg-gray-200"
      />
    );
  } else {
    return (
      <BiText
        onClick={startTextEdit}
        size={15}
        className="text-gray-500 hover:text-gray-900 hover:scale-110 cursor-pointer hover:bg-gray-200"
      />
    );
  }
}

function CodeEditIcon({
  data: { id, type: typ, filePath, pkgPath, ranges },
  codeRangeEditingNode,
}: {
  data: CodeBlock;
  codeRangeEditingNode: string;
}) {
  const isCodeRangeEditing = codeRangeEditingNode === id;
  const available = codeRangeEditingNode === "";
  const onClick = useCallback(() => {
    if (isCodeRangeEditing) {
      vscode.postMessage({
        action: "web2ext-code-range-edit-stop",
        data: { id },
      } as Web2Ext.CodeRangeEditStop);
    } else {
      if (available) {
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
      } else {
        vscodeMessage.warn("A code range editing is in using,  stop it before start a new.");
      }
    }
  }, [filePath, id, isCodeRangeEditing, pkgPath, ranges, typ, available]);
  if (isCodeRangeEditing) {
    return (
      <MdCodeOff
        className="cursor-pointer hover:scale-110 hover:bg-gray-200 text-red scale-110"
        onClick={onClick}
        size={16}
      />
    );
  } else {
    return (
      <MdCode
        className="cursor-pointer hover:text-gray-900 hover:scale-110 hover:bg-gray-200 text-gray-500"
        onClick={onClick}
        size={16}
      />
    );
  }
}
