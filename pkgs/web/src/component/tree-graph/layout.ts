import type { CodeNode, Edge, GroupNode, Node, TemplateNode, TextNode } from "types";
import Debug from "debug";

const log = Debug("vscode-note:layout");

const GroupPadding = {
  X: 10,
  Y: 28,
};

export const VIEWPORT = {
  x: 0,
  y: 0,
  zoom: 1.0,
};

export const DefaultNodeDimension = {
  X: 50,
  Y: 46,
  W: 600,
  H: 58,
  WGroup: 800,
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
  // /** width of sub tree */
  // treeW: number; //
};

class TreeLayout {
  edgeMap = new Map<string, Edge>();
  _layoutMap = new Map<string, NodeLayout>();

  constructor(private nodeMap: Record<string, Node>, edges: Edge[], private renderAsGroupNodes: Set<string>) {
    edges.forEach((e) => {
      this.edgeMap.set(e.sourceHandle!, e).set(e.targetHandle!, e);
    });
  }
  private layoutNode(id: string): NodeLayout {
    return this._layoutMap.get(id)!;
  }

  private right = (n: Node | undefined) => {
    if (!n) return;
    const edge = this.edgeMap.get(n.id + "-right");
    if (!edge) return;
    return this.nodeMap[edge.target] as Node;
  };
  private bottom = (n: Node | undefined) => {
    if (!n) return;
    const edge = this.edgeMap.get(n.id + "-bottom");
    if (!edge) return;
    return this.nodeMap[edge.target] as Node;
  };
  private left = (n: Node | undefined) => {
    if (!n) return;
    const edge = this.edgeMap.get(n.id + "-left");
    if (!edge?.targetHandle?.endsWith("left")) return;
    return this.nodeMap[edge.source] as Node;
  };
  private top = (n: Node | undefined) => {
    if (!n) return;
    const edge = this.edgeMap.get(n.id + "-top");
    if (!edge) return;
    return this.nodeMap[edge.source] as Node;
  };

  private topRight = (n: Node): Node | undefined => {
    if (!n) return;
    const topEdge = this.edgeMap.get(n.id + "-top");
    if (!topEdge) return;
    const rightEdge = this.edgeMap.get(topEdge.source + "-right");
    if (!rightEdge) return;
    return this.nodeMap[rightEdge.target] as Node;
  };

  private parent = (n: Node): GroupNode | undefined => {
    if (!n) return;
    if (!n.parentId) return;
    return this.nodeMap[n.parentId] as GroupNode;
  };

  private sizeOf = (n: Node, relation: (x: Node) => Node | undefined): NodeLayout | undefined => {
    const x = relation(n);
    if (!x) return;
    return this.layoutNode(x.id);
  };

  private visit(node: Node | undefined, visitor: (n: Node) => void, order: VisitOrder) {
    if (!node) return;
    const children = [this.right(node), this.bottom(node)];
    if (isGroupNode(node)) {
      const { chain } = node.data;
      const renderAsGroup = this.renderAsGroupNodes.has(node.id);
      if (!renderAsGroup) {
        children.push(this.nodeMap[chain[0]]);
      }
    }

    if (order === VisitOrder.PreOrder) {
      visitor(node);
    }
    for (const child of children) {
      this.visit(child, visitor, order);
    }
    if (order === VisitOrder.PostOrder) {
      visitor(node);
    }
  }

  private getRoot(n: Node | undefined, visited: Set<string>): Node | undefined {
    if (!n) return;
    if (visited.has(n.id)) return;
    if (isTemplateNote(n)) return;

    visited.add(n.id);
    const left = this.left(n);
    const top = this.top(n);
    const parent = this.parent(n);
    if (!left && !top && !parent) {
      return n; // root is found
    }
    return this.getRoot(left, visited) || this.getRoot(top, visited) || this.getRoot(parent, visited);
  }

  private getRoots() {
    const visited = new Set<string>();
    const roots = new Array<Node>();
    for (const n of Object.values(this.nodeMap)) {
      const root = this.getRoot(n, visited);
      if (root) roots.push(root);
    }
    return roots;
  }

  /** convert the pos of group children from absolute to relative */
  private toRelativePos = (node: Node) => {
    const parent = this.parent(node);
    if (!parent) return;
    const psz = this.layoutNode(parent.id);
    const sz = this.layoutNode(node.id);
    sz.x -= psz.x;
    sz.y -= psz.y;
  };

