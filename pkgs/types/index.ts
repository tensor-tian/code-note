import type { Edge, XYPosition } from "reactflow";

export interface Package {
  name: string; // 包名
  workDir: string; // 本地代码位置
  git: string; // github http path
  configFile: string; // 包声明文件
  desc: string; // 包描述
}
type BlockType = "Code" | "Scrolly" | "Tree" | "Section";

export type Block = CodeBlock | ScrollyCodeBlock | TreeBlock;

export interface BaseBlock {
  id: string;
  text: string;
  type: BlockType;
  parentId?: string;
}

export interface CodeBlock extends BaseBlock {
  type: "Code";
  code: string;
  file: string;
  focus: string;
  lineNums: string;
  lang: string;
  project: string;
}

export interface ScrollyCodeBlock extends BaseBlock {
  type: "Scrolly";
  chain: string[];
}

export interface TreeBlock extends BaseBlock {
  type: "Tree";
}

export interface LayoutNode {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  totalH: number;
  totalW: number;
  left?: string;
  right?: string;
  top?: string;
  bottom?: string;
}

export interface Note<T extends Block> {
  type: "CodeNote";
  text: string;
  pkgName: string;
  blockMap: Record<string, T>;
  edges: Edge<T>[];
  activeBlockId: string | null;
}

export type MessageDataAddBlock = {
  action: "add-detail" | "add-next";
  data: Omit<CodeBlock, "id">;
};

export type MessageDataE2W = MessageDataAddBlock;

export type MessageDataW2E =
  | {
      action: "add-detail-done" | "add-next-done";
    }
  | {
      action: "add-detail-fail" | "add-next-fail";
      message: string;
    }
  | {
      action: "save-note";
      data: Note<CodeBlock>;
    };
