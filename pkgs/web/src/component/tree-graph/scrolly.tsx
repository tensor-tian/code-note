import { useTreeNoteStore } from "./store";
import { selectGroupCodes, selectGroupShowCode } from "./selector";

import { IoMdArrowDropdown } from "react-icons/io";
import { NodeProps } from "reactflow";
import { CodeNode, ScrollyCodeBlock, Web2Ext } from "types";
import { BiCopy } from "react-icons/bi";
import cx from "classnames";
import { useCallback, useMemo } from "react";
import NodeHandles from "./node-handles";

import { AiOutlineGroup } from "react-icons/ai";
import { FaRegRectangleList } from "react-icons/fa6";
import { vscode } from "../../utils";
import MDX from "../mdx";

function ScrollyNode({ id, data: { text, chain, stepIndex, renderAsGroup } }: NodeProps<ScrollyCodeBlock>) {
  const {
    selectedNodes,
    toggleNodeSelection,
    hideGroupCode,
    activateNode,
    toggleRenderAsGroup: _toggleRender,
  } = useTreeNoteStore();
  const codes = useTreeNoteStore((state) => selectGroupCodes(state, id));

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

  const onActivate = useCallback(() => {
    activateNode(chain[0]);
  }, [activateNode, chain]);

  const toggleRenderMode = useCallback(() => {
    _toggleRender(id);
  }, [id, _toggleRender]);

  const { mdx, copyMdx } = useMemo(() => {
    console.log("codes:", codes);
    if (!codes) {
      return { mdx: "", copyMdx: () => {} };
    }
    const mdx = groupCodesMDX(id, text, codes);

    const copyMdx = () => {
      navigator.clipboard.writeText(mdx);
      vscode.postMessage({
        action: "web2ext-show-info",
        data: "MDX code is copied.",
      } as Web2Ext.ShowMsg);
    };
    return { mdx, copyMdx };
  }, [codes, id, text]);

  return (
    <div className={cx("w-full h-full px-2 py-2 bg-white bg-opacity-0")} onClick={onActivate}>
      <div className="flex justify-between">
        {showCode && (
          <div className="w-100 flex" onClick={hideCode}>
            <IoMdArrowDropdown className="hover:scale-125" size={16} />
            <span className="text-gray-600 hover:text-gray-900 font-medium text-xs mr-2 ">Hide Code</span>
          </div>
        )}
        <BiCopy className="mr-5 cursor-auto text-gray-500 hover:text-gray-900 hover:scale-125" onClick={copyMdx} />
        <div className="flex align-baseline text-gray-600 font-medium text-xs ">
          <div
            className="hover:text-gray-900 mr-2 w-50 flex border-l-0 border-t-0 border-b-0 border-r border-r-gray-600 pr-3"
            onClick={toggleRenderMode}
          >
            {renderAsGroup ? (
              <>
                <span className="pr-2">Render As Group</span>
                <AiOutlineGroup className="text-sm inline-block hover:scale-125" />
              </>
            ) : (
              <>
                <span className=" pr-2">Render As Codes</span>
                <FaRegRectangleList className="text-sm hover:scale-125" />
              </>
            )}
          </div>
          <label htmlFor={checkboxId} className="ignore-click  hover:text-gray-900 font-medium text-xs mr-2 w-20">
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
      {renderAsGroup && <MDX mdx={mdx} />}
      <NodeHandles id={id} />
    </div>
  );
}

export default ScrollyNode;

function groupCodesMDX(id: string, text: string, codes: CodeNode[]): string {
  return `
${text}

<CH.Scrollycoding id="${id}" enableScroller={false} >
${codes.map(({ data }) => `\n${data.text}\n\n${data.code}\n`).join("\n---\n")}
</CH.Scrollycoding>
`;
}
