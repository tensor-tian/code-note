import { ReactFlowProvider } from "reactflow";
import TreeFlow from "./tree-graph/tree-flow";
import { useState } from "react";

function Graph() {
  const [graphType, setGraphType] = useState<string>("TreeNote");
  return graphType === "TreeNote" ? (
    <ReactFlowProvider>
      <TreeFlow />
    </ReactFlowProvider>
  ) : null;
}

export default Graph;
