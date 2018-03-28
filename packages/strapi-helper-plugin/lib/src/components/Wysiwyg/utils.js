/**
 *
 * Utils
 *
 */

import { ContentBlock, EditorState, genKey, Modifier } from 'draft-js';
import { List } from 'immutable';
import detectIndent from 'detect-indent';
import { DEFAULT_INDENTATION } from './constants';

export function createNewBlock(text = '', type = 'unstyled', key = genKey()) {
  return new ContentBlock({ key, type, text, charaterList: List([]) });
}

export function getNextBlocksList(editorState, startKey) {
  return editorState
    .getCurrentContent()
    .getBlockMap()
    .toSeq()
    .skipUntil((_, k) => k === startKey)
    .toList()
    .shift()
    .concat([createNewBlock()]);
}


export function updateSelection(selection, blocks, offset) {
  return selection.merge({
    anchorKey: blocks.get(0).getKey(),
    focusKey: blocks.get(0).getKey(),
    anchorOffset: offset,
    focusOffset: offset,
  });
}

export function getSelectedBlocksList(editorState) {
  const selectionState = editorState.getSelection();
  const contentState = editorState.getCurrentContent();
  const startKey = selectionState.getStartKey();
  const endKey = selectionState.getEndKey();
  const blockMap = contentState.getBlockMap();
  return blockMap
    .toSeq()
    .skipUntil((_, k) => k === startKey)
    .takeUntil((_, k) => k === endKey)
    .concat([[endKey, blockMap.get(endKey)]])
    .toList();
}

/**
 * Detect indentation in a text
 * @param {String} text
 * @return {String}
 */
export function getIndentation(text) {
  const result = detectIndent(text);

  return result.indent || DEFAULT_INDENTATION;
}

export function onTab(editorState) {
  const contentState = editorState.getCurrentContent();
  const selection = editorState.getSelection();
  const startKey = selection.getStartKey();
  const currentBlock = contentState.getBlockForKey(startKey);
  const indentation = getIndentation(currentBlock.getText());
  let newContentState;

  if (selection.isCollapsed()) {
    newContentState = Modifier.insertText(
      contentState,
      selection,
      indentation,
    );
  } else {
    newContentState = Modifier.replaceText(
      contentState,
      selection,
      indentation,
    );
  }

  return EditorState.push(
    editorState,
    newContentState,
    'insert-characters'
  );
}
