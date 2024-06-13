import { CodeNode, Node } from "types";
import { useTreeNoteStore, TreeNote, getNextChain } from "./store";
import { createSelector } from "reselect";
import { DefaultNodeDimension, isCodeNode, isGroupNode } from "./layout";

const selectNodeMap = (state: TreeNote.Store) => state.nodeMap;

const selectAllEdges = (state: TreeNote.Store) => state.edges;
const selectHiddenNodes = (state: TreeNote.Store) => state.hiddenNodes;
const selectHiddenEdges = (state: TreeNote.Store) => state.hiddenEdges;

const selectSelectedNodes = (state: TreeNote.Store) => state.selectedNodes;
export const selectActiveEdgeId = (state: TreeNote.Store) => state.activeEdgeId;
export const selectActiveNodeId = (state: TreeNote.Store) => state.activeNodeId;
export const selectActiveNode = (state: TreeNote.Store) => state.nodeMap[state.activeNodeId];
const selectRenderAsGroupNodes = (state: TreeNote.Store) => state.renderAsGroupNodes;
const selectGroupStepIndexMap = (state: TreeNote.Store) => state.groupStepIndexMap;
export const selectTextEditing = (state: TreeNote.Store) => state.textEditing;
export const selectCodeRangeEditingNode = (state: TreeNote.Store) => state.codeRangeEditingNode;
export const selectShowCodeNodes = (state: TreeNote.Store) => state.showCodeNodes;

export const selectNodeInspectorState = (state: TreeNote.Store) => ({
  selectedNodes: state.selectedNodes,
  activeNodeId: state.activeNodeId,
});

export const selectNode = (id: string) => (state: TreeNote.Store) => state.nodeMap[id];

export const selectBlockState = (id: string) =>
  createSelector(
    [
      selectNode(id),
      selectActiveNodeId,
      selectRootIds,
      selectSelectedNodes,
      selectShowCode(id),
      selectRenderAsGroupNodes,
      selectCodeRangeEditingNode,
      selectTextEditing,
    ],
    (node, activeNodeId, rootIds, selectedNodes, showCode, renderAsGroupNodes, codeRangeEditingNode, textEditing) => {
      const width = isGroupNode(node)
        ? +(node.style?.width || node.width || DefaultNodeDimension.W)
        : node?.width || DefaultNodeDimension.W;
      return {
        isSelected: selectedNodes.includes(id),
        isActive: id === activeNodeId,
        isRoot: rootIds.includes(id),
        width,
        showCode,
        renderAsGroup: renderAsGroupNodes.has(id),
        isCodeRangeEditing: id === codeRangeEditingNode,
        isTextEditing: node.id === textEditing?.id && node.type === textEditing.type,
      };
    }
  );

const selectChain = createSelector([selectAllEdges, selectSelectedNodes, selectNodeMap], (edges, selections) => {
  return getNextChain(selections, edges);
});

export const selectTitleState = (state: TreeNote.Store) => ({
  id: state.id,
  text: state.text,
  debug: state.debug,
  nodeIds: Object.keys(state.nodeMap).sort(),
});

const selectNoteID = (state: TreeNote.Store) => state.id;
const selectNoteText = (state: TreeNote.Store) => state.text;
const selectNoteType = (state: TreeNote.Store) => state.type;
export const selectDebug = (state: TreeNote.Store) => state.debug;

const selectCanGroupToDetail = createSelector(
  [selectNodeMap, selectSelectedNodes, selectChain],
  (nodeMap, selectedNodes, chain) =>
    Boolean(chain) &&
    chain!.length > 1 &&
    selectedNodes.every((id) => {
      const node = nodeMap[id];
      if (!node) return false;
      return node.data.type === "Code";
    })
);
const selectCanGroup = createSelector(
  [selectCanGroupToDetail, selectSelectedNodes, selectNodeMap],
  (canGroupNodesToDetail, selectedNodes, nodeMap) =>
    canGroupNodesToDetail &&
    selectedNodes.every((id) => {
      const node = nodeMap[id];
      if (!node) return false;
      return node.data.type === "Code" && !node.parentId;
    })
);