  /** calc size of sub tree */
  private calcTreeSize = (n: Node) => {
    if (n.id === "6m") {
      console.log("6m", n);
    }
    const sz = this.layoutNode(n.id);
    const renderAsGroup = this.renderAsGroupNodes.has(n.id);
    if (isGroupNode(n) && !renderAsGroup) {
      const { chain, textHeight } = n.data;
      sz.h = GroupPadding.Y + (textHeight || 0);
      sz.w = 0;
      sz.treeH = sz.h;
      for (let i = 0; i < chain.length; i++) {
        const csz = this.layoutNode(chain[i]);
        if (i === 0) {
          sz.h += csz.treeH;
          sz.treeH += csz.treeH;
        } else if (i === chain.length - 1) {
          sz.h += csz.h - csz.treeH;
        }
        sz.w = Math.max(csz.w + 2 * GroupPadding.X, sz.w);
      }
      sz.h += GroupPadding.Y;
      sz.wCol = sz.w;
    } else {
      const rsz = this.sizeOf(n, this.right);
      sz.treeH = sz.h;
      if (rsz) {
        sz.treeH = Math.max(sz.treeH, rsz.treeH);
      }
    }
    const bsz = this.sizeOf(n, this.bottom);
    if (bsz) {
      sz.treeH += bsz.treeH + DefaultNodeDimension.Y;
    }
    if (bsz) {
      sz.wCol = Math.max(sz.wCol, bsz.wCol);
    }
  };

  /** calc pos of node */
  private calcPosition = (n: Node) => {
    const sz = this.layoutNode(n.id);

    if (n.parentId) {
      // children of group node
      const psz = this.layoutNode(n.parentId);

      sz.x = psz.x + GroupPadding.X;
      const top = this.sizeOf(n, this.top);
      const topRight = this.sizeOf(n, this.topRight);
      // sz.y = psz.y;
      if (top && top.wCol > sz.wCol) {
        sz.wCol = top.wCol;
      }
      if (top) {
        sz.y = top.y + Math.max(topRight?.treeH || 0, top.h) + DefaultNodeDimension.Y;
      } else {
        const parent = this.nodeMap[n.parentId];
        const textHeight = (isGroupNode(parent) && parent.data.textHeight) || 0;
        sz.y = psz.y + GroupPadding.Y + textHeight;
      }
      return;
    }

    const top = this.sizeOf(n, this.top);
    const left = this.sizeOf(n, this.left);
    const topRight = this.sizeOf(n, this.topRight);
    if (top) {
      sz.wCol = Math.max(sz.wCol, top.wCol);
    }
    if (typeof top?.x === "number") {
      sz.x = top.x;
      const topNode = this.top(n);
      if (isGroupNode(topNode)) {
        sz.x += 10;
      }
    } else {
      sz.x = 0;
      if (left) {
        sz.x = left.x + left.wCol + DefaultNodeDimension.X;
      }
    }
    if (left) {
      sz.y = left.y;
    } else {
      if (top) {
        let h = top.h;
        if (topRight) {
          h = Math.max(h, topRight.treeH);
        }
        sz.y = top.y + h + DefaultNodeDimension.Y;
      } else {
        sz.y = 50 + DefaultNodeDimension.Y;
      }
    }
    // group node
    if (isGroupNode(n)) {
      sz.x -= GroupPadding.X;
      sz.y -= GroupPadding.Y;
    }
  };

  public layout(): { nodeMap: Record<string, Node>; rootIds: string[] } {
    console.log("layout", this.nodeMap, this.edgeMap);
    const roots = this.getRoots();
    const rootIds = roots.map((n) => n.id);
    if (roots.length !== 1) {
      console.log("skip layout: multiple tree root", rootIds);
      return {
        rootIds,
        nodeMap: this.nodeMap,
      };
    }
    const nodes = Object.values(this.nodeMap);
    const groups: GroupNode[] = [];
    const codes: Node[] = [];

    for (const n of nodes) {
      let w = n.width || DefaultNodeDimension.W;
      if (isGroupNode(n) && n.style?.width) w = +n.style.width;
      let h = n.height || DefaultNodeDimension.H;
      if (isCodeNode(n) || isTextNode(n)) {
        codes.push(n);
      }
      if (isGroupNode(n)) {
        if (n.style?.width) w = +n.style.width;
        if (n.style?.height) h = +n.style.height;
        groups.push(n);
      }
      this._layoutMap.set(n.id, {
        ...n.position,
        w,
        h,
        wCol: w,
        treeH: 0,
      });
    }

    const root = roots[0];
    this.visit(root, this.calcTreeSize, VisitOrder.PostOrder);
    this.visit(root, this.calcPosition, VisitOrder.PreOrder);
    this.visit(root, this.toRelativePos, VisitOrder.PreOrder);

    // update group if changed
    const groupMap = groups.reduce((acc, n) => {
      const sz = this.layoutNode(n.id)!;
      if (sz.x !== n.position.x || sz.y !== n.position.y || sz.w !== n.style?.width || sz.h !== n.style.height) {
        const renderAsGroup = this.renderAsGroupNodes.has(n.id);
        const style = renderAsGroup ? { width: sz.w } : { width: sz.w, height: sz.h };
        acc[n.id] = {
          ...n,
          position: { x: sz.x, y: sz.y },
          style,
          ...style,
          // width: sz.w,
          // height: sz.h,
        };
      }
      return acc;
    }, {} as Record<string, GroupNode>);

    // update code if changed
    const codeMap = codes.reduce((acc, n) => {
      const sz = this.layoutNode(n.id)!;
      if (sz.x !== n.position.x || sz.y !== n.position.y || sz.w !== n.width || sz.h !== n.height) {
        acc[n.id] = {
          ...n,
          position: { x: sz.x, y: sz.y },
          width: sz.w,
          height: sz.h,
        };
      }
      return acc;
    }, {} as Record<string, Node>);

    const changed = Object.keys(groupMap).length + Object.keys(codeMap).length === 0;
    if (changed) {
      return { nodeMap: this.nodeMap, rootIds };
    }
    return { nodeMap: { ...this.nodeMap, ...groupMap, ...codeMap }, rootIds };
  }

