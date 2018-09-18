import {
  ON_CLICK_EDIT_FIELD,
  ON_CLICK_EDIT_LIST_ITEM,
  ON_CLICK_EDIT_RELATION,
} from './constants';

export function onClickEditField(fieldToEdit) {
  return {
    type: ON_CLICK_EDIT_FIELD,
    fieldToEdit,
  };
}

export function onClickEditListItem(listItemToEdit) {
  return {
    type: ON_CLICK_EDIT_LIST_ITEM,
    listItemToEdit,
  };
}

export function onClickEditRelation(relationToEdit) {
  return {
    type: ON_CLICK_EDIT_RELATION,
    relationToEdit,
  };
}