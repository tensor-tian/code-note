import { CODE_SIZE, hasCycle, isCodeNode, isGroupNode } from "./layout";
import { CodeNode, Edge, Ext2Web, GroupNode, Node, Note } from "types";
import {
  EdgeChange,
  NodeChange,
  OnConnect,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
} from "reactflow";
import { devtools, persist } from "zustand/middleware";
import { nanoid, saveNote } from "../../utils";

import { create } from "zustand";
import { createSelector } from "reselect";
import { layout } from "./layout";

namespace TreeNote {
  export interface Store extends Note {
    activeEdgeId: string;
    selectedNodes: string[];
    selectedEdge: string;
    panToActiveMark: number;
    rootIds: string[];
    handshake: boolean;
  }
  export interface Actions {
    resetNote: (state: Note) => void;
    setKV: <T extends keyof Store>(key: T, val: Store[T]) => void;
    activateNode: (id: string) => void;
    toggleNodeSelection: (id: string) => void;
    onNodeChange: (changes: NodeChange[]) => void;
    onEdgeChange: (changes: EdgeChange[]) => void;
    onConnect: OnConnect;
    addCodeNode: (msg: Ext2Web.AddCode) => void;
    updateNodeText: (id: string, text: string) => void;
    toggleCode: (id: string) => void;
    hideGroupCode: (id: string) => void;
    toggleGroup: () => void;
    deleteEdge: () => void;
    deleteNode: () => void;
  }
  export type State = Store & Actions;
}

const initialData: TreeNote.Store = {
  id: nanoid(),
  type: "TreeNote",
  pkgName: "decorator-sample",
  text: "",
  nodeMap: {},
  edges: [],
  activeNodeId: "", // highlight node, central in viewport, parent for adding node
  activeEdgeId: "", // highlight edge on hover
  selectedNodes: [], // checked for merge group
  selectedEdge: "", // select for delete
  panToActiveMark: 0,
  rootIds: [],
  handshake: false,
};

export type { TreeNote };

