import { insertLink } from '../utils/links';

/**
 * This plugin is used to add data as a clickable link if its a valid URL
 *
 * @param {import('slate').Editor} editor
 */

const withDataInsertion = (editor) => {
  const { insertData } = editor;

  editor.insertData = (data) => {
    const pastedText = data.getData('text/plain');

    if (pastedText) {
      try {
        // eslint-disable-next-line no-new
        new URL(pastedText);
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

export { withDataInsertion };
