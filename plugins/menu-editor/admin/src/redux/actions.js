import { ON_CHANGE, SUBMIT, GET_MENU, GET_MENU_SUCCEEDED } from './constants';

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
