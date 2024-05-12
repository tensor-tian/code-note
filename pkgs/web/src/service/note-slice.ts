import {
  CODE_SIZE,
  isCodeNode,
  isGroupNode,
  layout,
} from "../component/tree-graph/layout2";
import type {
  Edge,
  Ext2Web,
  GroupNode,
  Node,
  NodeDimensionChange,
  NodePositionChange,
  Note,
} from "types";
import { PayloadAction, createSelector, createSlice } from "@reduxjs/toolkit";

import type { RootState } from "./store";
import { nanoid } from "../utils";

const noteSlice = createSlice({
  name: "note",
  initialState: {
    data: {
      id: nanoid(),
      type: "CodeNote",
      text: "sample",
      pkgName: "decorator-sample",
      nodeMap: {},
      edges: [],
      activeBlockId: undefined,
    } as Note,
    forceLayout: false,
    nodesSelected: new Array<string>(),
    edgeSelected: "",
    highlightEdge: undefined as
      | undefined
      | {
          id: string;
          sourceHandle: string;
          targetHandle: string;
        },
    activeEdgeId: "",
    containerBounds: {
      width: 100,
      height: 100,
    },
    viewport: {
      x: 0,
      y: 0,
      zoom: 1,
    },
  },
  reducers: {
    actAddNote(
      state,
      action: PayloadAction<{
        data: Ext2Web.AddBlockData;
        msgType: Ext2Web.AddBlock["action"];
      }>
    ) {
      const { data, msgType } = action.payload;
      const { nodeMap, edges, activeBlockId } = state.data;
      if (!activeBlockId && Object.keys(nodeMap).length > 0) {
        return;
      }

      const id = nanoid();
      if (activeBlockId) {
        if (msgType === "add-detail") {
          if (
            edges.find(
              ({ sourceHandle }) =>
                sourceHandle &&
                sourceHandle.startsWith(activeBlockId) &&
                sourceHandle.endsWith("right")
            )
          )
            return;
        } else if (msgType === "add-next") {
          if (
            edges.find(
              ({ sourceHandle }) =>
                sourceHandle &&
                sourceHandle.startsWith(activeBlockId) &&
                sourceHandle.endsWith("bottom")
            )
          )
            return;
        }
      }

      const block = { ...data, text: id, id };
      nodeMap[id] = {
        id: block.id,
        type: block.type,
        position: { x: 0, y: 0 },
        data: block,
      };

      state.data.activeBlockId = id;
      if (activeBlockId) {
        const edge = newEdge(activeBlockId, id, msgType);
        state.data.edges.push(edge);
      }
      layout(nodeMap, edges);
    },
    actToggleCode(state, action: PayloadAction<string>) {
      const id = action.payload;
      const { nodeMap } = state.data;
      const node = nodeMap[id];
      // Code
      if (isCodeNode(node)) {
        node.data.showCode = !node.data.showCode;
        state.data.activeBlockId = node.id;
        return;
      }
      // Group
      if (isGroupNode(node)) {
        const nodes = node.data.chain.map((id) => nodeMap[id]);
        if (
          nodes.find((n) => {
            if (!isCodeNode(n)) return false;
            return n.data.showCode;
          })
        ) {
          nodes.forEach((n) => {
            if (!isCodeNode(n)) return;
            if (n.data.showCode === true) {
              n.data.showCode = false;
            }
          });
        } else {
          nodes.forEach((n) => {
            if (!isCodeNode(n)) return;
            n.data.showCode = true;
          });
        }
        state.data.activeBlockId = nodeMap[node.data.chain[0]].id;
        return;
      }
    },
    actSetContainerBounds(
      state,
      action: PayloadAction<{ width: number; height: number }>
    ) {
      state.containerBounds = action.payload;
    },
    actSetNodeActive(state, action: PayloadAction<string>) {
      state.data.activeBlockId = action.payload;
    },
    actSetForceLayout(state, action: PayloadAction<boolean>) {
      state.forceLayout = action.payload;
    },
    actUpdateBlockText(
      state,
      action: PayloadAction<{ id: string; text: string }>
    ) {
      const { id, text } = action.payload;
      state.data.nodeMap[id].data.text = text;
    },
    actToggleNodeSelection(state, action: PayloadAction<string>) {
      const id = action.payload;
      if (state.nodesSelected.includes(id)) {
        state.nodesSelected = state.nodesSelected.filter((nID) => nID !== id);
      } else {
        state.nodesSelected.push(id);
      }
    },
    actToggleGroup(state, _action: PayloadAction<void>) {
      const { nodesSelected, data } = state;
      const { nodeMap, edges } = data;
      if (nodesSelected.length === 1) {
        // revmove Scrolly
        const node = nodeMap[nodesSelected[0]];
        if (!isGroupNode(node)) return;
        delete nodeMap[node.id];
        node.data.chain.forEach((id) => {
          const n = nodeMap[id];
          delete n.parentId;
          delete n.extent;
        });
      } else {
        // wrap Code nodes with Scrolly
        const isInScrolly = nodesSelected.find((id) => nodeMap[id].parentId);
        if (isInScrolly) {
          console.log(
            "stop grouping: a code block is already in scrolly block"
          );
          return;
        }
        const chain = getNextChain(nodesSelected, edges);
        if (!chain) return;
        const group = newScrolly(chain);
        nodeMap[group.id] = group;
        chain.forEach((id) => {
          nodeMap[id].parentId = group.id;
          nodeMap[id].extent = "parent";
        });
        state.data.activeBlockId = chain[0];
      }
      state.nodesSelected = [];
    },
    actSetEdgeActive(state, action: PayloadAction<string>) {
      state.activeEdgeId = action.payload;
    },
    actSetEdgeHighlight(state, action: PayloadAction<Edge | undefined>) {
      const edge = action.payload;
      if (edge) {
        state.highlightEdge = {
          id: edge.id,
          sourceHandle: edge.sourceHandle!,
          targetHandle: edge.targetHandle!,
        };
      } else {
        state.highlightEdge = undefined;
      }
    },
    actSelectEdge(state, action: PayloadAction<string>) {
      state.edgeSelected = action.payload;
    },
    actDeleteEdge(state, _action: PayloadAction<void>) {
      state.data.edges = state.data.edges.filter(
        (e) => e.id !== state.edgeSelected
      );
      state.edgeSelected = "";
    },
    actDeleteNode(state, _action: PayloadAction<void>) {
      const { nodesSelected, data } = state;
      const { nodeMap, edges } = data;
      if (nodesSelected.length !== 1) {
        console.log("stop delete: multiple node selection");
        return;
      }
      const node = nodeMap[nodesSelected[0]];
      // delete group node
      if (isGroupNode(node)) {
        delete nodeMap[node.id];
        node.data.chain.forEach((id) => {
          const n = nodeMap[id];
          delete n.parentId;
          delete n.extent;
        });
        return;
      }
      // delete code node
      if (!isCodeNode(node)) return;
      const es = edges.filter(
        (e) => e.source === node.id || e.target === node.id
      );
      if (es.length > 1) {
        console.log(
          "stop delete: multiple edge is connect to the selected node"
        );
        return;
      }
      if (node.parentId) {
        const parent = nodeMap[node.parentId];
        if (isGroupNode(parent)) {
          parent.data.chain = parent.data.chain.filter((id) => id !== node.id);
        }
      }
      delete nodeMap[node.id];
      const edge = es[0];
      if (edge) {
        state.data.edges = edges.filter((e) => e.id !== edge.id);
      }
    },
    actLayout(state, _action: PayloadAction<void>) {
      layout(state.data.nodeMap, state.data.edges);
    },
    actPanToActiveNode(state, _action: PayloadAction<void>) {
      const { containerBounds: bounds, data } = state;
      const { nodeMap, activeBlockId } = data;
      const activeNode = nodeMap[activeBlockId || ""];
      if (!isCodeNode(activeNode)) return;
      let xActive = activeNode.position.x;
      let yActive = activeNode.position.y;
      const group = nodeMap[activeNode.parentId || ""];
      if (group) {
        xActive += group.position.x;
        yActive += group.position.y;
      }
      const wActive = activeNode.width || CODE_SIZE.W;
      const hActive = activeNode.height || CODE_SIZE.H;
      const x = bounds.width / 2 - xActive - wActive / 2;
      const y = bounds.height / 2 - yActive - hActive / 2 - 50;
      state.viewport = { x, y, zoom: 1 };
    },
    actChangeNodes(
      state,
      action: PayloadAction<Array<NodeDimensionChange | NodePositionChange>>
    ) {
      const { nodeMap, edges } = state.data;
      const changes = action.payload;
      let needLayout = false;
      for (const change of changes) {
        const n = nodeMap[change.id];
        if (change.type === "dimensions") {
          if (change.dimensions) {
            if (isCodeNode(n)) {
              n.width = change.dimensions.width;
              n.height = change.dimensions.height;
            } else if (isGroupNode(n)) {
              n.style = change.dimensions;
            }
          }
          needLayout = true;
        } else if (change.type === "position") {
          if (change.position) {
            n.position = change.position;
          }
        }
      }
      if (needLayout) {
        layout(nodeMap, edges);
      }
    },
    actEditNodeText(
      state,
      action: PayloadAction<{ id: string; text: string }>
    ) {
      const { id, text } = action.payload;
      const node = state.data.nodeMap[id];
      if (isCodeNode(node)) {
        node.data.text = text;
      }
    },
  },
});

