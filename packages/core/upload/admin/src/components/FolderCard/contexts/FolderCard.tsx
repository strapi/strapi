import { createContext, useContext } from 'react';
import type { Folder } from '../../../../../shared/contracts/folders';

type FolderCardContextValue = Partial<Folder>;

export const FolderCardContext = createContext<FolderCardContextValue>({});

export function useFolderCard() {
  return useContext(FolderCardContext);
}
