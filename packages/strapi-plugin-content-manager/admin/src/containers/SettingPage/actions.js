import { ON_CLICK_EDIT_LIST_ITEM } from './constants';

export function onClickEditListItem(index) {
  return {
    type: ON_CLICK_EDIT_LIST_ITEM,
    index,
  };
}