import type { Block, Note } from "types";

import { WebviewApi } from "vscode-webview";
import { customAlphabet } from "nanoid";
import debounce from "lodash.debounce";

export const nanoid = customAlphabet(
  "01234567890abcdefghijklmnopqrstuvwxyz",
  10
);

const mock: WebviewApi<string> = {
  postMessage(message: unknown) {
    console.log("post message to extension:", message);
  },
  getState(): string {
    return "";
  },
  setState<T extends string | undefined>(newState: T): T {
    return newState;
  },
};

if (!window.acquireVsCodeApi) {
  window.acquireVsCodeApi = () => mock;
}

export const vscode = acquireVsCodeApi();

export const saveNote = debounce((data: string) => {
  vscode.postMessage({
    action: "save-note",
    data,
  });
}, 500);
