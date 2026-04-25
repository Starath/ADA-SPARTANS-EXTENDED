"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import type { FontSettings } from "@/types";

interface FontContextValue extends FontSettings {
  increase: () => void;
  applyDyslexicFont: () => void;
  reset: () => void;
}

const DEFAULT: FontSettings = {
  fontSize: 16,
  lineHeight: 1.6,
  letterSpacing: 0,
  fontFamily: "default",
};

const FontContext = createContext<FontContextValue>({
  ...DEFAULT,
  increase: () => {},
  applyDyslexicFont: () => {},
  reset: () => {},
});

export function useFontController() {
  return useContext(FontContext);
}

export function FontControllerProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<FontSettings>(DEFAULT);

  const increase = () =>
    setSettings((s) => ({
      ...s,
      fontSize: Math.min(s.fontSize + 2, 28),
      lineHeight: Math.min(s.lineHeight + 0.2, 2.4),
    }));

  const applyDyslexicFont = () =>
    setSettings((s) => ({
      ...s,
      fontFamily: "opendyslexic",
      letterSpacing: 0.12,
      lineHeight: Math.max(s.lineHeight, 2.0),
    }));

  const reset = () => setSettings(DEFAULT);

  return (
    <FontContext.Provider value={{ ...settings, increase, applyDyslexicFont, reset }}>
      {children}
    </FontContext.Provider>
  );
}
