export default function flattenTree(tree, parent, depth = 1) {
  return tree.flatMap(item =>
    item.children
      ? [{ ...item, parent: parent?.value, depth }, ...flattenTree(item.children, item, depth + 1)]
      : { ...item, depth, parent: parent?.value }
  );
}
