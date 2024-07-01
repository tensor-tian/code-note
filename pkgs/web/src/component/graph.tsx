import { ReactFlowProvider } from "reactflow";
import TreeFlow from "./tree-graph/tree-flow";
import { useCallback, useEffect, useState, MouseEvent as ReactMouseEvent } from "react";
import Modal from "@mui/material/Modal";
import Box from "@mui/material/Box";
import MDX from "./mdx";
import cls from "classnames";
import { useTreeNoteStore } from "./tree-graph/store";
import { selectShareNodes } from "./tree-graph/selector";
import Divider from "@mui/material/Divider";
import { MdOutlineClose } from "react-icons/md";
import IconButton from "@mui/material/IconButton";
import { IoMdShareAlt as ShareForward } from "react-icons/io";
import { Web2Ext } from "types";
import { vscode } from "../utils";

function Graph() {
  const [graphType, setGraphType] = useState<string>("TreeNote");
  useHideUnimportantErrors();
  const { setKV } = useTreeNoteStore();
  const { nodes: sharedNodes, open, textEditing } = useTreeNoteStore(selectShareNodes);
  const onModalClose = useCallback(() => {
    setKV("sharedListOpen", false);
  }, [setKV]);

  const insertReference = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      let elm = (event.currentTarget || event.target) as HTMLElement;
      let to: string | null | undefined;
      while (elm.parentElement) {
        elm = elm.parentElement;
        to = elm.getAttribute("data-shared-node-id");
        if (typeof to === "string") {
          break;
        }
      }
      console.log("click insert reference btn:", to);
      const prefix = `<Reference to="${to}">`;
      const suffix = "</Reference>";
      navigator.clipboard.writeText(prefix + to + suffix);
      if (textEditing?.id) {
        vscode.postMessage({
          action: "web2ext-insert-text-content",
          data: { prefix, suffix, ...textEditing },
        } as Web2Ext.InsertTextContent);
        setKV("sharedListOpen", false);
      } else {
        vscode.postMessage({
          action: "web2ext-show-warn",
          data: "No MDX text editor is open.",
        } as Web2Ext.Message);
      }
    },
    [setKV, textEditing]
  );
  return graphType === "TreeNote" ? (
    <div>
      <TreeFlow />
      <Modal
        open={open}
        onClose={onModalClose}
        aria-labelledby="modal-select-shared-node"
        aria-describedby="modal-select-shared-node"
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 !w-[800px] border-gray-900 border-solid shadow-sm p-2 rounded-md bg-white ">
          <div className="flex justify-end">
            <IconButton aria-label="delete" onClick={onModalClose}>
              <MdOutlineClose />
            </IconButton>
          </div>
          {sharedNodes.map((node, i) => (
            <div key={node.id}>
              <Divider />
              <Box
                id={"shared-item-" + node.id}
                className={cls("my-4 p-2  hover:bg-gray-300 transition-all duration-300 relative")}
                data-shared-node-id={node.id}
              >
                <IconButton
                  arial-label="Insert Reference"
                  onClick={insertReference}
                  className="absolute top-2 right-2 cursor-pointer"
                >
                  <ShareForward />
                </IconButton>
                <MDX mdx={node.data.text} width={500} id={"shared-" + node.id} />
              </Box>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  ) : null;
}

function GraphWrapper() {
  return (
    <ReactFlowProvider>
      <Graph />
    </ReactFlowProvider>
  );
}

export default GraphWrapper;

const useHideUnimportantErrors = () => {
  useEffect(() => {
    function hideError(e: ErrorEvent) {
      if (e.message === "ResizeObserver loop completed with undelivered notifications.") {
        const resizeObserverErrDiv = document.getElementById("webpack-dev-server-client-overlay-div");
        const resizeObserverErr = document.getElementById("webpack-dev-server-client-overlay");
        if (resizeObserverErr) {
          resizeObserverErr.setAttribute("style", "display: none");
        }
        if (resizeObserverErrDiv) {
          resizeObserverErrDiv.setAttribute("style", "display: none");
        }
      }
    }

    window.addEventListener("error", hideError);
    return () => {
      window.addEventListener("error", hideError);
    };
  }, []);
};
