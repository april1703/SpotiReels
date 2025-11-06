import React, { createContext, useEffect, useMemo, useState } from "react";

export const ThemeContext = createContext({
    theme: "dark",
    toggleTheme: () => {},
    setTheme: () => {}
});

export function ThemeProvider({ children }) {
    const [theme, setTheme ] = useState(
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