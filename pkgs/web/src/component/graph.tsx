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

function Graph() {
  const [graphType, setGraphType] = useState<string>("TreeNote");
  useHideUnimportantErrors();
  const { setKV, selectShare } = useTreeNoteStore();
  const { nodes: sharedNodes, open, source, to } = useTreeNoteStore(selectShareNodes);
  const onModalClose = useCallback(() => {
    setKV("selectSharedNodeFor", undefined);
  }, [setKV]);

  const onSelect = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      const elm = event.currentTarget as HTMLDivElement;
      const to = elm.getAttribute("data-id");
      if (source && typeof to === "string") {
        selectShare(source, to);
      }
    },
    [selectShare, source]
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
          <div className="share-list max-h-[80vh] overflow-y-auto mx-3">
            <div
              className={cls(
                "preview-container hover:bg-gray-300 my-4 p-2 transition-all duration-300",
                to === "" && "!bg-green-300"
              )}
              data-id=""
              onClick={onSelect}
            >
              <h4>Unlink to Shared Node</h4>
            </div>
            <Divider />

            {sharedNodes.map((node, i) => (
              <>
                <Divider />
                <Box
                  key={node.id}
                  id={"shared-item-" + node.id}
                  className={cls(
                    "my-4 p-2  hover:bg-gray-300 transition-all duration-300 ",
                    to === node.id && "!bg-green-300"
                  )}
                  data-id={node.id}
                  onClick={onSelect}
                >
                  <MDX mdx={node.data.text} width={500} id={"shared-" + node.id} />
                </Box>
              </>
            ))}
          </div>
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
