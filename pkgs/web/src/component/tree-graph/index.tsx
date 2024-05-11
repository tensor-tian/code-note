import { Block, CodeBlock, Note } from "types";
import { DefaultViewport, Layout, saveNote, vscode } from "../../utils";
import {
  Edge,
  EdgeTypes,
  Node,
  OnConnect,
  OnEdgesChange,
  OnNodesChange,
  ReactFlowProvider,
  useReactFlow,
} from "reactflow";
import { MouseEvent, useCallback, useEffect, useRef, useState } from "react";
import ReactFlow, {
  Controls,
  MiniMap,
  NodeTypes,
  SelectionMode,
  addEdge as addEdgeToState,
  useEdgesState,
  useNodesState,
} from "reactflow";
import {
  activateBlock,
  activateEdge,
  addNote,
  selectActiveBlockId,
  selectForceLayout,
  selectNeedLayout,
  selectNote,
  setForceLayout,
  setHighlightEdge,
} from "../../service/note-slice";
import { useAppDispatch, useAppSelector } from "../../service/store";

import Code from "./code";
import ConnectionLine from "./connection-line";
import Menu from "./menu";
import type { MessageDataAddBlock } from "types";
import Scrolly from "./scrolly";
import Tree from "./Tree";
import edge from "./edge";
import { layout } from "./layout";

const nodeTypes: NodeTypes = {
  Code,
  Scrolly,
  Tree,
};
const edgeTypes: EdgeTypes = {
  edge,
};
const defaultEdgeOptions = {
  zIndex: 1,
};

const useNodeChange = (_onNodesChange: OnNodesChange, note: Note<Block>) => {
  const [nodesReset, setNodesReset] = useState(false);

  useEffect(() => {
    if (nodesReset) {
      setNodesReset(false);
      saveNote(note);
    }
  }, [note, nodesReset, setNodesReset]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      for (const change of changes) {
        if (
          (change.type === "position" && change.dragging) ||
          ["remove", "add"].includes(change.type)
        ) {
          setNodesReset(true);
        }
      }
      console.log("on node change:", changes);
      _onNodesChange(changes);
    },
    [_onNodesChange, setNodesReset]
  );

  return onNodesChange;
};

const useEdgeChange = (_onEdgesChange: OnEdgesChange, note: Note<Block>) => {
  const [edgesReset, setEdgesReset] = useState(false);

  useEffect(() => {
    if (edgesReset) {
      setEdgesReset(false);
      saveNote(note);
    }
  }, [note, edgesReset, setEdgesReset]);

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      for (const change of changes) {
        if (["add", "remove"].includes(change.type)) {
          setEdgesReset(true);
        }
        if (change.type === "add") {
          change.item.type = "treeEdge";
        }
      }
      _onEdgesChange(changes);
    },
    [_onEdgesChange, setEdgesReset]
  );

  return onEdgesChange;
};
const handleMessage =
  (dispatch: Function) => (event: MessageEvent<MessageDataAddBlock>) => {
    switch (event.data.action) {
      case "add-detail":
      case "add-next":
        console.log("Receive message from extension:", event.data);
        // const { nodeInternals } = store.getState();
        // const activeNode = nodeInternals.get(activeBlockId || "");
        dispatch(
          addNote({
            data: event.data.data,
            msgType: event.data.action,
          })
        );
        vscode.postMessage({ action: event.data.action + "-done" });
        break;
    }
  };
/**
 *  Tree Graph Component
 */
