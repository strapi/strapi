export const replaceText = (markdownName, textToChange) => {
  let editedText;

  switch (markdownName) {
    case 'Strikethrough':
      editedText = `~~${textToChange}~~`;
      break;
    case 'Bold':
      editedText = `**${textToChange}**`;
      break;
    case 'Italic':
      editedText = `_${textToChange}_`;
      break;
    case 'Underline':
      editedText = `<u>${textToChange}</u>`;
      break;
    case 'Code':
      editedText = `\`\`\`\n${textToChange}\n\`\`\``;
      break;
    case 'Link':
      editedText = `[${textToChange}](link)`;
      break;
    case 'Quote':
      editedText = `>${textToChange}`;
      break;
    default:
      editedText = textToChange;
  }

  return editedText;
};

export const insertText = markdownName => {
  let editedText;
  // object to calculate text that will be selected after insert of markdown
  let selection = { start: markdownName.length, end: 0 };

  switch (markdownName) {
    case 'Strikethrough':
      editedText = `~~${markdownName}~~`;
      selection.end = 2;
      break;
    case 'Bold':
      editedText = `**${markdownName}**`;
      selection.end = 2;
      break;
    case 'Italic':
      editedText = `_${markdownName}_`;
      selection.end = 1;
      break;
    case 'alt':
      editedText = `[${markdownName}]()`;
      selection.end = 3;
      break;
    case 'Underline':
      editedText = `<u>${markdownName}</u>`;
      selection.end = 4;
      break;
    case 'Code':
      editedText = `\`\`\`\n${markdownName}\n\`\`\``;
      selection.end = 3;
      break;
    case 'Link':
      editedText = `[${markdownName}](link)`;
      selection.end = 7;
      break;
    case 'Quote':
      editedText = `>${markdownName}`;
      selection.end = 0;
      break;
    default:
      editedText = '';
  }

  return { editedText, selection };
};

export const insertListOrTitle = markdown => {
  let textToInsert;

  switch (markdown) {
    case 'BulletList':
      textToInsert = '- ';
      break;
    case 'NumberList':
      textToInsert = '1. ';
      break;
    case 'h1':
      textToInsert = '# ';
      break;
    case 'h2':
      textToInsert = '## ';
      break;
    case 'h3':
      textToInsert = '### ';
      break;
    case 'h4':
      textToInsert = '#### ';
      break;
    case 'h5':
      textToInsert = '##### ';
      break;
    case 'h6':
      textToInsert = '###### ';
      break;
    default:
      return '';
  }

  return textToInsert;
};

// EDITOR ACTIONS FUNCTIONS

export const markdownHandler = (editor, markdownType) => {
  const textToEdit = editor.current.getSelection();
  let textToInsert;

  if (textToEdit) {
    const editedText = replaceText(markdownType, textToEdit);
    editor.current.replaceSelection(editedText);
    editor.current.focus();
  } else {
    textToInsert = insertText(markdownType);
    editor.current.replaceSelection(textToInsert.editedText);
    editor.current.focus();
    // set selection-focus to text to replace with content
    const { line, ch } = editor.current.getCursor();
    const endSelection = ch - textToInsert.selection.end;
    const startSelection = ch - textToInsert.selection.end - textToInsert.selection.start;
    editor.current.setSelection({ line, ch: startSelection }, { line, ch: endSelection });
  }
};

export const listHandler = (editor, listType) => {
  const doc = editor.current.getDoc();
  const insertion = listType === 'BulletList' ? '- ' : '1. ';

  if (doc.somethingSelected()) {
    const selections = doc.listSelections();
    let remove = null;

    editor.current.operation(function() {
      selections.forEach(function(selection) {
        const pos = [selection.head.line, selection.anchor.line].sort();

        // Remove if the first text starts with it
        if (remove == null) {
          remove = doc.getLine(pos[0]).startsWith(insertion);
        }

        for (let i = pos[0]; i <= pos[1]; i++) {
          if (remove) {
            // Don't remove if we don't start with it
            if (doc.getLine(i).startsWith(insertion)) {
              doc.replaceRange('', { line: i, ch: 0 }, { line: i, ch: insertion.length });
            }
          } else {
            const lineInsertion = listType === 'BulletList' ? '- ' : `${i + 1}. `;
            doc.replaceRange(lineInsertion, { line: i, ch: 0 });
          }
        }
      });
    });
  } else {
    let { line: currentLine } = doc.getCursor();
    const listToInsert = insertListOrTitle(listType);
    const lineContent = editor.current.getLine(currentLine);

    const textToInsert = listToInsert + lineContent;
    editor.current.setSelection(
      { line: currentLine, ch: 0 },
      { line: currentLine, ch: lineContent.length }
    );
    editor.current.replaceSelection(textToInsert);
  }

  editor.current.focus();
};

