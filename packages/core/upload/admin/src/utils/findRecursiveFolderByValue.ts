import type { FolderNode } from '../../../shared/contracts/folders';

interface FolderStructureValue extends Omit<FolderNode, 'children'> {
  value: number | null;
  children?: FolderStructureValue[];
}

type Value = number | null | { value: number | null };

export function findRecursiveFolderByValue(data: FolderStructureValue[], value: Value) {
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
