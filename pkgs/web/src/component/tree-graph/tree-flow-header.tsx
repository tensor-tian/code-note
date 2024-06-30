import { Panel, useStore } from "reactflow";
import { selectTitleState } from "./selector";
import { useTreeNoteStore } from "./store";
import MDX from "../mdx";
import { DefaultNodeDimension } from "./layout";
import cls from "classnames";
import { MdLanguage } from "react-icons/md";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import { useCallback } from "react";
import { Lang } from "types";

const langs: { name: string; value: Lang }[] = [
  { name: "中文", value: "zh" },
  { name: "English", value: "en" },
];

function Title() {
  const { text, debug, nodeIds, id, lang } = useTreeNoteStore(selectTitleState);
  const { setKV } = useTreeNoteStore();

  const { activateNode } = useTreeNoteStore();
  const viewport = useStore(
    (s) => `x: ${s.transform[0].toFixed(2)}, y: ${s.transform[1].toFixed(2)}, zoom: ${s.transform[2].toFixed(2)}`
  );
  const onLangChange = useCallback(
    (e: { target: { value: string; name: string } }) => {
      setKV("lang", e.target.value as Lang);
    },
    [setKV]
  );

  return (
    <>
      <Panel position="top-left" className="border px-4 py-4 max-w-xl w-[600px]">
        <div className="px-1">
          <div className="flex justify-end">
            <FormControl size="small" className="w-[100px]">
              <InputLabel id="demo-simple-select-label">Language</InputLabel>
              <Select
                labelId="demo-simple-select-label"
                id="demo-simple-select"
                value={lang}
                label="Language"
                onChange={onLangChange}
                IconComponent={MdLanguage}
              >
                {langs.map(({ name, value }) => (
                  <MenuItem key={value} value={value}>
                    {name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
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
