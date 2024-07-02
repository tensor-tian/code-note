import { VscDebugConsole } from "react-icons/vsc";
import { BiText } from "react-icons/bi";
import { AiOutlineGroup } from "react-icons/ai";
import { MdOutlineSplitscreen } from "react-icons/md";
import { TfiLayoutGrid3 } from "react-icons/tfi";
import type { IconType } from "react-icons";
import { Panel } from "reactflow";

import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { BsFileEarmarkArrowUp } from "react-icons/bs";
import { useHover } from "usehooks-ts";
import { useCallback, useMemo, useRef, useState } from "react";
import cls from "classnames";
import { vscode, DEFAULT_BLOCK } from "../../utils";
import { Directions, iDGenerator, multiLangText, useTreeNoteStore } from "./store";
import type { DirectionType } from "./store";
import { selectMenuState } from "./selector";
import { Ext2Web, Note, Web2Ext } from "types";
import RightGroup from "../icons/right-group";
import { FaTextSlash } from "react-icons/fa6";
import { MdCodeOff } from "react-icons/md";
import { BiSolidShare as ShareBack } from "react-icons/bi";
import translateToLang from "../../langs";
import { MdOutlineFormatListBulleted as SharedList } from "react-icons/md";
import { ReactComponent as AddCodeIcon } from "../icons/+C.svg";
import { ReactComponent as AddTextIcon } from "../icons/+T.svg";
import {
  FaLongArrowAltLeft as IconLeft,
  FaLongArrowAltUp as IconTop,
  FaLongArrowAltRight as IconRight,
  FaLongArrowAltDown as IconBottom,
} from "react-icons/fa";
import "react-tippy/dist/tippy.css";
import Popper from "@mui/material/Popper";
import ClickAwayListener from "@mui/material/ClickAwayListener";

const Edge = LetterIcon("E");
const Node = LetterIcon("N");

export default function Menu() {
  const {
    setKV,
    groupNodes,
    groupNodesToDetail,
    splitGroup,
    deleteEdge,
    deleteNode,
    forceLayout,
    resetExtents,
    resetNote,
    historyBack,
    openSharedList,
    addNode,
  } = useTreeNoteStore();
  const {
    id,
    text,
    type: typ,
    debug,
    canGroupNodes,
    canGroupNodesToDetail,
    canSplitGroup,
    textEditing,
    codeRangeEditingNode,
    historyTop,
    lang,
    canOpenSharedList,
    isVscode,
  } = useTreeNoteStore(selectMenuState);

  const toggleDebug = useCallback(() => {
    setKV("debug", !debug);
    resetExtents();
  }, [debug, setKV, resetExtents]);

  const startTextEdit = useCallback(() => {
    vscode.postMessage({
      action: "web2ext-text-edit-start",
      data: { id, text, type: typ },
    } as Web2Ext.TextEditStart);
  }, [id, text, typ]);

  const stopTextEdit = useCallback(() => {
    vscode.postMessage({
      action: "web2ext-text-edit-stop",
      data: textEditing,
    } as Web2Ext.TextEditStop);
  }, [textEditing]);

  const stopCodeRageEdit = useCallback(() => {
    vscode.postMessage({
      action: "web2ext-code-range-edit-stop",
      data: { id: codeRangeEditingNode },
    } as Web2Ext.CodeRangeEditStop);
  }, [codeRangeEditingNode]);

  const translate = useMemo(() => {
    return translateToLang(lang);
  }, [lang]);

  const addCodeInDirection = useCallback(
    async (direction: DirectionType) => {
      const [id] = await iDGenerator.requestIDs(1);
      const action = ("ext2web-add-" + direction) as Ext2Web.AddNode["action"];
      addNode({ action, data: { ...DEFAULT_BLOCK, id } });
    },
    [addNode]
  );

  const addTextInDirection = useCallback(
    async (direction: DirectionType) => {
      const [id] = await iDGenerator.requestIDs(1);
      const action = ("ext2web-add-" + direction) as Ext2Web.AddNode["action"];
      addNode({
        action,
        data: {
          id,
          type: "Text",
          text: multiLangText({
            en: "MDX text...",
            zh: "MDX 内容...",
          }),
        },
      });
    },
    [addNode]
  );

  return (
    <Panel className="flex flex-col gap-1 absolute !top-1/4 !bottom-1/4 !right-0 text-lg" position="bottom-right">
      <FileButton title={translate("openFile")} resetNote={resetNote} disabled={isVscode} />
      <RoundButtonWithToolTip
        Icon={textEditing ? FaTextSlash : BiText}
        title={translate("editNoteTitle")}
        onClick={textEditing ? stopTextEdit : startTextEdit}
      />
      <RoundButtonWithToolTip
        Icon={MdCodeOff}
        title={translate("stopCodeRangeEditing")}
        onClick={stopCodeRageEdit}
        disabled={codeRangeEditingNode === ""}
      />
      <RoundButtonWithToolTip Icon={VscDebugConsole} title={translate("toggleDebug")} onClick={toggleDebug} />
      {!isVscode && <AddNodeButton addNodeInDirection={addCodeInDirection} Icon={AddCodeIcon} />}
      <AddNodeButton addNodeInDirection={addTextInDirection} Icon={AddTextIcon} />
      <RoundButtonWithToolTip
        Icon={AiOutlineGroup}
        title={translate("groupNodes")}
        disabled={!canGroupNodes}
        onClick={groupNodes}
      />
      <RoundButtonWithToolTip
        Icon={MdOutlineSplitscreen}
        title={translate("splitGroup")}
        disabled={!canSplitGroup}
        onClick={splitGroup}
      />
      <RoundButtonWithToolTip
        Icon={RightGroup}
        title={translate("extractToDetailGroup")}
        disabled={!canGroupNodesToDetail}
        onClick={groupNodesToDetail}
      />
      <RoundButtonWithToolTip Icon={TfiLayoutGrid3} title={translate("forceLayout")} onClick={forceLayout} />
      <RoundButtonWithToolTip Icon={Edge} title={translate("removeEdge")} onClick={deleteEdge} />
      <RoundButtonWithToolTip Icon={Node} title={translate("removeNode")} onClick={deleteNode} />
      <RoundButtonWithToolTip
        Icon={ShareBack}
        title={translate("historyBack")}
        onClick={historyBack}
        disabled={!historyTop}
      />
      <RoundButtonWithToolTip
        Icon={SharedList}
        title={translate("sharedList")}
        onClick={openSharedList}
        disabled={!canOpenSharedList}
      />
    </Panel>
  );
}