export const titleHandler = (editor, titleType) => {
  let { line: currentLine } = editor.current.getCursor();
  const titleToInsert = insertListOrTitle(titleType);
  const lineContent = editor.current.getLine(currentLine);

  // replace hashtags followed by a space in case user want to change the type of title
  const lineWithNoTitle = lineContent.replace(/#{1,6}\s/g, '').trim();

  const textToInsert = titleToInsert + lineWithNoTitle;
  editor.current.setSelection(
    { line: currentLine, ch: 0 },
    { line: currentLine, ch: lineContent.length }
  );
  editor.current.replaceSelection(textToInsert);

  setTimeout(() => {
    const newLastLineLength = editor.current.getLine(currentLine).length;
    editor.current.focus();
    editor.current.setCursor({ line: currentLine, ch: newLastLineLength });
  }, 0);
};

export const insertFile = (editor, files) => {
  let { line, ch } = editor.current.getCursor();

  files.forEach((file, i) => {
    let contentLength = editor.current.getLine(line).length;
    editor.current.setCursor({ line, ch: contentLength });
    // create a new line after first image markdown inserted
    // or if there is content in current line

    if (i > 0 || (i === 0 && ch !== 0)) {
      contentLength = editor.current.getLine(line).length;
      editor.current.setCursor({ line, ch: contentLength });
      line++;
      editor.current.replaceSelection('\n');
    }

    if (file.mime.includes('image')) {
      editor.current.replaceSelection(`![${file.alt}](${file.url})`);
    } else {
      editor.current.replaceSelection(`[${file.alt}](${file.url})`);
    }
  });

  setTimeout(() => editor.current.focus(), 0);
};

// NEXT FUNCTIONS FOR QUOTE OR CODE MARKDOWN

const insertWithTextToEdit = (editor, markdownType, line, contentLength, textToEdit) => {
  const textToInsert = replaceText(markdownType, textToEdit);

  // remove content after current line
  const contentToMove = editor.current.getRange(
    { line: line + 1, ch: 0 },
    { line: Infinity, ch: Infinity }
  );
  editor.current.replaceRange('', { line: line + 1, ch: 0 }, { line: Infinity, ch: Infinity });

  // remove word that was selected
  // set cursor end of line + move to next line
  // add text to insert
  editor.current.replaceSelection('');
  editor.current.setCursor({ line, ch: contentLength });
  editor.current.replaceSelection('\n');
  editor.current.replaceSelection(textToInsert);

  if (markdownType === 'Code') {
    let { line: newLine } = editor.current.getCursor();
    editor.current.setCursor({ line: newLine - 1, ch: textToEdit.length });
  }

  // add content we had to remove earlier
  editor.current.replaceRange(
    contentToMove,
    { line: line + 4, ch: 0 },
    { line: Infinity, ch: Infinity }
  );

  editor.current.focus();
};

const insertWithoutTextToEdit = (editor, markdownType, line, contentLength) => {
  const textToInsert = insertText(markdownType);

  // remove content after current line
  const contentToMove = editor.current.getRange(
    { line: line + 1, ch: 0 },
    { line: Infinity, ch: Infinity }
  );
  editor.current.replaceRange('', { line: line + 1, ch: 0 }, { line: Infinity, ch: Infinity });

  // replace cursor to next line
  editor.current.setCursor({ line, ch: contentLength });
  editor.current.replaceSelection('\n');
  editor.current.replaceSelection(textToInsert.editedText);

  // set selection on "Code" or "Quote" word

  if (markdownType === 'Code') {
    line += 2;

    editor.current.setSelection({ line, ch: 0 }, { line, ch: 4 });
  } else {
    line += 1;

    let { ch } = editor.current.getCursor();
    let endSelection = ch - textToInsert.selection.end;
    let startSelection = ch - textToInsert.selection.end - textToInsert.selection.start;
    editor.current.setSelection({ line, ch: startSelection }, { line, ch: endSelection });
  }

  // add content we had to remove earlier
  editor.current.replaceRange(
    contentToMove,
    { line: line + 2, ch: 0 },
    { line: Infinity, ch: Infinity }
  );
  editor.current.focus();
};

export const quoteAndCodeHandler = (editor, markdownType) => {
  const textToEdit = editor.current.getSelection();
  let { line } = editor.current.getCursor();
  let contentLength = editor.current.getLine(line).length;

  if (textToEdit) {
    insertWithTextToEdit(editor, markdownType, line, contentLength, textToEdit);
  } else {
    insertWithoutTextToEdit(editor, markdownType, line, contentLength);
  }
};
