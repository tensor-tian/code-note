import { getHidden, hasCycle, isCodeNode, isGroupNode, isTextNode, DefaultNodeDimension } from "./layout";
import {
  CodeBlock,
  Edge,
  Ext2Web,
  GroupNode,
  Node,
  Note,
  TemplateNode,
  TextNode,
  TextNodeType,
  VscodeRange,
  Web2Ext,
} from "types";
import {
  EdgeChange,
  NodeChange,
  OnConnect,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Connection,
  XYPosition,
} from "reactflow";
import { devtools, persist } from "zustand/middleware";
import { isVscode, saveNote, vscode, vscodeMessage } from "../../utils";
import Debug from "debug";

import { create } from "zustand";

import { layout } from "./layout";

const log = Debug("vscode-note:store");

namespace TreeNote {
  export interface Store extends Note {
    activeEdgeId: string;
    selectedNodes: string[];
    selectedEdge: string;
    panToActiveMark: number;
    rootIds: string[];
    handshake: boolean;
    debug: boolean;
    hiddenEdges: Set<string>;
    hiddenNodes: Set<string>;
    textEditing?: {
      id: string;
      type: TextNodeType;
    };
    codeRangeEditingNode: string;
    showCodeNodes: Set<string>;
    activeNodeId: string;
    saveMark: number;
  }
  export type SetKVFn = <T extends keyof Store>(key: Exclude<T, "nodeMap" | "edges">, val: Store[T]) => void;

  export interface Actions {
    resetNote: (state: Note) => void;
    setKV: SetKVFn;
    activateNode: (id: string, followEdge?: Edge) => void;
    toggleNodeSelection: (id: string) => void;
    onNodeChange: (changes: NodeChange[]) => void;
    onEdgeChange: (changes: EdgeChange[]) => void;
    onConnect: OnConnect;
    onConnectStart: (sourceHandle: string) => void;
    onConnectEnd: (sourceHandle: string, position: XYPosition) => void;
    addCodeNode: (msg: Ext2Web.AddCode) => void;
    updateNodeText: (id: string, text: string) => void;
    updateNodeCodeRange: (data: Ext2Web.CodeRangeChange["data"]) => void;
    stopNodeCodeRangeEditing: () => void;
    toggleCodeShow: (id: string) => void;
    deleteEdge: () => void;
    deleteNode: () => void;
    groupNodes: () => Promise<void>;
    groupNodesToDetail: () => Promise<void>;
    splitGroup: () => void;
    toggleRenderAsGroup: (id: string) => void;
    // toggleGroupRenderMode: (id: string) => void;
    handleCodeHikeMessage: (action: string, data: any) => void;
    forceLayout: () => void;
    adjustNodeWidth: (id: string, widen: boolean) => void;
    setGroupTextHeight: (id: string, height: number) => void;
    resetExtents: () => void;
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
  activeEdgeId: "", // highlight edge on hover
  selectedNodes: [], // checked for merge group
  selectedEdge: "", // select for delete
  panToActiveMark: 0,
  rootIds: [],
  handshake: false,
  debug: false,
  hiddenEdges: new Set(),
  hiddenNodes: new Set(),
  codeRangeEditingNode: "",
  showCodeNodes: new Set(),
  activeNodeId: "", // highlight node, central in viewport, parent for adding node

