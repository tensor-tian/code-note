import { init, reducer } from "./store";
import { useCallback, useReducer, useState } from "react";

import { Block } from "types";
import Markdown from "react-markdown";
import TreeGraph from "./comps/tree-graph";
import initialNote from "./note.example";
import remarkGfm from "remark-gfm";

function App() {
  const [note, dispatch] = useReducer(reducer, initialNote);
  return (
    <>
      <div className="h-10 bg-green">
        <Markdown remarkPlugins={[remarkGfm]}>{note.title}</Markdown>
      </div>
      <TreeGraph
        className="top-10 bottom-0 w-full absolute "
        note={note}
        dispatch={dispatch}
      />
    </>
  );
}

export default App;
