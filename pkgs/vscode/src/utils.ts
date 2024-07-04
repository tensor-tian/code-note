import "dayjs/locale/zh-cn";

import * as fs from "fs";
import * as vscode from "vscode";

import path from "path";
import toml from "toml";

export const isSubDirectory = (dir: string) => (p: string) => {
  const relative = path.relative(dir, p);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative);
};

async function fileExists(filePath: string): Promise<boolean> {
  try {
    const stat = await fs.promises.stat(filePath);
    return stat.isFile();
  } catch (err) {
    return false;
  }
}

type PackageInfo = { rootPath: string; name: string };

export async function getActiveWorkspacePackageInfo(): Promise<
  Partial<PackageInfo>
> {
  const project = vscode.workspace.workspaceFolders?.find((wsFolder) => {
    const currentFile = vscode.window.activeTextEditor?.document.uri.path;
    if (!currentFile) {
      return {};
    }
    const relative = path.relative(wsFolder.uri.path, currentFile);
    return relative && !relative.startsWith("..") && !path.isAbsolute(relative);
  });
  const rootPath = project?.uri.path;
  if (!rootPath) return {};
  const name = await findPackageName(rootPath);
  return { rootPath, name };
}

export async function getPackageInfo(
  file: string
): Promise<Partial<PackageInfo>> {
  let rootPath = path.dirname(file);
  let name = await findPackageName(rootPath);
  while (!name && rootPath !== "/") {
    rootPath = path.dirname(rootPath);
    name = await findPackageName(rootPath);
  }
  if (!name) return {};
  if (rootPath === "/") return {};
  return { name, rootPath };
}

async function findPackageName(dir: string): Promise<string | undefined> {
  try {
    // Check if package.json in the root directory
    const packageJsonPath = path.join(dir, "package.json");
    if (await fileExists(packageJsonPath)) {
      const packageJsonContent = await fs.promises.readFile(
        packageJsonPath,
        "utf8"
      );
      const packageJson = JSON.parse(packageJsonContent);
      if (packageJson && packageJson.name) {
        return packageJson.name;
      }
      return;
    }

    // Check if go.mod in the root directory
    const goModPath = path.join(dir, "go.mod");
    if (await fileExists(goModPath)) {
      const goModContent = await fs.promises.readFile(goModPath, "utf8");
      const moduleNameMatch = goModContent.match(/^module\s+([^\s]+)/m);
      if (moduleNameMatch && moduleNameMatch[1]) {
        return moduleNameMatch[1];
      }
    }

    // Check if Cargo.toml in the root directory
    const cargoTomlPath = path.join(dir, "Cargo.toml");
    if (await fileExists(cargoTomlPath)) {
      const cargoTomlContent = await fs.promises.readFile(
        cargoTomlPath,
        "utf8"
      );
      const cargoToml = toml.parse(cargoTomlContent);
      if (cargoToml && cargoToml.package && cargoToml.package.name) {
        return cargoToml.package.name;
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      console.log("Error parsing package config file: " + error.message, dir);
    }
    return;
  }
}

export async function closeFileIfOpen(file: vscode.Uri): Promise<void> {
  const tabs: vscode.Tab[] = vscode.window.tabGroups.all
    .map((tg) => tg.tabs)
    .flat();
  const index = tabs.findIndex(
    (tab) =>
      tab.input instanceof vscode.TabInputText &&
      tab.input.uri.path === file.path
  );
  if (index !== -1) {
    await vscode.window.tabGroups.close(tabs[index]);
  }
}

export function nextCol(col: vscode.ViewColumn | undefined): vscode.ViewColumn {
  return col ? col! + 1 : vscode.ViewColumn.Two;
}

/*
export function isDark() {
  const systemTheme = vscode.window.activeColorTheme.kind;
  return systemTheme === vscode.ColorThemeKind.Dark;
}
*/
