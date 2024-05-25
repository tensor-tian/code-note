import type { CodeNode, Edge, GroupNode, Node } from "types";

export type TreeGraphSettings = {
  X: number;
  Y: number;
  W: number;
  H: number;
};

export const VIEWPORT = {
  x: 0,
  y: 0,
  zoom: 1.0,
};

enum VisitOrder {
  PreOrder = 1,
  PostOrder = 2,
}
type NodeLayout = {
  x: number;
  y: number;
  w: number;
  h: number;
  treeH: number;
  treeW: number;
};

const UNSET_NUMBER = -1;

class TreeLayout {
  edgeMap = new Map<string, Edge>();
  nodeMap: Record<string, Node>;
  layoutMap = new Map<string, NodeLayout>();

  constructor(
    nodeMap: Record<string, Node>,
    edges: Edge[],
    private settings: TreeGraphSettings
  ) {
    this.nodeMap = nodeMap;
    edges.forEach((e) => {
      this.edgeMap.set(e.sourceHandle!, e).set(e.targetHandle!, e);
    });
  }
  private right = (n: CodeNode | undefined) => {
    if (!n) return;
    const edge = this.edgeMap.get(n.id + "-right");
    if (!edge) return;
    return this.nodeMap[edge.target] as CodeNode;
  };
  private bottom = (n: CodeNode | undefined) => {
    if (!n) return;
    const edge = this.edgeMap.get(n.id + "-bottom");
    if (!edge) return;
    return this.nodeMap[edge.target] as CodeNode;
  };
  private left = (n: CodeNode | undefined) => {
    if (!n) return;
    const edge = this.edgeMap.get(n.id + "-left");
    if (!edge?.targetHandle?.endsWith("left")) return;
    return this.nodeMap[edge.source] as CodeNode;
  };
  private top = (n: CodeNode | undefined) => {
    if (!n) return;
    const edge = this.edgeMap.get(n.id + "-top");
    if (!edge) return;
    return this.nodeMap[edge.source] as CodeNode;
  };

  private topRight = (n: CodeNode): CodeNode | undefined => {
    if (!n) return;
    const topEdge = this.edgeMap.get(n.id + "-top");
    if (!topEdge) return;
    const rightEdge = this.edgeMap.get(topEdge.source + "-right");
    if (!rightEdge) return;
    return this.nodeMap[rightEdge.target] as CodeNode;
  };

  private sizeOf = (
    n: CodeNode,
    relation: (x: CodeNode) => CodeNode | undefined
  ): NodeLayout | undefined => {
    const left = relation(n);
    if (!left) return;
    return this.layoutMap.get(left.id);
  };

  calcTotalSize = (n: CodeNode) => {
    const sz = this.layoutMap.get(n.id)!;

    sz.treeH = sz.h;
    const right = this.sizeOf(n, this.right);
    if (right && right.treeH > sz.treeH) {
      sz.treeH = right.treeH;
    }
    const bottom = this.sizeOf(n, this.bottom);
    if (bottom) {
      sz.treeH += bottom.treeH + this.settings.Y;
    }

    sz.treeW = sz.w;
    if (right) {
      sz.treeW += right.treeW + this.settings.X;
    }
    if (bottom && bottom.treeW > sz.treeW) {
      sz.treeW = bottom.treeW;
    }

    this.layoutMap.set(n.id, sz)!;
  };

  calcPosition = (n: CodeNode) => {
    const sz = this.layoutMap.get(n.id)!;

    const top = this.sizeOf(n, this.top);
    const left = this.sizeOf(n, this.left);
    const topRight = this.sizeOf(n, this.topRight);

    sz.x = top?.x || (left ? left!.x + left!.w : 0) + this.settings.X;
    sz.y =
      left?.y ||
      (top ? top!.y + Math.max(topRight?.treeH || 0, top.h) : 50) +
        this.settings.Y;
  };

  private visit(
    node: CodeNode | undefined,
    visitor: (n: CodeNode) => void,
    order: VisitOrder
  ) {
    if (!node) return;
    if (order === VisitOrder.PreOrder) {
      visitor(node);
    }
    this.visit(this.right(node), visitor, order);
    this.visit(this.bottom(node), visitor, order);
    if (order === VisitOrder.PostOrder) {
      visitor(node);
    }
  }
  private getRoot(
    n: CodeNode | undefined,
    visited: Set<string>
  ): CodeNode | undefined {
    if (!n) return;
    if (visited.has(n.id)) return;
    visited.add(n.id);
    const left = this.left(n);
    const top = this.top(n);
    if (!left && !top) return n;
    return this.getRoot(left, visited) || this.getRoot(top, visited);
  }
  private getRoots() {
    const visited = new Set<string>();
    const roots = new Array<CodeNode>();
    for (const n of Object.values(this.nodeMap)) {
      if (isCodeNode(n)) {
        const root = this.getRoot(n, visited);
        if (root) roots.push(root);
      }
    }
    return roots;
  }

