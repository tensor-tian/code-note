import { WebviewApi } from "vscode-webview";
import { customAlphabet } from "nanoid";
import debounce from "lodash.debounce";
import { Web2Ext } from "types";

export const nanoid = customAlphabet(
  "01234567890abcdefghijklmnopqrstuvwxyz",
  10
);

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
    action: "save-note",
    data: JSON.stringify(data, null, 2),
  });
}, 800);


