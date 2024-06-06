import type { CodeNode, Edge, GroupNode, Node } from "types";

export type TreeGraphSettings = {
  X: number;
  Y: number;
  W: number;
  H: number;
};

const GroupPadding = {
  X: 10,
  Y: 28,
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
  /**
   * max width of the same column
   */
  wCol: number;
  /**
   * height of sub tree
   */
  treeH: number;
  /** width of sub tree */
  treeW: number; //
};

class TreeLayout {
  edgeMap = new Map<string, Edge>();
  layoutMap = new Map<string, NodeLayout>();

  constructor(private nodeMap: Record<string, Node>, edges: Edge[], private settings: TreeGraphSettings) {
    edges.forEach((e) => {
      this.edgeMap.set(e.sourceHandle!, e).set(e.targetHandle!, e);
    });
  }

  private right = (n: Node | undefined) => {
    if (!n) return;
    const edge = this.edgeMap.get(n.id + "-right");
    if (!edge) return;
    return this.nodeMap[edge.target] as CodeNode;
  };
  private bottom = (n: Node | undefined) => {
    if (!n) return;
    const edge = this.edgeMap.get(n.id + "-bottom");
    if (!edge) return;
    return this.nodeMap[edge.target] as CodeNode;
  };
  private left = (n: Node | undefined) => {
    if (!n) return;
    const edge = this.edgeMap.get(n.id + "-left");
    if (!edge?.targetHandle?.endsWith("left")) return;
    return this.nodeMap[edge.source] as CodeNode;
  };
  private top = (n: Node | undefined) => {
    if (!n) return;
    const edge = this.edgeMap.get(n.id + "-top");
    if (!edge) return;
    return this.nodeMap[edge.source] as CodeNode;
  };

  private topRight = (n: Node): Node | undefined => {
    if (!n) return;
    const topEdge = this.edgeMap.get(n.id + "-top");
    if (!topEdge) return;
    const rightEdge = this.edgeMap.get(topEdge.source + "-right");
    if (!rightEdge) return;
    return this.nodeMap[rightEdge.target] as CodeNode;
  };

  private sizeOf = (n: Node, relation: (x: Node) => Node | undefined): NodeLayout | undefined => {
    const x = relation(n);
    if (!x) return;
    return this.layoutMap.get(x.id);
  };

  private visit(node: Node | undefined, visitor: (n: Node) => void, order: VisitOrder) {
    if (!node) return;
    if (order === VisitOrder.PreOrder) {
      visitor(node);
      if (isGroupNode(node)) {
        const { chain, renderAsGroup } = node.data;
        if (!renderAsGroup) {
          const firstChild = this.nodeMap[chain[0]];
          this.visit(firstChild, visitor, order);
        }
      }
    }
    this.visit(this.right(node), visitor, order);
    this.visit(this.bottom(node), visitor, order);
    if (order === VisitOrder.PostOrder) {
      if (isGroupNode(node)) {
        const { chain, renderAsGroup } = node.data;
        if (!renderAsGroup) {
          const child = this.nodeMap[chain[0]];
          this.visit(child, visitor, order);
        }
      }
      visitor(node);
    }
  }

  private getRoot(n: Node | undefined, visited: Set<string>): Node | undefined {
    if (!n) return;
    if (n.parentId) return;
    if (visited.has(n.id)) return;

    visited.add(n.id);
    const left = this.left(n);
    const top = this.top(n);
    if (!left && !top) return n;
    return this.getRoot(left, visited) || this.getRoot(top, visited);
  }

  private getRoots() {
    const visited = new Set<string>();
    const roots = new Array<Node>();
    for (const n of Object.values(this.nodeMap)) {
      const root = this.getRoot(n as CodeNode, visited);
      if (root) roots.push(root);
    }
    return roots;
  }

