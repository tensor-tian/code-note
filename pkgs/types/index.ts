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

type Pos = { line: number; character: number };

export interface CodeBlock extends BaseBlock {
  type: "Code";
  code: string; // code block string
  rowCount: number;
  filePath: string; // source code file path relative to pkgPath
  pkgPath: string; // package root path of source code
  pkgName: string; // package name defined in module config file
  ranges: { start: Pos; end: Pos }[][]; // highlight ranges in source code
  showCode: boolean;
  isCodeRangeEditing?: boolean;
}

export interface ScrollyCodeBlock extends BaseBlock {
  type: "Scrolly";
  chain: string[];
}

export interface EdgeData {
  id: string;
}

export interface Note {
  id: string;
  type: "TreeNote";
  text: string;
  pkgPath: string; // package root of workspace which include active editor document file
  pkgName: string; // package name of workspace which include active editor document file
  nodeMap: Record<string, Node>;
  edges: Edge[];
  activeNodeId: string;
}

namespace Ext2Web {
  export type AddCodeData = CodeBlock;
  export type AddCode = {
    action: "add-detail" | "add-next";
    data: AddCodeData;
  };
  export type InitTreeNote = {
    action: "init-tree-note";
    data: Note;
  };
  export type TextChange = {
    action: "text-change";
    data: {
      id: string;
      type: Note["type"] | Block["type"];
      text: string;
    };
  };
  export type CodeRangeChange = {
    action: "code-range-change";
    data: Pick<CodeBlock, "id" | "ranges" | "code" | "rowCount">;
  };
  export type CodeRangeEditStopped = {
    action: "code-range-edit-stopped";
    data: { id: string };
  };
  export type Message =
    | AddCode
    | InitTreeNote
    | TextChange
    | CodeRangeChange
    | CodeRangeEditStopped;
}

namespace Web2Ext {
  export type SaveNote = {
    action: "save-note";
    data: string;
  };
  export type ShowMsg = {
    action: "show-info" | "show-warn" | "show-error";
    data: string;
  };

  export type AskInitTreeNote = {
    action: "ask-init-tree-note";
    data: "";
  };

  export type StartTextEditor = {
    action: "start-text-editor";
    data: {
      id: string;
      type: Note["type"] | Block["type"];
      text: string;
    };
  };
  export type StartCodeRangeEditor = {
    action: "start-code-range-editor";
    data: Pick<CodeBlock, "id" | "type" | "filePath" | "pkgPath" | "ranges">;
  };
  export type StopCodeRangeEditor = {
    action: "stop-code-range-editor";
    data: { id: string };
  };

  export type Message =
    | SaveNote
    | ShowMsg
    | AskInitTreeNote
    | StartTextEditor
    | StartCodeRangeEditor
    | StopCodeRangeEditor;
}

export type { Ext2Web, Web2Ext };
