import { createContext, useEffect, useMemo, useState, useContext} from 'react';

export const ThemeContext = createContext({
  theme: "dark",
  toggleTheme: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "dark"
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("theme", theme);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      toggleTheme: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
      setTheme
    }),
    [theme]
  );
    
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function ThemeSwitch() {
  const {theme, setTheme} = useContext(ThemeContext);
  const isLight = theme === "light";
  
  return (
    <label className="ab-switch" aria-label="Toggle light mode">
      <input
        type="checkbox"
        checked={isLight}
        onChange={(e) => setTheme(e.target.checked ? "light" :"dark")}
        aria-checked={isLight}
      />
      <span className="ab-slider" />
    </label>
  );
}
