import { selectBlockState } from "./selector";
import { useTreeNoteStore } from "./store";

export function useBlockState(id: string) {
  const { activeNodeId, selectedNodes, rootIds, width } = useTreeNoteStore(selectBlockState);
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
