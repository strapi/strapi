import { type BaseEditor, Path, Transforms, Range, Point, Editor } from 'slate';

import { insertLink } from '../utils/links';

interface LinkEditor extends BaseEditor {
  lastInsertedLinkPath: Path | null;
  shouldSaveLinkPath: boolean;
}

const withLinks = (editor: Editor) => {
  const { isInline, apply, insertText, insertData } = editor;

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
      if (
        !Editor.isEditor(operation.node) &&
        operation.node.type === 'link' &&
        editor.shouldSaveLinkPath
      ) {
        editor.lastInsertedLinkPath = operation.path;
      }
    } else if (operation.type === 'move_node') {
      // We need to update the last inserted link path when link is moved
      // If link is the first word in the paragraph we dont need to update the path
      if (
        Path.hasPrevious(operation.path) &&
        editor.lastInsertedLinkPath &&
        editor.shouldSaveLinkPath
      ) {
        editor.lastInsertedLinkPath = Path.transform(editor.lastInsertedLinkPath, operation);
      }
    }

    apply(operation);
  };

  editor.insertText = (text) => {
    // When selection is at the end of a link and user types a space, we want to break the link
    if (editor.selection && Range.isCollapsed(editor.selection) && text === ' ') {
      const linksInSelection = Array.from(
        Editor.nodes(editor, {
          at: editor.selection,
          match: (node) => !Editor.isEditor(node) && node.type === 'link',
        })
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

  // Add data as a clickable link if its a valid URL
  editor.insertData = (data) => {
    const pastedText = data.getData('text/plain');

    if (pastedText) {
      try {
        // eslint-disable-next-line no-new
        new URL(pastedText);
        // Do not show link popup on copy-paste a link, so do not save its path
        editor.shouldSaveLinkPath = false;
        insertLink(editor, { url: pastedText });
        return;
      } catch (error) {
        // continue normal data insertion
      }
    }

    insertData(data);
  };

  return editor;
};

export { withLinks, type LinkEditor };
