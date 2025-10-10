type TreeNode<T> = {
  value: T;
  children?: TreeNode<T>[];
  label?: string;
};

export type FlattenedNode<T> = {
  value: T;
  parent?: T;
  depth: number;
  // we need the label in places where flattenTree is used
  label?: string;
  children?: TreeNode<T>[];
};

export function flattenTree<T>(
  tree: TreeNode<T>[],
  parent: TreeNode<T> | null = null,
  depth: number = 0
): FlattenedNode<T>[] {
  return tree.flatMap((item) =>
    item.children
      ? [{ ...item, parent: parent?.value, depth }, ...flattenTree(item.children, item, depth + 1)]
      : { ...item, depth, parent: parent?.value }
  );
}
