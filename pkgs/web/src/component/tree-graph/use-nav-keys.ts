import { useTreeNoteStore } from "./store";
import { selectActiveNode } from "./selector";
import { useCallback, useEffect, useRef } from "react";

import { Edge } from "types";

type KeyboardHandler = (event: KeyboardEvent) => void;

function useKeyPress(keys: string | string[], handler: KeyboardHandler) {
  const ref = useRef<KeyboardHandler | null>(null);
  useEffect(() => {
    ref.current = (event) => {
      if (Array.isArray(keys) ? keys.includes(event.key) : keys === event.key) {
        handler?.(event);
      }
    };
  }, [keys, handler]);
  useEffect(() => {
    const listener: KeyboardHandler = (event) => {
      ref.current?.(event);
    };
    window.addEventListener("keydown", listener);
    return () => {
      window.removeEventListener("keydown", listener);
    };
  }, []);
}

export function useNavKeys(edges: Edge[]) {
  const { activateNode, toggleNodeSelection } = useTreeNoteStore();
  const activeNode = useTreeNoteStore(selectActiveNode);
  const activeId = activeNode?.id;
  const parentId = activeNode?.parentId;
  const onKeyPress = useCallback(
    (event: KeyboardEvent) => {
      console.log(activeId, event);
      if (!activateNode) return;
      switch (event.key) {
        case "ArrowLeft": {
          const edge = edges.find((e) => e.targetHandle === activeId + "-left");
          console.log("←", edge);
          if (edge) {
            activateNode(edge.source, edge);
          } else if (parentId) {
            const edge = edges.find((e) => e.targetHandle === parentId + "-left");
            if (edge) activateNode(edge.source, edge);
          } else {
            const map = edges.reduce((acc, e) => {
              if (e.targetHandle) acc.set(e.targetHandle, e);
              if (e.sourceHandle) acc.set(e.sourceHandle!, e);
              return acc;
            }, new Map<string, Edge>());
            const moveTopLeft = (id: string): string | undefined => {
              // move top
              let top = map.get(id + "-top")?.source;
              while (top) {
                id = top;
                top = map.get(id + "-top")?.source;
              }
              // move left
              return map.get(id + "-left")?.source;
            };
            const left = moveTopLeft(activeId);
            if (left) activateNode(left, edge);
          }
          break;
        }
        case "ArrowRight": {
          const edge = edges.find((e) => e.sourceHandle === activeId + "-right");
          console.log("→", edge);
          if (edge) activateNode(edge.target, edge);
          break;
        }
        case "ArrowUp": {
          const edge = edges.find((e) => e.targetHandle === activeId + "-top");
          console.log("↑", edge);
          if (edge) {
            activateNode(edge.source, edge);
          } else if (parentId) {
            const edge = edges.find((e) => e.targetHandle === parentId + "-top");
            if (edge) activateNode(edge.source, edge);
          }
          break;
        }
        case "ArrowDown": {
          const edge = edges.find((e) => e.sourceHandle === activeId + "-bottom");
          console.log("↓", edge);
          if (edge) {
            activateNode(edge.target, edge);
          } else if (parentId) {
            const edge = edges.find((e) => e.sourceHandle === parentId + "-bottom");
            if (edge) activateNode(edge.target, edge);
          }
          break;
        }
        case "Enter": {
          toggleNodeSelection(activeId);
          break;
        }
      }
    },
    [activateNode, activeId, parentId, edges, toggleNodeSelection]
  );
  useKeyPress(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter"], onKeyPress);
}