export const useTreeNoteStore = create<TreeNote.State>(
  // @ts-ignore
  persist(
    devtools((set, get) => {
      const panToActive = () => {
        const { panToActiveMark: panToActive } = get();
        set({ panToActiveMark: panToActive + 1 }, false, "panToActive");
      };

      return {
        ...initialData,
        resetNote: (note) => set(note),
        setKV: (key, val) => set({ [key]: val }, false, "setKV:" + key),
        activateNode: (id) => {
          set({ activeNodeId: id }, false, "activateNode");
          panToActive();
        },
        toggleNodeSelection: (id) =>
          set(
            ({ selectedNodes }) => {
              if (selectedNodes.includes(id)) {
                return {
                  selectedNodes: selectedNodes.filter((nId) => nId !== id),
                };
              } else {
                const nextSelectedNodes = [...selectedNodes, id];
                return { selectedNodes: nextSelectedNodes };
              }
            },
            false,
            "toggleNodeSelection"
          ),
        onNodeChange: (changes) => {
          console.log("on node change:", changes);
          if (changes.every((chg) => chg.type === "select")) return;
          const { nodeMap, edges, rootIds } = get();
          const nextNodes = applyNodeChanges(changes, Object.values(nodeMap));
          const needLayout = changes.find((change) =>
            ["dimensions", "remove", "add"].includes(change.type)
          );
          let nextNodeMap = {
            ...nodeMap,
            ...nextNodes.reduce((acc, n) => {
              acc[n.id] = n;
              return acc;
            }, {} as Record<string, Node>),
          };
          let nextRootIds = rootIds;
          if (needLayout) {
            ({ nodeMap: nextNodeMap, rootIds: nextRootIds } = layout(
              nextNodeMap,
              edges
            ));
          }
          set(
            { nodeMap: nextNodeMap, rootIds: nextRootIds },
            false,
            "onNodeChange"
          );
        },
        onEdgeChange: (changes) => {
          const { edges } = get();
          set(
            { edges: applyEdgeChanges(changes, edges) },
            false,
            "onEdgeChange"
          );
        },
        onConnect: (conn) => {
          const { source, target, sourceHandle, targetHandle } = conn;
          if (source === target) return;
          const { edges, nodeMap } = get();
          const isX =
            sourceHandle?.endsWith("right") && targetHandle?.endsWith("left");
          const isY =
            sourceHandle?.endsWith("bottom") && targetHandle?.endsWith("top");
          if (!isX && !isY) return;

          const inEdge = edges.find((e) => e.target === target);
          const outEdge = edges.find((e) => e.sourceHandle === sourceHandle);
          if (outEdge?.target === target) return;

          let nextEdges =
            inEdge || outEdge
              ? edges.filter((e) => e.id !== inEdge?.id && e.id !== outEdge?.id)
              : edges;

          nextEdges = addEdge(conn, nextEdges);

          if (hasCycle(nextEdges)) {
            console.log("has cycle", nextEdges);
            return;
          }
          const { rootIds, nodeMap: nextNodeMap } = layout(nodeMap, nextEdges);
          set(
            {
              nodeMap: nextNodeMap,
              edges: nextEdges,
              rootIds,
            },
            false,
            "onConnect"
          );
        },
        addCodeNode: ({ action, data }) => {
          const { nodeMap, edges, activeNodeId } = get();
          const nodes = Object.values(nodeMap);

          if (!activeNodeId && nodes.length > 0) return;

          if (activeNodeId) {
            const sourceEdges = edges.filter(({ sourceHandle }) =>
              sourceHandle?.startsWith(activeNodeId)
            );
            if (sourceEdges && sourceEdges.length > 0)
              if (
                (action === "add-detail" &&
                  sourceEdges.find(({ sourceHandle }) =>
                    sourceHandle?.endsWith("right")
                  )) ||
                (action === "add-next" &&
                  sourceEdges.find(({ sourceHandle }) =>
                    sourceHandle?.endsWith("bottom")
                  ))
              )
                return;
          }

          // add node
          const activeNode = nodeMap[activeNodeId];
          const node = newNode({ data, action }, activeNode);
          const nextNodeMap = { ...nodeMap, [node.id]: node };
          if (!activeNode) {
            set(
              { activeNodeId: node.id, nodeMap: nextNodeMap },
              false,
              "addCodeNode"
            );
            panToActive();
            return;
          }

          // add edge
          const nextEdges = [...edges, newEdge(activeNodeId, node.id, action)];
          set(
            { activeNodeId: node.id, nodeMap: nextNodeMap, edges: nextEdges },
            false,
            "addCodeNode"
          );
          panToActive();
          return;
        },
        updateNodeText: (id, text) =>
          set(
            ({ nodeMap }) => {
              const node = nodeMap[id] as CodeNode;
              return {
                nodeMap: {
                  ...nodeMap,
                  [id]: { ...node, data: { ...node.data, text } },
                },
              };
            },
            false,
            "updateNodeText"
          ),
        toggleCode: (id) => {
          const { nodeMap } = get();
          const node = nodeMap[id] as CodeNode;
          set(
            {
              nodeMap: {
                ...nodeMap,
                [id]: {
                  ...node,
                  data: { ...node.data, showCode: !node.data.showCode },
                },
              },
            },
            false,
            "toggleCode"
          );
        },
        hideGroupCode: (id) => {
          const { nodeMap } = get();
          const { chain } = (nodeMap[id] as GroupNode).data;
          set(
            {
              nodeMap: chain.reduce(
                (acc, id) => {
                  const node = nodeMap[id] as CodeNode;
                  if (node.data.showCode) {
                    acc[node.id] = {
                      ...node,
                      data: { ...node.data, showCode: false },
                    };
                  }
                  return acc;
                },
                { ...nodeMap }
              ),
            },
            false,
            "hideGroupCode"
          );
        },
        toggleGroup: () => {
          const { selectedNodes, nodeMap, edges, rootIds } = get();
          if (selectedNodes.length === 1) {
            // remove group node
            const id = selectedNodes[0];
            const group = nodeMap[id];
            if (!isGroupNode(group)) return;

            const nextNodeMap = { ...nodeMap };
            delete nextNodeMap[id];
            group.data.chain.forEach((nId) => {
              const n = nextNodeMap[nId];
              delete n.parentId;
              delete n.extent;
              nextNodeMap[nId] = {
                ...n,
                position: {
                  x: n.position.x + group.position.x,
                  y: n.position.y + group.position.y,
                },
              };
            });

            set(
              {
                nodeMap: nextNodeMap,
                activeNodeId: group.data.chain[0],
                selectedNodes: [],
              },
              false,
              "toggleGroup:remove"
            );
            panToActive();
          } else {
            // add group node
            const inScrolly = selectedNodes.find((id) => nodeMap[id].parentId);
            if (inScrolly) return;

            const chain = getNextChain(selectedNodes, edges);
            if (!chain) return;

            const group = newScrolly(chain);
            let nextNodeMap = { ...nodeMap, [group.id]: group };
            chain.forEach((nId) => {
              const n = nextNodeMap[nId];
              nextNodeMap[nId] = {
                ...n,
                parentId: group.id,
                extent: "parent",
              };
            });
            let nextRootIds = rootIds;
            ({ nodeMap: nextNodeMap, rootIds: nextRootIds } = layout(
              nextNodeMap,
              edges
            ));
            set(
              {
                nodeMap: nextNodeMap,
                activeNodeId: chain[0],
                selectedNodes: [],
                rootIds: nextRootIds,
              },
              false,
              "toggleGroup:add"
            );
            panToActive();
          }
        },
        deleteEdge: () => {
          const { edges, selectedEdge, nodeMap } = get();
          let nextEdges = edges.filter((e) => e.id !== selectedEdge);
          const { rootIds, nodeMap: nextNodeMap } = layout(nodeMap, nextEdges);
          set(
            {
              edges: nextEdges,
              nodeMap: nextNodeMap,
              rootIds: rootIds,
            },
            false,
            "deleteEdge"
          );
        },
        deleteNode: () => {
          const { nodeMap, selectedNodes, edges, rootIds } = get();
          if (selectedNodes.length !== 1) return;
          const node = nodeMap[selectedNodes[0]];
          if (!node) return;

          const inEdges = edges.filter((e) => e.target === node.id);
          const outEdges = edges.filter((e) => e.source === node.id);
          if (outEdges.length > 1 || outEdges.length > 1) return;
          const inEdge = inEdges[0];
          const outEdge = outEdges[0];
          if (inEdges.length === 1 && outEdges.length === 1) {
            if (
              (inEdge?.targetHandle?.endsWith("top") &&
                outEdge.targetHandle?.endsWith("left")) ||
              (inEdge?.targetHandle?.endsWith("left") &&
                outEdge.targetHandle?.endsWith("top"))
            )
              return;
          }
          let nextNodeMap = { ...nodeMap };
          delete nextNodeMap[node.id];
          const nextEdges = edges.filter(
            (e) => e.id !== inEdge?.id && e.id !== outEdge?.id
          );
          const action = (inEdge || outEdge)?.targetHandle?.endsWith("top")
            ? "add-next"
            : "add-detail";
          if (inEdge && outEdge) {
            nextEdges.push(newEdge(inEdge.source, outEdge.target, action));
          }
          let nextRootIds = rootIds;
          ({ rootIds: nextRootIds, nodeMap: nextNodeMap } = layout(
            nextNodeMap,
            nextEdges
          ));
          set(
            {
              nodeMap: nextNodeMap,
              edges: nextEdges,
              rootIds: nextRootIds,
              selectedNodes: [],
            },
            false,
            "deleteNode"
          );
        },
      };
    }),
    {
      name: "tree-note",
      skipHydration: true,
      partialize: (state) => {
        console.log("partialize:", state);
        return cache({
          id: state.id,
          type: state.type,
          pkgName: state.pkgName,
          text: state.text,
          nodeMap: state.nodeMap,
          edges: state.edges,
        });
      },
      storage: {
        getItem: (_name) => ({ state: {} }),
        setItem: (_name, value) => {
          const { state } = value;
          console.log("set item:", state);
          if (state) {
            saveNote(JSON.stringify(state, null, 2));
          }
        },
        removeItem: (_name) => {},
      },
    }
  )
);

