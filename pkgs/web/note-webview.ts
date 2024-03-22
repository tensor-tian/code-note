import * as vscode from "vscode";

import fs from "fs";
import path from "path";

// webview 加载 html
export function setHtmlForWebviewPanel(
  extensionPath: string,
  panel: vscode.WebviewPanel
) {
  const manifest = JSON.parse(
    fs.readFileSync(
      path.join(extensionPath, "dist/web", "asset-manifest.json"),
      "utf-8"
    )
  );
  const mainScript = panel.webview.asWebviewUri(
    vscode.Uri.file(path.join(extensionPath, manifest["files"]["main.js"]))
  );
  const mainCSS = panel.webview.asWebviewUri(
    vscode.Uri.file(path.join(extensionPath, manifest["files"]["main.css"]))
  );
  const baseHref = panel.webview.asWebviewUri(
    vscode.Uri.file(path.join(extensionPath, "dist"))
  );

  panel.webview.html = `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <link rel="icon" href="/favicon.ico" />
      <meta name="viewport" content="width=device-width,initial-scale=1 shrink-to-fit=no" />
      <meta name="theme-color" content="#000000" />
      <title>Note Editor</title>
      <script defer="defer" src="${mainScript}"></script>
      <link href="${mainCSS}" type="text/css" rel="stylesheet" />
      <base href="${baseHref}"/>
    </head>
    <body>
      <noscript>You need to enable JavaScript to run this app.</noscript>
      <div id="root"></div>
    </body>
  </html>
  `;
}
