import { useTheme } from "next-themes";
import React, { useEffect, useState } from "react";
import SimpleDropDownSelector from "../ui/SimpleDropDownSelector";
import { PALETTES } from "../../../lib/appearance";

const THEMES = {
  system: { name: "system" },
  ...Object.fromEntries(Object.entries(PALETTES).map(([key, p]) => [key, { name: p.name }])),
};


const ThemeSelector = () => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return (
    <>
      <SimpleDropDownSelector
        buttonName="theme options"
        onSelect={setTheme}
        items={THEMES}
        selected={
          mounted ? (theme == "system" ? `System` : THEMES?.[theme]?.name) : ""
        }
      />
    </>
  );
};

export default ThemeSelector;
