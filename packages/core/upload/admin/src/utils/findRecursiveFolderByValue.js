export default function findRecursiveFolderByValue(data, value) {
  let result;

  function iter(a) {
    if (a.value === value) {
      result = a;

      return true;
    }

    return Array.isArray(a.children) && a.children.some(iter);
  }

  data.some(iter);

  return result;
}
