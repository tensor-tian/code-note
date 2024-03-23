import * as vscode from "vscode";

import { DecorationKind, lastCharOfLine } from "./highlight";

import { posix } from "path";

export type Note = {
  file: string;
  project: string;
  code: string;
  focus: string;
  lineNums: string;
  links: string[];
  marks: string[];
};
export function toMDx(ranges: vscode.Range[][]): Note | undefined {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage("Active highlighted editor not found!");
    return;
  }
  if (ranges[DecorationKind.Code].length === 0) {
    return;
  }

  const doc = editor.document;
  let file = doc.uri.fsPath;
  const project = vscode.workspace.workspaceFolders?.find((wsFolder) => {
    const relative = posix.relative(wsFolder.uri.fsPath, file);
    return (
      relative && !relative.startsWith("..") && !posix.isAbsolute(relative)
    );
  })?.uri.fsPath;
  if (!project) {
    return;
  }
  file = posix.relative(project, file);

  const ext = posix.extname(file).substring(1);
  const filename = posix.basename(file);

  const code = codeStr(
    doc,
    ext,
    ranges[DecorationKind.Code],
    ranges[DecorationKind.Mark]
  );

  const links = ranges[DecorationKind.Link].map(
    (range) =>
      `[\`${doc.getText(range)}\`](focus://${filename}#${rangeToStr(
        doc,
        range
      )})`
  );

  const lineNums = ranges[DecorationKind.Code]
    .map((range) =>
      range.start.line === range.end.line
        ? String(range.start.line + 1)
        : `${range.start.line + 1}:${range.end.line + 1}`
    )
    .join(",");

  const focus = ranges[DecorationKind.Focus]
    .map((range) => rangeToStr(doc, range))
    .join(",");

  const marks = ranges[DecorationKind.Mark].map(
    (range) => "`" + doc.getText(range) + "`"
  );

  return { project, file, code, focus, lineNums, links, marks };
}

function codeStr(
  doc: vscode.TextDocument,
  ext: string,
  codeRanges: vscode.Range[],
  markRanges: vscode.Range[]
) {
  const codeStartPos = codeRanges[0].start;
  const codeEndPos = codeRanges[codeRanges.length - 1].end;
  const origCodeLines = doc
    .getText(new vscode.Range(codeStartPos, codeEndPos))
    .split("\n");
  const codeLines = new Array<string>();
  const startLine = codeRanges[0].start.line;
  let i = 0;
  for (const range of codeRanges) {
    for (let j = range.start.line; j <= range.end.line; j++) {
      // only support one line mark
      if (markRanges[i] && markRanges[i].start.line === j) {
        codeLines.push(
          inlineComment(
            ext,
            `mark[${range.start.character + 1}:${range.end.character}]`
          )
        );
        i++;
      }
      codeLines.push(origCodeLines[j - startLine]);
    }
  }
  return codeLines.join("\n");
}

function rangeToStr(doc: vscode.TextDocument, range: vscode.Range): string {
  const { start, end } = range;
  if (start.line === end.line) {
    return `${start.line + 1}[${start.character + 1}:${end.character}])`;
  }
  const firstLine = new vscode.Range(
    start,
    new vscode.Position(start.line, lastCharOfLine(doc, start.line))
  );
  const lastLine = new vscode.Range(new vscode.Position(end.line, 0), end);
  const parts: string[] = [];
  parts.push(
    `${firstLine.start.line + 1}[${firstLine.start.character + 1}:${
      firstLine.end.character
    }]`
  );
  if (firstLine.end.isBefore(lastLine.start)) {
    const midStart = start.line + 1;
    const midEnd = end.line - 1;
    if (midStart === midEnd) {
      parts.push(String(midStart + 1));
    } else if (midStart < midEnd) {
      parts.push(`${midStart + 1}:${midEnd + 1}`);
    }
  }
  parts.push(
    `${lastLine.start.line + 1}[${lastLine.start.character + 1}:${
      lastLine.end.character
    }]`
  );
  return parts.join(",");
}

function inlineComment(ext: string, text: string): string {
  switch (ext) {
    case "py":
    case "sh":
      return "# " + text;
    case "html":
      return "<!-- " + text + "-->";
    case "jsx":
    case "tsx":
      return "{/* " + text + " */}";
    default:
      return "// " + text;
  }
}
