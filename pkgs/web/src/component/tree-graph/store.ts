import { getHidden, hasCycle, isCodeNode, isGroupNode, TreeGraphSettings } from "./layout";
import { CodeBlock, CodeNode, Edge, Ext2Web, GroupNode, Node, Note, Web2Ext } from "types";
import { EdgeChange, NodeChange, OnConnect, addEdge, applyEdgeChanges, applyNodeChanges, Connection } from "reactflow";
import { devtools, persist } from "zustand/middleware";
import { isVscode, nanoid, saveNote, vscode, vscodeMessage } from "../../utils";

import { create } from "zustand";

import { layout } from "./layout";
import { migrateNote } from "./selector";

namespace TreeNote {
  export interface Store extends Note {
    activeEdgeId: string;
    canGroupNodes: boolean;
    selectedNodes: string[];
    selectedEdge: string;
    panToActiveMark: number;
    rootIds: string[];
    handshake: boolean;
    debug: boolean;
    settings: TreeGraphSettings;
    hiddenEdges: Set<string>;
    hiddenNodes: Set<string>;
  }
  export interface Actions {
    resetNote: (state: Note) => void;
    setKV: <T extends keyof Store>(key: T, val: Store[T]) => void;
    activateNode: (id: string, followEdge?: Edge) => void;
    toggleNodeSelection: (id: string) => void;
    onNodeChange: (changes: NodeChange[]) => void;
    onEdgeChange: (changes: EdgeChange[]) => void;
    onConnect: OnConnect;
    addCodeNode: (msg: Ext2Web.AddCode) => void;
    updateCodeBlock: (data: Pick<CodeBlock, "id"> & Partial<CodeBlock>, action: string) => void;
    updateNodeText: (id: string, text: string) => void;
    updateNodeCodeRange: (data: Ext2Web.CodeRangeChange["data"]) => void;
    stopNodeCodeRangeEditing: (id: string) => void;
    toggleCode: (id: string) => void;
    hideGroupCode: (id: string) => void;
    deleteEdge: () => void;
    deleteNode: () => void;
    groupNodes: (id: string) => void;
    splitGroup: () => void;
    toggleRenderAsGroup: (id: string) => void;
    // toggleGroupRenderMode: (id: string) => void;
    handleCodeHikeMessage: (action: string, data: any) => void;
    forceLayout: () => void;
  }
  export type State = Store & Actions;
}