  // renderAsGroupNodes: new Set(),
  saveMark: 0,
  renderAsGroupNodes: [],
  groupStepIndexMap: {},
};

export type { TreeNote };

export const useTreeNoteStore = create<TreeNote.State>(
  // @ts-ignore
  persist(
    devtools((_set, get) => {
      const set = (state: Partial<TreeNote.Store>, action: string, save: boolean) => {
        if (save) {
          const { saveMark } = get();
          state.saveMark = saveMark + 1;
        }
        _set(state, false, action);
      };
      const panToActive = () => {
        const { panToActiveMark: panToActive } = get();
        set({ panToActiveMark: panToActive + 1 }, "panToActive", false);
      };
      const updateCodeBlock = (
        { id, ...rest }: Pick<CodeBlock, "id"> & Partial<CodeBlock>,
        action: string,
        save: boolean
      ) => {
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
          action,
          save
        );
      };
      return {
        ...initialData,
        resetNote: (note) => {
          const { renderAsGroupNodes } = get();
          log("reset note:", note);
          const { edges: hiddenEdges, nodes: hiddenNodes } = getHidden(
            note.nodeMap,
            note.edges,
            KeepNodeIds,
            renderAsGroupNodes
          );
          for (const [id, n] of Object.entries(note.nodeMap)) {
            // migrate old version ranges
            if (isCodeNode(n)) {
              // @ts-ignore
              const ranges = n.data.ranges as VscodeRange[][] | string;
              if (typeof ranges === "string") break;
              if (ranges[0][0] && !Array.isArray(ranges[0][0])) {
                n.data.ranges = JSON.stringify(
                  ranges.map((kind) =>
                    kind.map((range) => {
                      const { start, end } = range as VscodeRange;
                      return [
                        [start.line, start.character],
                        [end.line, end.character],
                      ];
                    })
                  )
                );
                note.nodeMap[id] = n;
              }
            }
          }
          set({ ...note, hiddenEdges, hiddenNodes }, "resetNote:1", false);
          const { activeNodeId, nodeMap, edges } = get();

          if (!activeNodeId) {
            if (Object.keys(nodeMap).length === 0) return;
            const { nodeMap: nextNodeMap, rootIds } = layout(nodeMap, edges, renderAsGroupNodes);
            set(
              {
                nodeMap: nextNodeMap,
                rootIds,
                activeNodeId: rootIds[0],
              },
              "resetNote:2",
              false
            );
          }
        },
        setKV: (key, val) => {
          const save = ["id", "type", "text", "pkgPath", "pkgName"].includes(key);
          set({ [key]: val }, "setKV:" + key, save);
        },
        activateNode: (id, edge) => {
          const { nodeMap, renderAsGroupNodes } = get();
          const node = nodeMap[id];
          let activeNodeId = id;
          if (isGroupNode(node) && !renderAsGroupNodes.includes(id) && edge) {
            const chain = node.data.chain;
            if (edge.target === node.id) {
              activeNodeId = chain[0];
            } else {
              activeNodeId = chain[chain.length - 1];
            }
          }
          set({ activeNodeId }, "activateNode", false);
          panToActive();
        },
        toggleNodeSelection: (id) => {
          const { selectedNodes } = get();
          let nextSelectedNodes: string[];
          if (selectedNodes.includes(id)) {
            nextSelectedNodes = selectedNodes.filter((nId) => nId !== id);
          } else {
            nextSelectedNodes = [...selectedNodes, id];
          }

          set({ selectedNodes: nextSelectedNodes }, "toggleNodeSelection", false);
        },
        onNodeChange: (_changes) => {
          log("on node change:", _changes);
          const { nodeMap, edges, rootIds, renderAsGroupNodes } = get();
          const changes = _changes.filter((c) => {
            if (c.type === "select") {
              return false;
            }
            if (c.type === "dimensions") {
              const node = nodeMap[c.id];
              let dimChanged = false,
                styleChanged = false;
              if (typeof c.dimensions !== "undefined") {
                dimChanged = c.dimensions.width !== node.width || c.dimensions.height !== node.height;
              }
              if (typeof c.updateStyle !== "undefined" && typeof c.dimensions !== "undefined") {
                styleChanged =
                  c.dimensions.width !== +(node.style?.width || 0) ||
                  c.dimensions.height !== +(node.style?.height || 0);
              }
              return dimChanged || styleChanged;
            }
            return true;
          });
          if (changes.length === 0) return;
          const nextNodes = applyNodeChanges(changes, Object.values(nodeMap));
          const needLayout = changes.some(
            (change) =>
              ["remove", "add", "reset"].includes(change.type) ||
              (change.type === "dimensions" && !KeepNodeIds.has(change.id))
          );
          const save = changes.some((change) => ["remove", "add", "reset"].includes(change.type));
          let nextNodeMap = {
            ...nodeMap,
            ...nextNodes.reduce((acc, n) => {
              acc[n.id] = n;
              return acc;
            }, {} as Record<string, Node>),
          };
          let nextRootIds = rootIds;
          if (needLayout) {
            ({ nodeMap: nextNodeMap, rootIds: nextRootIds } = layout(nextNodeMap, edges, renderAsGroupNodes));
          }
          set({ nodeMap: nextNodeMap, rootIds: nextRootIds }, "onNodeChange", save);
        },
        onEdgeChange: (changes) => {
          const { edges } = get();
          const save = changes.some((change) => ["add", "reset"].includes(change.type));
          set({ edges: applyEdgeChanges(changes, edges) }, "onEdgeChange", save);
        },

        onConnectStart: async (sourceHandle) => {
          const [nodeId, suffix] = sourceHandle.split("-");
          const { nodeMap } = get();
          const srcNode = nodeMap[nodeId];
          if (!allowAddTextNode(srcNode, suffix)) {
            return;
          }
          const parent = nodeMap[srcNode.parentId || ""];
          const w = 120;
          const h = 50;
          let x: number, y: number;
          if (suffix === "right") {
            x = srcNode.position.x + srcNode.width! + 10;
            y = srcNode.position.y + srcNode.height! / 2 - h - 30;
          } else {
            x = srcNode.position.x + srcNode.width! / 2 + 30;
            y = srcNode.position.y + srcNode.height! + 10;
          }
          if (parent) {
            x += parent.position.x;
            y += parent.position.y;
          }
          const n = templateForTextNode(x, y, w, h);
          const nextNodeMap = { ...nodeMap, [n.id]: n };
          set({ nodeMap: nextNodeMap }, "onConnectStart", false);
        },
        onConnectEnd: async (sourceHandle, position) => {
          const { nodeMap, edges, renderAsGroupNodes } = get();
          const [source, suffix] = sourceHandle.split("-");
          const srcNode = nodeMap[source];
          if (!allowAddTextNode(srcNode, suffix)) {
            return;
          }
          const tmp = nodeMap[TextNodeTemplateID];

          let nextNodeMap = { ...nodeMap };
          delete nextNodeMap[TextNodeTemplateID];

          if (
            tmp.position.x > position.x ||
            position.x > tmp.position.x + tmp.width! ||
            tmp.position.y > position.y ||
            position.y > tmp.position.y + tmp.height!
          ) {
            set({ nodeMap: nextNodeMap }, "onConnectEnd", false);
            return;
          } else {
            // add text node
            let nextEdges = [...edges];
            const idx = edges.findIndex((e) => e.sourceHandle === sourceHandle);
            const ids = await iDGenerator.requestIDs(2);
            const textNode = newTextNode(ids[0]);
            nextNodeMap[textNode.id] = textNode;
            const targetSuffix = suffix === "right" ? "left" : "top";
            if (idx !== -1) {
              nextEdges[idx] = {
                ...nextEdges[idx],
                source: textNode.id,
                sourceHandle: `${textNode.id}-${targetSuffix}`,
              };
            }
            const conn = { source, sourceHandle, target: textNode.id, targetHandle: `${textNode.id}-${targetSuffix}` };
            nextEdges = addEdge(newEdgeFromConn(conn, ids[1]), nextEdges);
            let rootIds: string[];
            ({ rootIds, nodeMap: nextNodeMap } = layout(nextNodeMap, nextEdges, renderAsGroupNodes));
            set({ nodeMap: nextNodeMap, edges: nextEdges, rootIds }, "onConnectEnd", true);
          }
        },
        onConnect: async (conn) => {
          log("on connect:", conn);
          const { source, target, sourceHandle, targetHandle } = conn;
          if (source === target) return;
          const { edges, nodeMap, debug, rootIds, renderAsGroupNodes } = get();

          const isX = sourceHandle?.endsWith("right") && targetHandle?.endsWith("left");
          const isY = sourceHandle?.endsWith("bottom") && targetHandle?.endsWith("top");
          if (!isX && !isY) return;

          let nextNodeMap = { ...nodeMap };
          delete nextNodeMap[TextNodeTemplateID];

          let nextEdges = [...edges];

          const inEdge = edges.find((e) => e.target === target);
          const outEdge = edges.find((e) => e.sourceHandle === sourceHandle);
          if (outEdge?.target === target) return;
          const ids = await iDGenerator.requestIDs(1);

          if (inEdge || outEdge) {
            nextEdges = edges.filter((e) => e.id !== inEdge?.id && e.id !== outEdge?.id);
          }

          nextEdges = addEdge(newEdgeFromConn(conn, ids[0]), nextEdges);

          if (!debug && hasCycle(nextEdges, nextNodeMap)) {
            log("has cycle", nextEdges);
            return;
          }

          let nextRootIds: string[] = rootIds;
          if (!debug) {
            ({ rootIds: nextRootIds, nodeMap: nextNodeMap } = layout(nextNodeMap, nextEdges, renderAsGroupNodes));
          }
          set({ nodeMap: nextNodeMap, edges: nextEdges, rootIds: nextRootIds }, "onConnect", true);
        },

        addCodeNode: async ({ action, data }) => {
          const { nodeMap, edges, activeNodeId, renderAsGroupNodes } = get();
          const nodes = Object.values(nodeMap);
          log("add code node:", activeNodeId, nodes.length);
          // empty tree flow graph
          if (!activeNodeId && nodes.length > 0) return;

          // add node
          const activeNode = nodeMap[activeNodeId];
          if (isGroupNode(activeNode)) {
            if (renderAsGroupNodes.includes(activeNode.id)) {
              vscodeMessage.error(
                "Adding a code node connecting to an active group node in 'renderAsGroup' mode is not allowed."
              );
              return;
            }
            if (action === "ext2web-add-detail") {
              vscodeMessage.error("Adding a detail code node connecting to an active group node is not allowed.");
              return;
            }
          }

          const parent = nodeMap[activeNode?.parentId || ""] as GroupNode | undefined;
          const node = newNode({ data, action }, activeNode, parent);
          let nextNodeMap = { ...nodeMap, [node.id]: node };

          if (!activeNode) {
            // add the first node
            set({ activeNodeId: node.id, nodeMap: nextNodeMap, rootIds: [node.id] }, "addCodeNode", true);
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
          const ids = await iDGenerator.requestIDs(2);
          const nextEdges = [...edges, newEdge(ids[0], activeNodeId, node.id, action)];
          // add edges
          if (action === "ext2web-add-detail") {
            const iR = edges.findIndex(({ sourceHandle }) => sourceHandle === `${activeNodeId}-right`);
            if (iR !== -1) {
              nextEdges[iR] = newEdge(ids[1], node.id, nextEdges[iR].target, action);
            }
          } else if (action === "ext2web-add-next") {
            const iB = edges.findIndex(({ sourceHandle }) => sourceHandle === `${activeNodeId}-bottom`);
            if (iB !== -1) {
              nextEdges[iB] = newEdge(ids[1], node.id, nextEdges[iB].target, action);
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
          let nextRootIds: string[];
          ({ nodeMap: nextNodeMap, rootIds: nextRootIds } = layout(nextNodeMap, nextEdges, renderAsGroupNodes));
          set(
            {
              activeNodeId: node.id,
              nodeMap: nextNodeMap,
              edges: nextEdges,
              rootIds: nextRootIds,
            },
            "addCodeNode",
            true
          );
          panToActive();
          return;
        },
        updateNodeText: (id, text) => {
          const { nodeMap } = get();
          const node = nodeMap[id];
          log("update node text:", id, text, node);
          if (isCodeNode(node)) {
            updateCodeBlock({ id, text }, "updateNodeText:Code", true);
          } else if (isTextNode(node) || isGroupNode(node)) {
            const nextNodeMap = {
              ...nodeMap,
              [id]: {
                ...node,
                data: {
                  ...node.data,
                  text,
                },
              },
            };
            set({ nodeMap: nextNodeMap }, "updateNodeText:" + node.type, true);
          }
        },

        updateNodeCodeRange: (data) => {
          updateCodeBlock(data, "updateNodeCodeRange", true);
        },

        stopNodeCodeRangeEditing: () => {
          set({ codeRangeEditingNode: "" }, "stopNodeCodeRangeEditing", false);
        },

        toggleCodeShow: (id) => {
          const { nodeMap, showCodeNodes } = get();
          const node = nodeMap[id];
          let action: string = `hideCode:${node.type}`;
          if (isCodeNode(node)) {
            if (!showCodeNodes.delete(id)) {
              showCodeNodes.add(id);
              action = `showCode:${node.type}`;
            }
          } else if (isGroupNode(node)) {
            const chain = node.data.chain;
            const showCode = chain.some((id) => showCodeNodes.has(id));

            if (showCode) {
              chain.forEach((id) => showCodeNodes.delete(id));
            } else {
              chain.forEach((id) => showCodeNodes.add(id));
              action = `showCode:${node.type}`;
            }
          }
          set({ showCodeNodes: new Set(showCodeNodes) }, action, false);
        },
        groupNodes: async () => {
          const { selectedNodes, edges, nodeMap, renderAsGroupNodes } = get();
          const chain = getNextChain(selectedNodes, edges);
          if (!chain || chain.length <= 1) {
            vscodeMessage.warn("Only a vertical edge chain can be merged into a group node");
            return;
          }
          const noGroupNode = selectedNodes.every((id) => {
            const node = nodeMap[id];
            if (!node) return false;
            return node.data.type === "Code" && !node.parentId;
          });
          if (!noGroupNode) {
            vscodeMessage.warn("Only code nodes can be merged into a group node");
            return;
          }
          const [id] = await iDGenerator.requestIDs(1);
          const group = newScrolly(id, chain);
          let nextNodeMap = { ...nodeMap, [group.id]: group };
          // add parentId & extent property for children
          chain.forEach((nId) => {
            const n = nextNodeMap[nId];
            nextNodeMap[nId] = { ...n, parentId: group.id, extent: "parent" };
          });
          // replace edges connect to code in chain with to group:

          const nextEdges = updateEdges(
            edges,
            [`${chain[0]}-left`, group.id],
            [`${chain[0]}-top`, group.id],
            [`${chain[chain.length - 1]}-bottom`, group.id]
          );
          // calc layout
          let nextRootIds: string[];
          ({ nodeMap: nextNodeMap, rootIds: nextRootIds } = layout(nextNodeMap, nextEdges, renderAsGroupNodes));
          set(
            {
              nodeMap: nextNodeMap,
              edges: nextEdges,
              activeNodeId: chain[0],
              selectedNodes: [],
              rootIds: nextRootIds,
            },
            "groupNodes",
            true
          );
          panToActive();
        },
        groupNodesToDetail: async () => {
          const { selectedNodes, edges, nodeMap, renderAsGroupNodes } = get();
          const chain = getNextChain(selectedNodes, edges);

          if (!chain || chain.length <= 1) {
            vscodeMessage.warn("Only a vertical chain can be merged into a group node.");
            return;
          }
          const noGroupNodes = selectedNodes.every((id) => {
            const node = nodeMap[id];
            if (!node) return false;
            return node.data.type === "Code";
          });
          if (!noGroupNodes) {
            vscodeMessage.warn("Only code nodes can be merged into a group node.");
            return;
          }
          const ids = await iDGenerator.requestIDs(3);
          const firstNode = nodeMap[chain[0]];
          const newCode = { ...firstNode, id: ids[0], data: { ...firstNode.data, id: ids[0] } };
          let nextNodeMap = {
            ...nodeMap,
            [newCode.id]: newCode,
          };
          let nextEdges = updateEdges(
            edges,
            [`${firstNode.id}-bottom`, newCode.id],
            [`${chain[chain.length - 1]}-bottom`, chain[0]]
          );
          let rootIds: string[];

          chain[0] = newCode.id;
          const group = newScrolly(ids[2], chain);
          nextNodeMap[group.id] = group;
          chain.forEach((id) => {
            const node = nextNodeMap[id];
            nextNodeMap[id] = {
              ...node,
              parentId: group.id,
              extent: "parent",
            };
          });
          nextEdges.push(newEdge(ids[1], firstNode.id, group.id, "ext2web-add-detail"));

          ({ nodeMap: nextNodeMap, rootIds } = layout(nextNodeMap, nextEdges, renderAsGroupNodes));
          set(
            {
              nodeMap: nextNodeMap,
              edges: nextEdges,
              rootIds,
              selectedNodes: [],
            },
            "groupNOdesToDetail",
            true
          );
        },
        splitGroup() {
          const { selectedNodes, nodeMap, edges, renderAsGroupNodes, groupStepIndexMap } = get();
          const id = selectedNodes[0];
          const group = nodeMap[id];
          if (!isGroupNode(group) || selectedNodes.length !== 1) {
            vscodeMessage.warn("Only a group node can be splitted !");
            return;
          }
          let nextNodeMap = { ...nodeMap };
          delete nextNodeMap[id];
          const nextRenderAsGroupNodes = renderAsGroupNodes.filter((_id) => _id !== id);
          delete groupStepIndexMap[id];
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
          // replace edges connect to group with edges to codes
          const nextEdges = updateEdges(
            edges,
            [`${id}-left`, chain[0]],
            [`${id}-top`, chain[0]],
            [`${id}-bottom`, chain[chain.length - 1]]
          );
          // calc layout
          let nextRootIds: string[];
          ({ nodeMap: nextNodeMap, rootIds: nextRootIds } = layout(nextNodeMap, nextEdges, nextRenderAsGroupNodes));
          set(
            {
              nodeMap: nextNodeMap,
              rootIds: nextRootIds,
              activeNodeId: group.data.chain[0],
              selectedNodes: [],
              edges: nextEdges,
              renderAsGroupNodes: nextRenderAsGroupNodes,
              groupStepIndexMap: { ...groupStepIndexMap },
            },
            "splitGroup",
            true
          );
          panToActive();
        },
        toggleRenderAsGroup(id: string) {
          const { nodeMap, edges, groupStepIndexMap, renderAsGroupNodes } = get();
          const g = nodeMap[id];
          if (!isGroupNode(g)) {
            vscodeMessage.warn("Only the group node can toggle renderAsGroup");
            return;
          }
          let nextNodeMap = { ...nodeMap };
          let nextEdges: Edge[];
          const { chain } = g.data;
          const stepIndex = groupStepIndexMap[g.id] || 0;
          let nextRenderAsGroupNodes: string[];
          if (renderAsGroupNodes.includes(g.id)) {
            delete g.height;
            nextNodeMap[g.id] = {
              ...g,
              style: { width: DefaultNodeDimension.W },
            };
            nextRenderAsGroupNodes = renderAsGroupNodes.filter((id) => id !== g.id);
            nextEdges = updateEdges(edges, [`${g.id}-right`, chain[stepIndex]]);
          } else {
            delete g.height;
            nextNodeMap[g.id] = {
              ...g,
              data: { ...g.data },
              style: { width: DefaultNodeDimension.WGroup },
            };
            renderAsGroupNodes.push(g.id);
            nextRenderAsGroupNodes = [...renderAsGroupNodes];
            groupStepIndexMap[g.id] = 0;
            nextEdges = updateEdges(edges, [`${chain[0]}-right`, g.id]);
          }

          let nextRootIds: string[] = [];
          const { edges: hiddenEdges, nodes: hiddenNodes } = getHidden(
            nextNodeMap,
            nextEdges,
            KeepNodeIds,
            nextRenderAsGroupNodes
          );
          log("toggleRenderAsGroup, getHidden:", hiddenEdges, hiddenNodes);
          ({ nodeMap: nextNodeMap, rootIds: nextRootIds } = layout(nextNodeMap, nextEdges, nextRenderAsGroupNodes));
          set(
            {
              nodeMap: nextNodeMap,
              edges: nextEdges,
              rootIds: nextRootIds,
              hiddenEdges,
              hiddenNodes,
              renderAsGroupNodes: nextRenderAsGroupNodes,
              groupStepIndexMap: { ...groupStepIndexMap },
            },
            "toggleRenderAsGroup",
            true
          );
        },
        handleCodeHikeMessage(action, data) {
          if (action === "on-scrolly-step-change") {
            log("on scrollyCoding step change:", data);
            const { id, stepIndex: nextStepIndex } = data as { id: string; stepIndex: number };
            const { nodeMap, edges, groupStepIndexMap, renderAsGroupNodes } = get();
            // const nextEdges = new Array<Edge>(edges.length);
            const g = nodeMap[id] as GroupNode;
            const { chain } = g.data;
            const stepIndex = groupStepIndexMap[g.id] || 0;
            if (stepIndex === nextStepIndex) return;
            const nextGroupStepIndexMap = {
              ...groupStepIndexMap,
              [g.id]: nextStepIndex,
            };
            let nextNodeMap = {
              ...nodeMap,
              [id]: { ...g, data: { ...g.data } },
            };
            const nextEdges = updateEdges(
              edges,
              [`${g.id}-right`, chain[stepIndex]],
              [`${chain[nextStepIndex]}-right`, g.id]
            );
            const { edges: hiddenEdges, nodes: hiddenNodes } = getHidden(
              nextNodeMap,
              nextEdges,
              KeepNodeIds,
              renderAsGroupNodes
            );
            let nextRooIds: string[] = [];
            ({ nodeMap: nextNodeMap, rootIds: nextRooIds } = layout(nextNodeMap, nextEdges, renderAsGroupNodes));
            set(
              {
                nodeMap: nextNodeMap,
                edges: nextEdges,
                rootIds: nextRooIds,
                hiddenEdges,
                hiddenNodes,
                groupStepIndexMap: nextGroupStepIndexMap,
              },
              "handleCodeHikeMessage",
              true
            );
          }
        },
        deleteEdge() {
          const { edges, selectedEdge } = get();
          set({ edges: edges.filter((e) => e.id !== selectedEdge) }, "deleteEdge", true);
        },
        deleteNode: async () => {
          const { nodeMap, selectedNodes, edges, renderAsGroupNodes } = get();
          if (selectedNodes.length !== 1) {
            vscodeMessage.warn("Can't remove multiple nodes.");
            return;
          }
          const node = nodeMap[selectedNodes[0]];
          if (!node) {
            vscodeMessage.error("Remove node failed: node not found.");
            return;
          }
          if (isGroupNode(node)) {
            vscodeMessage.warn("Using split group node instead of remove node.");
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
            const ids = await iDGenerator.requestIDs(1);
            nextEdges.push(newEdge(ids[0], inEdge.source, outEdge.target, action));
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
          ({ rootIds: nextRootIds, nodeMap: nextNodeMap } = layout(nextNodeMap, nextEdges, renderAsGroupNodes));
          set(
            {
              nodeMap: nextNodeMap,
              edges: nextEdges,
              rootIds: nextRootIds,
              selectedNodes: [],
            },
            "deleteNode",
            true
          );
        },
        forceLayout() {
          const { nodeMap, edges, renderAsGroupNodes } = get();
          const { rootIds, nodeMap: nextNodeMap } = layout(nodeMap, edges, renderAsGroupNodes);
          set(
            {
              rootIds,
              nodeMap: nextNodeMap,
            },
            "forceLayout",
            true
          );
        },
        adjustNodeWidth(id, widen) {
          const { nodeMap, edges, renderAsGroupNodes } = get();
          const node = nodeMap[id];
          const isGroup = isGroupNode(node);
          const delta = widen ? +1 : -1;
          const width = isGroup
            ? +(node.style?.width || 0) || node.width || DefaultNodeDimension.WGroup
            : node.width || DefaultNodeDimension.W;
          const nextWidth = (Math.floor((width || DefaultNodeDimension.W) / 100) + delta) * 100;
          const nextNode = { ...node, width: nextWidth, data: { ...node.data } };
          if (isGroupNode(nextNode)) {
            if (renderAsGroupNodes.includes(nextNode.id)) {
              nextNode.data.groupModeWidth = width;
            }
          }
          if (isGroup) nextNode.style = { ...node.style, width: nextWidth };
          let nextNodeMap = { ...nodeMap, [id]: nextNode };
          let rootIds: string[];
          ({ nodeMap: nextNodeMap, rootIds } = layout(nextNodeMap, edges, renderAsGroupNodes));
          set(
            {
              rootIds,
              nodeMap: nextNodeMap,
            },
            widen ? "widenNodeWidth" : "narrowNodeWidth",
            true
          );
        },
        setGroupTextHeight(id, height) {
          const { nodeMap, edges, renderAsGroupNodes } = get();
          const node = nodeMap[id];
          let nextNodeMap = {
            ...nodeMap,
            [id]: {
              ...node,
              data: {
                ...node.data,
                textHeight: height,
              },
            },
          };
          let rootIds: string[];
          ({ nodeMap: nextNodeMap, rootIds } = layout(nextNodeMap, edges, renderAsGroupNodes));
          set(
            {
              nodeMap: nextNodeMap,
              rootIds,
            },
            "updateGroupTextHeight",
            false
          );
        },
        resetExtents() {
          const { nodeMap, debug } = get();
          let nextNodeMap = { ...nodeMap };
          const extent = debug ? undefined : "parent";
          for (const node of Object.values(nodeMap)) {
            if (node.parentId) {
              nextNodeMap[node.id] = { ...node, extent };
            }
          }
          set({ nodeMap: nextNodeMap }, "resetExtents", false);
        },
      };
    }),
    {
      name: "tree-note",
      skipHydration: true,
      partialize: buildPartialize(),
      storage: {
        getItem: (_name) => ({ state: {} }),
        setItem: (_name, value) => {
          const { state } = value;
          if (typeof state !== "undefined") {
            log("save note");
            saveNote(state);
          } else {
            log("skip save note");
          }
        },
        removeItem: (_name) => {},
      },
    }
  )
);

function buildPartialize() {
  let prevMark = 0;
  return (state: TreeNote.Store) => {
    if (prevMark > state.saveMark) {
      prevMark = state.saveMark;
    } else if (state.saveMark > prevMark) {
      prevMark = state.saveMark;
      const note: Note = {
        id: state.id,
        type: state.type,
        text: state.text,
        pkgName: state.pkgName,
        pkgPath: state.pkgPath,
        nodeMap: state.nodeMap,
        edges: state.edges,
        renderAsGroupNodes: state.renderAsGroupNodes,
        groupStepIndexMap: state.groupStepIndexMap,
      };
      return note;
    }
    return;
  };
}

export function newEdge(
  id: string,
  source: string,
  target: string,
  action: "ext2web-add-detail" | "ext2web-add-next"
): Edge {
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

export function newEdgeFromConn(conn: Connection, id: string): Edge {
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
      x += (activeNode.width || DefaultNodeDimension.W) + DefaultNodeDimension.X;
    } else if (action === "ext2web-add-next") {
      y = (activeNode.height || DefaultNodeDimension.H) + DefaultNodeDimension.Y;
    }
  }
  const node: Node = {
    id: block.id,
    type: block.type,
    position: { x, y },
    data: block,
    width: DefaultNodeDimension.W,
    height: DefaultNodeDimension.H,
    deletable: false,
  };
  return node;
}

const TextNodeTemplateID = "text-node-template-id";
const KeepNodeIds = new Set([TextNodeTemplateID]);
const templateForTextNode = (x: number, y: number, width: number, height: number): TemplateNode => ({
  id: TextNodeTemplateID,
  type: "Template",
  position: { x, y },
  width,
  height,
  data: {
    id: TextNodeTemplateID,
    text: "Add Text Node",
    type: "Template",
  },
});

export function newTextNode(id: string): TextNode {
  return {
    id,
    type: "Text",
    position: { x: 0, y: 0 },
    width: DefaultNodeDimension.W,
    data: {
      id,
      type: "Text",
      text: "MDX text...",
    },
  };
}

export function getNextChain(selections: string[], edges: Edge[]): string[] | undefined {
  if (selections.length < 2) {
    return;
  }
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
    log("stop grouping: first node not found");
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
    log("stop grouping: more than one chain");
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
      text: "MDX text...",
      chain,
      groupModeWidth: DefaultNodeDimension.WGroup,
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
  log("ext to web:", { action, data });
  switch (action) {
    case "ext2web-init-tree-note":
      log("init tree note:", data);
      resetNote(data);
      break;
    case "ext2web-text-change":
      switch (data.type) {
        case "Code":
        case "Text":
        case "Scrolly":
          updateNodeText(data.id, data.text);
          break;
        case "TreeNote":
          setKV("text", data.text);
          break;
      }
      break;
    case "ext2web-text-edit-ready":
      setKV("textEditing", data);
      break;
    case "ext2web-text-edit-done":
      setKV("textEditing", undefined);
      break;
    case "ext2web-add-detail":
    case "ext2web-add-next":
      addCodeNode(event.data);
      break;
    case "ext2web-code-range-edit-ready":
      setKV("codeRangeEditingNode", data.id);
      break;
    case "ext2web-code-range-change":
      updateNodeCodeRange(data);
      break;
    case "ext2web-code-range-edit-done":
      stopNodeCodeRangeEditing();
      break;
    case "ext2web-response-for-ids":
      iDGenerator.receiveIDs(data.key, data.ids);
  }
});

function allowAddTextNode(source: Node, suffix: string): boolean {
  if (isGroupNode(source) && suffix === "right") {
    return false;
  }
  if (source.parentId && suffix === "bottom") {
    return false;
  }
  return true;
}

function updateEdges(edges: Edge[], ...updates: [string, string][]): Edge[] {
  const res: Edge[] = [];
  const updateFns = updates.map(([handle, id]) => createUpdateEdge(handle, id));
  for (const edge of edges) {
    let modified = false;
    for (const fn of updateFns) {
      const nextEdge = fn(edge);
      if (nextEdge) {
        res.push(nextEdge);
        modified = true;
        break;
      }
    }
    if (!modified) {
      res.push(edge);
    }
  }
  return res;
}

function createUpdateEdge(oldHandle: string, newId: string) {
  return (edge: Edge) => {
    if (edge.targetHandle === oldHandle) {
      const suffix = edge.targetHandle.split("-")[1];
      return {
        ...edge,
        target: newId,
        targetHandle: `${newId}-${suffix}`,
      };
    } else if (edge.sourceHandle === oldHandle) {
      const suffix = edge.sourceHandle.split("-")[1];
      return {
        ...edge,
        source: newId,
        sourceHandle: `${newId}-${suffix}`,
      };
    }
  };
}
