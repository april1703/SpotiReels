import React, { useContext } from "react";
import { ThemeContext } from "./ThemeContext";

export default function ThemeSwitch() {
  const { theme, setTheme } = useContext(ThemeContext);
  const isDark = theme === "dark";

  const onChange = (e) => {
    setTheme(e.target.checked ? "dark" : "light");
  };

  return (
    <label className="theme" aria-label="Toggle dark mode">
      <input
        className="theme__toggle"
        type="checkbox"
        role="switch"
        aria-checked={isDark}
        checked={isDark}
        onChange={onChange}
      />
      <span className="theme__icon" aria-hidden="true">
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
      <span className="theme__fill" aria-hidden="true" />
    </label>
  );
}
