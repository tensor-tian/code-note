import { CodeNode, Edge, GroupNode, Node, Note } from "types";
import { useTreeNoteStore, TreeNote, getNextChain } from "./store";
import { createSelector } from "reselect";
import { DefaultNodeDimension, isGroupNode } from "./layout";

export const selectNodeMap = (state: TreeNote.Store) => state.nodeMap;
// export const selectAllEdges = (state: TreeNote.Store) => state.edges;
export const selectAllEdges = (state: TreeNote.Store) => state.edges;
export const selectHiddenNodes = (state: TreeNote.Store) => state.hiddenNodes;
export const selectHiddenEdges = (state: TreeNote.Store) => state.hiddenEdges;

export const selectSelectedNodes = (state: TreeNote.Store) => state.selectedNodes;
export const selectActiveEdgeId = (state: TreeNote.Store) => state.activeEdgeId;
export const selectActiveNodeId = (state: TreeNote.Store) => state.activeNodeId;
export const selectActiveNode = (state: TreeNote.Store) => state.nodeMap[state.activeNodeId];

export const selectNodeInspectorState = (state: TreeNote.Store) => ({
  selectedNodes: state.selectedNodes,
  activeNodeId: state.activeNodeId,
});
export const selectBlockState = (state: TreeNote.Store) => ({
  activeNodeId: state.activeNodeId,
  selectedNodes: state.selectedNodes,
  rootIds: state.rootIds,
  nodeMap: state.nodeMap,
});

export const selectChain = createSelector([selectAllEdges, selectSelectedNodes, selectNodeMap], (edges, selections) => {
  return getNextChain(selections, edges);
});

export const selectState = (state: TreeNote.Store) => state;

export const selectMenuState = createSelector([selectState, selectChain], (state, chain) => {
  const { nodeMap, selectedNodes } = state;
  const firstSelected = nodeMap[selectedNodes[0] || ""];
  const canGroupNodesToDetail =
    Boolean(chain) &&
    chain!.length > 1 &&
    selectedNodes.every((id) => {
      const node = nodeMap[id];
      if (!node) return false;
      return node.data.type === "Code";
    });
  const canGroupNodes =
    canGroupNodesToDetail &&
    selectedNodes.every((id) => {
      const node = nodeMap[id];
      if (!node) return false;
      return node.data.type === "Code" && !node.parentId;
    });
  return {
    id: state.id,
    text: state.text,
    type: state.type,
    debug: state.debug,
    canGroupNodes,
    canGroupNodesToDetail,
    canSplitGroup: selectedNodes.length === 1 && isGroupNode(firstSelected) && !firstSelected.data.renderAsGroup,
  };
});
export const selectNoteTitle = (state: TreeNote.Store) => ({
  text: state.text,
  id: state.id,
  type: state.type,
});
export const selectPanToActiveMark = (state: TreeNote.Store) => state.panToActiveMark;
export const selectRootIds = (state: TreeNote.Store) => state.rootIds;
export const selectDebug = (state: TreeNote.Store) => state.debug;

export const selectNodes = createSelector([selectNodeMap, selectHiddenNodes], (nodeMap, hidden) => {
  const nodes = Object.values(nodeMap);
  const groups: Node[] = [];
  let codes: Node[] = [];
  for (const node of nodes) {
    if (isGroupNode(node)) {
      if (!hidden.has(node.id)) {
        groups.push(node);
      }
    } else {
      codes.push(node);
    }
  }
  for (const code of codes) {
    if (!hidden.has(code.id)) {
      groups.push(code);
    }
  }
  return groups;
});

export const selectGroups = (state: TreeNote.Store) =>
  Object.values(state.nodeMap).filter((n) => n.type === "Scrolly" && (n as GroupNode).data.renderAsGroup);

export const selectEdges = createSelector([selectAllEdges, selectHiddenEdges], (edges, hidden) => {
  return edges.filter((e) => !hidden.has(e.id));
});

