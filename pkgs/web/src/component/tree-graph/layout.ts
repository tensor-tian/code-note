import type { Block, CodeBlock, ScrollyCodeBlock, TreeBlock } from "types";
import type { Edge, Node } from "reactflow";

import { Layout } from "../../utils";

class LayoutNode {
  id = "";

  x = 0;
  y = 0;
  w = Layout.code.W;
  h = Layout.code.H;

  totalH = 0;
  totalW = 0;

  left?: LayoutNode;
  right?: LayoutNode;
  top?: LayoutNode;
  bottom?: LayoutNode;

  parentId?: string;
  public static map = new Map<string, LayoutNode>();

  public constructor(
    id: string,
    w: number | null | undefined,
    h: number | null | undefined
  ) {
    this.id = id;
    if (w) this.w = w;
    if (h) this.h = h;
  }

  public calcTotalSize() {
    this.right?.calcTotalSize();
    this.bottom?.calcTotalSize();

    this.totalH = this.h;
    if (this.right && this.right.totalH > this.totalH) {
      this.totalH = this.right.totalH;
    }
    if (this.bottom) {
      this.totalH += this.bottom.totalH + Layout.code.Y;
    }

    this.totalW = this.w;
    if (this.right) {
      this.totalW += this.right.totalW + Layout.code.X;
    }
    if (this.bottom && this.bottom.totalW > this.totalW) {
      this.totalW = this.bottom.totalW;
    }
  }
  public calcPosition() {
    const { left, top } = this;
    this.x = top?.x || (left ? left!.x + left!.w : 0) + Layout.code.X;
    this.y =
      left?.y ||
      (top ? top!.y + Math.max(top!.right?.totalH || 0, top.h) : 0) +
        Layout.code.Y;

    this.right?.calcPosition();
    this.bottom?.calcPosition();
  }
}

function visitTree(
  n: LayoutNode | undefined,
  preOrPost: "pre" | "post",
  visitor: (n: LayoutNode) => void
) {
  if (!n) return;
  if (preOrPost === "pre") {
    visitor(n);
  }
  visitTree(n.right, preOrPost, visitor);
  visitTree(n.bottom, preOrPost, visitor);
  if (preOrPost === "post") {
    visitor(n);
  }
}

function calcTotalSize(n: LayoutNode) {
  n.totalH = n.h;
  if (n.right && n.right.totalH > n.totalH) {
    n.totalH = n.right.totalH;
  }
  if (n.bottom) {
    n.totalH += n.bottom.totalH + Layout.code.Y;
  }

  n.totalW = n.w;
  if (n.right) {
    n.totalW += n.right.totalW + Layout.code.X;
  }
  if (n.bottom && n.bottom.totalW > n.totalW) {
    n.totalW = n.bottom.totalW;
  }
}

function calcPosition(n: LayoutNode) {
  const { left, top } = n;
  n.x = top?.x || (left ? left!.x + left!.w : 0) + Layout.code.X;
  n.y =
    left?.y ||
    (top ? top!.y + Math.max(top!.right?.totalH || 0, top.h) : 0) +
      Layout.code.Y;
}

class LayoutGraph {
  private map = new Map<string, LayoutNode>();
  private blockMap: Record<string, Block>;
  private codeBlocks = new Array<CodeBlock>();
  private groupBlocks = new Array<ScrollyCodeBlock>();

  constructor(
    edges: Edge[],
    blockMap: Record<string, Block>,
    getNode: (id: string) => Node<Block> | undefined
  ) {
    this.blockMap = blockMap;
    Object.values(blockMap).forEach((b) => {
      if (b.type === "Code") {
        this.codeBlocks.push(b);
      } else if (b.type === "Scrolly") {
        this.groupBlocks.push(b);
      }
    });

    this.map = this.codeBlocks.reduce((map, block) => {
      const node = getNode(block.id);
      map.set(block.id, new LayoutNode(block.id, node?.width, node?.height));
      return map;
    }, new Map<string, LayoutNode>());
    edges.forEach(({ source: sourceId, target: targetId, sourceHandle }) => {
      const source = this.map.get(sourceId);
      const target = this.map.get(targetId);
      if (!source || !target) return;
      if (sourceHandle?.endsWith("right")) {
        source.right = target;
        target.left = source;
      } else {
        source.bottom = target;
        target.top = source;
      }
    });
  }

