import * as vscode from "vscode";

import { Ext2Web, Web2Ext } from "types";
import { getPartialBlock, getCodeRangeChange } from "./code-hike-mdx";

import type { PartialBlock } from "./code-hike-mdx";
import { Store } from "./store";
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
  private _editingMap: Map<string, string> = new Map(); // file uri.path -> code block id
  private _getWebviewPanel?: () => vscode.WebviewPanel | undefined;

  get _ranges(): vscode.Range[][] | undefined {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
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
    return getPartialBlock({
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
        const file = doc.uri.path;
        const found = vscode.workspace.textDocuments.find(
          (doc) => doc.uri.path === file
        );
        if (!found) {
          if (this.isEditing(file)) {
            this._rangeMap.delete(file);
            // stop code range editing if need
            this.stopCodeRangeEdit(file);
          }
          // console.log("did close doc:", file, [...this._rangeMap.keys()]);
        }
      }),
      vscode.workspace.onDidOpenTextDocument((doc) => {
        this._updateHighlights(true);
        // console.log(
        //   "did open doc",
        //   doc.uri.fsPath,
        //   Array.from(this._rangeMap.keys())
        // );
      }),
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        this._updateHighlights(true);
        // console.log([...this._rangeMap.keys()]);
        // console.log(
        //   "change active editor:",
        //   editor?.document.uri.fsPath,
        //   Array.from(this._rangeMap.keys())
        // );
      })
    );
  }

  // editing
  public async startCodeRangeEdit(
    {
      filePath,
      pkgPath,
      ranges: _ranges,
      id,
    }: Web2Ext.StartCodeRangeEditor["data"],
    getWebviewPanel: () => vscode.WebviewPanel | undefined
  ) {
    const uri = vscode.Uri.joinPath(vscode.Uri.file(pkgPath), filePath);
    this._getWebviewPanel = getWebviewPanel;
    const column = getWebviewPanel()?.viewColumn || 1;
    console.log("editor view column:", column);
    const doc = await vscode.workspace.openTextDocument(uri);
    let editor: vscode.TextEditor;
    if (column === 1) {
      await vscode.commands.executeCommand("workbench.action.splitEditorLeft");
      editor = await vscode.window.showTextDocument(doc, {
        viewColumn: vscode.ViewColumn.Active,
        preserveFocus: false,
        preview: false,
      });
      await vscode.commands.executeCommand(
        "workbench.action.closeEditorsToTheLeft"
      );
    } else {
      editor = await vscode.window.showTextDocument(doc, {
        viewColumn: column - 1,
        preserveFocus: false,
        preview: false,
      });
    }
    const firstLine = editor.document.lineAt(0);
    const lastLine = editor.document.lineAt(editor.document.lineCount - 1);
    const { Code, Focus, Mark, Link } = DecorationKind;
    const ranges = _ranges.map((list) =>
      list.map(
        (range) =>
          new vscode.Range(
            new vscode.Position(range.start.line, range.start.character),
            new vscode.Position(range.end.line, range.end.character)
          )
      )
    );
    this._ranges = ranges;
    this._updateHighlights(true);
    this._editingMap.set(uri.path, id);

    // reveal highlight code
    let start = lastLine.range.end;
    let end = firstLine.range.start;
    var collectRange = (range: vscode.Range) => {
      if (start.isAfter(range.start)) start = range.start;
      if (end.isBefore(range.end)) end = range.end;
    };
    let revealType = vscode.TextEditorRevealType.InCenter;
    if (ranges[Mark].length > 0 || ranges[Link].length > 0) {
      ranges[Mark].forEach(collectRange);
      ranges[Link].forEach(collectRange);
    } else if (ranges[Focus].length > 0) {
      ranges[Focus].forEach(collectRange);
    } else if (ranges[Code].length > 0) {
      ranges[Code].forEach(collectRange);
      revealType = vscode.TextEditorRevealType.AtTop;
    }
    editor.revealRange(new vscode.Range(start, end), revealType);
  }
  private isEditing(filePath?: string): boolean {
    if (!filePath) {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return false;
      filePath = editor.document.uri.path;
    }
    return this._editingMap.has(filePath);
  }
  public stopCodeRangeEdit(filePathOrId: string) {
    let id: string | undefined;
    let filePath: string | undefined;
    if (filePathOrId.startsWith("/")) {
      filePath = filePathOrId;
      if (!this._editingMap.has(filePath)) return;
      id = this._editingMap.get(filePath);
    } else {
      id = filePathOrId;
      [filePath] =
        [...this._editingMap.entries()].find(([, _id]) => _id === id) || [];
      if (!filePath) return;
    }
    this._editingMap.delete(filePath);
    this._getWebviewPanel?.()?.webview.postMessage({
      action: "code-range-edit-stopped",
      data: { id },
    } as Ext2Web.CodeRangeEditStopped);
  }

  private _resetDecorations() {
    const ranges: vscode.Range[][] = new Array(N);
    for (let kind = 0; kind < N; kind++) {
      ranges[kind] = [];
    }
    this._ranges = ranges;
  }

  private _findAddKind(
    ranges: vscode.Range[][],
    range: vscode.Range
  ): DecorationKind | undefined {
    let res: number | undefined = undefined;
    for (
      let kind = 0;
      kind < 4 && ranges[kind].find((_range) => _range.contains(range));
      kind++
    ) {
      res = kind;
    }
    return res;
  }

  public addHighlight() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const ranges = this._ranges;
    if (!ranges) return;

    let selection = currentSelection();
    // if no selection, select the whole line where the cursor at
    if (!selection) {
      const line = editor.selection.active.line;
      selection = new vscode.Range(
        new vscode.Position(line, 0),
        new vscode.Position(line, lastCharOfLine(editor.document, line))
      );
    }

    const kind = this._findAddKind(ranges, selection);
    if (typeof kind !== "number") return;

    this._addHighlight(editor, kind, selection);
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
    const { Code, Focus, Mark, Link } = DecorationKind;
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
    const newRange = new vscode.Range(start, end);
    if (kind === Link) {
      // remove Mark range contains the link
      ranges[Mark] = ranges[Mark].filter((range) => !range.contains(newRange));
    }

    ranges[kind].push(newRange);
    ranges[kind] = mergeOverlap(ranges[kind]);
    this._ranges = ranges;
    this._updateHighlights();
  }

  private _findRemoveKind(ranges: vscode.Range[][], pos: vscode.Position) {
    let res: number | undefined = undefined;

    for (
      let kind = 3;
      kind >= 0 && ranges[kind].find((range) => range.contains(pos));
      kind--
    ) {
      res = kind;
    }
    return res;
  }

  public removeHighlight() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const ranges = this._ranges;
    if (!ranges) return;

    let kind = this._findRemoveKind(ranges, editor.selection.active);
    if (typeof kind !== "number" || kind <= 0) return;
    kind--;

    const idx = ranges[kind].findIndex((range) =>
      range.contains(editor.selection.active)
    );

    this._removeHighlight(editor, kind, idx);
  }

  private _removeHighlight(
    editor: vscode.TextEditor,
    kind: DecorationKind,
    idx: number
  ) {
    const ranges = this._ranges;
    if (!ranges) return;
    const [removed] = ranges[kind].splice(idx, 1);
    const { Focus } = DecorationKind;
    // hold the Code or Focus line where other kinds in
    if (kind <= Focus) {
      for (let k = kind + 1; k < N; k++) {
        for (const range of ranges[k]) {
          if (range.intersection(removed)) {
            ranges[kind].push(
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
      ranges[kind] = mergeOverlap(ranges[kind]);
    }
    this._ranges = ranges;
    this._updateHighlights();
  }

  public removeAll() {
    if (this.isEditing()) return;

    this._resetDecorations();
    this._updateHighlights();
  }

  private async _updateHighlights(stopSyncOnEditing = false) {
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
    // sync code range change to webview node
    const isEditing = this.isEditing();
    if (!isEditing || stopSyncOnEditing || !this._ranges) return;
    const filePath = editor.document.uri.path;
    const id = this._editingMap.get(filePath)!;
    const {
      code,
      rowCount,
      ranges: _ranges,
    } = (await getCodeRangeChange(this._ranges)) || {};
    if (!code || !rowCount) return;
    const webview = this._getWebviewPanel?.()?.webview;
    webview?.postMessage({
      action: "code-range-change",
      data: {
        id,
        code,
        rowCount,
        ranges: _ranges,
      },
    } as Ext2Web.CodeRangeChange);
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
