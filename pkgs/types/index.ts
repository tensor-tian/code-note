import type { Edge as RFEdge, Node as RFNode, XYPosition } from "reactflow";
export type {
  Edge as RFEdge,
  Node as RFNode,
  XYPosition,
  NodeDimensionChange,
  NodePositionChange,
} from "reactflow";

export type Edge = RFEdge<EdgeData>;
export type Node = RFNode<Block>;
export type CodeNode = RFNode<CodeBlock>;
export type GroupNode = RFNode<ScrollyCodeBlock>;

export interface Package {
  name: string; // 包名
  workDir: string; // 本地代码位置
  git: string; // github http path
  configFile: string; // 包声明文件
  desc: string; // 包描述
}
type BlockType = "Code" | "Scrolly";

export type Block = CodeBlock | ScrollyCodeBlock;

export interface BaseBlock {
  id: string;
  text: string;
  type: BlockType;
}

export interface CodeBlock extends BaseBlock {
  type: "Code";
  code: string;
  file: string;
  focus: string;
  lineNums: string;
  lang: string;
  project: string;
  showCode: boolean;
}

export interface ScrollyCodeBlock extends BaseBlock {
  type: "Scrolly";
  chain: string[];
}

export interface EdgeData {
  id: string;
}

export interface Note {
  type: "CodeNote";
  text: string;
  pkgName: string;
  nodeMap: Record<string, Node>;
  edges: Edge[];
  activeBlockId?: string;
}

namespace Ext2Web {
  export type AddBlockData = Omit<CodeBlock, "id">;
  export type AddBlock = {
    action: "add-detail" | "add-next";
    data: AddBlockData;
  };
  export type Message = AddBlock;
}

namespace Web2Ext {
  export type SaveNote = {
    action: "save-note";
    data: Note;
  };
  export type ShowMsg = {
    action: "show-info" | "show-warn" | "show-error";
    data: string;
  };
  export type Message = SaveNote | ShowMsg;
}

export type { Ext2Web, Web2Ext };
