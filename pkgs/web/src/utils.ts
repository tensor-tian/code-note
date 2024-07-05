import { WebviewApi } from "vscode-webview";
import { customAlphabet } from "nanoid";
import debounce from "lodash.debounce";
import { Ext2Web, Web2Ext } from "types";
import Debug from "debug";

const log = Debug("vscode-note:utils");

export const nanoid = customAlphabet("01234567890abcdefghijklmnopqrstuvwxyz", 10);

const mock: WebviewApi<any> = {
  // @ts-ignore
  isMock: true,
  postMessage(message: unknown) {
    log("post message to extension:", message);
  },
  getState(): any {
    return "";
  },
  setState<T extends any>(newState: T): T {
    return newState;
  },
};

export const vscode: WebviewApi<Web2Ext.Message> = typeof acquireVsCodeApi === "function" ? acquireVsCodeApi() : mock;
export const isVscode = !("isMock" in vscode && vscode.isMock);

export const saveNote = debounce((data: any) => {
  log("save note:", data);
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

export const DEFAULT_BLOCK: Ext2Web.AddNode["data"] = {
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
  text: `###  Go map 相关的数据结构字段


Go \`map\` 的使用基于拉链法（[separate chaining | wikipedia](https://en.wikipedia.org/wiki/Hash_table#Separate_chaining)）的哈希表实现。
拉链法中，将散列值相同的键值对所在的桶串联成桶链表，桶数组中每一个元素都是一个桶链表的头 （header of linked list）。

对应的数据结构：
| 简称   |                 | Go               |
|-------|-----------------|------------------|
| 桶     | bucket          | _\`bmap\`_         |
| 桶数组 | array of bucket | _\`hmap.buckets\`_ |
| 桶链表 ｜ linked list of bucket | _\`hmap.bucket[i]\`_ _\`mapextra.overflow[i]\`_ |

`,
  ranges: "[[], [], [], []]",
  id: "",
};
