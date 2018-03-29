/**
 *
 * Utils
 *
 */

import { ContentBlock, EditorState, genKey, Modifier } from 'draft-js';
import { List } from 'immutable';
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

export function onTab(editorState) {
  const contentState = editorState.getCurrentContent();
  const selection = editorState.getSelection();
  let newContentState;

  if (selection.isCollapsed()) {
    newContentState = Modifier.insertText(
      contentState,
      selection,
      DEFAULT_INDENTATION,
    );
  } else {
    newContentState = Modifier.replaceText(
      contentState,
      selection,
      DEFAULT_INDENTATION,
    );
  }

  return EditorState.push(
    editorState,
    newContentState,
    'insert-characters'
  );
}
