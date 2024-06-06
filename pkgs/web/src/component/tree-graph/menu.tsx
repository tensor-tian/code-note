import { Ext2Web, Note, Web2Ext } from "types";
import { Panel, useStore } from "reactflow";
import { isVscode, nanoid, vscode } from "../../utils";
import { selectMenuState } from "./selector";
import { iDGenerator, useTreeNoteStore } from "./store";
import { useSpring, animated } from "@react-spring/web";
import MDX from "../mdx";
import { useCallback, useMemo, useState, ChangeEvent } from "react";
import { VSCodeOption, VSCodeDropdown, VSCodeButton } from "@vscode/webview-ui-toolkit/react";

const block: Ext2Web.AddCode["data"] = {
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

type Props = {
  addBlock: ({ action, data }: Ext2Web.AddCode) => void;
};

function Menu({ addBlock }: Props) {
  const addDetail = useCallback(() => {
    addBlock({ action: "ext2web-add-detail", data: { ...block, id: nanoid() } });
  }, [addBlock]);
  const addNext = useCallback(() => {
    addBlock({ action: "ext2web-add-next", data: { ...block, id: nanoid() } });
  }, [addBlock]);

  const {
    resetNote,
    setKV,
    groupNodes: _groupNodes,
    splitGroup,
    deleteEdge,
    deleteNode,
    forceLayout,
  } = useTreeNoteStore();
  const { id, text, type: typ, settings, debug, canGroupNodes, canSplitGroup } = useTreeNoteStore(selectMenuState);

  const viewport = useStore(
    (s) => `x: ${s.transform[0].toFixed(2)}, y: ${s.transform[1].toFixed(2)}, zoom: ${s.transform[2].toFixed(2)}`
  );
  const startEdit = useCallback(() => {
    vscode.postMessage({
      action: "web2ext-start-text-editor",
      data: { id, text, type: typ },
    } as Web2Ext.StartTextEditor);
  }, [id, text, typ]);

  const toggleDebug = useCallback(() => {
    setKV("debug", !debug);
  }, [debug, setKV]);

  const [showForm, setShowForm] = useState(false);

  const toggleForm = useCallback(() => {
    setShowForm(!showForm);
  }, [showForm]);

  const formStyle = useSpring({
    height: showForm ? "auto" : 0,
    opacity: showForm ? 1 : 0,
  });
  const onSettingsChange = useCallback(
    (key: string) =>
      function (e: React.ChangeEvent<HTMLSelectElement>) {
        setKV("settings", {
          ...settings,
          [key]: +e.target.value,
        });
      },
    [setKV, settings]
  );
  const list = useMemo(
    () => (
      <>
        {[
          {
            id: "settings-w",
            key: "settings-w",
            label: "Max Width:",
            value: settings.W.toString(),
            options: ["500", "600", "700", "800", "900"],
            onChange: onSettingsChange("W"),
          },
          {
            id: "settings-y",
            key: "settings-y",
            label: "Vertical Gap:",
            value: settings.Y.toString(),
            options: ["40", "50", "60", "70", "80"],
            onChange: onSettingsChange("Y"),
          },
          {
            id: "settings-x",
            key: "settings-x",
            label: "Horizontal Gap:",
            value: settings.X.toString(),
            options: ["60", "80", "100", "120", "140"],
            onChange: onSettingsChange("X"),
          },
        ].map((props) => (
          <Dropdown {...props} />
        ))}
      </>
    ),
    [onSettingsChange, settings.W, settings.X, settings.Y]
  );

  const openFile = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      console.log("receive files:", e.target);
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      const note = JSON.parse(text) as Note;
      resetNote(note);
    },
    [resetNote]
  );

  const groupNodes = useCallback(async () => {
    const [id] = await iDGenerator.requestIDs(1);
    _groupNodes(id);
  }, [_groupNodes]);

  return (
    <>
      <Panel position="top-left" className="border px-4 py-4">
        <div className="px-1">
          <MDX mdx={text} />
        </div>
        <div className="flex justify-between align-middle ">
          <VSCodeButton onClick={startEdit}>Edit</VSCodeButton>
          {!isVscode && <VSCodeButton onClick={addDetail}>Add Detail</VSCodeButton>}
          {!isVscode && <VSCodeButton onClick={addNext}>Add Next</VSCodeButton>}
          {<VSCodeButton onClick={toggleDebug}>Debug</VSCodeButton>}
          <VSCodeButton onClick={deleteEdge}>
            <s>Edge</s>
          </VSCodeButton>
          <VSCodeButton onClick={deleteNode}>
            <s>Node</s>
          </VSCodeButton>
          <VSCodeButton onClick={groupNodes} disabled={!canGroupNodes}>
            Group Nodes
          </VSCodeButton>
          <VSCodeButton onClick={splitGroup} disabled={!canSplitGroup}>
            Split Group
          </VSCodeButton>
          <VSCodeButton onClick={forceLayout}>Layout</VSCodeButton>
          <VSCodeButton onClick={toggleForm}>Edit Settings</VSCodeButton>
          {debug && (
            <pre className="text-xs m-2 mt-1 h-6 leading-6 border-gray rounded border px-3  bg-gray-300">
              {viewport}
            </pre>
          )}
        </div>
        <animated.div className="flex justify-between  pt-4" style={formStyle}>
          {list}
        </animated.div>
      </Panel>
    </>
  );
}

export default Menu;

type DropdownProps = {
  id: string;
  label: string;
  options: string[];
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
} & React.HTMLAttributes<HTMLSelectElement>;

function Dropdown({ id, label, options, value, onChange, ...rest }: DropdownProps) {
  return (
    <div key={id}>
      <label htmlFor={id} className="text-xs px-6">
        {label}
      </label>
      {/* @ts-ignore */}
      <VSCodeDropdown id={id} onChange={onChange} {...rest}>
        {options.map((val) => (
          <VSCodeOption key={val} value={val} selected={val === value} className="py-1 text-xs">
            {val}
          </VSCodeOption>
        ))}
      </VSCodeDropdown>
    </div>
  );
}
