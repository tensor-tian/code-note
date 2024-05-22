import * as vscode from "vscode";

import { DecorationKind, lastCharOfLine } from "./highlight";

import type { CodeBlock } from "types";
import { Store } from "./store";
import { posix } from "path";

export type PartialBlock = Omit<CodeBlock, "showCode" | "text"> & {
  links: string[];
  marks: string[];
};

export async function createPartialBlock({
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
  const filePath = posix.relative(pkgPath, file);
  const ext = posix.extname(file).substring(1);
  const filename = posix.basename(file);

  const { code, count: rowCount } = codeStr({ doc, ext, ranges, filename });

  const links = ranges[DecorationKind.Link].map(
    (range) =>
      `[\`${doc.getText(range)}\`](focus://${filename}#${rangeToStr(
        doc,
        range
      )})`
  );

  const marks = ranges[DecorationKind.Mark].map(
    (range) => "`" + doc.getText(range) + "`"
  );

  return {
    id: store.getBlockId(),
    type: "Code",
    code,
    rowCount,
    filePath,
    pkgPath,
    pkgName,
    ranges,
    links,
    marks,
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
  const [codeRanges, focusRanges, markRanges, linkRanges] = ranges;
  const codeStartPos = codeRanges[0].start;
  const codeEndPos = codeRanges[codeRanges.length - 1].end;
  const origCodeLines = doc
    .getText(new vscode.Range(codeStartPos, codeEndPos))
    .split("\n");
  const codeLines = new Array<string>();
  const startLine = codeRanges[0].start.line;
  let iMark = 0;
  let count = 0;
  for (const range of codeRanges) {
    count += range.end.line - range.start.line + 1;
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
  const lineNums = codeRanges
    .map((range) =>
      range.start.line === range.end.line
        ? String(range.start.line + 1)
        : `${range.start.line + 1}:${range.end.line + 1}`
    )
    .join(",");

  const focus = focusRanges.map((range) => rangeToStr(doc, range)).join(",");
  return {
    code: `\`\`\`${ext} ${filename} lineNums=${lineNums} focus=${focus} 
${codeLines.join("\n")}
\`\`\``,
    count,
  };
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