  /** convert the pos of group children from absolute to relative */
  private toRelativePos = (node: Node) => {
    if (node.parentId) {
      const parent = this.nodeMap[node.parentId]! as GroupNode;
      const psz = this.layoutMap.get(parent.id)!;
      const sz = this.layoutMap.get(node.id)!;
      sz.x -= psz.x;
      sz.y -= psz.y;
    }
  };
  /** calc size of sub tree */
  private calcTreeSize = (n: Node) => {
    const sz = this.layoutMap.get(n.id)!;
    if (isGroupNode(n) && !n.data.renderAsGroup) {
      const { chain } = n.data;
      sz.h = GroupPadding.Y;
      for (let i = 0; i < chain.length; i++) {
        const _id = chain[i];
        const csz = this.layoutMap.get(_id)!;
        if (i === 0) {
          sz.h += csz.treeH;
        } else if (i === chain.length - 1) {
          sz.h += csz.h - csz.treeH;
        }
        sz.w = Math.max(csz.w + 2 * GroupPadding.X, sz.w);
      }
      sz.h += GroupPadding.Y;
      sz.wCol = sz.w;
    }
    sz.treeH = sz.h;
    const rsz = this.sizeOf(n, this.right); // TODO, active right node id
    if (rsz && rsz.treeH > sz.treeH) {
      sz.treeH = rsz.treeH;
    }
    const bsz = this.sizeOf(n, this.bottom);
    if (bsz) {
      sz.treeH += bsz.treeH + this.settings.Y;
    }
    if (bsz && bsz.wCol > sz.wCol) {
      sz.wCol = bsz.wCol;
    }

    sz.treeW = sz.wCol;
    if (rsz) {
      sz.treeW += rsz.treeW + this.settings.X;
    }
    if (bsz && bsz.treeW > sz.treeW) {
      sz.treeW = bsz.treeW;
    }
  };

  /** calc pos of node */
  private calcPosition = (n: Node) => {
    const sz = this.layoutMap.get(n.id)!;

    if (n.parentId) {
      // children of group node
      const psz = this.layoutMap.get(n.parentId)!;
      sz.x = psz.x + GroupPadding.X;
      const top = this.sizeOf(n, this.top);
      const topRight = this.sizeOf(n, this.topRight);
      sz.y = psz.y;
      if (top && top.wCol > sz.wCol) {
        sz.wCol = top.wCol;
      }
      if (top) {
        sz.y = top.y + Math.max(topRight?.treeH || 0, top.h) + this.settings.Y;
      } else {
        sz.y = psz.y + GroupPadding.Y;
      }
      return;
    }

    const top = this.sizeOf(n, this.top);
    const left = this.sizeOf(n, this.left);
    const topRight = this.sizeOf(n, this.topRight);
    if (top && top.wCol > sz.wCol) {
      sz.wCol = top.wCol;
    }
    sz.x = top?.x || -1;
    if (sz.x !== -1) {
      const topNode = this.top(n);
      if (isGroupNode(topNode)) {
        sz.x += 10;
      }
    } else {
      sz.x = (left ? left!.x + left!.wCol : 0) + this.settings.X;
    }
    sz.y = left?.y || (top ? top!.y + Math.max(topRight?.treeH || 0, top.h) : 50) + this.settings.Y;
    // group node
    if (isGroupNode(n)) {
      sz.x -= GroupPadding.X;
      sz.y -= GroupPadding.Y;
    }
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
    const groups: GroupNode[] = [];
    const codes: CodeNode[] = [];

    for (const n of nodes) {
      let w = n.width || this.settings.W;
      let h = n.height || this.settings.H;
      if (isCodeNode(n)) {
        codes.push(n);
      }
      if (isGroupNode(n)) {
        if (n.style?.width) w = +n.style.width;
        if (n.style?.height) h = +n.style.height;
        groups.push(n);
      }
      this.layoutMap.set(n.id, {
        ...n.position,
        w,
        h,
        wCol: w,
        treeH: 0,
        treeW: 0,
      });
    }

    const root = roots[0];
    this.visit(root, this.calcTreeSize, VisitOrder.PostOrder);
    this.visit(root, this.calcPosition, VisitOrder.PreOrder);
    this.visit(root, this.toRelativePos, VisitOrder.PreOrder);

    // update group if changed
    const groupMap = groups.reduce((acc, n) => {
      const sz = this.layoutMap.get(n.id)!;
      if (sz.x !== n.position.x || sz.y !== n.position.y || sz.w !== n.style?.width || sz.h !== n.style.height) {
        const style = n.data.renderAsGroup ? { width: sz.w } : { width: sz.w, height: sz.h };
        acc[n.id] = {
          ...n,
          position: { x: sz.x, y: sz.y },
          style,
          // width: sz.w,
          // height: sz.h,
        };
      }
      return acc;
    }, {} as Record<string, GroupNode>);

    // update code if changed
    const codeMap = codes.reduce((acc, n) => {
      const sz = this.layoutMap.get(n.id)!;
      if (sz.x !== n.position.x || sz.y !== n.position.y || sz.w !== n.width || sz.h !== n.height) {
        acc[n.id] = {
          ...n,
          position: { x: sz.x, y: sz.y },
          width: sz.w,
          height: sz.h,
        };
      }
      return acc;
    }, {} as Record<string, CodeNode>);

    const changed = Object.keys(groupMap).length + Object.keys(codeMap).length === 0;
    if (changed) {
      return { nodeMap: this.nodeMap, rootIds };
    }
    return { nodeMap: { ...this.nodeMap, ...groupMap, ...codeMap }, rootIds };
  }

