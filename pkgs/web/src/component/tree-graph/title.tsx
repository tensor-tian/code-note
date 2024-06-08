import { Panel, useStore } from "reactflow";
import { selectMenuState } from "./selector";
import { useTreeNoteStore } from "./store";
import { useSpring, animated } from "@react-spring/web";
import MDX from "../mdx";
import { DefaultNodeDimension } from "./layout";

function Title() {
  const { text, debug } = useTreeNoteStore(selectMenuState);

  const viewport = useStore(
    (s) => `x: ${s.transform[0].toFixed(2)}, y: ${s.transform[1].toFixed(2)}, zoom: ${s.transform[2].toFixed(2)}`
  );

  const style = useSpring({
    height: debug ? "auto" : 0,
    opacity: debug ? 1 : 0,
  });

  return (
    <>
      <Panel position="top-left" className="border px-4 py-4">
        <div className="px-1" style={{ width: 600 }}>
          <MDX mdx={text} width={DefaultNodeDimension.W} />
        </div>
        <animated.div className="flex justify-between  pt-4" style={style}>
          <pre className="text-xs m-2 mt-1 h-6 leading-6 border-gray rounded border px-3  bg-gray-300">{viewport}</pre>
        </animated.div>
      </Panel>
    </>
  );
}

export default Title;