  private calcGroupNode = (g: GroupNode) => {
    let x = 0;
    let yFirst = -1;
    let yLast = -1;
    let hLast = 0;
    let w = 0;
    const chain = g.data.chain;

    chain.forEach((id, i) => {
      const sz = this.layoutMap.get(id);
      if (!sz) return;
      if (i === 0) {
        x = sz.x;
        yFirst = sz.y;
      }
      if (sz.w > w) {
        w = sz.w;
      }
      if (i === chain.length - 1) {
        yLast = sz.y;
        hLast = sz.h;
      }
    });

    const gsz = this.layoutMap.get(g.id)!;
    gsz.x = x - 10;
    gsz.y = yFirst - 28; // -10-16-2
    gsz.w = w + 20;
    gsz.h = yLast - yFirst + (hLast || this.settings.H) + 38; // 10 + 10 + 16 + 4

    chain.forEach((id) => {
      const sz = this.layoutMap.get(id);
      if (!sz) return;
      sz.x = 10;
      sz.y -= gsz.y;
    });
  };

  public layout(): { nodeMap: Record<string, Node>; rootIds: string[] } {
    const roots = this.getRoots();
    const rootIds = roots.map((n) => n.id);
    if (roots.length !== 1) {
      console.log("skip layout: multiple tree root");
      return {
        rootIds,
        nodeMap: this.nodeMap,
      };
    }
    const nodes = Object.values(this.nodeMap);
    nodes.forEach((n) => {
      this.layoutMap.set(n.id, {
        x: UNSET_NUMBER,
        y: UNSET_NUMBER,
        w: n.width || this.settings.W,
        h: n.height || this.settings.H,
        treeH: UNSET_NUMBER,
        treeW: UNSET_NUMBER,
      });
    });

    const groups = nodes.filter(isGroupNode);
    const codes = nodes.filter(isCodeNode);

    const root = roots[0];
    this.visit(root, this.calcTotalSize, VisitOrder.PostOrder);
    this.visit(root, this.calcPosition, VisitOrder.PreOrder);
    groups.forEach(this.calcGroupNode);

    const groupMap = groups.reduce((acc, n) => {
      const sz = this.layoutMap.get(n.id)!;
      if (
        sz.x !== n.position.x ||
        sz.y !== n.position.y ||
        sz.w !== n.style?.width ||
        sz.h !== n.style.height
      ) {
        acc[n.id] = {
          ...n,
          position: { x: sz.x, y: sz.y },
          style: { ...n.style, width: sz.w, height: sz.h },
          width: sz.w,
          height: sz.h,
        };
      }
      return acc;
    }, {} as Record<string, GroupNode>);
    const codeMap = codes.reduce((acc, n) => {
      const sz = this.layoutMap.get(n.id)!;
      if (
        sz.x !== n.position.x ||
        sz.y !== n.position.y ||
        sz.w !== n.width ||
        sz.h !== n.height
      ) {
        acc[n.id] = {
          ...n,
          position: { x: sz.x, y: sz.y },
          width: sz.w,
          height: sz.h,
        };
      }
      return acc;
    }, {} as Record<string, CodeNode>);

    if (Object.keys(groupMap).length + Object.keys(codeMap).length === 0) {
      return { nodeMap: this.nodeMap, rootIds };
    }
    return { nodeMap: { ...this.nodeMap, ...groupMap, ...codeMap }, rootIds };
  }
}

export function isCodeNode(n: Node | undefined): n is CodeNode {
  return n?.data.type === "Code";
}

export function isGroupNode(n: Node | undefined): n is GroupNode {
  return n?.data.type === "Scrolly";
}

export function layout(
  nodeMap: Record<string, Node>,
  edges: Edge[],
  options: TreeGraphSettings
) {
  return new TreeLayout(nodeMap, edges, options).layout();
}

export function hasCycle(edges: Edge[]): boolean {
  const map = new Map<string, Edge>();
  edges.forEach((e) => {
    if (e.sourceHandle) map.set(e.sourceHandle!, e);
    if (e.targetHandle) map.set(e.targetHandle!, e);
  });

  const dfs = (
    id: string,
    visited: Set<string>,
    parent: string | undefined
  ): boolean => {
    if (visited.has(id)) {
      return true;
    }
    visited.add(id);
    const left = map.get(id + "-left");
    if (left && left.source !== parent && dfs(left.source, visited, id))
      return true;
    const top = map.get(id + "-top");
    if (top && top.source !== parent && dfs(top.source, visited, id))
      return true;
    const right = map.get(id + "-right");
    if (right && right.target !== parent && dfs(right.target, visited, id))
      return true;
    const bottom = map.get(id + "-bottom");
    if (bottom && bottom.target !== parent && dfs(bottom.target, visited, id))
      return true;
    return false;
  };

  const visited = new Set<string>();
  for (const edge of edges) {
    if (visited.has(edge.source)) continue;
    if (dfs(edge.source, visited, undefined)) return true;
  }
  return false;
}
