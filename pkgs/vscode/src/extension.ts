// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

import { arch, platform } from "os";

import Database from "better-sqlite3";
import path from "path";

// import sqlite3 from "sqlite3";

// import { validateSqliteCommand } from "./sqlite";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "code-note" is now active!!!');
  console.log("extension path:", context.extensionPath);
  console.log("platform:", platform(), "arch:", arch());

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand(
    "code-note.helloWorld",
    () => {
      // The code you place here will be executed every time your command is executed
      // Display a message box to the user
      vscode.window.showInformationMessage("Hello World from code-note!");
    }
  );

  context.subscriptions.push(disposable);

  context.subscriptions.push(
    vscode.commands.registerCommand("code-note.sqlite-test", () => {
      // const sqliteCommand = validateSqliteCommand(context.extensionPath);
      const db = new Database(path.join(context.extensionPath, "test.db"), {});
      const rows = db.prepare("select * from test").all();
      console.log(rows);
    })
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
