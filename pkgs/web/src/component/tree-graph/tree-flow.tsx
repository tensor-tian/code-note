import { DefaultNodeDimension, VIEWPORT, isGroupNode } from "./layout";
import CodeEdge, { useEdge } from "./edge";
import type { Node, Web2Ext } from "types";
import ReactFlow, { EdgeTypes, MiniMap, NodeTypes, ReactFlowInstance, useReactFlow } from "reactflow";
import { selectActiveNodeAndGroup, selectNodes, selectTreeFlowState } from "./selector";
import { useTreeNoteStore, TreeNote } from "./store";
import { useCallback, useEffect, useRef, useState } from "react";

import Code from "./node-code";
import Text from "./node-text";
import Scrolly from "./node-scrolly";
import Template from "./node-template";
import Title from "./tree-flow-header";
import MiniMapNode from "./minimap-node";
import NodeInspector from "./node-inspector";
import { useNavKeys } from "./use-nav-keys";
import { vscode } from "../../utils";
import Menu from "./tree-flow-menu";
import Debug from "debug";

const log = Debug("vscode-note:tree-flow");
const NODE_TYPES: NodeTypes = {
  Code,
  Scrolly,
  Text,
  Template,
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
  const { setKV, onNodeChange, onConnect } = useTreeNoteStore();
  const { rootIds, selectedNodes, debug, handshake } = useTreeNoteStore(selectTreeFlowState);
  const nodes = useTreeNoteStore(selectNodes);

  // edge operation
  const { edges, onEdgeClick, onEdgeMouseEnter, onEdgeMouseLeave, onEdgeChange } = useEdge();

  // arrow key to focus node
  useNavKeys(edges);
  // auto focus node by reset viewport
  usePanToActiveNode(containerRef, setKV, nodes.length);
  // get init note from extension
  useInitNote(handshake, setKV);

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

  log("<TreeFlow> nodes:", nodes, "edges:", edges);

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
        {/* <Controls /> */}
        <MiniMap pannable nodeClassName={nodeClassName} nodeComponent={MiniMapNode} />
        <Title />
        <Menu />
        {debug && <NodeInspector />}
      </ReactFlow>
    </div>
  );
}
export default TreeFlow;

function usePanToActiveNode(ref: React.RefObject<HTMLDivElement>, setKV: TreeNote.SetKVFn, nLen: number) {
  const { activeNode, activeGroup, activeMark, isActiveNodeRenderAsGroup } = useTreeNoteStore(selectActiveNodeAndGroup);
  const { setViewport, getViewport } = useReactFlow();
  const [mark, setMark] = useState<number>(activeMark);
  useEffect(() => {
    if (mark === activeMark) return;
    console.log("pan to active.");
    if (!ref.current || !activeNode) return;
    // if (isGroupNode(activeNode) && !activeNode.data.renderAsGroup) return;

    let { x: xActive, y: yActive } = activeNode.position;
    if (activeGroup) {
      xActive += activeGroup.position.x;
      yActive += activeGroup.position.y;
    }

    const wActive = activeNode.width || DefaultNodeDimension.W;
    const hActive = activeNode.height || DefaultNodeDimension.H;
    const container = ref.current?.getBoundingClientRect();
    const x = container.width / 2 - xActive - wActive / 2;
    let y = container.height / 2 - yActive - hActive / 2;
    // console.log("setViewport", hActive, container.height - 120);
    if (hActive > container.height - 120) {
      y = -yActive + 120;
    }
    // if (isGroupNode(activeNode) && !isActiveNodeRenderAsGroup) {
    //   // prevent vertical scroll
    //   y = getViewport().y;
    // }
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
    getViewport,
    isActiveNodeRenderAsGroup,
  ]);

  useEffect(() => {
    setMark(activeMark);
  }, [activeMark]);
}

function useInitNote(handshake: boolean, setKV: TreeNote.SetKVFn) {
  useEffect(() => {
    if (!handshake) {
      vscode.postMessage({ action: "web2ext-ask-init-tree-note", data: "" } as Web2Ext.AskInitTreeNote);
      setKV("handshake", true);
    }
  }, [handshake, setKV]);
}
