import { selectActiveNodeId, useTreeNoteStore } from "./store";
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
  const { activateNode } = useTreeNoteStore();
  const activeId = useTreeNoteStore(selectActiveNodeId);
  const onKeyPress = useCallback(
    (event: KeyboardEvent) => {
      console.log(activeId, event);
      if (!activeId) return;
      switch (event.key) {
        case "ArrowLeft": {
          const edge = edges.find((e) => e.targetHandle === activeId + "-left");
          console.log("←", edge);
          if (edge) {
            activateNode(edge.source);
          } else {
            const map = edges.reduce((acc, e) => {
              if (e.targetHandle) acc.set(e.targetHandle, e);
              if (e.sourceHandle) acc.set(e.sourceHandle!, e);
              return acc;
            }, new Map<string, Edge>());
            const moveTopLeft = (
              id: string
            ): { id: string | undefined; found: boolean } => {
              // move top
              let top = map.get(id + "-top")?.source;
              while (top) {
                id = top;
                top = map.get(id + "-top")?.source;
              }
              // move left
              let left = map.get(id + "-left")?.source;
              while (left) {
                const bottom = map.get(left + "-bottom")?.target;
                console.log("bottom:", bottom);
                if (bottom) {
                  // found if has bottom
                  return { id: bottom, found: true };
                }
                id = left;
                left = map.get(id + "-left")?.source;
              }
              return { id, found: false };
            };
            let { id, found } = moveTopLeft(activeId);
            while (id && !found) {
              const prevId = id;
              ({ id, found } = moveTopLeft(id));
              if (id === prevId) {
                break;
              }
            }

            if (found && id) activateNode(id);
          }
          break;
        }
        case "ArrowRight": {
          const edge = edges.find(
            (e) => e.sourceHandle === activeId + "-right"
          );
          console.log("→", edge);
          if (edge) activateNode(edge.target);
          break;
        }
        case "ArrowUp": {
          const edge = edges.find((e) => e.targetHandle === activeId + "-top");
          console.log("↑", edge);
          if (edge) activateNode(edge.source);
          break;
        }
        case "ArrowDown": {
          const edge = edges.find(
            (e) => e.sourceHandle === activeId + "-bottom"
          );
          console.log("↓", edge);
          if (edge) activateNode(edge.target);
          break;
        }
      }
    },
    [activateNode, activeId, edges]
  );
  useKeyPress(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"], onKeyPress);
}
