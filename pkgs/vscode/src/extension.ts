import * as vscode from "vscode";

import { CodeNoteEditorProvider } from "./editor-provider";
import { Ext2Web } from "types";
import { Highlight } from "./highlight";
import { Store } from "./store";

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "vscode-note" is now active!');

  const store = new Store(context);

  const highlight = new Highlight(store);
  highlight.subscribe(context);

  const editorProvider = new CodeNoteEditorProvider(
    context.extensionUri,
    store,
    highlight
  );
  editorProvider.register(context);

  context.subscriptions.push(
    vscode.commands.registerCommand("vscode-note.create-file", () => {
      editorProvider.createFile().catch(console.error);
    }),
    vscode.commands.registerCommand("vscode-note.open-file", () => {
      editorProvider.openFile().catch(console.log);
    }),
    vscode.commands.registerCommand("vscode-note.add-highlight", () => {
      highlight.addHighlight();
    }),
    vscode.commands.registerCommand("vscode-note.remove-highlight", () => {
      highlight.removeHighlight();
    }),
    vscode.commands.registerCommand("vscode-note.remove-all", () => {
      highlight.removeAll();
    }),
    vscode.commands.registerCommand("vscode-note.add-node-left", () => {
      addBlock(editorProvider, highlight, "ext2web-add-left", store).catch(
        console.error
      );
    }),
    vscode.commands.registerCommand("vscode-note.add-up", () => {
      addBlock(editorProvider, highlight, "ext2web-add-top", store).catch(
        console.error
      );
    }),
    vscode.commands.registerCommand("vscode-note.add-right", () => {
      addBlock(editorProvider, highlight, "ext2web-add-right", store).catch(
        console.error
      );
    }),
    vscode.commands.registerCommand("vscode-note.add-down", () => {
      addBlock(editorProvider, highlight, "ext2web-add-bottom", store).catch(
        console.error
      );
    })
  );
}

export function deactivate() {}

async function addBlock(
  provider: CodeNoteEditorProvider,
  highlight: Highlight,
  action: Ext2Web.AddNode["action"],
  store: Store
) {
  const files = store.getOpenedNoteFiles();
  if (files.length !== 1) {
    vscode.window.showErrorMessage(
      "Must open a Code Note File before add code block"
    );
    return;
  }
  const webview = provider.getWebview(files[0]);
  if (!webview) {
    vscode.window.showErrorMessage("Webview is not ready");
    return;
  }
  await submitNote(highlight, webview, action);
}

async function submitNote(
  highlight: Highlight,
  webview: vscode.Webview,
  action: Ext2Web.AddNode["action"]
) {
  const block = await highlight.createBlock();
  if (!block) return;
  const { links, marks } = block;

  const value = links.join(" ") + marks.join(" ");
  const text = await vscode.window.showInputBox({
    value: value || "",
    valueSelection: [0, value.length],
    placeHolder: "note text",
  });

  if (!text) {
    vscode.window.showWarningMessage(
      "failed to submit note: need an input text !"
    );
    return;
  }

  const msg: Ext2Web.AddNode = {
    action,
    data: {
      id: block.id,
      type: block.type,
      code: block.code,
      text,
      rowCount: block.rowCount,
      filePath: block.filePath,
      pkgPath: block.pkgPath,
      pkgName: block.pkgName,
      ranges: block.ranges,
    },
  };
  await webview.postMessage(msg);
}
