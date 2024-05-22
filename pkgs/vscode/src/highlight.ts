import * as vscode from "vscode";

import type { PartialBlock } from "./code-hike-mdx";
import { Store } from "./store";
import { createPartialBlock } from "./code-hike-mdx";
import { getPackageInfo } from "./utils";

export enum DecorationKind {
  Code = 0,
  Focus,
  Mark,
  Link,
}
// https://tailwindcss.com/docs/customizing-colors
const DecorationStyles: vscode.DecorationRenderOptions[] = [
  {
    // Code
    isWholeLine: true,
    backgroundColor: "#fef9c380", // yellow-100
    overviewRulerColor: "#4ade80", // green-400
    overviewRulerLane: vscode.OverviewRulerLane.Right,
  },
  {
    // Focus
    isWholeLine: true,
    backgroundColor: "#fecaca80", // red-200
    overviewRulerColor: "#4ade80", // green-400
    overviewRulerLane: vscode.OverviewRulerLane.Right,
  },
  {
    // Mark
    border: "solid",
    borderWidth: "1px",
    borderColor: "#ea580c", // orange 600
    borderRadius: "4px",
    backgroundColor: "#fcd34d80", // yellow 300
    overviewRulerColor: "#4ade80", // green-400
    overviewRulerLane: vscode.OverviewRulerLane.Right,
  },
  {
    // Link
    backgroundColor: "#86efac80", // green 300
    overviewRulerColor: "#4ade80", // green-400
    overviewRulerLane: vscode.OverviewRulerLane.Right,
  },
];

const N = Object.values(DecorationKind).length / 2;

export class Highlight {
  private _decorators: vscode.TextEditorDecorationType[] = new Array(N);
  private _rangeMap: Map<string, vscode.Range[][]> = new Map();

