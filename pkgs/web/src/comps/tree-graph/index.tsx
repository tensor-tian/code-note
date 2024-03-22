import { Block, Note } from "types";
import type {
  Edge,
  EdgeTypes,
  Node,
  OnConnect,
  OnEdgesChange,
  OnNodesChange,
} from "reactflow";
import { HTMLAttributes, useCallback, useEffect, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  NodeTypes,
  addEdge as addEdgeToState,
  useEdgesState,
  useNodesState,
} from "reactflow";
import { resetEdges, resetNodes } from "../../api";

import ConnectionLine from "./connection-line";
import { Dispatch } from "../../store";
import TreeEdge from "./edge";
import TreeNode from "./tree-node";

const nodeTypes: NodeTypes = {
  treeNode: TreeNode,
};
const edgeTypes: EdgeTypes = {
  treeEdge: TreeEdge,
};

interface TreeGraphProps extends HTMLAttributes<HTMLDivElement> {
  note: Note;
  dispatch: Dispatch;
}

const useNodeChange = (_onNodesChange: OnNodesChange, nodes: Node<Block>[]) => {
  const [nodesReset, setNodesReset] = useState(false);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      console.log("on nodes change:", changes);
      for (const change of changes) {
        if (
          (change.type === "position" && change.dragging) ||
          ["remove", "add"].includes(change.type)
        ) {
          setNodesReset(true);
        }
      }
      _onNodesChange(changes);
    },
    [_onNodesChange, setNodesReset]
  );

  useEffect(() => {
    if (nodesReset) {
      resetNodes(nodes);
      setNodesReset(false);
    }
  }, [nodes, nodesReset, setNodesReset]);

  return onNodesChange;
};

const useEdgeChange = (_onEdgesChange: OnEdgesChange, edges: Edge<any>[]) => {
  const [edgesReset, setEdgesReset] = useState(false);
  useEffect(() => {
    if (edgesReset) {
      resetEdges(edges);
      setEdgesReset(false);
    }
  }, [edges, edgesReset, setEdgesReset]);
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      console.log("on edges change:", changes);
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

/**
 *  Tree Graph Component
 */
function TreeGraph({ note, dispatch, ...restProps }: TreeGraphProps) {
  const [nodes, setNodes, _onNodesChange] = useNodesState<Block>([]);
  const [edges, setEdges, _onEdgesChange] = useEdgesState<any>([]);

  useEffect(() => {
    const nodeList: Node<Block>[] = Object.values(note.blockMap).map((b) => ({
      id: b.id,
      position: note.tree.nodes[b.id].position ?? { x: 0, y: 0 },
      data: b,
      type: b.type,
    }));
    console.log("nodeList:", nodeList);
    setNodes(nodeList);
    setEdges(note.tree.edges);
  }, [note, setNodes, setEdges]);

  const onConnect: OnConnect = useCallback(
    (conn) => {
      const { sourceHandle, targetHandle, source, target } = conn;
      const isX =
        sourceHandle?.endsWith("right") && targetHandle?.endsWith("left");
      const isY =
        sourceHandle?.endsWith("bottom") && targetHandle?.endsWith("top");
      if (isX || isY) {
        console.log("will connect:", conn);
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
              x: srcNode.position.x + srcNode.width! + 80,
              y: srcNode.position.y + srcNode.height! / 2 - tgtNode.height! / 2,
            },
          });
        }
        if (isY && srcNode && tgtNode) {
          newNodes.push({
            ...tgtNode,
            position: {
              x: srcNode.position.x + srcNode.width! / 2 - tgtNode.width! / 2,
              y: srcNode.position.y + srcNode.height! + 40,
            },
          });
        }
        setNodes(newNodes);
      }
    },
    [setEdges, nodes, setNodes]
  );

  const onNodesChange = useNodeChange(_onNodesChange, nodes);
  const onEdgesChange = useEdgeChange(_onEdgesChange, edges);

  return (
    <div {...restProps}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        connectionLineComponent={ConnectionLine}
        defaultEdgeOptions={{
          type: "treeEdge",
        }}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}

export default TreeGraph;
