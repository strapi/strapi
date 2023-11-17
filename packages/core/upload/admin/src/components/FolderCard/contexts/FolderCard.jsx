import { createContext, useContext } from 'react';

export const FolderCardContext = createContext({});

export function useFolderCard() {
  return useContext(FolderCardContext);
}
