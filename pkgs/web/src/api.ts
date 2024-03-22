import type {
  Edge,
  EdgeAddChange,
  EdgeRemoveChange,
  Node,
  NodeAddChange,
  NodePositionChange,
  NodeRemoveChange,
} from "reactflow";

import { Block } from "types";
import type { DebouncedFunc } from "lodash";
import debounce from "lodash/debounce";

type AnyFunc = (...args: any[]) => any;

class DebouncedApiFuncs<F extends AnyFunc> {
  private _mp = new Map<string, DebouncedFunc<F>>();
  private _fn: F;
  private _wait: number;
  constructor(fn: F, wait: number) {
    this._fn = fn;
    this._wait = wait;
  }
  debouncedByKey(key: string): DebouncedFunc<F> {
    let fn = this._mp.get(key);
    if (!fn) {
      fn = debounce(this._fn, this._wait);
      this._mp.set(key, fn);
    }
    return fn;
  }
}

export const moveBlock = new DebouncedApiFuncs((change: NodePositionChange) => {
  console.log("send block move change to server:", change);
}, 500);

export const addBlock = new DebouncedApiFuncs((change: NodeAddChange) => {
  console.log("send block add change to server:", change);
}, 100);

export const removeBlock = new DebouncedApiFuncs((change: NodeRemoveChange) => {
  console.log("send block remove change to server:", change);
}, 100);

export const addEdge = new DebouncedApiFuncs((change: EdgeAddChange) => {
  console.log("send edge change to server:", change);
}, 100);

export const removeEdge = new DebouncedApiFuncs((change: EdgeRemoveChange) => {
  console.log("send edge remove change to server:", change);
}, 100);

export const resetNodes = debounce((nodes: Node<any>[]) => {
  console.log("reset all nodes:", nodes);
}, 500);

export const resetEdges = debounce((edges: Edge<any>[]) => {
  console.log("reset all edges:", edges);
}, 500);
