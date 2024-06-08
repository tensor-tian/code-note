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
export type TextNode = RFNode<TextBlock>;
export type TemplateNode = RFNode<TemplateBlock>;

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
  renderAsGroup: boolean; // render as "group" mode: Scrollycoding block, or "codes" mode: group container + code blocks
  stepIndex: number; // step index of CH.Scrollycoding component
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

export interface NoteV1 {
  id: string;
  type: "TreeNote";
  text: string;
  pkgPath: string; // package root of workspace which include active editor document file
  pkgName: string; // package name of workspace which include active editor document file
  nodeMap: Record<string, Node>;
  edges: Edge[];
  activeNodeId: string;
}

export interface NoteV2 extends NoteV1 {
  version: 2;
}

export type Note = NoteV2;

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
      type: Note["type"] | Block["type"];
      text: string;
    };
  };
  export type CodeRangeChange = {
    action: "ext2web-code-range-change";
    data: Pick<CodeBlock, "id" | "ranges" | "code" | "rowCount">;
  };
  export type CodeRangeEditStopped = {
    action: "ext2web-code-range-edit-stopped";
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
    | CodeRangeChange
    | CodeRangeEditStopped
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

  export type StartTextEditor = {
    action: "web2ext-start-text-editor";
    data: {
      id: string;
      type: Note["type"] | Block["type"];
      text: string;
    };
  };
  export type StartCodeRangeEditor = {
    action: "web2ext-start-code-range-editor";
    data: Pick<CodeBlock, "id" | "type" | "filePath" | "pkgPath" | "ranges">;
  };
  export type StopCodeRangeEditor = {
    action: "web2ext-stop-code-range-editor";
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
    | StartTextEditor
    | StartCodeRangeEditor
    | StopCodeRangeEditor
    | RequestForIDs;
}

export type { Ext2Web, Web2Ext };
