import * as vscode from "vscode";

import { CodeBlock, MessageDataAddBlock } from "types";
import { DecorationKind, Highlight, currentSelection } from "./highlight";
import { codeNoteWorkspaceDir, getOpenedCodeNoteFiles } from "./utils";

import { CodeNoteEditorProvider } from "./code-note-editor";
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
    vscode.commands.registerCommand("vscode-note.toggle-code", () => {
      highlight.toggleHighlight(DecorationKind.Code);
    }),
    vscode.commands.registerCommand("vscode-note.toggle-focus", () => {
      highlight.toggleHighlight(DecorationKind.Focus);
    }),
    vscode.commands.registerCommand("vscode-note.toggle-mark", () => {
      highlight.toggleHighlight(DecorationKind.Mark);
    }),
    vscode.commands.registerCommand("vscode-note.toggle-link", () => {
      highlight.toggleHighlight(DecorationKind.Link);
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
  action: MessageDataAddBlock["action"]
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
  action: MessageDataAddBlock["action"]
) {
  const note = highlight.block;
  if (!note) {
    return;
  }
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

  const block: Omit<CodeBlock, "id"> = {
    type: "Code",
    text,
    code: note.code,
    file: note.file,
    focus: note.focus,
    lineNums: note.lineNums,
    lang: note.lang,
    project: note.project,
  };
  const msg: MessageDataAddBlock = {
    action,
    data: block,
  };
  await webview.postMessage(msg);
}
