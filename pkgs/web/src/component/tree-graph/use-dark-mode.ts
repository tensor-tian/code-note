import { useMediaQuery } from "usehooks-ts";
import { selectThemeMode } from "./selector";
import { useTreeNoteStore } from "./store";
import { useCallback } from "react";
import { ThemeMode, Web2Ext } from "types";
import { vscode } from "../../utils";
import { createTheme } from "@mui/material/styles";

const COLOR_SCHEME_QUERY = "(prefers-color-scheme: dark)";

const themes = {
  dark: createTheme({
    palette: {
      mode: "dark",
      primary: {
        main: "#9ca3af", //gray 400
        light: "#e5e7eb", // gray 200
        dark: "#52525b", // gray 600
        contrastText: "#111827", // gray 900
      },
    },
    typography: {
      button: {
        textTransform: "none",
      },
    },
  }),
  light: createTheme({
    palette: {
      mode: "light",
      primary: {
        main: "#1a202c", //gray 400
        light: "#e5e7eb", // gray 200
        dark: "#52525b", // gray 600
        contrastText: "#111827", // gray 900
      },
    },
    typography: {
      button: {
        textTransform: "none",
      },
    },
  }),
};
export function useDarkMode() {
  const isDarkOS = useMediaQuery(COLOR_SCHEME_QUERY, {});
  const themeMode = useTreeNoteStore(selectThemeMode);
  const { setKV } = useTreeNoteStore();
  const mode = themeMode !== "system" ? themeMode : isDarkOS ? "dark" : "light";
  const theme = themes[mode];
  const setThemeMode = useCallback(
    (v: ThemeMode) => {
      setKV("themeMode", v);
      vscode.postMessage({ action: "web2ext-set-theme-mode", data: v } as Web2Ext.SetThemeMode);
    },
    [setKV]
  );
  return {
    mode,
    theme,
    themeMode,
    setThemeMode,
  };
}
