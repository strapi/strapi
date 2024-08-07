import { createContext, useContext } from 'react';

export const FolderCardContext = createContext<FolderCardContextValue>({});
import type { Folder } from '../../../../../shared/contracts/folders';

interface FolderCardContextValue {
  id?: Folder['id'];
  name?: Folder['name'];
}

export function useFolderCard() {
  return useContext(FolderCardContext);
}
