import * as vscode from "vscode";

import type { Block, Ext2Web, Note, Web2Ext } from "types";
import {
  closeFileIfOpen,
  codeNoteWorkspaceDir,
  filename,
  getPackageName,
} from "./utils";

import fs from "fs";
import { nextCol } from "./webview";
import { posix } from "path";

type WebManifest = {
  files: Record<"main.css" | "main.js", string>;
};

export class CodeNoteEditorProvider implements vscode.CustomTextEditorProvider {
  private webviewPanelMap: Map<string, vscode.WebviewPanel> = new Map(); // webview panel key -> webview panel
  private vDocToNoteFileMap: Map<string, string> = new Map(); // vdoc uri path -> webview panel key
  private textChangeMsgMap = new Map<string, Ext2Web.TextChange>(); // webview panel key -> text change message

  public getWebviewPanel(filename: string): vscode.WebviewPanel | undefined {
    return this.webviewPanelMap.get(filename);
  }
  public getWebView(filename: string): vscode.Webview | undefined {
    return this.webviewPanelMap.get(filename)?.webview;
  }

  public getWebViewByVDoc(
    vDocUri: vscode.Uri
  ): vscode.WebviewPanel | undefined {
    const file = this.vDocToNoteFileMap.get(vDocUri.path);
    if (!file) return;
    return this.getWebviewPanel(file);
  }

  public static async openFile() {
    if (!codeNoteWorkspaceDir) {
      vscode.window.showErrorMessage("Code Note workspace is not defined");
      return;
    }
    const files = await fs.promises.readdir(codeNoteWorkspaceDir, {
      recursive: true,
      encoding: "utf-8",
    });
    const filename = await vscode.window.showQuickPick(files, {
      placeHolder: "Select file to open",
    });
    if (!filename) {
      vscode.window.showWarningMessage("No file is selected");
      return;
    }
    const uri = vscode.Uri.parse(
      `file://${posix.join(codeNoteWorkspaceDir, filename)}`
    );

    await vscode.commands.executeCommand(
      "vscode.openWith",
      uri,
      CodeNoteEditorProvider.viewType,
      nextCol(vscode.window.activeTextEditor?.viewColumn)
    );
  }

  public static async createFile(fsPath?: string) {
    if (!codeNoteWorkspaceDir) {
      vscode.window.showErrorMessage("Code Note workspace is not defined");
      return;
    }

    if (fsPath) {
      const uri = vscode.Uri.parse(`file://${fsPath}`);
      await vscode.commands.executeCommand(
        "vscode.openWith",
        uri,
        CodeNoteEditorProvider.viewType,
        nextCol(vscode.window.activeTextEditor?.viewColumn)
      );
      return;
    }
    const value = (await getPackageName())?.replaceAll("/", " | ") + "-" || "";
    const title = await vscode.window.showInputBox({
      value,
      valueSelection: [value.length, value.length],
      placeHolder: "code note filename",
    });
    if (!title) {
      vscode.window.showErrorMessage("Empty filename is not allowed");
      return;
    }
    fsPath = await initialCodeNoteFile(title);

    if (!fsPath) {
      vscode.window.showErrorMessage(
        "Error in initializing a empty code note file!"
      );
      return;
    }
    const uri = vscode.Uri.parse(`file://${fsPath}`);
    await vscode.commands.executeCommand(
      "vscode.openWith",
      uri,
      CodeNoteEditorProvider.viewType,
      nextCol(vscode.window.activeTextEditor?.viewColumn)
    );
  }

