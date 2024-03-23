import "dayjs/locale/zh-cn";

import * as fs from "fs";
import * as vscode from "vscode";

import dayjs from "dayjs";
import isLeapYear from "dayjs/plugin/isLeapYear";
import { posix } from "path";

dayjs.extend(isLeapYear);
const blockDir = "blocks";

export function initBlockWorkspace(extensionPath: string) {
  const dir = posix.join(extensionPath, blockDir);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  vscode.workspace.updateWorkspaceFolders(0, 0, {
    uri: vscode.Uri.file(dir),
    name: "code-note-blocks",
  });
}

export function createMDx(
  extensionPath: string,
  content: string,
  selection: vscode.Range
) {
  const filePath = posix.join(extensionPath, blockDir, mdxFilename());
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, new TextEncoder().encode(content));
  }
  const fileUri = vscode.Uri.file(filePath);
  const viewColumn = (vscode.window.activeTextEditor?.viewColumn ?? 0) + 1;
  vscode.window.showTextDocument(fileUri, {
    preview: false,
    selection,
    viewColumn,
  });
}

function mdxFilename() {
  return dayjs().format("YYYY-MM-DD HH:mm:ss.SSS") + ".mdx";
}
