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
  text: `#### \`disposeAll\` dispose by hand 5 
  some text <Reference to="255s">_\`test\`_</Reference> Emphasis, aka italics, with *asterisks* or _underscores_.

# H1
## H2
### H3
#### H4
##### H5
###### H6

Emphasis, aka italics, with *asterisks* or _underscores_.

Strong emphasis, aka bold, with **asterisks** or __underscores__.

Combined emphasis with **asterisks and _underscores_**.

Strikethrough uses two tildes. ~~Scratch this.~~

1. First ordered list item
2. Another item
  - Unordered sub-list.
1. Actual numbers don't matter, just that it's a number
  1. Ordered sub-list
4. And another item.



- Unordered list can use asterisks
- Or minuses
- Or pluses

1. foo
  1. bar
    1. baz
      a. faz
2. foo2

- foo
  - bar
    - baz
      - faz
- foo2

[I'm an inline-style link](https://www.google.com)


Inline-style:
![alt text](https://github.com/adam-p/markdown-here/raw/master/src/common/images/icon48.png "Logo Title Text 1")

Inline \`code\` has \`back-ticks around\` it.

| Tables        | Are           | Cool  |
| ------------- |:-------------:| -----:|
| col 3 is      | right-aligned |  |
| col 2 is      | centered      |    |
| zebra stripes | are neat      |     |

> Blockquotes are very handy in email to emulate reply text.
> This line is part of the same quote.

Quote break.

> This is a very long line that will still be quoted properly when it wraps. Oh boy let's keep writing to make sure this is long enough to actually wrap for everyone. Oh, you can *put* **Markdown** into a blockquote.

`,
  ranges: "[[], [], [], []]",
  id: "",
};
