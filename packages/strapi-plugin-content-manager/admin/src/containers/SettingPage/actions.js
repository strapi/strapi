import { ON_CLICK_EDIT_LIST_ITEM } from './constants';

export function onClickEditListItem(listItemToEdit) {
  return {
    type: ON_CLICK_EDIT_LIST_ITEM,
    listItemToEdit,
  };
}