function cache<T extends Record<string, any>>(state: T) {
  return createCache<T>()(state);
}

function createCache<T extends Record<string, any>>() {
  let prevState: T | null = null;
  return (state: T): T | null => {
    console.log("cache state: ", state);
    if (
      Object.entries(state).every(
        ([key, value]) => prevState && prevState[key] === value
      )
    )
      return null;
    prevState = state;
    return state;
  };
}

export function newEdge(
  source: string,
  target: string,
  action: "add-detail" | "add-next"
): Edge {
  return {
    id: nanoid(12),
    type: "CodeEdge",
    source,
    target,
    animated: true,
    sourceHandle:
      action === "add-detail" ? `${source}-right` : `${source}-bottom`,
    targetHandle: action === "add-detail" ? `${target}-left` : `${target}-top`,
  };
}

export function newNode(
  { action, data }: Ext2Web.AddCode,
  activeNode: Node | undefined
) {
  const id = nanoid();
  const block = { ...data, id, text: `${id} ${data.text}` };
  let x = 0,
    y = 0;
  if (activeNode) {
    if (action === "add-detail") {
      x =
        activeNode.position.x + (activeNode.width || CODE_SIZE.W) + CODE_SIZE.X;
      y = activeNode.position.y;
    } else if (action === "add-next") {
      x = activeNode.position.x;
      y =
        activeNode.position.y +
        (activeNode.height || CODE_SIZE.H) +
        CODE_SIZE.Y;
    }
  }
  const node: Node = {
    id: block.id,
    type: block.type,
    position: { x, y },
    data: block,
    width: CODE_SIZE.W,
    height: CODE_SIZE.H,
    deletable: false,
  };
  return node;
}

