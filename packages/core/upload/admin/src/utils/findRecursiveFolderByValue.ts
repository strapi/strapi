import type { FolderNode } from '../../../shared/contracts/folders';

interface FolderStructureValue extends Omit<FolderNode, 'children'> {
  value?: string | number | null;
  children?: FolderStructureValue[];
  label?: string;
}

type Value = number | null | { value: number | null };

export function findRecursiveFolderByValue(
  data: FolderStructureValue[],
  value: Value
): FolderStructureValue | undefined {
  let result: FolderStructureValue | undefined;

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
