import "dayjs/locale/zh-cn";

import * as fs from "fs";
import * as vscode from "vscode";

import { posix } from "path";
import toml from "toml";

function getCodeNoteWorkspaceDir(): string {
  const config = vscode.workspace.getConfiguration("vscode-note");
  let workspaceDir: string = config.get("workspaceDir") || "";
  if (!workspaceDir) {
    workspaceDir = posix.join(getUserHomeDir(), "code-note", "data");
    if (!workspaceDir) {
      vscode.window.showErrorMessage(
        "Could not determine user's home directory. You should define vscode-note.workspaceDir in settings.json instead"
      );
      return "";
    }
  }
  if (!fs.existsSync(workspaceDir)) {
    fs.mkdirSync(workspaceDir, { recursive: true });
  }
  return workspaceDir;
}

export const codeNoteWorkspaceDir = getCodeNoteWorkspaceDir();

export function getProjectRoot(): string | undefined {
  const project = vscode.workspace.workspaceFolders?.find((wsFolder) => {
    const currentFile = vscode.window.activeTextEditor?.document.uri.fsPath;
    if (!currentFile) {
      return;
    }
    const relative = posix.relative(wsFolder.uri.fsPath, currentFile);
    return (
      relative && !relative.startsWith("..") && !posix.isAbsolute(relative)
    );
  });
  return project?.uri.fsPath;
}

export async function getPackageName(): Promise<string | undefined> {
  // Get the workspace folders
  const project = getProjectRoot();
  if (!project) {
    return;
  }

  // Check if package.json in the root directory
  const packageJsonPath = posix.join(project, "package.json");
  if (await fileExists(packageJsonPath)) {
    const packageJsonContent = await fs.promises.readFile(
      packageJsonPath,
      "utf8"
    );
    try {
      const packageJson = JSON.parse(packageJsonContent);
      if (packageJson && packageJson.name) {
        return packageJson.name;
      }
    } catch (error) {
      if (error instanceof Error) {
        vscode.window.showErrorMessage(
          "Error parsing package.json: " + error.message
        );
      }
      return;
    }
  }

  // Check if go.mod in the root directory
  const goModPath = posix.join(project, "go.mod");
  if (await fileExists(goModPath)) {
    const goModContent = await fs.promises.readFile(goModPath, "utf8");
    const moduleNameMatch = goModContent.match(/^module\s+([^\s]+)/m);
    if (moduleNameMatch && moduleNameMatch[1]) {
      return moduleNameMatch[1];
    }
  }

  // Check if Cargo.toml in the root directory
  const cargoTomlPath = posix.join(project, "Cargo.toml");
  if (await fileExists(cargoTomlPath)) {
    const cargoTomlContent = await fs.promises.readFile(cargoTomlPath, "utf8");
    const cargoToml = toml.parse(cargoTomlContent);
    if (cargoToml && cargoToml.package && cargoToml.package.name) {
      return cargoToml.package.name;
    }
  }

  vscode.window.showErrorMessage(
    "No supported project file found in the current workspace."
  );
  return;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export function filename(workspaceDir: string, id: string) {
  return posix.join(workspaceDir, id + ".cnote");
}

export function getUserHomeDir(): string {
  return process.env.HOME || process.env.USERPROFILE || "";
}

// export function readNote(extensionPath: string, id: string): Note {
//   return JSON.parse(
//     fs.readFileSync(filename(extensionPath, id), "utf-8")
//   ) as Note;
// }

// export function writeNote(extensionPath: string, note: Note) {
//   fs.writeFileSync(
//     filename(extensionPath, note.id),
//     JSON.stringify(note, null, 2)
//   );
// }

const isSubDirectory = (dir: string) => (fsPath: string) => {
  const relative = posix.relative(dir, fsPath);
  return relative && !relative.startsWith("..") && !posix.isAbsolute(relative);
};

const isCodeNoteFile = isSubDirectory(codeNoteWorkspaceDir);

export function getOpenedCodeNoteFiles(): string[] {
  return vscode.workspace.textDocuments
    .map((doc) => doc.uri.fsPath)
    .filter(isCodeNoteFile);
}

// export function getVisibleCodeNoteFiles(): string[] {
//   return vscode.window.visibleTextEditors
//     .map((editor) => editor.document.uri.fsPath)
//     .filter(isCodeNoteFile);
// }