const selectFirstSelected = createSelector([selectNodeMap, selectSelectedNodes], (nodeMap, selectedNodes) => {
  return nodeMap[selectedNodes[0]];
});

const selectCanSplitGroup = createSelector(
  [selectSelectedNodes, selectFirstSelected, selectRenderAsGroupNodes],
  (selectedNodes, firstSelected, renderAsGroupNodes) =>
    selectedNodes.length === 1 && isGroupNode(firstSelected) && !renderAsGroupNodes.has(firstSelected.id)
);

export const selectMenuState = createSelector(
  [
    selectNoteID,
    selectNoteText,
    selectNoteType,
    selectDebug,
    selectCanGroupToDetail,
    selectCanGroup,
    selectCanSplitGroup,
  ],
  (id, text, typ, debug, canGroupNodesToDetail, canGroupNodes, canSplitGroup) => {
    return {
      id,
      text,
      type: typ,
      debug,
      canGroupNodes,
      canGroupNodesToDetail,
      canSplitGroup,
    };
  }
);

const selectPanToActiveMark = (state: TreeNote.Store) => state.panToActiveMark;
const selectRootIds = (state: TreeNote.Store) => state.rootIds;

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

export const selectEdges = createSelector([selectAllEdges, selectHiddenEdges], (edges, hidden) => {
  return edges.filter((e) => !hidden.has(e.id));
});

export const selectGroupCodes = (id: string) =>
  createSelector([selectNodeMap, selectRenderAsGroupNodes], (nodeMap, renderAsGroupNodes) => {
    const group = nodeMap[id];
    if (!isGroupNode(group)) return;
    if (!renderAsGroupNodes.has(id)) return [];
    return group.data.chain.map((_id) => nodeMap[_id] as CodeNode);
  });

export const selectIsActiveNodeRenderAsGroup = createSelector(
  [selectActiveNodeId, selectRenderAsGroupNodes],
  (activeNodeId, renderAsGroupNodes) => renderAsGroupNodes.has(activeNodeId)
);

export const selectActiveNodeAndGroup = createSelector(
  [selectActiveNodeId, selectNodeMap, selectPanToActiveMark, selectIsActiveNodeRenderAsGroup],
  (activeId, nodeMap, activeMark, isActiveNodeRenderAsGroup) => {
    let activeNode = nodeMap[activeId];
    let activeGroup: Node | undefined = undefined;
    if (activeNode?.parentId) {
      activeGroup = nodeMap[activeNode.parentId];
    }
    return {
      activeNode,
      activeMark,
      activeGroup,
      isActiveNodeRenderAsGroup,
    };
  }
);

const selectShowCode = (id: string) =>
  createSelector([selectNodeMap, selectShowCodeNodes], (nodeMap, showCodeNodes) => {
    const n = nodeMap[id];
    if (isCodeNode(n)) {
      return showCodeNodes.has(id);
    } else if (isGroupNode(n)) {
      return n.data.chain
        .map((id) => nodeMap[id])
        .filter(isCodeNode)
        .some((n) => showCodeNodes.has(n.id));
    }
    return false;
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

const selectSelectedEdgeId = (state: TreeNote.Store) => state.selectedEdge;

export const selectSelectedEdge = createSelector([selectAllEdges, selectSelectedEdgeId], (edges, id) =>
  edges.find((e) => e.id === id)
);

/**
 * handle message from code hike by defined window.postMessageToCodeNoteEditor method
 */

if (!window.postMessageToCodeNoteEditor) {
  window.postMessageToCodeNoteEditor = function (action: string, payload: any) {
    console.log("receive message from code hike:", action, payload);
    useTreeNoteStore.getState().handleCodeHikeMessage(action, payload);
  };
}
