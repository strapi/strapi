import type { FolderStructure } from '../../../shared/contracts/folders';

interface FolderStructureValue extends Omit<FolderStructure, 'children'> {
  value: number | null;
  children?: FolderStructureValue[];
}

export function findRecursiveFolderByValue(data: FolderStructureValue[], value: number | null) {
  let result;

  function iter(a: FolderStructureValue) {
    if (a.value === value) {
      result = a;

      return true;
    }

    return Array.isArray(a.children) && a.children.some(iter);
  }

  data.some(iter);

  return result;
}
