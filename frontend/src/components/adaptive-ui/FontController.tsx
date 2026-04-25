"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { FontSettings } from "@/types";

interface FontContextValue extends FontSettings {
  increase: () => void;
  applyDyslexicFont: () => void;
  reset: () => void;
}

const DEFAULT: FontSettings = {
  fontSize: 16,
  lineHeight: 1.5,
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

  const increase = useCallback(() => {
    setSettings((s) => ({
      ...s,
      fontSize: Math.min(s.fontSize + 2, 28),
      lineHeight: Math.min(s.lineHeight + 0.2, 2.4),
    }));
  }, []);

  const applyDyslexicFont = useCallback(() => {
    setSettings((s) => ({
      ...s,
      fontFamily: "opendyslexic",
      letterSpacing: Math.max(s.letterSpacing, 1),
      lineHeight: Math.max(s.lineHeight, 2.0),
    }));
  }, []);

  const reset = useCallback(() => {
    setSettings(DEFAULT);
  }, []);

  const value = useMemo(
    () => ({
      ...settings,
      increase,
      applyDyslexicFont,
      reset,
    }),
    [settings, increase, applyDyslexicFont, reset]
  );

  return <FontContext.Provider value={value}>{children}</FontContext.Provider>;
}