function TreeFlow() {
  const note = useAppSelector(selectNote);
  const [nodes, setNodes, _onNodesChange] = useNodesState<Block>([]);
  const [edges, setEdges, _onEdgesChange] = useEdgesState<any>([]);
  const dispatch = useAppDispatch();
  const activeBlockId = useAppSelector(selectActiveBlockId);
  const { setViewport, getNode } = useReactFlow();
  const ref = useRef<HTMLDivElement>(null);
  const addBlock = useCallback(
    (action: MessageDataAddBlock["action"], data: Omit<CodeBlock, "id">) => {
      const handler = handleMessage(dispatch);
      handler(new MessageEvent("message", { data: { action, data } }));
    },
    [dispatch]
  );
  useEffect(() => {
    const handler = handleMessage(dispatch);
    window.addEventListener("message", handler);
    return () => {
      window.removeEventListener("message", handler);
    };
  }, [dispatch, nodes, getNode]);

  const [needLayout, setNeeedLayout] = useState<boolean>(false);

  useEffect(() => {
    const nodes = layout(note.edges, note.blockMap, getNode);
    setNodes(nodes);
    setEdges(note.edges);
    setNeeedLayout(true);
  }, [getNode, note, setEdges, setNodes]);

  const forceLayout = useAppSelector(selectForceLayout);
  useEffect(() => {
    if (forceLayout) {
      dispatch(setForceLayout(false));
      setNeeedLayout(true);
    }
  }, [forceLayout, dispatch]);

  const [cond1, cond2] = useAppSelector(selectNeedLayout);
  useEffect(() => {
    setNeeedLayout(true);
    setNeeedLayout(true);
  }, [cond1, cond2]);

  useEffect(() => {
    if (needLayout) {
      const nodes = layout(note.edges, note.blockMap, getNode);
      setNodes(nodes);
      setEdges(note.edges);
      const active = nodes.find((n) => n.id === activeBlockId);
      if (active && ref.current) {
        const group = nodes.find((n) => n.id === active.parentId);
        let xActive = active.position.x;
        let yActive = active.position.y;
        if (group) {
          xActive += group.position.x;
          yActive += group.position.y;
        }
        const bounds = ref.current.getBoundingClientRect();
        const wActive = +(active.width || 600);
        const hActive = +(active.height || 58);
        const x = bounds.width / 2 - xActive - wActive / 2;
        const y = bounds.height / 2 - yActive - hActive / 2 - 50;
        const zoom = DefaultViewport.zoom;
        console.log({ active, group });
        setViewport({ x, y, zoom }, { duration: 800 });
      }
      setNeeedLayout(false);
    }
  }, [
    needLayout,
    note,
    activeBlockId,
    getNode,
    setEdges,
    setViewport,
    setNodes,
  ]);

  const onConnect: OnConnect = useCallback(
    (conn) => {
      const { sourceHandle, targetHandle, source, target } = conn;
      const isX =
        sourceHandle?.endsWith("right") && targetHandle?.endsWith("left");
      const isY =
        sourceHandle?.endsWith("bottom") && targetHandle?.endsWith("top");
      if (!isX && !isY) return;
      const inEdge = edges.find((edge) => edge.target === target);
      if (inEdge) return;
      setEdges((eds) => addEdgeToState(conn, eds));
      const newNodes = [];
      let srcNode, tgtNode: Node<Block> | undefined;
      for (const node of nodes) {
        if (node.id === source) {
          srcNode = node;
          newNodes.push(srcNode);
        } else if (node.id === target) {
          tgtNode = node;
        } else {
          newNodes.push(node);
        }
      }
      if (isX && srcNode && tgtNode) {
        newNodes.push({
          ...tgtNode,
          position: {
            x: srcNode.position.x + srcNode.width! + Layout.code.X,
            y: srcNode.position.y + srcNode.height! / 2 - tgtNode.height! / 2,
          },
        });
      }
      if (isY && srcNode && tgtNode) {
        newNodes.push({
          ...tgtNode,
          position: {
            x: srcNode.position.x + srcNode.width! / 2 - tgtNode.width! / 2,
            y: srcNode.position.y + srcNode.height! + Layout.code.Y,
          },
        });
      }
      setNodes(newNodes);
    },
    [setEdges, nodes, edges, setNodes]
  );
  const onNodesChange = useNodeChange(_onNodesChange, note);
  const onEdgesChange = useEdgeChange(_onEdgesChange, note);
  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      const { source, target } = edge;
      console.log("on click edge: ", source, target, activeBlockId);
      if (activeBlockId === source) {
        dispatch(activateBlock(target));
      } else if (activeBlockId === target) {
        dispatch(activateBlock(source));
      }
      dispatch(activateEdge(edge.id));
    },
    [activeBlockId, dispatch]
  );
  const onEdgeMouseEnter = useCallback(
    (_event: MouseEvent, edge: Edge) => {
      dispatch(setHighlightEdge(edge));
    },
    [dispatch]
  );
  const onEdgeMouseLeave = useCallback(
    (_event: MouseEvent, _edge: Edge) => {
      dispatch(setHighlightEdge());
    },
    [dispatch]
  );

  return (
    <div ref={ref} className="top-0 bottom-0 w-full absolute">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        connectionLineComponent={ConnectionLine}
        panOnScroll
        // selectionMode={SelectionMode.Partial}
        nodesDraggable={true}
        nodesFocusable={true}
        elementsSelectable={true}
        defaultViewport={DefaultViewport}
        defaultEdgeOptions={defaultEdgeOptions}
        minZoom={0.8}
        maxZoom={1}
        onEdgeMouseEnter={onEdgeMouseEnter}
        onEdgeMouseLeave={onEdgeMouseLeave}
        style={{
          background: "white",
          color: "black",
        }}
        onEdgeClick={onEdgeClick}
      >
        {/* <Background /> */}
        <Controls />
        <MiniMap pannable />
        <Menu addBlock={addBlock} />
      </ReactFlow>
    </div>
  );
}

export default function TreeGraph() {
  return (
    <ReactFlowProvider>
      <TreeFlow />
    </ReactFlowProvider>
  );
}
