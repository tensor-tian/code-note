import { Block, CodeBlock, Edge, Node } from "types";
import { DefaultViewport, vscode } from "../../utils";
import {
  EdgeTypes,
  OnConnect,
  OnEdgesChange,
  OnNodesChange,
  ReactFlowProvider,
} from "reactflow";
import type { Ext2Web, NodeDimensionChange, NodePositionChange } from "types";
import { MouseEvent, useCallback, useEffect, useRef } from "react";
import ReactFlow, {
  Controls,
  MiniMap,
  NodeTypes,
  addEdge as addEdgeToState,
  useEdgesState,
  useNodesState,
} from "reactflow";
import {
  actAddNote,
  actChangeNodes,
  actSetEdgeActive,
  actSetEdgeHighlight,
  actSetNodeActive,
  selectActiveNodeId,
  selectEdges,
  selectNodes,
} from "../../service/note-slice";
import { useAppDispatch, useAppSelector } from "../../service/store";

import { CODE_SIZE } from "./layout2";
import Code from "./code";
import CodeEdge from "./edge";
import ConnectionLine from "./connection-line";
import Menu from "./menu";
import Scrolly from "./scrolly";
import Tree from "./Tree";

const nodeTypes: NodeTypes = {
  Code,
  Scrolly,
  Tree,
};
const edgeTypes: EdgeTypes = {
  CodeEdge,
};
const defaultEdgeOptions = {
  zIndex: 1,
};

const useNodeChange = (_onNodesChange: OnNodesChange, dispatch: Function) => {
  // const [nodesReset, setNodesReset] = useState(false);

  // useEffect(() => {
  //   if (nodesReset) {
  //     setNodesReset(false);
  //     saveNote(note);
  //   }
  // }, [note, nodesReset, setNodesReset]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      const chgs = changes.filter(
        (change) =>
          change.type === "dimensions" ||
          (change.type === "position" && change.dragging)
      ) as Array<NodeDimensionChange | NodePositionChange>;
      if (chgs.length > 0) {
        dispatch(actChangeNodes(chgs));
      }
      // for (const change of changes) {
      //   if (
      //     (change.type === "position" && change.dragging) ||
      //     ["remove", "add"].includes(change.type)
      //   ) {
      //     setNodesReset(true);
      //   }
      // }
      console.log("on node change:", changes);
      _onNodesChange(changes);
    },
    [dispatch, _onNodesChange]
  );

  return onNodesChange;
};

const useEdgeChange = (_onEdgesChange: OnEdgesChange) => {
  // const [edgesReset, setEdgesReset] = useState(false);

  // useEffect(() => {
  //   if (edgesReset) {
  //     setEdgesReset(false);
  //   }
  // }, [edgesReset, setEdgesReset]);

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      for (const change of changes) {
        if (["add", "remove"].includes(change.type)) {
          // setEdgesReset(true);
        }
        if (change.type === "add") {
          change.item.type = "treeEdge";
        }
      }
      _onEdgesChange(changes);
    },
    [_onEdgesChange]
  );

  return onEdgesChange;
};
const handleMessage =
  (dispatch: Function) => (event: MessageEvent<Ext2Web.AddBlock>) => {
    switch (event.data.action) {
      case "add-detail":
      case "add-next":
        console.log("Receive message from extension:", event.data);
        // const { nodeInternals } = store.getState();
        // const activeNode = nodeInternals.get(activeBlockId || "");
        dispatch(
          actAddNote({
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
  const [nodes, setNodes, _onNodesChange] = useNodesState<Block>([]);
  const [edges, setEdges, _onEdgesChange] = useEdgesState<any>([]);
  const dispatch = useAppDispatch();
  const activeBlockId = useAppSelector(selectActiveNodeId);
  const ref = useRef<HTMLDivElement>(null);
  // add block buttonn in Menu component
  const addBlock = useCallback(
    (action: Ext2Web.AddBlock["action"], data: Omit<CodeBlock, "id">) => {
      const handler = handleMessage(dispatch);
      handler(new MessageEvent("message", { data: { action, data } }));
    },
    [dispatch]
  );
  // message from extension
  useEffect(() => {
    const handler = handleMessage(dispatch);
    window.addEventListener("message", handler);
    return () => {
      window.removeEventListener("message", handler);
    };
  }, [dispatch]);

  console.log("nodes:", nodes);
  console.log("edges:", edges);
  const nodes2 = useAppSelector(selectNodes);
  const edges2 = useAppSelector(selectEdges);
  useEffect(() => {
    setNodes(nodes2);
    console.log("nodes 2:", nodes2);
  }, [nodes2, setNodes]);
  useEffect(() => {
    setEdges(edges2);
    console.log("edges 2:", edges2);
  }, [edges2, setEdges]);

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
      let srcNode, tgtNode: Node | undefined;
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
            x: srcNode.position.x + srcNode.width! + CODE_SIZE.X,
            y: srcNode.position.y + srcNode.height! / 2 - tgtNode.height! / 2,
          },
        });
      }
      if (isY && srcNode && tgtNode) {
        newNodes.push({
          ...tgtNode,
          position: {
            x: srcNode.position.x + srcNode.width! / 2 - tgtNode.width! / 2,
            y: srcNode.position.y + srcNode.height! + CODE_SIZE.Y,
          },
        });
      }
      setNodes(newNodes);
    },
    [setEdges, nodes, edges, setNodes]
  );
  const onNodesChange = useNodeChange(_onNodesChange, dispatch);
  const onEdgesChange = useEdgeChange(_onEdgesChange);
  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      const { source, target } = edge;
      console.log("on click edge: ", source, target, activeBlockId);
      if (activeBlockId === source) {
        dispatch(actSetNodeActive(target));
      } else if (activeBlockId === target) {
        dispatch(actSetNodeActive(source));
      }
      dispatch(actSetEdgeActive(edge.id));
    },
    [activeBlockId, dispatch]
  );
  const onEdgeMouseEnter = useCallback(
    (_event: MouseEvent, edge: Edge) => {
      dispatch(actSetEdgeHighlight(edge));
    },
    [dispatch]
  );
  const onEdgeMouseLeave = useCallback(
    (_event: MouseEvent, _edge: Edge) => {
      dispatch(actSetEdgeHighlight());
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
