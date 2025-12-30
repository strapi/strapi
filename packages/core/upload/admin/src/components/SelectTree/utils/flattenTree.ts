type TreeNode<T> = {
  value: T;
  children?: TreeNode<T>[];
  label?: string;
  path?: string;
};

export type FlattenedNode<T> = {
  value: T;
  parent?: T;
  depth: number;
  // we need the label in places where flattenTree is used
  label?: string;
  path?: string;
  children?: TreeNode<T>[];
};

export function flattenTree<T>(
  tree: TreeNode<T>[],
  parent: TreeNode<T> | null = null,
  depth: number = 0,
  path: string = ''
): FlattenedNode<T>[] {
  return tree.flatMap((item) => {
    const newPath = item.value ? `${path}/${item.value}` : path;

    return item.children
      ? [
          { ...item, parent: parent?.value, depth, path: newPath },
          ...flattenTree(item.children, item, depth + 1, newPath),
        ]
      : { ...item, depth, parent: parent?.value, path: newPath };
  });
}
