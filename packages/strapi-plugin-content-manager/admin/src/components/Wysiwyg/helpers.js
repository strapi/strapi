import { trimEnd, trimStart } from 'lodash';
/**
 * Override the editor css
 * @param  {[type]} block [description]
 * @return {[type]}       [description]
 */

export function getBlockStyle() {
  return null;
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

export function getKeyCommandData(command) {
  let content;
  let style;

  switch (command) {
    case 'bold':
      content = '**textToReplace**';
      style = 'BOLD';
      break;
    case 'italic':
      content = '*textToReplace*';
      style = 'ITALIC';
      break;
    case 'underline':
      content = '__textToReplace__';
      style = 'UNDERLINE';
      break;
    default:
      content = '';
      style = '';
  }

  return { content, style };
}