  public getHidden(keepList: Set<string>) {
    const allNodes = new Set(Object.keys(this.nodeMap));
    const allEdges = new Set([...this.edgeMap.values()].map((e) => e.id));
    const nodes = new Set<string>(keepList);
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
    exclude(allNodes, nodes);
    exclude(allEdges, edges);
    return {
      nodes: allNodes,
      edges: allEdges,
    };
  }
}

export function isCodeNode(n: Node | undefined): n is CodeNode {
  return n?.data.type === "Code";
}

export function isTextNode(n: Node | undefined): n is TextNode {
  return n?.data.type === "Text";
}

export function isTemplateNote(n: Node | undefined): n is TemplateNode {
  return n?.data.type === "Template";
}

export function isGroupNode(n: Node | undefined): n is GroupNode {
  return n?.data.type === "Scrolly";
}

export function getHidden(
  nodeMap: Record<string, Node>,
  edges: Edge[],
  keepList: Set<string>,
  renderAsGroupNodes: string[]
) {
  log("getHidden:", nodeMap, edges, keepList, renderAsGroupNodes);
  return new TreeLayout(nodeMap, edges, new Set(renderAsGroupNodes)).getHidden(keepList);
}

export function layout(nodeMap: Record<string, Node>, edges: Edge[], renderAsGroupNodes: string[]) {
  return new TreeLayout(nodeMap, edges, new Set(renderAsGroupNodes)).layout();
}

export function hasCycle(edges: Edge[], nodeMap: Record<string, Node>): boolean {
  const map = new Map<string, Edge>();
  edges.forEach((e) => {
    if (e.sourceHandle) map.set(e.sourceHandle!, e);
    if (e.targetHandle) map.set(e.targetHandle!, e);
  });

  const dfs = (id: string | undefined, pathTo: Map<string, string>, paths: string[]): boolean => {
    if (!id) return false;
    const prev = paths[paths.length - 2];
    const last = paths[paths.length - 1];
    if (prev === id) {
      return false;
    }
    paths.push(id);
    if (pathTo.has(id)) {
      const cycle = [];
      for (let cur: string | undefined = id; cur; cur = pathTo.get(cur)) {
        cycle.push(cur);
      }
      console.log("has cycle:", paths);
      cycle.push(...paths);
      console.log("has cycle:", cycle);
      return true;
    }
    if (last) {
      pathTo.set(id, last);
    }
    const left = map.get(id + "-left");
    if (dfs(left?.source, pathTo, paths)) return true;
    const top = map.get(id + "-top");
    if (dfs(top?.source, pathTo, paths)) return true;
    const node = nodeMap[id];
    if (!top && !left && node?.parentId) {
      if (dfs(node.parentId, pathTo, paths)) return true;
    }
    const right = map.get(id + "-right");
    if (dfs(right?.target, pathTo, paths)) return true;
    const bottom = map.get(id + "-bottom");
    if (dfs(bottom?.target, pathTo, paths)) return true;
    if (isGroupNode(node)) {
      if (dfs(node.data.chain[0], pathTo, paths)) return true;
    }
    paths.pop();
    return false;
  };

  const pathTo = new Map<string, string>();
  for (const edge of edges) {
    if (pathTo.has(edge.source)) continue;
    if (dfs(edge.source, pathTo, [])) return true;
  }
  return false;
}

function exclude(A: Set<string>, B: Set<string>) {
  for (const e of A) {
    if (B.has(e)) {
      A.delete(e);
    }
  }
}
