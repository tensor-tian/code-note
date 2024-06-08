import { DefaultNodeDimension, isGroupNode } from "./layout";
import { selectBlockState } from "./selector";
import { useTreeNoteStore } from "./store";

export function useBlockState(id: string) {
  const { activeNodeId, selectedNodes, rootIds, nodeMap } = useTreeNoteStore(selectBlockState);
  const node = nodeMap[id];
  const width = isGroupNode(node)
    ? +(node.style?.width || node.width || DefaultNodeDimension.W)
    : node?.width || DefaultNodeDimension.W;
  const isSelected = selectedNodes.includes(id);
  const isActive = activeNodeId === id;
  const isRoot = rootIds.includes(id);
  return {
    isSelected,
    isActive,
    isRoot,
    width,
  };
}
