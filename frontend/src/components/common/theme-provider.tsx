"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

type ThemeContextType = {
  theme: string;
  setTheme: (theme: string) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<string>("");

  useEffect(() => {
    const savedTheme = localStorage.getItem("app-theme") || "";
    setThemeState(savedTheme);
    applyTheme(savedTheme);
  }, []);

  const applyTheme = (themeClass: string) => {
    const html = document.documentElement;
    html.classList.remove(
      "dark",
      "theme-a",
      "theme-a-dark",
      "theme-b",
      "theme-b-dark",
      "theme-c",
      "theme-c-dark",
      "theme-d",
      "theme-d-dark",
      "theme-pink",
      "theme-pink-dark",
      "theme-vercel",
      "theme-vercel-dark",
    );
    if (themeClass) {
      html.classList.add(themeClass);
    }
  };

  const setTheme = (themeClass: string) => {
    setThemeState(themeClass);
    applyTheme(themeClass);
    localStorage.setItem("app-theme", themeClass);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