const initialData: TreeNote.Store = {
  id: "",
  type: "TreeNote",
  pkgPath: "/pkg/path",
  pkgName: "decorator-sample",
  text: "## loading...",
  nodeMap: {},
  edges: [],
  activeNodeId: "", // highlight node, central in viewport, parent for adding node
  activeEdgeId: "", // highlight edge on hover
  canGroupNodes: false,
  selectedNodes: [], // checked for merge group
  selectedEdge: "", // select for delete
  panToActiveMark: 0,
  rootIds: [],
  handshake: false,
  debug: false,
  settings: {
    X: 50,
    Y: 46,
    W: 600,
    H: 58,
  },
  version: 2,
  hiddenEdges: new Set(),
  hiddenNodes: new Set(),
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
      const updateCodeBlock = ({ id, ...rest }: Pick<CodeBlock, "id"> & Partial<CodeBlock>, action: string) => {
        const { nodeMap } = get();
        const node = nodeMap[id];
        if (!isCodeNode(node)) return;
        set(
          {
            nodeMap: {
              ...nodeMap,
              [id]: { ...node, data: { ...node.data, ...rest } },
            },
          },
          false,
          action
        );
      };

      return {
        ...initialData,
        resetNote: (note) => {
          console.log("reset note:", note);
          note.nodeMap = Object.values(note.nodeMap).reduce((acc, node) => {
            if (isCodeNode(node)) {
              node.data.isCodeRangeEditing = false;
            }
            acc[node.id] = node;
            return acc;
          }, {} as Record<string, Node>);
          set({ ...note, hiddenEdges: new Set<string>(), hiddenNodes: new Set<string>() });
          const { activeNodeId, nodeMap, edges, settings } = get();
          if (!activeNodeId) {
            if (Object.keys(nodeMap).length === 0) return;
            const { nodeMap: nextNodeMap, rootIds } = layout(nodeMap, edges, settings);
            set({
              nodeMap: nextNodeMap,
              rootIds,
              activeNodeId: rootIds[0],
            });
          }
        },
        setKV: (key, val) => set({ [key]: val }, false, "setKV:" + key),
        activateNode: (id, edge) => {
          const { nodeMap } = get();
          const node = nodeMap[id];
          let activeNodeId = id;
          if (isGroupNode(node) && !node.data.renderAsGroup && edge) {
            const chain = node.data.chain;
            if (edge.target === node.id) {
              activeNodeId = chain[0];
            } else {
              activeNodeId = chain[chain.length - 1];
            }
          }
          set({ activeNodeId }, false, "activateNode");
          panToActive();
        },
        toggleNodeSelection: (id) => {
          const { selectedNodes, edges, nodeMap } = get();
          let nextSelectedNodes: string[];
          if (selectedNodes.includes(id)) {
            nextSelectedNodes = selectedNodes.filter((nId) => nId !== id);
          } else {
            nextSelectedNodes = [...selectedNodes, id];
          }
          const noGroupNode = nextSelectedNodes.every((id) => {
            const node = nodeMap[id];
            if (!node) return false;
            return node.data.type === "Code" && !node.parentId;
          });
          const chain =
            noGroupNode && nextSelectedNodes.length > 1 ? getNextChain(nextSelectedNodes, edges) : undefined;
          set(
            {
              canGroupNodes: Boolean(chain),
              selectedNodes: chain || nextSelectedNodes,
            },
            false,
            "toggleNodeSelection"
          );
        },
        onNodeChange: (changes) => {
          console.log("on node change:", changes);
          if (changes.every((chg) => chg.type === "select")) return;
          const { nodeMap, edges, rootIds, settings } = get();
          const nextNodes = applyNodeChanges(changes, Object.values(nodeMap));
          const needLayout = changes.find((change) => ["dimensions", "remove", "add"].includes(change.type));
          let nextNodeMap = {
            ...nodeMap,
            ...nextNodes.reduce((acc, n) => {
              acc[n.id] = n;
              return acc;
            }, {} as Record<string, Node>),
          };
          let nextRootIds = rootIds;
          if (needLayout) {
            ({ nodeMap: nextNodeMap, rootIds: nextRootIds } = layout(nextNodeMap, edges, settings));
          }
          set({ nodeMap: nextNodeMap, rootIds: nextRootIds }, false, "onNodeChange");
        },
        onEdgeChange: (changes) => {
          const { edges } = get();
          set({ edges: applyEdgeChanges(changes, edges) }, false, "onEdgeChange");
        },
        onConnect: (conn) => {
          const { source, target, sourceHandle, targetHandle } = conn;
          if (source === target) return;
          const { edges, nodeMap, settings } = get();
          const isX = sourceHandle?.endsWith("right") && targetHandle?.endsWith("left");
          const isY = sourceHandle?.endsWith("bottom") && targetHandle?.endsWith("top");
          if (!isX && !isY) return;

          const inEdge = edges.find((e) => e.target === target);
          const outEdge = edges.find((e) => e.sourceHandle === sourceHandle);
          if (outEdge?.target === target) return;

          let nextEdges = inEdge || outEdge ? edges.filter((e) => e.id !== inEdge?.id && e.id !== outEdge?.id) : edges;

          nextEdges = addEdge(newEdgeFromConn(conn), nextEdges);

          if (hasCycle(nextEdges)) {
            console.log("has cycle", nextEdges);
            return;
          }
          const { rootIds, nodeMap: nextNodeMap } = layout(nodeMap, nextEdges, settings);
          set({ nodeMap: nextNodeMap, edges: nextEdges, rootIds }, false, "onConnect");
        },
        addCodeNode: ({ action, data }) => {
          const { nodeMap, edges, activeNodeId, settings, selectedNodes } = get();
          const nodes = Object.values(nodeMap);
          console.log("add code node:", activeNodeId, nodes.length);
          // empty tree flow graph
          if (!activeNodeId && nodes.length > 0) return;

          // add node
          const activeNode = nodeMap[activeNodeId];
          const parent = nodeMap[activeNode?.parentId || ""] as GroupNode | undefined;
          const node = newNode({ data, action }, settings, activeNode, parent);
          let nextNodeMap = { ...nodeMap, [node.id]: node };

          if (!activeNode) {
            set({ activeNodeId: node.id, nodeMap: nextNodeMap, rootIds: [node.id] }, false, "addCodeNode");
            panToActive();
            return;
          }

          if (parent) {
            const chain = parent.data.chain;
            if (action === "ext2web-add-next") {
              node.parentId = parent.id;
              node.extent = "parent";
              const pos = chain.findIndex((_id) => _id === activeNode.id);
              chain.splice(pos + 1, 0, node.id);
              nextNodeMap[parent.id] = { ...parent, data: { ...parent.data, chain: [...chain] } };
            }
          }

          const nextEdges = [...edges, newEdge(activeNodeId, node.id, action)];
          // add edges
          if (action === "ext2web-add-detail") {
            const iR = edges.findIndex(({ sourceHandle }) => sourceHandle === `${activeNodeId}-right`);
            if (iR !== -1) {
              const eR = nextEdges[iR];
              nextEdges.splice(iR, 1, newEdge(node.id, eR.target, action));
            }
          } else if (action === "ext2web-add-next") {
            const iB = edges.findIndex(({ sourceHandle }) => sourceHandle === `${activeNodeId}-bottom`);
            if (iB !== -1) {
              const eB = nextEdges[iB];
              nextEdges.splice(iB, 1, newEdge(node.id, eB.target, action));
            }
            if (activeNode.parentId) {
              const group = nextNodeMap[activeNode.parentId] as GroupNode;
              const chain = group.data.chain;
              if (chain.length - 1 === chain.indexOf(activeNodeId)) {
                // the active note is the last of group chain node
                nextNodeMap[group.id] = {
                  ...group,
                  data: {
                    ...group.data,
                    chain: [...chain, node.id],
                  },
                };
              }
            }
          }
          const chain = selectedNodes.length > 1 ? getNextChain(selectedNodes, nextEdges) : undefined;
          let nextRootIds: string[];
          ({ nodeMap: nextNodeMap, rootIds: nextRootIds } = layout(nextNodeMap, edges, settings));
          set(
            {
              activeNodeId: node.id,
              nodeMap: nextNodeMap,
              edges: nextEdges,
              rootIds: nextRootIds,
              canGroupNodes: Boolean(chain),
            },
            false,
            "addCodeNode"
          );
          panToActive();
          return;
        },
        updateCodeBlock: (data, action) => updateCodeBlock(data, action),
        updateNodeText: (id, text) => {
          updateCodeBlock({ id, text }, "updateNodeText");
        },

        updateNodeCodeRange: (data) => {
          updateCodeBlock(data, "updateNodeCodeRange");
        },

        stopNodeCodeRangeEditing: (id) => {
          updateCodeBlock({ id, isCodeRangeEditing: false }, "stopNodeCodeRangeEditing");
        },

        toggleCode: (id) => {
          const { nodeMap } = get();
          const node = nodeMap[id] as CodeNode;
          updateCodeBlock({ id, showCode: !node.data.showCode }, "toggleCode");
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
        groupNodes: (id: string) => {
          const { selectedNodes, canGroupNodes, edges, nodeMap, settings } = get();
          if (!canGroupNodes) {
            vscodeMessage.warn("Only a vertical edge chain can be merged to a group node");
            return;
          }
          const chain = getNextChain(selectedNodes, edges);
          if (!chain) {
            vscodeMessage.warn("Only a vertical edge chain can be merged to a group node !");
            return;
          }
          const group = newScrolly(id, chain);
          let nextNodeMap = { ...nodeMap, [group.id]: group };
          // add parentId & extent property for children
          chain.forEach((nId) => {
            const n = nextNodeMap[nId];
            nextNodeMap[nId] = { ...n, parentId: group.id, extent: "parent" };
          });
          // const edgeMap = edges.reduce((acc, e) => acc.set(e.id, e), new Map<string, Edge>());
          const nextEdges = new Array<Edge>(edges.length);
          // replace edges connect to code in chain with to group:
          const nFist = chain[0];
          const nLast = chain[chain.length - 1];
          for (let i = 0; i < nextEdges.length; i++) {
            const edge = edges[i];
            if (edge.targetHandle === nFist + "-left") {
              nextEdges[i] = { ...edge, target: group.id, targetHandle: group.id + "-left" };
            } else if (edge.targetHandle === nFist + "-top") {
              nextEdges[i] = { ...edge, target: group.id, targetHandle: group.id + "-top" };
            } else if (edge.sourceHandle === nLast + "-bottom") {
              nextEdges[i] = { ...edge, source: group.id, sourceHandle: group.id + "-bottom" };
            } else {
              nextEdges[i] = edge;
            }
          }
          // calc layout
          let nextRootIds: string[];
          ({ nodeMap: nextNodeMap, rootIds: nextRootIds } = layout(nextNodeMap, nextEdges, settings));
          set(
            {
              nodeMap: nextNodeMap,
              edges: nextEdges,
              activeNodeId: chain[0],
              selectedNodes: [],
              canGroupNodes: false,
              rootIds: nextRootIds,
            },
            false,
            "groupNodes"
          );
          panToActive();
        },
        splitGroup() {
          const { selectedNodes, nodeMap, edges, settings } = get();
          const id = selectedNodes[0];
          const group = nodeMap[id];
          if (!isGroupNode(group) || selectedNodes.length !== 1) {
            vscodeMessage.warn("Only a group node can be splitted !");
            return;
          }
          let nextNodeMap = { ...nodeMap };
          delete nextNodeMap[id];
          const chain = group.data.chain;
          // remove parentId and extent property of children, update position
          chain.forEach((nId) => {
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
          const nextEdges = new Array<Edge>(edges.length);
          // replace edges connect to group with edges to codes
          const nFirst = chain[0];
          const nLast = chain[chain.length - 1];

          for (let i = 0; i < nextEdges.length; i++) {
            const edge = edges[i];
            if (edge.targetHandle === id + "-left") {
              nextEdges[i] = { ...edge, target: nFirst, targetHandle: nFirst + "-left" };
            } else if (edge.targetHandle === id + "-top") {
              nextEdges[i] = { ...edge, target: nFirst, targetHandle: nFirst + "-top" };
            } else if (edge.sourceHandle === id + "-bottom") {
              nextEdges[i] = { ...edge, source: nLast, sourceHandle: nLast + "-bottom" };
            } else {
              nextEdges[i] = edge;
            }
          }
          // calc layout
          let nextRootIds: string[];
          ({ nodeMap: nextNodeMap, rootIds: nextRootIds } = layout(nextNodeMap, nextEdges, settings));
          set(
            {
              nodeMap: nextNodeMap,
              rootIds: nextRootIds,
              activeNodeId: group.data.chain[0],
              selectedNodes: [],
              edges: nextEdges,
            },
            false,
            "splitGroup"
          );
          panToActive();
        },
        toggleRenderAsGroup(id: string) {
          const { nodeMap, edges, settings } = get();
          const g = nodeMap[id];
          if (!isGroupNode(g)) {
            vscodeMessage.warn("Only the group node can toggle renderAsGroup");
            return;
          }
          let nextNodeMap = { ...nodeMap };
          const nextEdges = [...edges];
          const { renderAsGroup, stepIndex, chain } = g.data;
          if (renderAsGroup) {
            delete g.height;
            nextNodeMap[g.id] = {
              ...g,
              data: { ...g.data, renderAsGroup: false, stepIndex: 0 },
              style: { width: settings.W },
            };
            const idx = nextEdges.findIndex((e) => e.sourceHandle === `${g.id}-right`);
            if (idx !== -1) {
              const _id = chain[stepIndex];
              nextEdges[idx] = { ...nextEdges[idx], source: _id, sourceHandle: `${_id}-right` };
            }
          } else {
            delete g.height;
            nextNodeMap[g.id] = {
              ...g,
              data: { ...g.data, renderAsGroup: true, stepIndex: 0 },
              style: { width: 800 },
            };
            const _id = chain[0];
            const idx = nextEdges.findIndex((e) => e.sourceHandle === `${_id}-right`);
            if (idx !== -1) {
              nextEdges[idx] = { ...nextEdges[idx], source: g.id, sourceHandle: `${g.id}-right` };
            }
          }

          let nextRootIds: string[] = [];
          const { edges: hiddenEdges, nodes: hiddenNodes } = getHidden(nextNodeMap, edges);
          ({ nodeMap: nextNodeMap, rootIds: nextRootIds } = layout(nextNodeMap, nextEdges, settings));
          set(
            {
              nodeMap: nextNodeMap,
              edges: nextEdges,
              rootIds: nextRootIds,
              hiddenEdges,
              hiddenNodes,
            },
            false,
            "toggleRenderAsGroup"
          );
        },
        handleCodeHikeMessage(action, data) {
          if (action === "on-scrolly-step-change") {
            console.log("on scrollyCoding step change:", data);
            const { id, stepIndex: nextStepIndex } = data as { id: string; stepIndex: number };
            const { nodeMap, edges } = get();
            const nextEdges = new Array<Edge>(edges.length);
            const g = nodeMap[id] as GroupNode;
            const { chain, stepIndex } = g.data;
            if (stepIndex === nextStepIndex) return;

            let nextNodeMap = {
              ...nodeMap,
              [id]: { ...g, data: { ...g.data, stepIndex: nextStepIndex } },
            };
            const groupRightHandle = `${g.id}-right`;
            const nextGroupRightHandle = `${chain[nextStepIndex]}-right`;
            for (let i = 0; i < edges.length; i++) {
              const edge = edges[i];
              if (edge.sourceHandle === groupRightHandle) {
                const _id = chain[stepIndex];
                nextEdges[i] = { ...edge, source: _id, sourceHandle: `${_id}-right` };
              } else if (edge.sourceHandle === nextGroupRightHandle) {
                nextEdges[i] = { ...edge, source: g.id, sourceHandle: groupRightHandle };
              } else {
                nextEdges[i] = edge;
              }
            }
            const { edges: hiddenEdges, nodes: hiddenNodes } = getHidden(nextNodeMap, nextEdges);
            let nextRooIds: string[] = [];
            ({ nodeMap: nextNodeMap, rootIds: nextRooIds } = layout(nextNodeMap, nextEdges, this.settings));
            set(
              {
                nodeMap: nextNodeMap,
                edges: nextEdges,
                rootIds: nextRooIds,
                hiddenEdges,
                hiddenNodes,
              },
              false,
              "handleCodeHikeMessage"
            );
          }
        },
        deleteEdge() {
          const { edges, selectedEdge } = get();
          set({ edges: edges.filter((e) => e.id !== selectedEdge) }, false, "deleteEdge");
        },
        deleteNode() {
          const { nodeMap, selectedNodes, edges, settings } = get();
          if (selectedNodes.length !== 1) {
            vscodeMessage.warn("Can't remove multiple nodes.");
            return;
          }
          const node = nodeMap[selectedNodes[0]];
          if (!node) {
            vscodeMessage.error("Remove node failed: node not found.");
            return;
          }

          const inEdges = edges.filter((e) => e.target === node.id);
          const outEdges = edges.filter((e) => e.source === node.id);
          if (inEdges.length > 1) {
            vscodeMessage.error(`Remove node ${node.id} failed: multiple incoming edges.`);
            return;
          }
          if (outEdges.length > 1) {
            vscodeMessage.warn("Remove node failed: multiple outgoing edges");
            return;
          }
          const inEdge = inEdges[0];
          const outEdge = outEdges[0];
          if (
            inEdge &&
            outEdge &&
            ((inEdge.targetHandle!.endsWith("top") && outEdge.targetHandle!.endsWith("left")) ||
              (inEdge.targetHandle!.endsWith("left") && outEdge.targetHandle!.endsWith("top")))
          ) {
            vscodeMessage.warn("Remove node failed: incoming and outgoing edges are not in the same direction.");
            return;
          }
          // remove node
          let nextNodeMap = { ...nodeMap };
          delete nextNodeMap[node.id];
          // remove edges connect to the node
          const nextEdges = edges.filter((e) => e.id !== inEdge?.id && e.id !== outEdge?.id);
          // connect two siblings around node
          const action = (inEdge || outEdge)?.targetHandle?.endsWith("top") ? "ext2web-add-next" : "ext2web-add-detail";
          if (inEdge && outEdge) {
            nextEdges.push(newEdge(inEdge.source, outEdge.target, action));
          }
          // update group node chain
          if (node.parentId) {
            const parent = nodeMap[node.parentId] as GroupNode;
            nextNodeMap[parent.id] = {
              ...parent,
              data: { ...parent.data, chain: parent.data.chain.filter((id) => id !== node.id) },
            };
          }

          let nextRootIds: string[];
          ({ rootIds: nextRootIds, nodeMap: nextNodeMap } = layout(nextNodeMap, nextEdges, settings));
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
        // toggleGroupRenderMode(id: string) {
        //   const { nodeMap } = get();
        //   const nextNodeMap = { ...nodeMap };
        //   const group = nodeMap[id];
        //   if (!isGroupNode(group)) {
        //     vscodeMessage.error(`Failed to switch group render: group ${id} node not found!`);
        //     return;
        //   }
        //   nextNodeMap[id] = {
        //     ...group,
        //     data: {
        //       ...group.data,
        //       renderAsGroup: !group.data.renderAsGroup,
        //     },
        //   };
        //   set({ nodeMap: nextNodeMap }, false, "toggleRenderAsGroup");
        // },
        forceLayout() {
          const { nodeMap, edges, settings } = get();
          const { rootIds, nodeMap: nextNodeMap } = layout(nodeMap, edges, settings);
          set(
            {
              rootIds,
              nodeMap: nextNodeMap,
            },
            false,
            "forceLayout"
          );
        },
      };
    }),
    {
      name: "tree-note",
      skipHydration: true,
      partialize: (state) => {
        console.log("partialize:", state);
        return {
          id: state.id,
          type: state.type,
          pkgName: state.pkgName,
          text: state.text,
          nodeMap: state.nodeMap,
          edges: state.edges,
          settings: state.settings,
        };
      },
      storage: {
        getItem: (_name) => ({ state: {} }),
        setItem: (_name, value) => {
          const { state } = value;
          console.log("set item:", state);
          saveNote(state);
        },
        removeItem: (_name) => {},
      },
    }
  )
);

export function newEdge(source: string, target: string, action: "ext2web-add-detail" | "ext2web-add-next"): Edge {
  const id = nanoid();
  return {
    id,
    type: "CodeEdge",
    source,
    target,
    animated: true,
    sourceHandle: action === "ext2web-add-detail" ? `${source}-right` : `${source}-bottom`,
    targetHandle: action === "ext2web-add-detail" ? `${target}-left` : `${target}-top`,
    data: { id },
  };
}

export function newEdgeFromConn(conn: Connection): Edge {
  const id = nanoid();
  return {
    id,
    type: "CodeEdge",
    source: conn.source!,
    target: conn.target!,
    animated: true,
    sourceHandle: conn.sourceHandle!,
    targetHandle: conn.targetHandle!,
    data: { id },
  };
}

export function newNode(
  { action, data: block }: Ext2Web.AddCode,
  settings: TreeGraphSettings,
  activeNode: Node | undefined,
  parent: GroupNode | undefined
) {
  let x = 0;
  let y = 0;
  if (activeNode) {
    ({ x, y } = activeNode.position);
    if (parent) {
      x += parent.position.x;
      y += parent.position.y;
    }
    if (action === "ext2web-add-detail") {
      x += (activeNode.width || settings.W) + settings.X;
    } else if (action === "ext2web-add-next") {
      y = (activeNode.height || settings.H) + settings.Y;
    }
  }
  const node: Node = {
    id: block.id,
    type: block.type,
    position: { x, y },
    data: block,
    width: settings.W,
    height: settings.H,
    deletable: false,
  };
  return node;
}

function getNextChain(selections: string[], edges: Edge[]): string[] | undefined {
  const selectionsSet = new Set(selections);
  // prepare maps for source and target
  const maps = edges
    .filter(
      (edge) =>
        edge.sourceHandle?.endsWith("bottom") && (selectionsSet.has(edge.source) || selectionsSet.has(edge.target))
    )
    .reduce(
      (maps, edge) => {
        maps.source.set(edge.source, edge);
        maps.target.set(edge.target, edge);
        return maps;
      },
      { source: new Map<string, Edge>(), target: new Map<string, Edge>() }
    );

  const nIDFirst = selections.find((id) => {
    const inEdge = maps.target.get(id);
    if (!inEdge) return true;
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

// need 1 ids
function newScrolly(id: string, chain: string[]): GroupNode {
  return {
    id,
    type: "Scrolly",
    data: {
      id,
      type: "Scrolly",
      text: "",
      chain,
      renderAsGroup: false,
      stepIndex: 0,
    },
    position: { x: 0, y: 0 },
    style: {
      width: 0,
      height: 0,
    },
    deletable: false,
  };
}
/**
 * handle message from extension
 */

let __id = 1e5;

class IDGenerator {
  private _resolvers = new Map<number, (ids: string[]) => void>();
  private _key = 1;
  async requestIDs(num: number): Promise<string[]> {
    if (!isVscode) {
      const ids = [];
      for (let i = 0; i < num; i++) {
        ids.push((__id++).toString(36));
      }
      return Promise.resolve(ids);
    }
    const key = this._key++;
    vscode.postMessage({
      action: "web2ext-request-for-ids",
      data: { key, n: num },
    } as Web2Ext.RequestForIDs);
    return new Promise((resolve) => {
      this._resolvers.set(key, resolve);
    });
  }
  receiveIDs(key: number, ids: string[]) {
    this._resolvers.get(key)?.(ids);
    this._resolvers.delete(key);
  }
}

export const iDGenerator = new IDGenerator();

window.addEventListener("message", (event: MessageEvent<Ext2Web.Message>) => {
  const { setKV, resetNote, addCodeNode, updateNodeText, updateNodeCodeRange, stopNodeCodeRangeEditing } =
    useTreeNoteStore.getState();
  const { action, data } = event.data;
  if (!action?.startsWith("ext2web")) return;
  console.log("ext to web:", { action, data });
  switch (action) {
    case "ext2web-init-tree-note":
      console.log("init tree note:", data);
      const note = migrateNote(data);
      resetNote(note);
      break;
    case "ext2web-text-change":
      if (data.type === "Code") {
        updateNodeText(data.id, data.text);
      } else if (data.type === "TreeNote") {
        setKV("text", data.text);
      }
      break;
    case "ext2web-add-detail":
    case "ext2web-add-next":
      addCodeNode(event.data);
      break;
    case "ext2web-code-range-change":
      updateNodeCodeRange(data);
      break;
    case "ext2web-code-range-edit-stopped":
      stopNodeCodeRangeEditing(data.id);
      break;
    case "ext2web-response-for-ids":
      iDGenerator.receiveIDs(data.key, data.ids);
  }
});
