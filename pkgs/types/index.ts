import type { Edge as RFEdge, Node as RFNode, XYPosition } from "reactflow";
export type {
  Edge as RFEdge,
  Node as RFNode,
  XYPosition,
  NodeDimensionChange,
  NodePositionChange,
} from "reactflow";

export type VscodeRange = {
  start: { line: number; character: number };
  end: { line: number; character: number };
};

export type Edge = RFEdge<EdgeData>;
export type Node = RFNode<Block>;
export type CodeNode = RFNode<CodeBlock>;
export type GroupNode = RFNode<ScrollyCodeBlock>;
export type TextNode = RFNode<TextBlock>;
export type TemplateNode = RFNode<TemplateBlock>;

export type Lang = "zh" | "en";

export interface Package {
  name: string; // 包名
  workDir: string; // 本地代码位置
  git: string; // github http path
  configFile: string; // 包声明文件
  desc: string; // 包描述
}
export type BlockType = Block["type"];

export type Block = CodeBlock | ScrollyCodeBlock | TextBlock | TemplateBlock;

export interface BaseBlock {
  id: string;
  text: string;
  shared?: boolean;
  copyOf?: string;
}

export type Pos = { line: number; character: number };

export interface CodeBlock extends BaseBlock {
  type: "Code";
  code: string; // code block string
  rowCount: number;
  filePath: string; // source code file path relative to pkgPath
  pkgPath: string; // package root path of source code
  pkgName: string; // package name defined in module config file
  ranges: string; // highlight ranges in source code, [[[[startLine, startCharacter], [endLine, endCharacter]]], [], [], []]
}

export interface ScrollyCodeBlock extends BaseBlock {
  type: "Scrolly";
  chain: string[];
  // renderAsGroup: boolean; // render as "group" mode: Scrollycoding block, or "codes" mode: group container + code blocks
  groupModeWidth: number; // node width on "group" mode
  textHeight?: number; // text height on "codes" mode
}

export interface TextBlock extends BaseBlock {
  type: "Text";
}
export interface TemplateBlock extends BaseBlock {
  type: "Template";
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
  // `renderAsGroupNodes` and `groupStepIndexes` affect edges
  renderAsGroupNodes: string[];
  groupStepIndexMap: Record<string, number>;
}

export type TextNodeType = Note["type"] | Block["type"];

namespace Ext2Web {
  export type AddCodeData = CodeBlock;
  export type AddCode = {
    action: "ext2web-add-detail" | "ext2web-add-next";
    data: AddCodeData;
  };
  export type InitTreeNote = {
    action: "ext2web-init-tree-note";
    data: Note;
  };
  export type TextChange = {
    action: "ext2web-text-change";
    data: {
      id: string;
      type: TextNodeType;
      text: string;
    };
  };
  export type TextEditReady = {
    action: "ext2web-text-edit-ready";
    data: { id: string; type: TextNodeType };
  };
  export type TextEditDone = {
    action: "ext2web-text-edit-done";
    data: { id: string; type: TextNodeType };
  };
  export type CodeRangeEditReady = {
    action: "ext2web-code-range-edit-ready";
    data: { id: string };
  };
  export type CodeRangeChange = {
    action: "ext2web-code-range-change";
    data: Pick<CodeBlock, "id" | "ranges" | "code" | "rowCount">;
  };
  export type CodeRangeEditDone = {
    action: "ext2web-code-range-edit-done";
    data: { id: string };
  };
  export type ResponseForIDs = {
    action: "ext2web-response-for-ids";
    data: {
      ids: string[];
      key: number;
    };
  };
  export type Message =
    | AddCode
    | InitTreeNote
    | TextChange
    | TextEditReady
    | TextEditDone
    | CodeRangeEditReady
    | CodeRangeChange
    | CodeRangeEditDone
    | ResponseForIDs;
}

namespace Web2Ext {
  export type SaveNote = {
    action: "web2ext-save-note";
    data: string;
  };
  export type ShowMsg = {
    action: "web2ext-show-info" | "web2ext-show-warn" | "web2ext-show-error";
    data: string;
  };

  export type AskInitTreeNote = {
    action: "web2ext-ask-init-tree-note";
    data: "";
  };

  export type TextEditStart = {
    action: "web2ext-text-edit-start";
    data: {
      id: string;
      type: Note["type"] | Block["type"];
      text: string;
    };
  };
  export type TextEditStop = {
    action: "web2ext-text-edit-stop";
    data: {
      id: string;
      type: Note["type"] | Block["type"];
    };
  };
  export type CodeRangeEditStart = {
    action: "web2ext-code-range-edit-start";
    data: Pick<CodeBlock, "id" | "type" | "filePath" | "pkgPath" | "ranges">;
  };
  export type CodeRangeEditStop = {
    action: "web2ext-code-range-edit-stop";
    data: { id: string };
  };

  export type RequestForIDs = {
    action: "web2ext-request-for-ids";
    data: {
      n: number;
      key: number;
    };
  };

  export type Message =
    | SaveNote
    | ShowMsg
    | AskInitTreeNote
    | TextEditStart
    | TextEditStop
    | CodeRangeEditStart
    | CodeRangeEditStop
    | RequestForIDs;
}

export type { Ext2Web, Web2Ext };
