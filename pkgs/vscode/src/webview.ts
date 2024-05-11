import * as vscode from "vscode";

import type { MessageDataW2E } from "types";
import fs from "fs";
import path from "path";

type WebManifest = {
  files: Record<"main.css" | "main.js", string>;
};

export function nextCol(col: vscode.ViewColumn | undefined): vscode.ViewColumn {
  return col ? col! + 1 : vscode.ViewColumn.Two;
}

export class ReactPanel {
  public static currentPanel: ReactPanel | undefined;

  private static readonly viewType = "react";

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = nextCol(vscode.window.activeTextEditor?.viewColumn);

    // If we already have a panel, show it.
    // Otherwise, create a new panel.
    if (ReactPanel.currentPanel) {
      ReactPanel.currentPanel._panel.reveal(column);
      console.log("reveal webview");
    } else {
      ReactPanel.currentPanel = new ReactPanel(extensionUri, column);
      console.log("create webview");
    }
  }

  private constructor(extensionPath: vscode.Uri, column: vscode.ViewColumn) {
    this._extensionUri = extensionPath;

    // Create and show a new webview panel
    this._panel = vscode.window.createWebviewPanel(
      ReactPanel.viewType,
      "React",
      column,
      {
        // Enable javascript in the webview
        enableScripts: true,

        // And restric the webview to only loading content from our extension's `media` directory.
        localResourceRoots: [
          vscode.Uri.joinPath(this._extensionUri, "dist/web"),
        ],
      }
    );

    // Set the webview's initial html content
    this._panel.webview.html = this._getHtmlForWebview();

    // Listen for when the panel is disposed
    // This happens when the user closes the panel or when the panel is closed programatically
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Handle messages from the webview
    this._panel.webview.onDidReceiveMessage(
      (event: MessageDataW2E) => {
        switch (event.action) {
          case "add-detail-done":
          case "add-next-done":
            break;
          case "add-detail-fail":
          case "add-next-fail":
            vscode.window.showErrorMessage(event.message);
            break;
          case "save-note":
            break;
        }
      },
      null,
      this._disposables
    );
  }

  public doRefactor() {
    // Send a message to the webview webview.
    // You can send any JSON serializable data.
    this._panel.webview.postMessage({ command: "refactor" });
  }

  public dispose() {
    ReactPanel.currentPanel = undefined;

    // Clean up our resources
    this._panel.dispose();

    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  private _getHtmlForWebview() {
    const manifest = JSON.parse(
      fs.readFileSync(
        path.join(this._extensionUri.path, "dist/web", "asset-manifest.json"),
        "utf-8"
      )
    ) as WebManifest;
    const webview = this._panel.webview;
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, manifest["files"]["main.js"])
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, manifest["files"]["main.css"])
    );
    console.log({
      scriptUri,
      styleUri,
    });
    // const nonce = getNonce();

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
      <h1>heading 1</h1>
      <noscript>You need to enable JavaScript to run this app.</noscript>
      <div id="root"></div>
    </body>
  </html>
  `;
  }
}

/*
function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
*/
