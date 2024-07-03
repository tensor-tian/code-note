import { PropsWithChildren, useCallback, useState } from "react";
import { Panel } from "reactflow";
import { Lang, ThemeMode } from "types";
import { useTreeNoteStore } from "./store";
import { selectSettingState } from "./selector";
import { MdLanguage } from "react-icons/md";
import Button from "@mui/material/Button";
import MuiMenu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemText from "@mui/material/ListItemText";
import ListItemIcon from "@mui/material/ListItemIcon";
import {
  MdOutlineLightMode as IconLight,
  MdOutlineModeNight as IconDark,
  MdComputer as IconSystem,
} from "react-icons/md";
import { IconType } from "react-icons";

const Icons = {
  light: IconLight,
  dark: IconDark,
  system: IconSystem,
} as const;

const ThemeModes: { name: string; value: ThemeMode }[] = [
  {
    name: "light",
    value: "light",
  },
  {
    name: "dark",
    value: "dark",
  },
  {
    name: "system",
    value: "system",
  },
];

const langs: { name: string; value: Lang }[] = [
  { name: "中文", value: "zh" },
  { name: "English", value: "en" },
];

export type SettingProps = {
  setThemeMode: (mode: ThemeMode) => void;
  themeMode: ThemeMode;
  mode: Exclude<ThemeMode, "system">;
};

export default function Setting({ setThemeMode, themeMode, mode }: SettingProps) {
  const { lang } = useTreeNoteStore(selectSettingState);
  const { setKV } = useTreeNoteStore();
  const onLangChange = useCallback(
    (v: Lang) => {
      setKV("lang", v);
    },
    [setKV]
  );
  const IconMode = Icons[mode];
  const langName = langs.find(({ value }) => value === lang)?.name;
  console.log("language:", langs, lang, langName);

  return (
    <Panel position="top-right" className="border border-solid border-gray-300 rounded-sm">
      <div className="flex justify-end">
        <Menu<Lang> options={langs} value={lang} onSelectOption={onLangChange}>
          <span className="px-2">{langName}</span>
          <MdLanguage />
        </Menu>
        <Menu<ThemeMode> options={ThemeModes} value={themeMode} onSelectOption={setThemeMode} IconMap={Icons}>
          <IconMode />
        </Menu>
      </div>
    </Panel>
  );
}

type MenuProps<T extends string> = {
  options: { name: string; value: T }[];
  value: T;
  IconMap?: Record<T, IconType>;
  onSelectOption: (v: T) => void;
};

function Menu<T extends string>({
  value,
  options,
  IconMap,
  onSelectOption,
  children,
}: PropsWithChildren<MenuProps<T>>) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);
  const openMenu = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);
  const closeMenu = useCallback(() => {
    setAnchorEl(null);
  }, []);
  const selectOption = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      const val = event.currentTarget.getAttribute("data-value") as T;
      onSelectOption(val);
      setAnchorEl(null);
    },
    [onSelectOption]
  );
  return (
    <>
      <Button onClick={openMenu} size="small">
        {children}
      </Button>
      <MuiMenu
        id="basic-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={closeMenu}
        MenuListProps={{
          "aria-labelledby": "basic-button",
        }}
      >
        {options.map(({ name, value }) => {
          let Icon: IconType | undefined = undefined;
          if (IconMap) Icon = IconMap[value];
          return (
            <MenuItem key={value} data-value={value} onClick={selectOption}>
              {Icon && (
                <ListItemIcon>
                  <Icon />
                </ListItemIcon>
              )}
              <ListItemText>{name}</ListItemText>
            </MenuItem>
          );
        })}
      </MuiMenu>
    </>
  );
}