export const selectGroupCodes = createSelector(
  [selectNodeMap, (_state: TreeNote.Store, id: string) => id],
  (nodeMap, id) => {
    const group = nodeMap[id];
    if (!isGroupNode(group)) return;
    if (!group.data.renderAsGroup) return [];
    console.log("chain:", group.data.chain);
    return group.data.chain.map((_id) => nodeMap[_id] as CodeNode);
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
    return {
      activeNode,
      activeMark,
      activeGroup,
    };
  }
);

export const selectGroupShowCode = (id: string) =>
  createSelector([selectNodeMap], (nodeMap) => {
    const group = nodeMap[id] as GroupNode;
    if (!group) return false;
    return !!group.data.chain.find((id) => (nodeMap[id] as CodeNode).data.showCode);
  });

export const selectActiveEdge = createSelector([selectAllEdges, selectActiveEdgeId], (edges, id) =>
  edges.find((e) => e.id === id)
);

const selectHandshake = (state: TreeNote.Store) => state.handshake;

export const selectTreeFlowState = createSelector(
  [selectRootIds, selectSelectedNodes, selectDebug, selectHandshake],
  (rootIds, selectedNodes, debug, handshake) => {
    return { rootIds, selectedNodes, debug, handshake };
  }
);

export const selectSelectedEdgeId = (state: TreeNote.Store) => state.selectedEdge;

export const selectSelectedEdge = createSelector([selectAllEdges, selectSelectedEdgeId], (edges, id) =>
  edges.find((e) => e.id === id)
);

function v1Tov2(note: Note): Note {
  const { nodeMap, edges } = note;
  const map = new Map<string, Edge>();
  for (const e of edges) {
    map.set(e.sourceHandle!, e);
    map.set(e.targetHandle!, e);
  }
  const nodes = Object.values(nodeMap);
  for (const node of nodes) {
    if (isGroupNode(node)) {
      node.data.stepIndex = 0;
      node.data.renderAsGroup = false;
      node.data.groupModeWidth = node.data.groupModeWidth || DefaultNodeDimension.WGroup;
      const chain = node.data.chain;
      // replace edges connecting to 1st and last code node with to group node
      const nFist = chain[0];
      const left = map.get(nFist + "-left");
      if (left) {
        left.target = node.id;
        left.targetHandle = node.id + "-left";
      }
      const top = map.get(nFist + "-top");
      if (top) {
        top.target = node.id;
        top.targetHandle = node.id + "-top";
      }
      const nLast = chain[chain.length - 1];
      const bottom = map.get(nLast + "-bottom");
      if (bottom) {
        bottom.source = node.id;
        bottom.sourceHandle = node.id + "-bottom";
      }
    }
    note.version = 2;
    return note;
  }
  return note;
}

export function migrateNote(note: Note): Note {
  if (note.version === 2) {
    return note;
  }
  // ScrollyCodeBlockV1 -> ScrollyCodeBlockV2
  if (typeof note.version === "undefined") {
    return v1Tov2(note);
  }
  for (const n of Object.values(note.nodeMap)) {
    // reset all group nodes
    if (isGroupNode(n)) {
      const { renderAsGroup, chain, stepIndex } = n.data;
      if (renderAsGroup) {
        const rightHandle = `${n.id}-right`;
        for (let i = 0; i < note.edges.length; i++) {
          const edge = note.edges[i];
          if (edge.sourceHandle === rightHandle) {
            edge.source = chain[stepIndex];
            edge.sourceHandle = `${chain[stepIndex]}-right`;
          }
        }
      }
      n.data.renderAsGroup = false;
      n.data.stepIndex = 0;
    }
  }
  note.version = 2;
  return note;
}

/**
 * handle message from code hike by defined window.postMessageToCodeNoteEditor method
 */

if (!window.postMessageToCodeNoteEditor) {
  window.postMessageToCodeNoteEditor = function (action: string, payload: any) {
    console.log("receive message from code hike:", action, payload);
    useTreeNoteStore.getState().handleCodeHikeMessage(action, payload);
  };
}
