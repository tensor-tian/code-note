import { CODE_SIZE, VIEWPORT, isCodeNode } from "./layout";
import CodeEdge, { useEdge } from "./edge";
import type { Ext2Web, Node } from "types";
import ReactFlow, {
  Controls,
  EdgeTypes,
  MiniMap,
  NodeTypes,
  useReactFlow,
} from "reactflow";
import {
  selectActiveNodeAndGroup,
  selectNodes,
  selectRootIds,
  selectSelectedNodes,
  useTreeNoteStore,
} from "./store";
import { useCallback, useEffect, useRef, useState } from "react";

import Code from "./code";
import Menu from "./menu";
// import NodeInspector from "./NodeInspector";
import Scrolly from "./scrolly";
import { useNavKeys } from "./use-nav-keys";
import { vscode } from "../../utils";

const NODE_TYPES: NodeTypes = {
  Code,
  Scrolly,
};
const EDGE_TYPES: EdgeTypes = {
  CodeEdge,
};
const DEFAULT_EDGE_OPTIONS = {
  zIndex: 1,
  deletable: false,
};

function TreeFlow() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { handshake, setKV, resetNote, onNodeChange, addCodeNode, onConnect } =
    useTreeNoteStore();
  const { setViewport } = useReactFlow();
  const selectedNodes = useTreeNoteStore(selectSelectedNodes);
  const rootIds = useTreeNoteStore(selectRootIds);
  const nodes = useTreeNoteStore(selectNodes);
  const { activeNode, activeGroup, activeMark } = useTreeNoteStore(
    selectActiveNodeAndGroup
  );
  const [mark, setMark] = useState<number>(activeMark);

  const {
    edges,
    onEdgeClick,
    onEdgeMouseEnter,
    onEdgeMouseLeave,
    onEdgeChange,
  } = useEdge();

  useEffect(() => {
    if (mark === activeMark) return;
    console.log("pan to active.");
    if (!containerRef.current) return;
    if (!isCodeNode(activeNode)) return;

    let { x: xActive, y: yActive } = activeNode.position;
    if (activeGroup) {
      xActive += activeGroup.position.x;
      yActive += activeGroup.position.y;
    }

    const wActive = activeNode.width || CODE_SIZE.W;
    const hActive = activeNode.height || CODE_SIZE.H;
    const container = containerRef.current?.getBoundingClientRect();
    const x = container.width / 2 - xActive - wActive / 2;
    const y = container.height / 2 - yActive - hActive / 2;
    setViewport({ x, y, zoom: VIEWPORT.zoom }, { duration: 800 });
  }, [activeGroup, activeMark, activeNode, setViewport, mark]);

  useEffect(() => {
    setMark(activeMark);
  }, [activeMark]);

  useNavKeys(edges);

  console.log("nodes:", nodes, "edges:", edges);

  const nodeColor = useCallback(
    (node: Node): string => {
      if (selectedNodes.includes(node.id)) {
        return "#bee3f8";
      }
      return "#edf2f7";
    },
    [selectedNodes]
  );

  const nodeStrokeColor = useCallback(
    (node: Node): string => {
      if (rootIds.includes(node.id)) {
        return "#fc8181";
      }
      if (selectedNodes.includes(node.id)) {
        return "#bee3f8";
      }
      return "#edf2f7";
    },
    [selectedNodes, rootIds]
  );

  useEffect(() => {
    if (!handshake) {
      vscode.postMessage({ action: "ask-init-tree-note" });
      setKV("handshake", true);
    }
  }, [handshake, setKV]);

  useEffect(() => {
    const handler = (event: MessageEvent<Ext2Web.Message>) => {
      switch (event.data.action) {
        case "init-tree-note":
          console.log("init tree note:", event.data.data);
          resetNote(event.data.data);
          break;
        case "add-detail":
        case "add-next":
          console.log("Receive message from extension:", event.data);
          addCodeNode(event.data);
          break;
      }
    };
    window.addEventListener("message", handler);
    return () => {
      window.removeEventListener("message", handler);
    };
  }, [addCodeNode, resetNote]);

  return (
    <div ref={containerRef} className="top-0 bottom-0 w-full absolute">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
        onNodesChange={onNodeChange}
        onEdgesChange={onEdgeChange}
        onEdgeClick={onEdgeClick}
        onEdgeMouseEnter={onEdgeMouseEnter}
        onEdgeMouseLeave={onEdgeMouseLeave}
        onConnect={onConnect}
        zoomOnScroll={false}
        panOnScroll={true}
        nodesDraggable={true}
        nodesFocusable={false}
        zoomOnDoubleClick={false}
      >
        <Controls />
        <MiniMap
          pannable
          nodeColor={nodeColor}
          nodeStrokeWidth={30}
          nodeStrokeColor={nodeStrokeColor}
        />
        <Menu addBlock={addCodeNode} />
        {/* <NodeInspector /> */}
      </ReactFlow>
    </div>
  );
}
export default TreeFlow;
