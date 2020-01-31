import {
  GET_MENU_SUCCEEDED,
  GET_MENU,
  ON_CHANGE,
  //FIXME: no-unused-vars
  // eslint-disable-next-line no-unused-vars
  SUBMIT_SUCCEEDED,
  SUBMIT,
} from './constants';

export function getMenu() {
  return {
    type: GET_MENU,
  };
}
export function getMenuSucceeded({ menuItems }) {
  return {
    type: GET_MENU_SUCCEEDED,
    menuItems,
  };
}
export function onChange(key, value) {
  return {
    type: ON_CHANGE,
    key,
    value,
  };
}
export function submit() {
  return {
    type: SUBMIT,
  };
}