  private _getRoot(
    n: LayoutNode | undefined,
    visited: Set<string>
  ): LayoutNode | undefined {
    if (!n) return;
    if (visited.has(n.id)) return;
    visited.add(n.id);
    if (!n.left && !n.top) return n;
    return this._getRoot(n.left, visited) || this._getRoot(n.top, visited);
  }
  private _getRoots() {
    const visited = new Set<string>();
    const roots = new Array<LayoutNode>();
    for (const n of this.map.values()) {
      const root = this._getRoot(n, visited);
      if (root) roots.push(root);
    }
    return roots;
  }
  private _getGroupNode(
    group: ScrollyCodeBlock,
    nMap: Map<string, Node<Block>>
  ): Node<ScrollyCodeBlock> {
    let x = 0;
    let yFirst = -1;
    let yLast = -1;
    let hLast = 0;
    let w = 0;

    const ns = group.chain.map((nID) => this.blockMap[nID] as CodeBlock);
    group.chain.forEach((nID, i) => {
      const n = this.map.get(nID);
      if (!n) return;
      if (i === 0) {
        x = n.x;
        yFirst = n.y;
      }
      if (n.w > w) {
        w = n.w;
      }
      if (i === group.chain.length - 1) {
        yLast = n.y;
        hLast = n.h;
      }
    });

    const xGroup = x - 10;
    const yGroup = yFirst - 28; // -10-16-2

    const node: Node<ScrollyCodeBlock> = {
      id: group.id,
      data: group,
      type: group.type,
      position: { x: xGroup, y: yGroup },
      style: {
        width: w + 20,
        height: yLast - yFirst + (hLast || Layout.code.H) + 38, // 10 + 10 + 16 + 4
      },
      focusable: true,
      deletable: false,
    };
    ns.forEach(({ id }) => {
      // convert position of code node in group to position realative to parent
      const n = nMap.get(id);
      if (!n) return;
      n.position.x = 10;
      n.position.y -= yGroup;
      n.extent = "parent";
    });
    return node;
  }

  public layout() {
    const roots = this._getRoots();
    for (const root of roots) {
      visitTree(root, "post", calcTotalSize);
      visitTree(root, "pre", calcPosition);
    }
    roots.sort((a, b) => a.totalW - b.totalW);
    const nMap = new Map<string, Node<CodeBlock>>();
    for (let i = 0; i < roots.length; i++) {
      visitTree(roots[i], "pre", (n: LayoutNode) => {
        const code = newNode(
          this.map.get(n.id)!,
          this.blockMap[n.id] as CodeBlock
        );
        nMap.set(code.id, code);
      });
    }
    const groups = this.groupBlocks.map((group: ScrollyCodeBlock) =>
      this._getGroupNode(group, nMap)
    );

    const nodes = [...groups, ...nMap.values()];
    console.log("layout output:", nodes);
    return nodes;
  }
}

export function layout(
  edges: Edge[],
  blockMap: Record<string, Block>,
  getNode: (id: string) => Node<Block> | undefined
) {
  return new LayoutGraph(edges, blockMap, getNode).layout();
}

function newNode(n: LayoutNode, b: CodeBlock): Node<CodeBlock> {
  const parentId = b.parentId;
  return {
    id: b.id,
    type: b.type,
    data: b,
    position: { x: n.x, y: n.y },
    // style: {
    width: n.w,
    height: n.h,
    // },
    ...(parentId ? { parentId } : {}),
    focusable: true,
    deletable: false,
    draggable: false,
  };
}

// function newTreeNode(roots: LayoutNode[], index: number): Node<TreeBlock> {
//   const root = roots[index];
//   const x = roots
//     .slice(0, index)
//     .reduce((acc, root) => acc + Layout.code.X * 1.5 + root.totalW, 0);
//   return {
//     id: "tree-" + root.id,
//     type: "Tree",
//     data: {
//       id: "tree-" + root.id,
//       text: "",
//       type: "Tree",
//     },
//     position: { x, y: -Layout.code.Y / 2 + 8 },
//     style: {
//       width: 2 * Layout.code.X + root.totalW,
//       height: 2 * Layout.code.Y + root.totalH,
//     },
//     focusable: true,
//     deletable: false,
//     draggable: true,
//   };
// }
