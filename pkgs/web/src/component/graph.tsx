import { ReactFlowProvider } from "reactflow";
import TreeFlow from "./tree-graph/tree-flow";
import { useEffect, useState } from "react";

function Graph() {
  const [graphType, setGraphType] = useState<string>("TreeNote");
  useHideUnimportantErrors();
  return graphType === "TreeNote" ? (
    <ReactFlowProvider>
      <TreeFlow />
    </ReactFlowProvider>
  ) : null;
}

export default Graph;

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
