import { createContext, useContext } from 'react';

export const FolderCardContext = createContext<{
  id?: string;
}>({});

export function useFolderCard() {
  return useContext(FolderCardContext);
}
