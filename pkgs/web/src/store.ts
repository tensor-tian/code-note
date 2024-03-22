import { Block, Note } from "types";
type Action<T = any> = {
  type: string;
  data: T;
};
export function init(state: Note) {
  return state;
}
export function reducer(state: Note, action: Action) {
  switch (action.type) {
    case "add-block":
      state._auto_inc_block_id += 1;
      const block = {
        id: state._auto_inc_block_id,
      };
  }
  return state;
}

export const actions = {
  addBlock(
    loc: string,
    mdx: string,
    file: string,
    fileRanges: string
  ): Action<{ loc: string; file: string; fileRanges: string; mdx: string }> {
    return {
      type: "add-block",
      data: {
        loc,
        file,
        fileRanges,
        mdx,
      },
    };
  },
};

export type Dispatch = React.Dispatch<Action>;
