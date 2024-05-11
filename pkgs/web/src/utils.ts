import type { Block, Note } from "types";

import { WebviewApi } from "vscode-webview";
import { customAlphabet } from "nanoid";
import debounce from "lodash.debounce";

export const nanoid = customAlphabet(
  "01234567890abcdefghijklmnopqrstuvwxyz",
  10
);

export const Layout = {
  code: {
    X: 50,
    Y: 46,
    W: 600,
    H: 58,
  },
  tree: 100,
};

export const DefaultViewport = {
  x: 0,
  y: 0,
  zoom: 1.0,
};

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

export const saveNote = debounce((note: Note<Block>) => {
  vscode.postMessage({
    action: "save-note",
    data: note,
  });
}, 300);
