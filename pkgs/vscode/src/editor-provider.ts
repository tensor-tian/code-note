import * as vscode from "vscode";

import type { Ext2Web, Note, Web2Ext } from "types";
import { closeFileIfOpen, getActiveWorkspacePackageInfo } from "./utils";

import { Highlight, lastCharOfLine } from "./highlight";
import { Store } from "./store";
import fs from "fs";
import { initCodeNote } from "./store";
import { posix } from "path";

type WebManifest = {
  files: Record<"main.css" | "main.js", string>;
};

export class CodeNoteEditorProvider implements vscode.CustomTextEditorProvider {
  private webviewPanelMap: Map<string, vscode.WebviewPanel> = new Map(); // webview panel key -> webview panel
  private vDocToNoteFileMap: Map<string, string> = new Map(); // vdoc uri path -> webview panel key
  private textChangeMsgMap = new Map<string, Ext2Web.TextChange>(); // webview panel key -> text change message

  public getWebviewPanel(webviewKey: string): vscode.WebviewPanel | undefined {
    return this.webviewPanelMap.get(webviewKey);
  }
  public getWebview(webviewKey: string): vscode.Webview | undefined {
    return this.webviewPanelMap.get(webviewKey)?.webview;
  }

  public getWebViewByVDoc(
    vDocUri: vscode.Uri
  ): vscode.WebviewPanel | undefined {
    const file = this.vDocToNoteFileMap.get(vDocUri.path);
    if (!file) return;
    return this.getWebviewPanel(file);
  }

  public async openFile() {
    const files = await this.store.listNotePaths();
    if (files.length === 0) {
      vscode.window.showWarningMessage(
        "No *.vnote file is available. You can create a new note."
      );
      return;
    }
    const file = await vscode.window.showQuickPick(files, {
      placeHolder: "Select file to open",
    });
    if (!file) {
      vscode.window.showWarningMessage("No file is selected");
      return;
    }
    const uri = this.store.noteUri(file);
    await vscode.commands.executeCommand(
      "vscode.openWith",
      uri,
      CodeNoteEditorProvider.viewType,
      vscode.ViewColumn.Beside
    );
  }

  public async createFile() {
    const title = await vscode.window.showInputBox({
      value: "",
      placeHolder: "Title/Topic of new note",
    });
    if (!title) {
      vscode.window.showErrorMessage("Empty filename is not allowed");
      return;
    }
    const { name: pkgName } = await getActiveWorkspacePackageInfo();
    if (!pkgName) {
      vscode.window.showErrorMessage("Package Name is not found!");
      return;
    }

    const uri = await this.store.createNote(title);

    await vscode.commands.executeCommand(
      "vscode.openWith",
      uri,
      CodeNoteEditorProvider.viewType,
      vscode.ViewColumn.Beside
    );
  }

  public static readonly viewType = "vscode-note";
  private disposables: vscode.Disposable[] = [];

  constructor(
    // private readonly context: vscode.ExtensionContext,
    private readonly extensionUri: vscode.Uri,
    private readonly store: Store,
    private readonly highlight: Highlight
  ) {}

  register(context: vscode.ExtensionContext) {
    context.subscriptions.push(
      vscode.workspace.onDidCloseTextDocument((doc: vscode.TextDocument) => {
        const uri = doc.uri;
        this.store.removeVDoc(doc.uri).then(({ id, type }) => {
          this.vDocToNoteFileMap.delete(uri.path);
          if (id && type) {
            const webviewPanel = this.getWebViewByVDoc(uri);
            webviewPanel?.webview.postMessage({
              action: "ext2web-text-edit-done",
              data: { id, type },
            } as Ext2Web.TextEditDone);
          }
        });
      }),
      vscode.workspace.onDidChangeTextDocument(this.onDidChangeVDoc, this),
      vscode.window.registerCustomEditorProvider(
        CodeNoteEditorProvider.viewType,
        this,
        {
          webviewOptions: {
            retainContextWhenHidden: true,
          },
        }
      )
    );
  }

  resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _: vscode.CancellationToken
  ): void | Thenable<void> {
    const webviewKey = document.uri.path;
    // only allow one webview
    if (this.getWebview(webviewKey)) return;

    this.webviewPanelMap.set(webviewKey, webviewPanel);
    webviewPanel.options.retainContextWhenHidden;
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, "dist/web")],
    };
    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

    const disposables: vscode.Disposable[] = [];
    disposables.push(
      webviewPanel.webview.onDidReceiveMessage(
        this.receiveMessage(webviewKey, document)
      )
    );
    this.disposables.push(
      webviewPanel.onDidDispose(() => {
        disposables.forEach((disposable) => disposable.dispose());
        console.log("on dispose:", webviewKey);
        this.webviewPanelMap.delete(webviewKey);

        // close vdoc text editor
        const docs = vscode.workspace.textDocuments;
        for (const [vdoc, k] of this.vDocToNoteFileMap.entries()) {
          // vdoc is the v-doc uri path
          if (k !== webviewKey) continue;
          const doc = docs.find((doc) => doc.uri.path === vdoc);
          if (!doc) continue;
          closeFileIfOpen(doc.uri); // close text file will trigger 'onDidCloseTextDocument'
        }
      })
    );
  }

  receiveMessage =
    (webviewKey: string, document: vscode.TextDocument) =>
    async (message: Web2Ext.Message) => {
      const webviewPanel = this.getWebviewPanel(webviewKey);
      if (!webviewPanel) return;
      if (message.action !== "web2ext-save-note") {
        console.log("web to ext:", message);
      }
      switch (message.action) {
        case "web2ext-show-info": {
          vscode.window.showInformationMessage(message.data);
          break;
        }
        case "web2ext-show-warn": {
          vscode.window.showWarningMessage(message.data);
          break;
        }
        case "web2ext-show-error": {
          vscode.window.showErrorMessage(message.data);
          break;
        }
        case "web2ext-save-note": {
          this.saveTextDocument(document, message.data);
          break;
        }
        case "web2ext-ask-init-tree-note": {
          let note: Note | undefined;
          const getNote = async () => {
            try {
              note = JSON.parse(document.getText());
            } catch (err) {
              note = await initCodeNote("Untitled Note");
            }
            return note;
          };
          getNote().then((note) => {
            if (!note) return;
            console.log("note:", note);
            webviewPanel.webview
              .postMessage({
                action: "ext2web-init-tree-note",
                data: note,
              } as Ext2Web.Message)
              .then(() =>
                this.sendCachedTextChangeMsg(webviewKey, webviewPanel)
              );
          });
          break;
        }
        case "web2ext-text-edit-start": {
          try {
            const done = await this.startTextEdit(message.data, webviewKey);
            if (done) {
              const { id, type } = message.data;
              webviewPanel.webview.postMessage({
                action: "ext2web-text-edit-ready",
                data: { id, type },
              } as Ext2Web.TextEditReady);
            }
          } catch (err) {
            console.error("start text editor failed:", err);
          }
          break;
        }
        case "web2ext-text-edit-stop": {
          await this.stopTextEdit(message.data);
          webviewPanel.webview.postMessage({
            action: "ext2web-text-edit-done",
            data: message.data,
          } as Ext2Web.TextEditDone);
          break;
        }
        case "web2ext-code-range-edit-start": {
          const getWebviewPanel = () => this.getWebviewPanel(webviewKey);
          await this.highlight.startCodeRangeEdit(
            message.data,
            getWebviewPanel
          );
          webviewPanel.webview.postMessage({
            action: "ext2web-code-range-edit-ready",
            data: { id: message.data.id },
          } as Ext2Web.CodeRangeEditReady);
          break;
        }
        case "web2ext-code-range-edit-stop": {
          this.highlight.stopCodeRangeEdit(message.data.id);
          break;
        }
        case "web2ext-request-for-ids": {
          const { n, key } = message.data;
          const ids: string[] = [];
          for (let i = 0; i < n; i++) {
            ids.push(this.store.getBlockId());
          }
          webviewPanel.webview.postMessage({
            action: "ext2web-response-for-ids",
            data: { ids, key },
          } as Ext2Web.Message);
          break;
        }
        case "web2ext-insert-text-content": {
          this.insertTextContent(message.data);
          break;
        }
        case "web2ext-get-kv": {
          const val = this.store.getKV(message.data.key);
          webviewPanel.webview.postMessage({
            action: "ext2web-get-kv",
            data: {
              key: message.data.key,
              val,
            },
          } as Ext2Web.GetKV);
          break;
        }
        case "web2ext-set-kv": {
          const { key, val } = message.data;
          this.store.setKV(key, val);
          break;
        }
      }
    };
  private sendCachedTextChangeMsg(
    webviewKey: string,
    webviewPanel: vscode.WebviewPanel
  ) {
    const msg = this.textChangeMsgMap.get(webviewKey);
    if (msg) {
      this.textChangeMsgMap.delete(webviewKey);
      return webviewPanel.webview.postMessage(msg);
    }
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const manifest = JSON.parse(
      fs.readFileSync(
        posix.join(this.extensionUri.path, "dist/web", "asset-manifest.json"),
        "utf-8"
      )
    ) as WebManifest;
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, manifest["files"]["main.js"])
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, manifest["files"]["main.css"])
    );

    return (
      `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1.5" />
        <meta name="description" content="vscode code block note" />
        <title>Code Note</title>
        <script defer="defer" src="${scriptUri}"></script>
        <link href="${styleUri}" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.10/dist/katex.min.css" integrity="sha384-wcIxkf4k558AjM3Yz3BBFQUbk/zgIYC2R0QpeeYb+TwlBVMrlgLqwRjRtGZiK7ww" crossorigin="anonymous">
        <script>
          localStorage.debug = '` +
      // @ts-ignore
      LOCALSTORAGE_DEBUG +
      `'
        </script>
      </head>
      <body>
        <noscript>You need to enable JavaScript to run this app.</noscript>
        <div id="root"></div>
      </body>
    </html>
  `
    );
  }

  private saveTextDocument(document: vscode.TextDocument, text: string) {
    const edit = new vscode.WorkspaceEdit();
    edit.replace(
      document.uri,
      new vscode.Range(0, 0, document.lineCount, 0),
      text
    );
    return vscode.workspace.applyEdit(edit).then(undefined, (err) => {
      console.error("apply edit error:", err);
    });
  }

  private async insertTextContent({
    prefix,
    suffix,
    id,
    type: typ,
  }: Web2Ext.InsertTextContent["data"]) {
    const uri = this.store.vDocUri(typ, id);
    const editor = vscode.window.visibleTextEditors.find(
      (editor) => editor.document.uri.toString() === uri.toString()
    );
    if (!editor) {
      vscode.window.showErrorMessage("The MDX text editor is not open.");
      return;
    }

    await vscode.window.showTextDocument(editor.document, {
      preserveFocus: true,
      preview: false,
      viewColumn: editor.viewColumn,
    });
    const text = editor.document.getText(editor.selection);
    let selection = editor.selection;
    if (
      text.endsWith("\n") ||
      (selection.end.line === selection.start.line + 1 &&
        selection.end.character === 0)
    ) {
      const end = new vscode.Position(
        selection.end.line - 1,
        lastCharOfLine(editor.document, selection.end.line - 1)
      );
      selection = new vscode.Selection(selection.start, end);
    }
    const edit = new vscode.WorkspaceEdit();
    edit.replace(editor.document.uri, editor.selection, prefix + text + suffix);
    await vscode.workspace.applyEdit(edit).then(
      () => {},
      (err) => {
        console.error("apply edit error:", err);
      }
    );
    const end = editor.selection.end;
    const pos = new vscode.Position(end.line, end.character + prefix.length);
    editor.selection = new vscode.Selection(pos, pos);
  }
  /**
   *   virtual document
   */

  private async startTextEdit(
    { text: content, id, type: typ }: Web2Ext.TextEditStart["data"],
    webviewKey: string
  ) {
    const uri = await this.store.writeVDoc(typ, id, content);
    this.vDocToNoteFileMap.set(uri.path, webviewKey);
    const doc = await vscode.workspace.openTextDocument(uri);
    // const webviewPanel = this.getWebviewPanel(webviewKey);
    // const activeColumn = webviewPanel?.viewColumn || 3;
    // console.log("active column:", activeColumn, vscode.window.activeTextEditor);
    await vscode.commands.executeCommand("workbench.action.splitEditorDown");
    await vscode.window.showTextDocument(doc, {
      viewColumn: vscode.ViewColumn.Active,
      preserveFocus: false,
      preview: false,
    });
    await vscode.commands.executeCommand(
      "workbench.action.closeEditorsToTheLeft"
    );
    for (let i = 0; i < 4; i++) {
      await vscode.commands.executeCommand(
        "workbench.action.decreaseViewHeight"
      );
    }
    return true;
  }

  private async stopTextEdit({ id, type: typ }: Web2Ext.TextEditStop["data"]) {
    const uri = this.store.vDocUri(typ, id);
    closeFileIfOpen(uri);
  }

  // post changed text to paired webview
  private onDidChangeVDoc(event: vscode.TextDocumentChangeEvent) {
    const uri = event.document.uri;
    const { id, type: typ } = this.store.parseVDocUri(uri);
    if (!id || !typ) return;

    const text = event.document.getText();
    const webviewPanel = this.getWebViewByVDoc(uri);
    const message = {
      action: "ext2web-text-change",
      data: { id, type: typ, text },
    } as Ext2Web.TextChange;
    if (webviewPanel?.visible) {
      // console.log("webview panel is visible:", id, typ, text);
      webviewPanel.webview?.postMessage(message);
    } else {
      console.log("webview panel is not visible");
      const webviewKey = this.vDocToNoteFileMap.get(uri.path);
      if (webviewKey) {
        this.textChangeMsgMap.set(webviewKey, message);
      }
    }
  }
}
