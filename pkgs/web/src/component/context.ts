import { createContext, useContext } from "react";
import { ThemeMode } from "types";

type Mode = Exclude<ThemeMode, "system">;
const ThemeModeContext = createContext<Mode>("light");

export const ThemeModeProvider = ThemeModeContext.Provider;

export function useThemeMode() {
  return useContext(ThemeModeContext);
}
