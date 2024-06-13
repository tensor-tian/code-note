import * as vscode from "vscode";

import { DecorationKind, lastCharOfLine } from "./highlight";

import type { CodeBlock } from "types";
import { Store } from "./store";
import path from "path";

export type PartialBlock = Omit<CodeBlock, "showCode" | "text"> & {
  links: string[];
  marks: string[];
};

export async function getPartialBlock({
  store,
  pkgName,
  pkgPath,
  ranges,
}: {
  store: Store;
  pkgName: string;
  pkgPath: string;
  ranges: vscode.Range[][];
}): Promise<PartialBlock | void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage("Active highlighted editor not found!");
    return;
  }
  if (ranges[DecorationKind.Code].length === 0) return;
  const doc = editor.document;
  const file = doc.uri.path;
  const filePath = path.relative(pkgPath, file);
  const ext = path.extname(file).substring(1);
  const filename = path.basename(file);

  const { code, count: rowCount } = codeStr({ doc, ext, ranges, filename });

  const links = ranges[DecorationKind.Link].map(
    (range) =>
      `[_\`${doc.getText(range)}\`_](focus://${filename}#${rangeToStr(
        doc,
        range
      )})`
  );

  const marks = ranges[DecorationKind.Mark].map(
    (range) => "_`" + doc.getText(range) + "`_"
  );

  return {
    id: store.getBlockId(),
    type: "Code",
    code,
    rowCount,
    filePath,
    pkgPath,
    pkgName,
    ranges: JSON.stringify(
      ranges.map((kind) =>
        kind.map(({ start, end }) => [
          [start.line, start.character],
          [end.line, end.character],
        ])
      )
    ),
    links,
    marks,
  };
}

export async function getCodeRangeChange(ranges: vscode.Range[][]) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;
  if (ranges[DecorationKind.Code].length === 0) return;
  const doc = editor.document;
  const file = doc.uri.path;
  const ext = path.extname(file).substring(1);
  const filename = path.basename(file);
  const { code, count: rowCount } = codeStr({ doc, ext, ranges, filename });
  return {
    code,
    rowCount,
    ranges: ranges.map((list) =>
      list.map((range) => ({
        start: { line: range.start.line, character: range.start.character },
        end: { line: range.end.line, character: range.end.character },
      }))
    ),
  };
}

function codeStr({
  doc,
  ext,
  filename,
  ranges,
}: {
  doc: vscode.TextDocument;
  ext: string;
  filename: string;
  ranges: vscode.Range[][];
}) {
  const [codeRanges, focusRanges, markRanges] = ranges;
  const codeStartPos = codeRanges[0].start;
  const codeEndPos = codeRanges[codeRanges.length - 1].end;
  const origCodeLines = doc
    .getText(new vscode.Range(codeStartPos, codeEndPos))
    .split("\n");
  const markLines = new Array<string>();
  const codeLines = new Array<string>();
  const startLine = codeRanges[0].start.line;
  let iMark = 0;
  let lineCount = 0;
  let mRange = markRanges[iMark];
  for (const range of codeRanges) {
    for (let i = range.start.line; i <= range.end.line; i++) {
      lineCount++;
      while (mRange && mRange.start.line === i) {
        markLines.push(
          inlineComment(
            ext,
            `mark(${i - startLine + 1}[${mRange.start.character + 1}:${
              mRange.end.character
            }])`
          )
        );
        iMark++;
        mRange = markRanges[iMark];
      }
      codeLines.push(origCodeLines[i - startLine]);
    }
  }
  const lineNums = codeRanges
    .map((range) =>
      range.start.line === range.end.line
        ? String(range.start.line + 1)
        : `${range.start.line + 1}:${range.end.line + 1}`
    )
    .join(",");

  const focus = focusRanges.map((range) => rangeToStr(doc, range)).join(",");
  const markStr = markLines.length > 0 ? markLines.join("\n") + "\n" : "";
  return {
    code: `\`\`\`${ext} ${filename} lineNums=${lineNums} focus=${focus} 
${markStr + codeLines.join("\n")}
\`\`\``,
    count: lineCount,
  };
}

function rangeToStr(doc: vscode.TextDocument, range: vscode.Range): string {
  const { start, end } = range;
  if (start.line === end.line) {
    return `${start.line + 1}[${start.character + 1}:${end.character}]`;
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
    default:
      return "// " + text;
  }
}
