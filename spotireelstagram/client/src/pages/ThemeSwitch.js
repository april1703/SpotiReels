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
    
        return (<ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>);
}

export function ThemeSwitch() {
  const {theme, setTheme} = useContext(ThemeContext);
  const isDark = theme === "dark";
  
  return (
    <label className="theme">
      <input
        type="checkbox"
        className="theme__toggle"
        checked={isDark}
        onChange={(e) => setTheme(e.target.checked ? "dark" :"light" )}
      />
      <span className="theme__icon">
        {/* sun/moon parts */}
        <span className="theme__icon-part" />
        <span className="theme__icon-part" />
        <span className="theme__icon-part" />
        <span className="theme__icon-part" />
        <span className="theme__icon-part" />
        <span className="theme__icon-part" />
        <span className="theme__icon-part" />
        <span className="theme__icon-part" />
        <span className="theme__icon-part" />
      </span>
    </label>
  );
}
