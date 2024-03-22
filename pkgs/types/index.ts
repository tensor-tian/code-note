import type { Edge, XYPosition } from "reactflow";

export interface Package {
  name: string; // 包名
  workDir: string; // 本地代码位置
  git: string; // github http path
  configFile: string; // 包声明文件
  desc: string; // 包描述
}

interface Range {
  from: number;
  to: number;
}

export interface Block {
  id: string;
  loc: string; // vscode document symbol
  text: string;
  pkgName: string;
  mdx: string;
  file: string;
  fileRanges: Range[];
  type?: string;
}

export interface Graph<T = {}> {
  text: string;
  edges: Edge<T>[];
  nodes: Record<
    string,
    {
      type: string;
      position: XYPosition;
    }
  >;
}

export interface Note<T = {}> {
  title: string;
  pkgName: string;
  _auto_inc_block_id: number;
  _auto_inc_edge_id: number;
  blockMap: Record<string, Block>;
  tree: Graph<T>;
  graphs: Graph<T>[];
}
