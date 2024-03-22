import { Block, Graph, Note } from "types";

const block: Block = {
  id: "0",
  loc: `dianostics.ts|subscribeToDocumentChanges()`,
  text: `监听tab 激活、编辑、关闭文档等事件`,
  pkgName: "code-actions-sample",
  mdx: `export function subscribeToDocumentChanges(context: vscode.ExtensionContext, emojiDiagnostics: vscode.DiagnosticCollection): void {
    if (vscode.window.activeTextEditor) {
      refreshDiagnostics(vscode.window.activeTextEditor.document, emojiDiagnostics);
    }
    context.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) {
          refreshDiagnostics(editor.document, emojiDiagnostics);
        }
      })
    );
  
    context.subscriptions.push(
      vscode.workspace.onDidChangeTextDocument(e => refreshDiagnostics(e.document, emojiDiagnostics))
    );
  
    context.subscriptions.push(
      vscode.workspace.onDidCloseTextDocument(doc => emojiDiagnostics.delete(doc.uri))
    );
  
}`,
  file: "/Users/jinmao/code/vscode/vscode-extension-samples/code-actions-sample/src/diagnostics.ts",
  fileRanges: [{ from: 47, to: 67 }],
};

const blockMap: Note["blockMap"] = {};
const nodes: Graph["nodes"] = {};
for (let i = 1; i <= 10; i++) {
  const id = String(i);
  blockMap[id] = {
    ...block,
    id: id,
    type: "treeNode",
    text: `${id}. ${block.text}`,
  };
  nodes[id] = { position: { x: i * 100, y: i * 100 }, type: "treeNode" };
}
const tree: Graph = {
  text: "call graph",
  nodes: nodes,
  edges: [],
};
const note: Note = {
  title: "# decrator-sample bootstrap",
  pkgName: "decorator-sample",
  _auto_inc_block_id: Object.keys(blockMap).length,
  _auto_inc_edge_id: Object.keys(tree).length,
  blockMap,
  tree,
  graphs: [],
};

export default note;