  public static readonly viewType = "vscode-note";

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly memFS: vscode.FileSystemProvider
  ) {
    context.subscriptions.push(
      vscode.workspace.onDidCloseTextDocument((doc: vscode.TextDocument) => {
        const uri = doc.uri;
        const { id, type: typ } = this.parseVDocUri(uri);
        if (!id || !typ) return;
        this.memFS.delete(uri, { recursive: true });
        this.vDocToNoteFileMap.delete(uri.path);
      }),
      vscode.workspace.onDidChangeTextDocument(this.onDidChangeVDoc, this)
    );
  }

  resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _: vscode.CancellationToken
  ): void | Thenable<void> {
    const webviewKey = document.uri.path;
    this.webviewPanelMap.set(webviewKey, webviewPanel);
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, "dist/web"),
      ],
    };
    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

    webviewPanel.onDidDispose(() => {
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
    });

    webviewPanel.webview.onDidReceiveMessage((message: Web2Ext.Message) => {
      console.log("web to ext:", message);
      switch (message.action) {
        case "show-info":
          vscode.window.showInformationMessage(message.data);
          break;
        case "show-warn":
          vscode.window.showWarningMessage(message.data);
          break;
        case "show-error":
          vscode.window.showErrorMessage(message.data);
          break;
        case "save-note":
          this.saveTextDocument(document, message.data);
          break;
        case "ask-init-tree-note":
          {
            let note: Note;
            const getNote = async () => {
              try {
                note = JSON.parse(document.getText());
              } catch (err) {
                const pkgName = await getPackageName();
                if (!pkgName) {
                  return;
                }
                note = {
                  id: await nanoid(),
                  type: "TreeNote",
                  text: `### Untitled`,
                  pkgName: pkgName,
                  nodeMap: {},
                  edges: [],
                  activeNodeId: "",
                };
              }
              return note;
            };
            getNote().then((note) =>
              webviewPanel.webview
                .postMessage({
                  action: "init-tree-note",
                  data: note,
                })
                .then(() => {
                  const msg = this.textChangeMsgMap.get(webviewKey);
                  if (msg) {
                    this.textChangeMsgMap.delete(webviewKey);
                    return webviewPanel.webview.postMessage(msg);
                  }
                })
            );
          }
          break;
        case "start-text-editor":
          this.startVirtualDocument(message.data, webviewKey);
          break;
      }
    });
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const manifest = JSON.parse(
      fs.readFileSync(
        posix.join(
          this.context.extensionUri.path,
          "dist/web",
          "asset-manifest.json"
        ),
        "utf-8"
      )
    ) as WebManifest;
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.context.extensionUri,
        manifest["files"]["main.js"]
      )
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.context.extensionUri,
        manifest["files"]["main.css"]
      )
    );

    return `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1.5" />
        <meta name="description" content="vscode code block note" />
        <title>Code Note</title>
        <script defer="defer" src="${scriptUri}"></script>
        <link href="${styleUri}" rel="stylesheet" />
      </head>
      <body>
        <h1>Loading file...</h1>
        <noscript>You need to enable JavaScript to run this app.</noscript>
        <div id="root"></div>
      </body>
    </html>
  `;
  }

  private saveTextDocument(document: vscode.TextDocument, text: string) {
    const edit = new vscode.WorkspaceEdit();

    edit.replace(
      document.uri,
      new vscode.Range(0, 0, document.lineCount, 0),
      text
    );

    return vscode.workspace.applyEdit(edit);
  }
  /**
   *   virtual document
   */
  public static readonly vDocSchema = "vscode-note-vdoc";
  private getVDocUri(id: string, typ: string): vscode.Uri {
    return vscode.Uri.parse(
      `${CodeNoteEditorProvider.vDocSchema}:/${typ}-${id}.md`
    );
  }
  private parseVDocUri(uri: vscode.Uri): {
    id?: string;
    type?: string;
  } {
    if (uri.scheme !== CodeNoteEditorProvider.vDocSchema) return {};
    if (!uri.path.endsWith(".md") || !uri.path.startsWith("/")) return {};
    const parts = uri.path.slice(1, uri.path.length - 3).split("-");
    if (parts.length !== 2) return {};
    return { id: parts[1], type: parts[0] };
  }

  private async startVirtualDocument(
    { text: content, id, type: typ }: Web2Ext.StartTextEditor["data"],
    webviewKey: string
  ) {
    const uri = this.getVDocUri(id, typ);
    console.log("uri.path", uri.path);
    this.memFS.writeFile(uri, Buffer.from(content), {
      create: true,
      overwrite: true,
    });
    this.vDocToNoteFileMap.set(uri.path, webviewKey);
    const doc = await vscode.workspace.openTextDocument(uri);
    const webviewPanel = this.getWebviewPanel(webviewKey);
    const activeColumn = webviewPanel?.viewColumn || 3;
    console.log("active column:", activeColumn, vscode.window.activeTextEditor);
    vscode.window.showTextDocument(doc, {
      viewColumn: activeColumn + 1,
      preserveFocus: false,
      preview: false,
    });
  }

  // post changed text to paired webview
  private onDidChangeVDoc(event: vscode.TextDocumentChangeEvent) {
    const uri = event.document.uri;
    const { id, type: typ } = this.parseVDocUri(uri);
    if (!id || !typ) return;

    const text = event.document.getText();
    const webviewPanel = this.getWebViewByVDoc(uri);
    const message = {
      action: "text-change",
      data: { id, type: typ, text },
    } as Ext2Web.TextChange;
    if (webviewPanel?.visible) {
      console.log("webview panel is visible:", id, typ, text);
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

const nanoid = async (): Promise<string> => {
  const newId = await import("nanoid").then(({ customAlphabet }) =>
    customAlphabet("01234567890abcdefghijklmnopqrstuvwxyz", 10)
  );
  return newId();
};

async function initialCodeNoteFile(title: string): Promise<string | undefined> {
  const file = vscode.Uri.file(filename(codeNoteWorkspaceDir, title));
  if (!fs.existsSync(file.fsPath)) {
    const pkgName = await getPackageName();
    if (!pkgName) {
      return;
    }
    const note: Note = {
      id: await nanoid(),
      type: "TreeNote",
      text: `### ${title}`,
      pkgName: pkgName,
      nodeMap: {},
      edges: [],
      activeNodeId: "",
    };
    await fs.promises.writeFile(file.fsPath, JSON.stringify(note, null, 2));
  }
  return file.fsPath;
}
