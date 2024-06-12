import { VscDebugConsole } from "react-icons/vsc";
import { RiText } from "react-icons/ri";
import { AiOutlineGroup } from "react-icons/ai";
import { MdOutlineSplitscreen } from "react-icons/md";
import { TfiLayoutGrid3 } from "react-icons/tfi";
import type { IconType } from "react-icons";
import { Panel } from "reactflow";

import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";

import { useHover } from "usehooks-ts";
import { useCallback, useMemo, useRef } from "react";
import cls from "classnames";
import { FaFileArrowDown, FaFileImport } from "react-icons/fa6";
import { vscode, isVscode, DEFAULT_BLOCK } from "../../utils";
import { iDGenerator, useTreeNoteStore } from "./store";
import { selectMenuState } from "./selector";
import { Ext2Web, Web2Ext } from "types";
import RightGroup from "../icons/right-group";

type Props = {
  addBlock: ({ action, data }: Ext2Web.AddCode) => void;
};
export default function Menu({ addBlock }: Props) {
  const { setKV, groupNodes, groupNodesToDetail, splitGroup, deleteEdge, deleteNode, forceLayout, resetExtents } =
    useTreeNoteStore();
  const {
    id,
    text,
    type: typ,
    debug,
    canGroupNodes,
    canGroupNodesToDetail,
    canSplitGroup,
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

  const editNoteTitle = useCallback(() => {
    vscode.postMessage({
      action: "web2ext-text-edit-start",
      data: { id, text, type: typ },
    } as Web2Ext.TextEditStart);
  }, [id, text, typ]);

  const Edge = useMemo(() => LetterIcon("E"), []);
  const Node = useMemo(() => LetterIcon("N"), []);

  return (
    <Panel className="flex flex-col gap-1 absolute top-1/4 text-lg" position="bottom-right">
      <RoundButton Icon={RiText} title="Edit Note Title" onClick={editNoteTitle} />
      <RoundButton Icon={VscDebugConsole} title="Toggle Debug" onClick={toggleDebug} />
      <RoundButton Icon={FaFileArrowDown} title="Add Next Block" disabled={isVscode} onClick={addNext} />
      <RoundButton Icon={FaFileImport} title="Add Detail Block" disabled={isVscode} onClick={addDetail} />
      <RoundButton Icon={AiOutlineGroup} title="Group Codes" disabled={!canGroupNodes} onClick={groupNodes} />
      <RoundButton Icon={MdOutlineSplitscreen} title="Split Group" disabled={!canSplitGroup} onClick={splitGroup} />
      <RoundButton
        Icon={RightGroup}
        title="Extract Codes To Detail Group"
        disabled={!canGroupNodesToDetail}
        onClick={groupNodesToDetail}
      />
      <RoundButton Icon={TfiLayoutGrid3} title="Force Layout" onClick={forceLayout} />
      <RoundButton Icon={Edge} title="Remove Edge" onClick={deleteEdge} />
      <RoundButton Icon={Node} title="Remove Node" onClick={deleteNode} />
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
      >
        {/* <Icon /> */}
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
