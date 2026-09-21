'use client';

import { createContext, useContext, ReactNode } from 'react';

interface ReadOnlyContextValue {
  isReadOnly: boolean;
  message?: string;
}

const ReadOnlyContext = createContext<ReadOnlyContextValue>({
  isReadOnly: false,
});

export function ReadOnlyProvider({
  isReadOnly,
  message,
  children,
}: {
  isReadOnly: boolean;
  message?: string;
  children: ReactNode;
}) {
  return (
    <ReadOnlyContext.Provider value={{ isReadOnly, message }}>
      {children}
    </ReadOnlyContext.Provider>
  );
}

export function useReadOnly() {
  return useContext(ReadOnlyContext);
}
