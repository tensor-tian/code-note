import * as vscode from "vscode";

import { CodeBlock, toMDx } from "./code-hike-mdx";

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
    backgroundColor: "#fef9c34d", // yellow-100
    overviewRulerColor: "#4ade80", // green-400
    overviewRulerLane: vscode.OverviewRulerLane.Right,
  },
  {
    // Focus
    backgroundColor: "#fecaca4d", // red-200
    overviewRulerColor: "#4ade80", // green-400
    overviewRulerLane: vscode.OverviewRulerLane.Right,
  },
  {
    // Mark
    border: "solid",
    borderWidth: "1px",
    borderColor: "#ea580c", // orange 600
    borderRadius: "4px",
    backgroundColor: "#fcd34d4d", // yellow 300
    overviewRulerColor: "#4ade80", // green-400
    overviewRulerLane: vscode.OverviewRulerLane.Right,
  },
  {
    // Link
    backgroundColor: "#86efac4d", // green 300
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

  private _mdx: CodeBlock | undefined;
  public get block(): CodeBlock | undefined {
    return this._mdx;
  }

  private _resetDecorations() {
    const ranges: vscode.Range[][] = new Array(N);
    for (let kind = 0; kind < N; kind++) {
      ranges[kind] = [];
    }
    this._ranges = ranges;
  }

  constructor() {
    this._resetDecorations();
    for (let kind = 0; kind < N; kind++) {
      this._decorators[kind] = vscode.window.createTextEditorDecorationType(
        DecorationStyles[kind]
      );
    }
  }

  public toggleHighlight(kind: DecorationKind) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }
    const ranges = this._ranges;
    if (!ranges) {
      return;
    }
    const idxOfCursor = ranges[kind].findIndex((range) =>
      range.contains(editor.selection.active)
    );
    const selection = currentSelection();
    const idxOfSelection = ranges[kind].findIndex(
      (range) => selection && range.contains(selection)
    );
    if (selection && idxOfSelection >= 0) {
      this._removeHilight(editor, kind, idxOfSelection);
    }
    // add selection which is not a sub range
    if (selection && idxOfSelection === -1) {
      this._addHighlight(editor, kind);
      return;
    }
    if (idxOfCursor !== -1) {
      this._removeHilight(editor, kind, idxOfCursor);
    }
  }

  private _addHighlight(editor: vscode.TextEditor, kind: DecorationKind) {
    const word = editor.document.getText(editor.selection);
    if (!word || word.length === 0) {
      vscode.window.showErrorMessage("Nothing selected");
      return;
    }
    const selection = currentSelection();
    console.log("add highlight:", JSON.stringify(selection));
    if (!selection) {
      vscode.window.showErrorMessage("Empty selected");
      return;
    }
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
    const Code = DecorationKind.Code;
    if (kind === Code) {
      // highlight the whole line for Code kind
      start = startWholeLine;
      end = endWholeLine;
    } else {
      // exetend Code Kind ranges if Code range does not contain the new range
      ranges[Code].push(new vscode.Range(startWholeLine, endWholeLine));
      ranges[Code] = mergeOverlap(ranges[Code]);
    }

    ranges[kind].push(new vscode.Range(start, end));
    ranges[kind] = mergeOverlap(ranges[kind]);
    this._ranges = ranges;
    this._updateHighlights();
  }

  private _removeHilight(
    editor: vscode.TextEditor,
    kind: DecorationKind,
    idx: number
  ) {
    const ranges = this._ranges;
    if (!ranges) {
      return;
    }
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
    this._mdx = toMDx(ranges);
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
  if (end.character === 0) {
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
