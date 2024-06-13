import { Panel, useStore } from "reactflow";
import { selectTitleState } from "./selector";
import { useTreeNoteStore } from "./store";
import MDX from "../mdx";
import { DefaultNodeDimension } from "./layout";
import cls from "classnames";

function Title() {
  const { text, debug, nodeIds, id } = useTreeNoteStore(selectTitleState);

  const { activateNode } = useTreeNoteStore();
  const viewport = useStore(
    (s) => `x: ${s.transform[0].toFixed(2)}, y: ${s.transform[1].toFixed(2)}, zoom: ${s.transform[2].toFixed(2)}`
  );

  return (
    <>
      <Panel position="top-left" className="border px-4 py-4 max-w-xl">
        <div className="px-1" style={{ width: 600 }}>
          <MDX mdx={text} width={DefaultNodeDimension.W} id={"note-header-" + id} />
        </div>
        <div className={cls("pt-4", { hidden: !debug })}>
          <pre className="text-xs m-2 mt-1 h-6 leading-6 border-gray rounded border px-3  bg-gray-300">{viewport}</pre>
          <div className="text-xs flex gap-2 m-2 flex-wrap">
            {nodeIds.map((id) => (
              <pre
                key={id}
                onClick={() => {
                  console.log("click debug node:");
                  activateNode(id);
                }}
                className="bg-gray-200 px-2 py-0.5 rounded border border-gray-500"
              >
                {id}
              </pre>
            ))}
          </div>
        </div>
      </Panel>
    </>
  );
}

export default Title;
