import * as vscode from "vscode";

import { CodeBlock, Ext2Web } from "types";
import { codeNoteWorkspaceDir, getOpenedCodeNoteFiles } from "./utils";

import { CodeNoteEditorProvider } from "./code-note-editor";
import { Highlight } from "./highlight";
import { posix } from "path";

// import { ReactPanel } from "./webview";

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "vscode-note" is now active!');

  console.log("env", process.env);
  const highlight = new Highlight();
  highlight.subscribe(context);

  console.log(
    "extension context:",
    context.extensionPath,
    context.extensionUri
  );

  const editorProvider = new CodeNoteEditorProvider(context);

  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      CodeNoteEditorProvider.viewType,
      editorProvider
    ),
    vscode.commands.registerCommand("vscode-note.create-file", () => {
      CodeNoteEditorProvider.createFile().catch(console.error);
    }),
    vscode.commands.registerCommand("vscode-note.open-workspace", () => {
      CodeNoteEditorProvider.openWorkspace();
    }),
    vscode.commands.registerCommand("vscode-note.open-file", () => {
      CodeNoteEditorProvider.openFile().catch(console.error);
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
    vscode.commands.registerCommand("vscode-note.add-detail", () => {
      addBlock(highlight, "add-detail").catch(console.error);
    }),
    vscode.commands.registerCommand("vscode-note.add-next", () => {
      addBlock(highlight, "add-next").catch(console.error);
    })
  );
}

export function deactivate() {}

async function addBlock(
  highlight: Highlight,
  action: Ext2Web.AddCode["action"]
) {
  const files = getOpenedCodeNoteFiles();
  if (files.length !== 1) {
    vscode.window.showErrorMessage(
      "Must open a Code Note File before add code block"
    );
    return;
  }
  const webview = CodeNoteEditorProvider.getWebView(
    posix.relative(codeNoteWorkspaceDir, files[0])
  );
  if (!webview) {
    vscode.window.showErrorMessage("Webview is not ready");
    return;
  }
  await submitNote(highlight, webview, action);
}

async function submitNote(
  highlight: Highlight,
  webview: vscode.Webview,
  action: Ext2Web.AddCode["action"]
) {
  const note = highlight.block;
  if (!note) return;
  const { links, marks } = note;

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

  const msg: Ext2Web.AddCode = {
    action,
    data: {
      type: "Code",
      text,
      code: note.code,
      rows: note.rows,
      file: note.file,
      focus: note.focus,
      lineNums: note.lineNums,
      lang: note.lang,
      project: note.project,
      showCode: true,
    },
  };
  await webview.postMessage(msg);
}