function LetterIcon(letter: string) {
  return ({ className }: { className?: string }) => {
    return (
      <span className={cls("bg-opacity-0 text-gray-600 ", className, "text-sm font-bold")}>
        <s>{letter}</s>
      </span>
    );
  };
}

type RoundButtonWithToolTipProps = {
  Icon: IconType | typeof RightGroup | React.FunctionComponent;
  title: string;
  disabled?: boolean;
  onClick: () => void;
};

function RoundButtonWithToolTip({ Icon, title, disabled, onClick }: RoundButtonWithToolTipProps) {
  const ref = useRef(null);
  const hover = useHover(ref);

  return (
    <Tooltip title={title} arrow placement="left">
      <IconButton
        color="default"
        size="small"
        ref={ref}
        className="hover:bg-gray-600"
        disabled={disabled}
        onClick={onClick}
        component="span"
      >
        <Icon
          className={cls(
            !hover && "fill-gray-600 stroke-gray-600",
            hover && "fill-white stroke-white",
            disabled && "!fill-gray-400"
          )}
          size={16}
        />
      </IconButton>
    </Tooltip>
  );
}
type FileButtonProps = {
  title: string;
  disabled?: boolean;
  resetNote: (note: Note) => void;
};
function FileButton({ title, disabled, resetNote }: FileButtonProps) {
  const ref = useRef(null);
  const isHover = useHover(ref);
  const onChange = useCallback(
    async (event: React.ChangeEvent) => {
      const input = event.target as HTMLInputElement;
      if (input.files && input.files.length > 0) {
        const file = input.files[0];
        const content = await file.text();
        resetNote(JSON.parse(content));
      }
    },
    [resetNote]
  );

  return (
    <Tooltip title={title} arrow placement="left">
      <div>
        <input type="file" className="hidden" id="menu-open-note-file-id" onChange={onChange} accept=".cnote" />
        <label htmlFor="menu-open-note-file-id">
          <IconButton
            color="default"
            size="small"
            ref={ref}
            className={cls("bg-white hover:!bg-gray-500")}
            disabled={disabled}
            component="span"
            // onClick={onClick}
          >
            <BsFileEarmarkArrowUp
              className={cls({
                "fill-white text-white stroke-white": isHover,
                "fill-gray-600 stroke-gray-600": !isHover,
                "!fill-gray-400": disabled,
              })}
              size={16}
            />
          </IconButton>
        </label>
      </div>
    </Tooltip>
  );
}

const Icons: Record<DirectionType, IconType> = {
  left: IconLeft,
  right: IconRight,
  top: IconTop,
  bottom: IconBottom,
};

type AddNodeButtonProps = {
  addNodeInDirection: (direction: DirectionType) => void;
  Icon: React.FunctionComponent;
};

function AddNodeButton({ addNodeInDirection, Icon }: AddNodeButtonProps) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const openMenu = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchor(event.currentTarget as HTMLElement);
    setOpen((prev) => !prev);
  }, []);
  const closeMenu = useCallback(() => {
    setOpen(false);
  }, []);
  const onClickMenu = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      const elm = event.currentTarget;
      const dir = elm.getAttribute("data-direction") as DirectionType;
      addNodeInDirection(dir);
      setOpen(false);
    },
    [addNodeInDirection]
  );

  return (
    <>
      <RoundButton onClick={openMenu} Icon={Icon} />
      {open && (
        <ClickAwayListener onClickAway={closeMenu}>
          <Popper sx={{ zIndex: 10 }} open={open} anchorEl={anchor} placement="left">
            <div className="flex bg-white  p-1">
              {Directions.map((dir, i) => (
                <RoundButton key={dir} arial-label={dir} Icon={Icons[dir]} data-direction={dir} onClick={onClickMenu} />
              ))}
            </div>
          </Popper>
        </ClickAwayListener>
      )}
    </>
  );
}

type RoundButtonProps = {
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  Icon: IconType | React.FunctionComponent;
  disabled?: boolean;
  "arial-label"?: string;
} & Record<`data-${string}`, string>;
function RoundButton({ disabled = false, Icon, onClick, ...rest }: RoundButtonProps) {
  const ref = useRef(null);
  const hover = useHover(ref);
  return (
    <IconButton
      ref={ref}
      color="default"
      size="small"
      className={cls("bg-white hover:!bg-gray-500")}
      disabled={disabled}
      component="span"
      onClick={onClick}
      {...rest}
    >
      <Icon
        className={cls(
          !hover && "fill-gray-600 stroke-gray-600",
          hover && "fill-white stroke-white",
          disabled && "!fill-gray-400"
        )}
        size={16}
        width={16}
        height={16}
      />
    </IconButton>
  );
}
