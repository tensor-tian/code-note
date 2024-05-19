import * as vscode from "vscode";

import { DecorationKind, lastCharOfLine } from "./highlight";

import { getProjectRoot } from "./utils";
import { posix } from "path";

export type CodeBlock = {
  file: string;
  project: string;
  code: string;
  rows: number;
  focus: string;
  lineNums: string;
  links: string[];
  marks: string[];
  lang: string;
};

export function toMDx(ranges: vscode.Range[][]): CodeBlock | undefined {
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
  const project = getProjectRoot();
  if (!project) {
    return;
  }
  file = posix.relative(project, file);

  const ext = posix.extname(file).substring(1);
  const filename = posix.basename(file);

  const { code, rows } = codeStr(
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

  return {
    project,
    file,
    code,
    rows,
    focus,
    lineNums,
    links,
    marks,
    lang: ext,
  };
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
  let iMark = 0;
  let rows = 0;
  for (const range of codeRanges) {
    rows += range.end.line - range.start.line + 1;
    for (let i = range.start.line; i <= range.end.line; i++) {
      // only support one line mark
      const mRange = markRanges[iMark];
      if (mRange && mRange.start.line === i) {
        codeLines.push(
          inlineComment(
            ext,
            `mark[${mRange.start.character + 1}:${mRange.end.character}]`
          )
        );
        iMark++;
      }
      codeLines.push(origCodeLines[i - startLine]);
    }
  }
  return { code: codeLines.join("\n"), rows };
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
