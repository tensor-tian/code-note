import type { Block, MessageDataAddBlock, Note, ScrollyCodeBlock } from "types";
import { PayloadAction, createSlice } from "@reduxjs/toolkit";

import type { Edge } from "reactflow";
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
      blockMap: {},
      edges: [],
      activeBlockId: null,
    } as Note<Block>,
    forceLayout: false,
    selections: new Array<string>(),
    showCodeBlockIds: new Array<string>(),
    activeEdgeId: "",
    highlightEdge: {
      id: "",
      sourceHandle: "",
      targetHandle: "",
    },
  },
  reducers: {
    addNote(
      state,
      action: PayloadAction<{
        data: MessageDataAddBlock["data"];
        msgType: MessageDataAddBlock["action"];
      }>
    ) {
      const { data, msgType } = action.payload;
      const edges = state.data.edges;
      const activeId = state.data.activeBlockId;
      if (msgType === "add-detail" && activeId) {
        if (
          edges.find(
            ({ sourceHandle }) =>
              sourceHandle &&
              sourceHandle.startsWith(activeId) &&
              sourceHandle.endsWith("right")
          )
        ) {
          return;
        }
      } else if (msgType === "add-next" && activeId) {
        if (
          edges.find(
            ({ sourceHandle }) =>
              sourceHandle &&
              sourceHandle.startsWith(activeId) &&
              sourceHandle.endsWith("bottom")
          )
        ) {
          return;
        }
      }

      const id = nanoid();
      const block = { ...data, text: id, id };
      state.data.blockMap[id] = block;

      state.data.activeBlockId = id;
      if (!activeId) {
        return;
      }
      const edge = newEdge(activeId, id, msgType);
      state.data.edges.push(edge);
    },
    toggleShowCode(state, action: PayloadAction<string>) {
      const id = action.payload;
      const block = state.data.blockMap[id];
      // Scrolly
      if (block.type === "Scrolly") {
        const set = new Set(block.chain);
        const showCode = state.showCodeBlockIds.find((nID) => set.has(nID));
        state.showCodeBlockIds = state.showCodeBlockIds.filter(
          (nID) => !set.has(nID)
        );
        if (!showCode) {
          state.showCodeBlockIds.push(...block.chain);
        }
        return;
      }
      // Code
      if (state.showCodeBlockIds.includes(id)) {
        state.showCodeBlockIds = state.showCodeBlockIds.filter(
          (blockId) => blockId !== id
        );
      } else {
        state.showCodeBlockIds.push(id);
      }
    },
    activateBlock(state, action: PayloadAction<string>) {
      state.data.activeBlockId = action.payload;
    },
    setForceLayout(state, action: PayloadAction<boolean>) {
      state.forceLayout = action.payload;
    },
    setBlockText(state, action: PayloadAction<{ id: string; text: string }>) {
      const { id, text } = action.payload;
      state.data.blockMap[id].text = text;
    },
    toggleBlockSelection(state, action: PayloadAction<string>) {
      const id = action.payload;
      if (state.selections.includes(id)) {
        state.selections = state.selections.filter((blockId) => blockId !== id);
      } else {
        state.selections.push(id);
      }
    },
    toggleSrollyBlock(state, _action: PayloadAction<void>) {
      const { selections, data } = state;
      const { blockMap, edges } = data;
      if (selections.length === 1) {
        // revmove Scrolly
        const scrolly = blockMap[selections[0]];
        if (scrolly.type !== "Scrolly") {
          return;
        }
        delete blockMap[scrolly.id];
        Object.values(blockMap).forEach((block) => {
          if (block.parentId === scrolly.id) {
            delete block.parentId;
          }
        });
      } else {
        // wrap Code nodes with Scrolly
        const isInScrolly = selections.find((nID) => blockMap[nID].parentId);
        if (isInScrolly) {
          console.log(
            "stop grouping: a code block is already in scrolly block"
          );
          return;
        }
        const chain = getNextChain(selections, edges);
        if (!chain) return;
        const scrolly = newScrolly(chain);
        blockMap[scrolly.id] = scrolly;
        chain.forEach((nID) => {
          blockMap[nID].parentId = scrolly.id;
        });
        state.data.activeBlockId = chain[0];
      }
      state.selections = [];
    },
    setHighlightEdge(state, action: PayloadAction<Edge | undefined>) {
      const edge = action.payload;
      if (edge) {
        state.highlightEdge = {
          id: edge.id,
          sourceHandle: edge.sourceHandle!,
          targetHandle: edge.targetHandle!,
        };
      } else {
        state.highlightEdge = {
          id: "",
          sourceHandle: "",
          targetHandle: "",
        };
      }
    },
    activateEdge(state, action: PayloadAction<string>) {
      state.activeEdgeId = action.payload;
    },
    deleteEdge(state, _action: PayloadAction<void>) {
      state.data.edges = state.data.edges.filter(
        (e) => e.id !== state.activeEdgeId
      );
      state.activeEdgeId = "";
    },
    // deleteBlock(state, _action: PayloadAction<void>) {
    //   const { selections, data } = state;
    //   if (selections.length !== 1) {
    //     console.log("stop delete: multiple selection");
    //     return;
    //   }
    //   const { blockMap, edges } = data;
    //   const nID = selections[0];
    //   const inEdge = edges.find((e) => e.target === nID);
    //   const outEdges = edges.filter((e) => e.source === nID);

    // },
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

function newScrolly(chain: string[]): ScrollyCodeBlock {
  return {
    id: nanoid(),
    type: "Scrolly",
    text: "",
    chain,
  };
}

function newEdge(
  source: string,
  target: string,
  action: "add-detail" | "add-next" = "add-next"
): Edge<Block> {
  return {
    id: nanoid(12),
    type: "edge",
    source,
    target,
    sourceHandle:
      action === "add-detail" ? `${source}-right` : `${source}-bottom`,
    targetHandle: action === "add-detail" ? `${target}-left` : `${target}-top`,
  };
}

// action
export const {
  addNote,
  toggleShowCode,
  activateBlock,
  setForceLayout,
  setBlockText,
  toggleBlockSelection,
  toggleSrollyBlock,
  setHighlightEdge,
  activateEdge,
  deleteEdge,
} = noteSlice.actions;

// selector
export const selectNote = (state: RootState) => state.note.data;
export const selectNeedLayout = (state: RootState) => [
  state.note.showCodeBlockIds,
  state.note.data.activeBlockId,
];
export const selectShowCode = (id: string) => (state: RootState) =>
  state.note.showCodeBlockIds.includes(id);
export const selectIsActive = (id: string) => (state: RootState) =>
  state.note.data.activeBlockId === id;
export const selectActiveBlockId = (state: RootState) =>
  state.note.data.activeBlockId;
export const selectForceLayout = (state: RootState) => state.note.forceLayout;
export const selectIsSeleced = (id: string) => (state: RootState) =>
  state.note.selections.includes(id);
export const selectGroupShowCode = (id: string) => (state: RootState) => {
  const scrolly = state.note.data.blockMap[id] as ScrollyCodeBlock;
  if (!scrolly) return false;
  const set = new Set(state.note.showCodeBlockIds);
  const { chain } = scrolly;
  for (const nID of chain) {
    if (set.has(nID)) return true;
  }
  return false;
};
export const selectEdgeHilight = (state: RootState) => state.note.highlightEdge;
// reducer
export default noteSlice.reducer;
