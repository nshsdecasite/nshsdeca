"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type SessionFocusContextValue = {
  isFocusMode: boolean;
  setFocusMode: (value: boolean) => void;
};

const SessionFocusContext = createContext<SessionFocusContextValue | null>(null);

export function SessionFocusProvider({ children }: { children: ReactNode }) {
  const [isFocusMode, setFocusMode] = useState(false);

  return (
    <SessionFocusContext.Provider value={{ isFocusMode, setFocusMode }}>
      {children}
    </SessionFocusContext.Provider>
  );
}

export function useSessionFocus() {
  const context = useContext(SessionFocusContext);
  if (!context) {
    return { isFocusMode: false, setFocusMode: () => {} };
  }
  return context;
}
