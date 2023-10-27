import * as React from 'react';

/* -------------------------------------------------------------------------------------------------
 * Context
 * -----------------------------------------------------------------------------------------------*/

interface LibraryContextValue {
  fields?: Record<string, React.ComponentType>;
  components?: Record<string, React.ComponentType>;
}

const LibraryContext = React.createContext<LibraryContextValue>({});

/* -------------------------------------------------------------------------------------------------
 * Provider
 * -----------------------------------------------------------------------------------------------*/

interface LibraryProviderProps extends LibraryContextValue {
  children: React.ReactNode;
}

const LibraryProvider = ({ children, fields, components }: LibraryProviderProps) => {
  const value = React.useMemo(() => ({ fields, components }), [fields, components]);

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
};

/* -------------------------------------------------------------------------------------------------
 * Hook
 * -----------------------------------------------------------------------------------------------*/

const useLibrary = () => React.useContext(LibraryContext);

export { LibraryContext, LibraryProvider, useLibrary };
export type { LibraryContextValue, LibraryProviderProps };