  public getHidden() {
    const allNodes = new Set(Object.keys(this.nodeMap));
    const allEdges = new Set([...this.edgeMap.values()].map((e) => e.id));
    const nodes = new Set<string>();
    const edges = new Set<string>();
    const visitor = (node: Node) => {
      nodes.add(node.id);
      const top = this.edgeMap.get(`${node.id}-top`);
      if (top) {
        edges.add(top.id);
      }
      const left = this.edgeMap.get(`${node.id}-left`);
      if (left) {
        edges.add(left.id);
      }
    };
    const roots = this.getRoots();
    for (const root of roots) {
      this.visit(root, visitor, VisitOrder.PreOrder);
    }
    return {
      nodes: difference(allNodes, nodes),
      edges: difference(allEdges, edges),
    };
  }
}

export function isCodeNode(n: Node | undefined): n is CodeNode {
  return n?.data.type === "Code";
}

export function isGroupNode(n: Node | undefined): n is GroupNode {
  return n?.data.type === "Scrolly";
}

export function getHidden(nodeMap: Record<string, Node>, edges: Edge[]) {
  return new TreeLayout(nodeMap, edges, { X: 0, Y: 0, W: 0, H: 0 }).getHidden();
}

export function layout(nodeMap: Record<string, Node>, edges: Edge[], settings: TreeGraphSettings) {
  return new TreeLayout(nodeMap, edges, settings).layout();
}

export function hasCycle(edges: Edge[]): boolean {
  const map = new Map<string, Edge>();
  edges.forEach((e) => {
    if (e.sourceHandle) map.set(e.sourceHandle!, e);
    if (e.targetHandle) map.set(e.targetHandle!, e);
  });

  const dfs = (id: string, visited: Set<string>, parent: string | undefined): boolean => {
    if (visited.has(id)) {
      return true;
    }
    visited.add(id);
    const left = map.get(id + "-left");
    if (left && left.source !== parent && dfs(left.source, visited, id)) return true;
    const top = map.get(id + "-top");
    if (top && top.source !== parent && dfs(top.source, visited, id)) return true;
    const right = map.get(id + "-right");
    if (right && right.target !== parent && dfs(right.target, visited, id)) return true;
    const bottom = map.get(id + "-bottom");
    if (bottom && bottom.target !== parent && dfs(bottom.target, visited, id)) return true;
    return false;
  };

  const visited = new Set<string>();
  for (const edge of edges) {
    if (visited.has(edge.source)) continue;
    if (dfs(edge.source, visited, undefined)) return true;
  }
  return false;
}

function difference(A: Set<string>, B: Set<string>) {
  const diff = new Set<string>();
  for (const s of A) {
    if (!B.has(s)) {
      diff.add(s);
    }
  }
  return diff;
}
