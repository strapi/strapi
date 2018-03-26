import { trimEnd, trimStart } from 'lodash';
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
    case 'paragraph':
    case 'unordered-list-item':
    case 'ordered-list-item':
    case 'header-one':
    case 'header-two':
    case 'header-three':
    case 'header-four':
    case 'header-five':
    case 'header-six':
    default:
      return null;
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
    case 'CODE':
      return {
        innerContent: 'code block',
        endReplacer: '`',
        startReplacer: '`',
      };
    case 'BLOCKQUOTE':
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

export const getDefaultSelectionOffsets = (
  content,
  startReplacer,
  endReplacer,
  initPosition = 0,
) => ({
  anchorOffset: initPosition + content.length - trimStart(content, startReplacer).length,
  focusOffset: initPosition + trimEnd(content, endReplacer).length,
});

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