function getNextChain(
  selections: string[],
  edges: Edge[]
): string[] | undefined {
  const nIDSet = new Set(selections);
  const nextEdges = edges.filter(
    (edge) =>
      edge.sourceHandle?.endsWith("bottom") &&
      (nIDSet.has(edge.source) || nIDSet.has(edge.target))
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

  const nIDFirst = [...nIDSet].find((id) => {
    const inEdge = maps.target.get(id);
    if (!inEdge) {
      return true;
    }
    const hasIn = nIDSet.has(inEdge.source || "");
    return !hasIn;
  });

  if (!nIDFirst) {
    console.log("stop grouping: first node not found");
    return;
  }

  let nID = nIDFirst;
  const chain = [] as string[];
  while (nIDSet.has(nID)) {
    chain.push(nID);
    const edge = maps.source.get(nID);
    if (!edge) {
      break;
    }
    nID = edge.target;
  }

  if (chain.length !== nIDSet.size) {
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
  };
}

function newEdge(
  source: string,
  target: string,
  action: "add-detail" | "add-next" = "add-next"
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

// action
export const {
  actAddNote,
  actSelectEdge,
  actToggleNodeSelection,
  actDeleteEdge,
  actDeleteNode,
  actSetContainerBounds,
  actSetForceLayout,
  actSetEdgeHighlight,
  actSetNodeActive,
  actSetEdgeActive,
  actToggleCode,
  actToggleGroup,
  actUpdateBlockText,
  actLayout,
  actChangeNodes,
  actEditNodeText,
} = noteSlice.actions;

// selector
export const selectNodeMap = (state: RootState) => state.note.data.nodeMap;
export const selectEdges = (state: RootState) => state.note.data.edges;
export const selectNodes = createSelector([selectNodeMap], (nodeMap) => {
  const nodes = Object.values(nodeMap);
  const sorted: Node[] = nodes.filter(isGroupNode);
  sorted.push(...nodes.filter(isCodeNode));
  return sorted;
});

export const selectNeedLayout = (state: RootState) => [
  state.note.data.activeBlockId,
];

export const selectActiveNodeId = (state: RootState) =>
  state.note.data.activeBlockId;

export const selectIsActiveNode = (id: string) => (state: RootState) =>
  state.note.data.activeBlockId === id;

export const selectForceLayout = (state: RootState) => state.note.forceLayout;

export const selectIsSeleced = (id: string) => (state: RootState) =>
  state.note.nodesSelected.includes(id);

export const selectShowCode = (id: string) => (state: RootState) => {
  const nodeMap = state.note.data.nodeMap;
  const node = nodeMap[id];
  if (isCodeNode(node)) {
    return !!node.data.showCode;
  }
  if (!isGroupNode(node)) return false;
  const chain = node.data.chain;
  return chain.find((id) => {
    const n = nodeMap[id];
    if (!isCodeNode(n)) return false;
    return n.data.showCode;
  });
};

export const selectHiglightEdge = (state: RootState) =>
  state.note.highlightEdge;

export const selectNoteText = (state: RootState) => state.note.data.text;

// reducer
export default noteSlice.reducer;
