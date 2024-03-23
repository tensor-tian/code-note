import * as vscode from "vscode";

import { DecorationKind, Highlight, currentSelection } from "./highlight";

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "vscode-note" is now active!');

  console.log("env", process.env);
  const highlight = new Highlight();
  highlight.subscribe(context);
  context.subscriptions.push(
    // hello world
    vscode.commands.registerCommand("vscode-note.helloWorld", () => {
      vscode.window.showInformationMessage("Hello World from vscode-note!");
    }),
    //
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
    vscode.commands.registerCommand("vscode-note.submit", () => {
      submitNote(highlight);
    })
  );
}

export function deactivate() {}

async function submitNote(highlight: Highlight) {
  console.log("current selection:", currentSelection());
  const note = highlight.note;
  if (!note) {
    return;
  }
  const { links, marks } = note;
  let text: string | undefined;
  if (links.length + marks.length === 1) {
    text = await showInputBox(links[0] || marks[0]);
  } else {
    text = await showQuickPick(links, marks);
    if (!text) {
      vscode.window.showWarningMessage(
        "failed to submit note: need an input text !"
      );
      return;
    }
    text = await showInputBox(text);
  }
  if (!text) {
    vscode.window.showWarningMessage(
      "failed to submit note: need an input text !"
    );
    return;
  }
  // post { ...note, text } to server
  console.log("post to server:", { ...note, text });
}
async function showInputBox(value: string): Promise<string | undefined> {
  const result = await vscode.window.showInputBox({
    value: value || "",
    valueSelection: [0, value.length],
    placeHolder: "note text",
  });
  return result;
}

async function showQuickPick(
  links: string[],
  marks: string[]
): Promise<string | undefined> {
  const window = vscode.window;
  const result = await window.showQuickPick([...links, ...marks], {
    placeHolder: links[0] || marks[0],
  });
  return result;
}
