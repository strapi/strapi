import type { FolderStructure } from '../../../shared/contracts/folders';

export function findRecursiveFolderByValue(data: FolderStructure[], value: number | null) {
  let result;

  function iter(a: FolderStructure) {
    if (a.value === value) {
      result = a;

      return true;
    }

    return Array.isArray(a.children) && a.children.some(iter);
  }

  data.some(iter);

  return result;
}
