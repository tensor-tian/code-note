import { VIEWPORT, isCodeNode } from "./layout";
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
  TreeNote,
  selectActiveNodeAndGroup,
  selectDebug,
  selectNodes,
  selectSettings,
  selectRootIds,
  selectSelectedNodes,
  useTreeNoteStore,
} from "./store";
import { useCallback, useEffect, useRef, useState } from "react";

import Code from "./code";
import Menu from "./menu";
import MiniMapNode from "./minimap-node";
import NodeInspector from "./node-inspector";
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
  const { setKV, onNodeChange, addCodeNode, onConnect } = useTreeNoteStore();
  const selectedNodes = useTreeNoteStore(selectSelectedNodes);
  const rootIds = useTreeNoteStore(selectRootIds);
  const nodes = useTreeNoteStore(selectNodes);
  const debug = useTreeNoteStore(selectDebug);

  // edge operation
  const {
    edges,
    onEdgeClick,
    onEdgeMouseEnter,
    onEdgeMouseLeave,
    onEdgeChange,
  } = useEdge();

  // arrow key to focus node
  useNavKeys(edges);
  // auto focus node by reset viewport
  usePanToActiveNode(containerRef, setKV, nodes.length);
  // init note and handle message from extension
  useExt2WebMessage();

  // minimap
  const nodeClassName = useCallback(
    (node: Node) => {
      let cls = "";
      if (rootIds.includes(node.id)) {
        cls += "root";
      }
      if (selectedNodes.includes(node.id)) {
        cls += " selected";
      }
      if (node.type === "Scrolly") {
        cls += " group";
      }
      return cls;
    },
    [selectedNodes, rootIds]
  );

  console.log("<TreeFlow> nodes:", nodes, "edges:", edges);

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
          nodeClassName={nodeClassName}
          nodeComponent={MiniMapNode}
        />
        <Menu addBlock={addCodeNode} />
        {debug && <NodeInspector />}
      </ReactFlow>
    </div>
  );
}
export default TreeFlow;

function usePanToActiveNode(
  ref: React.RefObject<HTMLDivElement>,
  setKV: <T extends keyof TreeNote.Store>(
    key: T,
    val: TreeNote.Store[T]
  ) => void,
  nLen: number
) {
  const { activeNode, activeGroup, activeMark } = useTreeNoteStore(
    selectActiveNodeAndGroup
  );
  const settings = useTreeNoteStore(selectSettings);
  const { setViewport } = useReactFlow();
  const [mark, setMark] = useState<number>(activeMark);
  useEffect(() => {
    if (mark === activeMark) return;
    console.log("pan to active.");
    if (!ref.current) return;
    if (!isCodeNode(activeNode)) return;

    let { x: xActive, y: yActive } = activeNode.position;
    if (activeGroup) {
      xActive += activeGroup.position.x;
      yActive += activeGroup.position.y;
    }

    const wActive = activeNode.width || settings.W;
    const hActive = activeNode.height || settings.H;
    const container = ref.current?.getBoundingClientRect();
    const x = container.width / 2 - xActive - wActive / 2;
    let y = container.height / 2 - yActive - hActive / 2;
    console.log("setViewport", hActive, container.height - 120);
    if (hActive > container.height - 120) {
      y = -yActive + 120;
    }
    setViewport({ x, y, zoom: VIEWPORT.zoom }, { duration: 800 });
    if (nLen === 1) {
      setTimeout(() => setKV("panToActiveMark", 0), 800);
    }
  }, [
    activeGroup,
    activeMark,
    activeNode,
    setViewport,
    mark,
    setKV,
    nLen,
    ref,
    settings.W,
    settings.H,
  ]);

  useEffect(() => {
    setMark(activeMark);
  }, [activeMark]);
}

function useExt2WebMessage() {
  const {
    handshake,
    setKV,
    resetNote,
    addCodeNode,
    updateNodeText,
    updateNodeCodeRange,
    stopNodeCodeRangeEditing,
  } = useTreeNoteStore();
  useEffect(() => {
    const handler = (event: MessageEvent<Ext2Web.Message>) => {
      const { action, data } = event.data;
      console.log("ext to web:", { action, data });
      switch (action) {
        case "init-tree-note":
          console.log("init tree note:", data);
          resetNote(data);
          break;
        case "text-change":
          if (data.type === "Code") {
            updateNodeText(data.id, data.text);
          } else if (data.type === "TreeNote") {
            setKV("text", data.text);
          }
          break;
        case "add-detail":
        case "add-next":
          addCodeNode(event.data);
          break;
        case "code-range-change":
          updateNodeCodeRange(data);
          break;
        case "code-range-edit-stopped":
          stopNodeCodeRangeEditing(data.id);
          break;
      }
    };
    window.addEventListener("message", handler);
    return () => {
      window.removeEventListener("message", handler);
    };
  }, [
    addCodeNode,
    resetNote,
    setKV,
    stopNodeCodeRangeEditing,
    updateNodeCodeRange,
    updateNodeText,
  ]);

  useEffect(() => {
    if (!handshake) {
      vscode.postMessage({ action: "ask-init-tree-note" });
      setKV("handshake", true);
    }
  }, [handshake, setKV]);
}