  get _ranges(): vscode.Range[][] | undefined {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }
    const file = editor.document.uri.fsPath;
    let ranges = this._rangeMap.get(file);
    if (!ranges) {
      this._resetDecorations();
      ranges = this._rangeMap.get(file);
    }
    return ranges;
  }

  set _ranges(ranges: vscode.Range[][]) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }
    this._rangeMap.set(editor.document.uri.fsPath, ranges);
  }

  public async createBlock(): Promise<PartialBlock | void> {
    if (!this._ranges) return;
    const activeFile = vscode.window.activeTextEditor?.document.uri.path;
    if (!activeFile) return;
    const { rootPath: pkgPath, name: pkgName } = await getPackageInfo(
      activeFile
    );
    if (!pkgName || !pkgPath) return;
    return createPartialBlock({
      pkgName,
      pkgPath,
      store: this.store,
      ranges: this._ranges,
    });
  }

  public constructor(private store: Store) {
    this._resetDecorations();
    for (let kind = 0; kind < N; kind++) {
      this._decorators[kind] = vscode.window.createTextEditorDecorationType(
        DecorationStyles[kind]
      );
    }
  }

  public subscribe(context: vscode.ExtensionContext) {
    context.subscriptions.push(
      vscode.workspace.onDidCloseTextDocument((doc) => {
        const file = doc.uri.fsPath;
        const found = vscode.workspace.textDocuments.find(
          (doc) => doc.uri.fsPath === file
        );
        if (!found) {
          this._rangeMap.delete(file);
          console.log("did close doc:", file, [...this._rangeMap.keys()]);
        }
      }),
      vscode.workspace.onDidOpenTextDocument((doc) => {
        this._updateHighlights();
        console.log(
          "did open doc",
          doc.uri.fsPath,
          Array.from(this._rangeMap.keys())
        );
      }),
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        this._updateHighlights();
        console.log([...this._rangeMap.keys()]);
        console.log(
          "change active editor:",
          editor?.document.uri.fsPath,
          Array.from(this._rangeMap.keys())
        );
      })
    );
  }

  private _resetDecorations() {
    const ranges: vscode.Range[][] = new Array(N);
    for (let kind = 0; kind < N; kind++) {
      ranges[kind] = [];
    }
    this._ranges = ranges;
  }

  private _findNextKind(
    rangeOrPos: vscode.Range | vscode.Position
  ): DecorationKind | undefined {
    const ranges = this._ranges;
    if (!ranges) return;

    let kind = 0;
    while (
      kind < 4 &&
      ranges[kind].find((range) => range.contains(rangeOrPos))
    ) {
      kind++;
    }
    if (kind === 4) return;

    return kind;
  }

  public addHighlight() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    let selection = currentSelection();
    // select the whole line where the cursor at if no selection
    if (!selection) {
      const line = editor.selection.active.line;
      selection = new vscode.Range(
        new vscode.Position(line, 0),
        new vscode.Position(line, lastCharOfLine(editor.document, line))
      );
    }

    const kind = this._findNextKind(selection);
    if (typeof kind !== "number") return;

    this._addHighlight(editor, kind, selection);
  }

  public removeHighlight() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const ranges = this._ranges;
    if (!ranges) return;

    let kind = this._findNextKind(editor.selection.active);
    if (typeof kind !== "number" || kind <= 0) return;
    kind--;

    const idx = ranges[kind].findIndex((range) =>
      range.contains(editor.selection.active)
    );

    this._removeHighlight(editor, kind, idx);
  }

  private _addHighlight(
    editor: vscode.TextEditor,
    kind: DecorationKind,
    selection: vscode.Range
  ) {
    const word = editor.document.getText(selection);
    if (!word || word.length === 0) {
      vscode.window.showErrorMessage("Nothing selected");
      return;
    }
    console.log("add highlight:", JSON.stringify(selection));
    let { start, end } = selection;
    if (kind === DecorationKind.Mark && end.line !== start.line) {
      vscode.window.showErrorMessage("'Mark' does not allow cross-line");
      return;
    }
    const startWholeLine = new vscode.Position(start.line, 0);
    const endWholeLine = new vscode.Position(
      end.line,
      editor.document.lineAt(end.line).range.end.character
    );
    const ranges = this._ranges;
    if (!ranges) {
      return;
    }
    const { Code, Focus } = DecorationKind;
    if (kind === Code || kind === Focus) {
      // highlight the whole line for Code or Focus kind
      start = startWholeLine;
      end = endWholeLine;
    }
    if (kind !== Code) {
      // extend Code Kind ranges if Code range does not contain the new range
      ranges[Code].push(new vscode.Range(startWholeLine, endWholeLine));
      ranges[Code] = mergeOverlap(ranges[Code]);
    }

    ranges[kind].push(new vscode.Range(start, end));
    ranges[kind] = mergeOverlap(ranges[kind]);
    this._ranges = ranges;
    this._updateHighlights();
  }

  private _removeHighlight(
    editor: vscode.TextEditor,
    kind: DecorationKind,
    idx: number
  ) {
    const ranges = this._ranges;
    if (!ranges) return;
    const [removed] = ranges[kind].splice(idx, 1);
    const Code = DecorationKind.Code;
    // hold the line where other kinds in
    if (kind === Code) {
      for (let k = 1; k < N; k++) {
        for (const range of ranges[k]) {
          if (range.intersection(removed)) {
            ranges[Code].push(
              new vscode.Range(
                new vscode.Position(range.start.line, 0),
                new vscode.Position(
                  range.end.line,
                  editor.document.lineAt(range.end.line).range.end.character
                )
              )
            );
          }
        }
      }
      ranges[Code] = mergeOverlap(ranges[Code]);
    }
    this._ranges = ranges;
    this._updateHighlights();
  }

  public removeAll() {
    this._resetDecorations();
    this._updateHighlights();
  }

  private _updateHighlights() {
    const editor = vscode.window.activeTextEditor;
    const ranges = this._ranges;
    if (!editor || !ranges) {
      return;
    }
    for (let kind = 0; kind < N; kind++) {
      editor.setDecorations(
        this._decorators[kind],
        ranges[kind].map((range, i) => ({
          range,
          hoverMessage: DecorationKind[kind] + "-" + i,
        }))
      );
    }
  }
}

function mergeOverlap(ranges: vscode.Range[]): vscode.Range[] {
  const ret = new Array<vscode.Range>();
  ranges.sort((r1, r2) => r1.start.compareTo(r2.start));
  let last: vscode.Range | null = null;
  for (const cur of ranges) {
    if (last && last.intersection(cur)) {
      ret[ret.length - 1] = last.union(cur);
    } else {
      ret.push(cur);
    }
    last = ret[ret.length - 1];
  }
  return ret;
}

export function lastCharOfLine(doc: vscode.TextDocument, line: number): number {
  return doc.lineAt(line).range.end.character;
}

export function currentSelection(): vscode.Range | undefined {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }
  let { start, end } = editor.selection;
  if (start.isAfter(end)) {
    const tmp = start;
    start = end;
    end = tmp;
  }
  if (start.character === lastCharOfLine(editor.document, start.line)) {
    start = new vscode.Position(start.line + 1, 0);
  }
  if (end.character === 0 && end.line > 0) {
    end = new vscode.Position(
      end.line - 1,
      lastCharOfLine(editor.document, end.line - 1)
    );
  }
  if (start.compareTo(end) >= 0) {
    return;
  }
  return new vscode.Range(start, end);
}
