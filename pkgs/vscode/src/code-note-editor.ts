import * as vscode from "vscode";

import type { Block, Ext2Web, Note, Web2Ext } from "types";
import { codeNoteWorkspaceDir, filename, getPackageName } from "./utils";

import fs from "fs";
import { nextCol } from "./webview";
import { posix } from "path";

type WebManifest = {
  files: Record<"main.css" | "main.js", string>;
};

export class CodeNoteEditorProvider implements vscode.CustomTextEditorProvider {
  private static webviewPanelMap: Map<string, vscode.WebviewPanel> = new Map();

  public static getWebView(filename: string): vscode.Webview | undefined {
    return CodeNoteEditorProvider.webviewPanelMap.get(filename)?.webview;
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
    // const doc = await vscode.workspace.openTextDocument(uri);
    // vscode.window.showTextDocument(doc, {
    //   preview: false,
    //   viewColumn,
    // });
  }

  public static async createFile(fsPath?: string) {
    if (!codeNoteWorkspaceDir) {
      vscode.window.showErrorMessage("Code Note workspace is not defined");
      return;
    }

    if (fsPath) {
      const uri = vscode.Uri.parse(`file://${fsPath}`);
      // const doc = await vscode.workspace.openTextDocument(uri);
      // vscode.window.showTextDocument(doc, {
      //   preview: false,
      //   viewColumn: nextCol(vscode.window.activeTextEditor?.viewColumn),
      // });
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
    // const doc = await vscode.workspace.openTextDocument(uri);
    // await vscode.window.showTextDocument(doc, {
    //   preview: false,
    //   viewColumn: nextCol(vscode.window.activeTextEditor?.viewColumn),
    // });
  }

  public static readonly viewType = "vscode-note";

  constructor(private readonly context: vscode.ExtensionContext) {}

  resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _: vscode.CancellationToken
  ): void | Thenable<void> {
    CodeNoteEditorProvider.webviewPanelMap.set(
      posix.relative(codeNoteWorkspaceDir, document.uri.fsPath),
      webviewPanel
    );
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, "dist/web"),
      ],
    };
    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

    // function updateWebview() {
    //   webviewPanel.webview.postMessage({
    //     type: "reset-note",
    //     data: document.getText(),
    //   } as Ext2Web.InitTreeNote);
    // }

    // const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(
    //   (e) => {
    //     if (e.document.uri.toString() === document.uri.toString()) {
    //       updateWebview();
    //     }
    //   }
    // );

    webviewPanel.onDidDispose(() => {
      // changeDocumentSubscription.dispose();
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
            webviewPanel.webview.postMessage({
              action: "init-tree-note",
              data: note,
            })
          );
      }
    });

    // updateWebview();
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
