import styles from './styles.scss';
/**
 * Override the editor css
 * @param  {[type]} block [description]
 * @return {[type]}       [description]
 */

export function getBlockStyle(block) {
  switch (block.getType()) {
    case 'blockquote':
      return styles.editorBlockquote;
    case 'code-block':
      return styles.editorCodeBlock;
    default: return null;
  }
}

// TODO: this could be improved
export function getInnerText(style) {
  let innerText;

  switch (style) {
    case 'BOLD':
      innerText = '**text in bold**';
      break;
    case 'ITALIC':
      innerText = '*text in italic*';
      break;
    case 'UNDERLINE':
      innerText = '__text underlined__';
      break;
    case 'H1':
      innerText = '# ';
      break;
    case 'H2':
      innerText = '## ';
      break;
    case 'H3':
      innerText = '### ';
      break;
    case 'H4':
      innerText = '#### ';
      break;
    case 'H5':
      innerText = '##### ';
      break;
    case 'H6':
      innerText = '###### ';
      break;
    case 'code-block':
      innerText = '```code block```';
      break;
    case 'blockquote':
      innerText = '> quotes';
      break;
    case 'unordered-list-item':
      innerText = '- ul';
      break;
    case 'ordered-list-item':
      innerText = '1. ol';
      break;
    case 'LINK':
      innerText = '[text](link)';
      break;
    case 'IMG':
      innerText = '![text](link)';
      break;
    default:
      innerText = '';
  }

  return innerText;
}


/**
 * Get the start and end offset
 * @param  {Object} selection
 * @return {Object}
 */
export function getOffSets(selection) {
  return {
    end: selection.getEndOffset(),
    start: selection.getStartOffset(),
  };
}
