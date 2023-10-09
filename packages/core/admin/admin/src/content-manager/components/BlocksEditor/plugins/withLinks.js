import { Path, Transforms, Range, Point, Editor } from 'slate';

const withLinks = (editor) => {
  const { isInline, apply, insertText } = editor;

  // Links are inline elements, so we need to override the isInline method for slate
  editor.isInline = (element) => {
    return element.type === 'link' ? true : isInline(element);
  };

  // We keep a track of the last inserted link path
  // So we can show the popover on the link component if that link is the last one inserted
  editor.lastInsertedLinkPath = null;

  // We intercept the apply method, so everytime we insert a new link, we save its path
  editor.apply = (operation) => {
    if (operation.type === 'insert_node') {
      if (operation.node.type === 'link') {
        editor.lastInsertedLinkPath = operation.path;
      }
    } else if (operation.type === 'move_node') {
      // We need to update the last inserted link path when link is moved
      // If link is the first word in the paragraph we dont need to update the path
      if (Path.hasPrevious(operation.path)) {
        editor.lastInsertedLinkPath = Path.transform(editor.lastInsertedLinkPath, operation);
      }
    }

    apply(operation);
  };

  editor.insertText = (text) => {
    // When selection is at the end of a link and user types a space, we want to break the link
    if (Range.isCollapsed(editor.selection) && text === ' ') {
      const linksInSelection = Array.from(
        Editor.nodes(editor, { at: editor.selection, match: (node) => node.type === 'link' })
      );

      const selectionIsInLink = editor.selection && linksInSelection.length > 0;
      const selectionIsAtEndOfLink =
        selectionIsInLink &&
        Point.equals(editor.selection.anchor, Editor.end(editor, linksInSelection[0][1]));

      if (selectionIsAtEndOfLink) {
        Transforms.insertNodes(
          editor,
          { text: ' ', type: 'text' },
          { at: Path.next(linksInSelection[0][1]), select: true }
        );

        return;
      }
    }

    insertText(text);
  };

  return editor;
};

export { withLinks };
