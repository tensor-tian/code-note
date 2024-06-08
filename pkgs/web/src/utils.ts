import { WebviewApi } from "vscode-webview";
import { customAlphabet } from "nanoid";
import debounce from "lodash.debounce";
import { Ext2Web, Web2Ext } from "types";

export const nanoid = customAlphabet("01234567890abcdefghijklmnopqrstuvwxyz", 10);

const mock: WebviewApi<any> = {
  postMessage(message: unknown) {
    console.log("post message to extension:", message);
  },
  getState(): any {
    return "";
  },
  setState<T extends any>(newState: T): T {
    return newState;
  },
};

export let isVscode = true;

if (!window.acquireVsCodeApi) {
  isVscode = false;
  window.acquireVsCodeApi = () => mock;
}

export const vscode: WebviewApi<Web2Ext.Message> = acquireVsCodeApi();

export const saveNote = debounce((data: any) => {
  vscode.postMessage({
    action: "web2ext-save-note",
    data: JSON.stringify(data, null, 2),
  } as Web2Ext.SaveNote);
}, 800);

export const vscodeMessage = {
  warn: (msg: string) => {
    vscode.postMessage({
      action: "web2ext-show-warn",
      data: msg,
    } as Web2Ext.ShowMsg);
  },

  error: (msg: string) => {
    vscode.postMessage({
      action: "web2ext-show-error",
      data: msg,
    } as Web2Ext.ShowMsg);
  },

  info: (msg: string) => {
    vscode.postMessage({
      action: "web2ext-show-info",
      data: msg,
    } as Web2Ext.ShowMsg);
  },
};
export const DEFAULT_BLOCK: Ext2Web.AddCode["data"] = {
  type: "Code",
  code: `\`\`\`ts src/dispose.ts lineNums=18:33 focus=22[1:32],23:25,26[1:15],33
if (this._isDisposed) {
    return;
  }
  this._isDisposed = true;
// mark[3:12]
  disposeAll(this._disposables);
}

protected _register<T extends vscode.Disposable>(value: T): T {
  if (this._isDisposed) {
    value.dispose();
  } else {
    this._disposables.push(value);
  }
  return value;
}
* configuration for mermaid rendering and calls init for rendering the mermaid diagrams on the
\`\`\`
`,
  rowCount: 15,
  filePath: "src/dispose.ts",
  pkgName: "custom-editor-sample",
  pkgPath: "/Users/jinmao/code/vscode/vscode-extension-samples/custom-editor-sample",
  text: `##### \`disposeAll\` dispose by hand 5 
  
  Emphasis, aka italics, with *asterisks* or _underscores_.

`,
  showCode: true,
  ranges: [],
  id: "",
};
