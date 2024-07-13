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
  text: `<LangEn>

### Access value by key
_\`mapaccess(t, h, key)\`_ is the implementation of map get in Go.

\`\`\`go
var val = h[key]
var val, exists = h[key]
for key, val := range h {
  // ...
}
\`\`\`
<SectionText>
Go choose [Seperate chaining](https://en.wikipedia.org/wiki/Hash_table#Separate_chaining) method for resolving collision.

1. It first locates the bucket _\`b\`_ by hashing the _\`key\`_.
2. Then, it traverses the linked list of bucket, comparing key.
3. If the key is found, it returns the associated value.
4. Otherwise, it returns zero value if not found.


 </SectionText> 
</LangEn>
<LangZh>

### Access value by key 2
_\`mapaccess(t, h, key)\`_ is the implementation of map get in Go.

\`\`\`go
var val = h[key]
var val, exists = h[key]
for key, val := range h {
  // ...
}
\`\`\`
<SectionText>

Go choose [Seperate chaining](https://en.wikipedia.org/wiki/Hash_table#Separate_chaining) method for resolving collision.

1. It first locates the bucket _\`b\`_ by hashing the _\`key\`_.
2. Then, it traverses the linked list of bucket, comparing key.
3. If the key is found, it returns the associated value.
4. Otherwise, it returns zero value if not found.

</SectionText>
</LangZh>
`,
  ranges: "[[], [], [], []]",
  id: "",
};

function cap1stChar(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function extractInnerContent<T extends string>(text: string, category: T, prefix?: string) {
  const tag = (prefix ?? "") + cap1stChar(category);
  const regStr = `([\\s\\S]*)<${tag}>([\\s\\S]*?)<\\/${tag}>([\\s\\S]*)`;
  const ret = text.match(new RegExp(regStr));
  const inner = ret ? ret[2] : text;
  const outside = ret ? (ret[1] ?? "") + "\n" + (ret[3] ?? "") : "";
  return {
    inner,
    outside,
  };
}

export function unwrap(text: string, tag: string): string {
  const regStr = `([\\s\\S]*)<${tag}>([\\s\\S]*?)<\\/${tag}>([\\s\\S]*)`;
  const ret = text.match(new RegExp(regStr));
  if (!ret) {
    return text;
  }
  return `${ret[1]}\n${ret[2]}\n${ret[3]}\n`;
}
