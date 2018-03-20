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

export function getBlockContent(style) {
  switch (style) {
    case 'IMG':
      return {
        innerContent: 'link',
        endReplacer: ')',
        startReplacer: '![text](',
      };
    case 'code-block':
      return {
        innerContent: 'code block',
        endReplacer: '`',
        startReplacer: '`',
      };
    case 'blockquote':
      return {
        innerContent: 'quote',
        endReplacer: '',
        startReplacer: '> ',
      };
    case 'BOLD':
      return {
        innerContent: 'bold text',
        endReplacer: '*',
        startReplacer: '*',
      };
    case 'ITALIC':
      return {
        innerContent: 'italic text',
        endReplacer: '*',
        startReplacer: '*',
      };
    case 'STRIKED':
      return {
        innerContent: 'striked out',
        endReplacer: '~',
        startReplacer: '~',
      };
    case 'UNDERLINE':
      return {
        innerContent: 'underlined text',
        endReplacer: '_',
        startReplacer: '_',
      };
    case 'LINK':
      return {
        innerContent: 'link',
        endReplacer: ')',
        startReplacer: '[text](',
      };
    default:
      return {
        innerContent: '',
        endReplacer: '',
        startReplacer: '',
      };
  }
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
