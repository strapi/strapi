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
      const isValidUrl = /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i.test(pastedText);

      if (isValidUrl) {
        insertLink(editor, { url: pastedText });

        return;
      }
    }

    insertData(data);
  };

  return editor;
};

export { withDataInsertion };
