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
import { useCallback, useMemo, useRef } from "react";
import cls from "classnames";
import { FaFileArrowDown, FaFileImport } from "react-icons/fa6";
import { vscode, isVscode, DEFAULT_BLOCK } from "../../utils";
import { iDGenerator, useTreeNoteStore } from "./store";
import { selectMenuState } from "./selector";
import { Ext2Web, Note, Web2Ext } from "types";
import RightGroup from "../icons/right-group";
import { FaTextSlash } from "react-icons/fa6";
import { MdCodeOff } from "react-icons/md";
import { BiSolidShare as ShareBack } from "react-icons/bi";
import translate, { TitleKey } from "../../langs";
import translateToLang from "../../langs";
import { MdOutlineFormatListBulleted as SharedList } from "react-icons/md";

const Edge = LetterIcon("E");
const Node = LetterIcon("N");
type Props = {
  addBlock: ({ action, data }: Ext2Web.AddCode) => void;
};
export default function Menu({ addBlock }: Props) {
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
  } = useTreeNoteStore(selectMenuState);

  const addDetail = useCallback(async () => {
    const [id] = await iDGenerator.requestIDs(1);
    addBlock({ action: "ext2web-add-detail", data: { ...DEFAULT_BLOCK, id } });
  }, [addBlock]);

  const addNext = useCallback(async () => {
    const [id] = await iDGenerator.requestIDs(1);
    addBlock({ action: "ext2web-add-next", data: { ...DEFAULT_BLOCK, id } });
  }, [addBlock]);

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

  return (
    <Panel className="flex flex-col gap-1 absolute top-1/4 text-lg" position="bottom-right">
      <FileButton title={translate("openFile")} resetNote={resetNote} disabled={isVscode} />
      <RoundButton
        Icon={textEditing ? FaTextSlash : BiText}
        title={translate("editNoteTitle")}
        onClick={textEditing ? stopTextEdit : startTextEdit}
      />
      <RoundButton
        Icon={MdCodeOff}
        title={translate("stopCodeRangeEditing")}
        onClick={stopCodeRageEdit}
        disabled={codeRangeEditingNode === ""}
      />
      <RoundButton Icon={VscDebugConsole} title={translate("toggleDebug")} onClick={toggleDebug} />
      <RoundButton Icon={FaFileArrowDown} title={translate("addNextBlock")} disabled={isVscode} onClick={addNext} />
      <RoundButton Icon={FaFileImport} title={translate("addDetailBlock")} disabled={isVscode} onClick={addDetail} />
      <RoundButton
        Icon={AiOutlineGroup}
        title={translate("groupNodes")}
        disabled={!canGroupNodes}
        onClick={groupNodes}
      />
      <RoundButton
        Icon={MdOutlineSplitscreen}
        title={translate("splitGroup")}
        disabled={!canSplitGroup}
        onClick={splitGroup}
      />
      <RoundButton
        Icon={RightGroup}
        title={translate("extractToDetailGroup")}
        disabled={!canGroupNodesToDetail}
        onClick={groupNodesToDetail}
      />
      <RoundButton Icon={TfiLayoutGrid3} title={translate("forceLayout")} onClick={forceLayout} />
      <RoundButton Icon={Edge} title={translate("removeEdge")} onClick={deleteEdge} />
      <RoundButton Icon={Node} title={translate("removeNode")} onClick={deleteNode} />
      <RoundButton Icon={ShareBack} title={translate("historyBack")} onClick={historyBack} disabled={!historyTop} />
      <RoundButton
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

type RoundButtonProps = {
  Icon: IconType | typeof RightGroup;
  title: string;
  disabled?: boolean;
  onClick: () => void;
};

function RoundButton({ Icon, title, disabled, onClick }: RoundButtonProps) {
  const ref = useRef(null);
  const isHover = useHover(ref);

  return (
    <Tooltip title={title} arrow placement="left">
      <IconButton
        color="default"
        size="small"
        ref={ref}
        // className="rounded-full bg-gray-500 hover:bg-gray-700 hover:scale-110 w-8 h-8 min-h-8  flex items-center justify-center"
        className="hover:bg-gray-600"
        disabled={disabled}
        onClick={onClick}
        component="span"
      >
        <Icon
          className={cls({
            "fill-white text-white stroke-white": isHover,
            "fill-gray-600 stroke-gray-600": !isHover,
            "!fill-gray-400": disabled,
          })}
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
            className="hover:bg-gray-600"
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
