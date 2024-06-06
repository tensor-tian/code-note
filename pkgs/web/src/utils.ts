import { WebviewApi } from "vscode-webview";
import { customAlphabet } from "nanoid";
import debounce from "lodash.debounce";
import { Web2Ext } from "types";

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
