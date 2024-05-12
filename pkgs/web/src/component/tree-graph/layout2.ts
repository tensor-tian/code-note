import type { CodeNode, Edge, GroupNode, Node } from "types";

export const CODE_SIZE = {
  X: 50,
  Y: 46,
  W: 600,
  H: 58,
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
  totalH: number;
  totalW: number;
};

const UNSET_NUMBER = -1;

class TreeLayout {
  srcEdgeMap = new Map<string, Edge>();
  tgtEdgeMap = new Map<string, Edge>();
  nodeMap: Record<string, Node>;
  layoutMap = new Map<string, NodeLayout>();
  constructor(nodeMap: Record<string, Node>, edges: Edge[]) {
    this.nodeMap = nodeMap;
    edges.forEach((e) => {
      this.srcEdgeMap.set(e.source, e);
      this.tgtEdgeMap.set(e.target, e);
    });
  }
  private right = (n: CodeNode | undefined) => {
    if (!n) return;
    const edge = this.srcEdgeMap.get(n.id);
    if (!edge?.targetHandle?.endsWith("left")) return;
    return this.nodeMap[edge.target] as CodeNode;
  };
  private bottom = (n: CodeNode | undefined) => {
    if (!n) return;
    const edge = this.srcEdgeMap.get(n.id);
    if (!edge?.targetHandle?.endsWith("top")) return;
    return this.nodeMap[edge.target] as CodeNode;
  };
  private left = (n: CodeNode | undefined) => {
    if (!n) return;
    const edge = this.tgtEdgeMap.get(n.id);
    if (!edge?.targetHandle?.endsWith("left")) return;
    return this.nodeMap[edge.source] as CodeNode;
  };
  private top = (n: CodeNode | undefined) => {
    if (!n) return;
    const edge = this.tgtEdgeMap.get(n.id);
    if (!edge?.targetHandle?.endsWith("top")) return;
    return this.nodeMap[edge.source] as CodeNode;
  };

  private topRight = (n: CodeNode): CodeNode | undefined => {
    if (!n) return;
    const topEdge = this.tgtEdgeMap.get(n.id);
    if (!topEdge) return;
    const rightEdge = this.srcEdgeMap.get(topEdge.source);
    if (!rightEdge) return;
    return this.nodeMap[rightEdge.target] as CodeNode;
  };

  size = (
    n: CodeNode,
    relation: (x: CodeNode) => CodeNode | undefined
  ): NodeLayout | undefined => {
    const left = relation(n);
    if (!left) return;
    return this.layoutMap.get(left.id);
  };
  calcTotalSize = (n: CodeNode) => {
    const sz = this.layoutMap.get(n.id)!;

    sz.totalH = sz.h;
    const right = this.size(n, this.right);
    if (right && right.totalH > sz.totalH) {
      sz.totalH = right.totalH;
    }
    const bottom = this.size(n, this.bottom);
    if (bottom) {
      sz.totalH += bottom.totalH + CODE_SIZE.Y;
    }

    sz.totalW = sz.w;
    if (right) {
      sz.totalW += right.totalW + CODE_SIZE.X;
    }
    if (bottom && bottom.totalW > sz.totalW) {
      sz.totalW = bottom.totalW;
    }
  };

  calcPosition = (n: CodeNode) => {
    const sz = this.layoutMap.get(n.id)!;
    const top = this.size(n, this.top);
    const left = this.size(n, this.left);
    const topRight = this.size(n, this.topRight);
    sz.x = top?.x || (left ? left!.x + left!.w : 0) + CODE_SIZE.X;
    sz.y =
      left?.y ||
      (top ? top!.y + Math.max(topRight?.totalH || 0, top.h) : 0) + CODE_SIZE.Y;
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
  private updateGroupNode = (g: GroupNode) => {
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

    const xGroup = x - 10;
    const yGroup = yFirst - 28; // -10-16-2
    const wGroup = w + 20;
    const hGroup = yLast - yFirst + (hLast || CODE_SIZE.H) + 38; // 10 + 10 + 16 + 4
    if (wGroup !== g.width || hGroup !== g.height)
      g.style = { width: wGroup, height: hGroup };
    if (xGroup !== g.position.x || yGroup !== g.position.y) {
      g.position = { x: xGroup, y: yGroup };
    }

    chain.forEach((id) => {
      const sz = this.layoutMap.get(id);
      if (!sz) return;
      sz.x = 10;
      sz.y -= yGroup;
    });
  };
  public layout() {
    const roots = this.getRoots();
    if (roots.length !== 1) {
      console.log("stop layout: multiple tree root");
      return;
    }
    Object.values(this.nodeMap).forEach((n) => {
      this.layoutMap.set(n.id, {
        x: UNSET_NUMBER,
        y: UNSET_NUMBER,
        w: n.width || CODE_SIZE.W,
        h: n.height || CODE_SIZE.H,
        totalH: UNSET_NUMBER,
        totalW: UNSET_NUMBER,
      });
    });
    const root = roots[0];
    this.visit(root, this.calcTotalSize, VisitOrder.PostOrder);
    this.visit(root, this.calcPosition, VisitOrder.PreOrder);
    Object.values(this.nodeMap).forEach((n) => {
      if (isGroupNode(n)) {
        this.updateGroupNode(n);
      }
    });

    Object.values(this.nodeMap).forEach((n) => {
      if (isCodeNode(n)) {
        const l = this.layoutMap.get(n.id)!;
        if (l.x !== n.position.x || l.y !== n.position.y) {
          n.position = { x: l.x, y: l.y };
        }
        if (l.w !== n.width) n.width = l.w;
        if (l.h !== n.height) n.height = l.h;
      }
    });
  }
}

export function isCodeNode(n: Node | undefined): n is CodeNode {
  return n?.data.type === "Code";
}

export function isGroupNode(n: Node | undefined): n is GroupNode {
  return n?.data.type === "Scrolly";
}

export function layout(nodeMap: Record<string, Node>, edges: Edge[]) {
  return new TreeLayout(nodeMap, edges).layout();
}