function getNextChain(
  selections: string[],
  edges: Edge[]
): string[] | undefined {
  const selectionsSet = new Set(selections);
  const nextEdges = edges.filter(
    (edge) =>
      edge.sourceHandle?.endsWith("bottom") &&
      (selectionsSet.has(edge.source) || selectionsSet.has(edge.target))
  );
  // prepare maps for source and target
  const maps = nextEdges.reduce(
    (maps, edge) => {
      maps.source.set(edge.source, edge);
      maps.target.set(edge.target, edge);
      return maps;
    },
    { source: new Map<string, Edge>(), target: new Map<string, Edge>() }
  );

  const nIDFirst = selections.find((id) => {
    const inEdge = maps.target.get(id);
    if (!inEdge) {
      return true;
    }
    const hasIn = selectionsSet.has(inEdge.source || "");
    return !hasIn;
  });

  if (!nIDFirst) {
    console.log("stop grouping: first node not found");
    return;
  }

  let nID = nIDFirst;
  const chain = [] as string[];
  while (selectionsSet.has(nID)) {
    chain.push(nID);
    const edge = maps.source.get(nID);
    if (!edge) {
      break;
    }
    nID = edge.target;
  }

  if (chain.length !== selections.length) {
    console.log("stop grouping: more than one chain");
    return;
  }

  return chain;
}

function newScrolly(chain: string[]): GroupNode {
  const id = nanoid();
  return {
    id,
    type: "Scrolly",
    data: {
      id,
      type: "Scrolly",
      text: "",
      chain,
    },
    position: { x: 0, y: 0 },
    style: {
      width: 0,
      height: 0,
    },
    deletable: false,
  };
}

type Store = TreeNote.Store;

export const selectNodeMap = (state: Store) => state.nodeMap;
export const selectEdges = (state: Store) => state.edges;
export const selectSelectedNodes = (state: Store) => state.selectedNodes;
export const selectActiveEdgeId = (state: Store) => state.activeEdgeId;
export const selectActiveNodeId = (state: Store) => state.activeNodeId;
export const selectNoteTitle = (state: Store) => `${state.id}. ${state.type}`;
export const selectPanToActiveMark = (state: Store) => state.panToActiveMark;
export const selectRootIds = (state: Store) => state.rootIds;

export const selectNodes = createSelector(
  [selectNodeMap],
  (nodeMap: Record<string, Node>) => {
    const nodes = Array.from(Object.values(nodeMap));
    const sorted: Node[] = nodes.filter(isGroupNode);
    return sorted.concat(nodes.filter(isCodeNode));
  }
);
export const selectActiveNode = createSelector(
  [selectActiveNodeId, selectNodeMap],
  (activeId, nodeMap) => {
    return nodeMap[activeId];
  }
);
export const selectActiveNodeAndGroup = createSelector(
  [selectActiveNodeId, selectNodeMap, selectPanToActiveMark],
  (activeId, nodeMap, activeMark) => {
    let activeNode = nodeMap[activeId];
    let activeGroup: Node | undefined = undefined;
    if (activeNode?.parentId) {
      activeGroup = nodeMap[activeNode.parentId];
    }
    console.log(activeNode, activeGroup, activeMark);
    return {
      activeNode,
      activeMark,
      activeGroup,
    };
  }
);

let mp: Record<string, Node>;
export const selectGroupShowCode = (id: string) =>
  createSelector([selectNodeMap], (nodeMap) => {
    console.log(
      "select group show code:",
      id,
      nodeMap === mp,
      nodeMap,
      nodeMap[id]
    );
    mp = nodeMap;
    const group = nodeMap[id] as GroupNode;
    if (!group) return false;
    return !!group.data.chain.find(
      (id) => (nodeMap[id] as CodeNode).data.showCode
    );
  });

export const selectActiveEdge = createSelector(
  [selectEdges, selectActiveEdgeId],
  (edges, id) => edges.find((e) => e.id === id)
);
