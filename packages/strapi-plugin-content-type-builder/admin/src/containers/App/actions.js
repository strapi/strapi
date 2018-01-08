/*
 *
 * App actions
 *
 */

/* eslint-disable new-cap */

import { List, Map } from 'immutable';
import { concat, get, size, map, findIndex, isEmpty } from 'lodash';

import { storeData } from '../../utils/storeData';

import {
  DELETE_CONTENT_TYPE,
  MODELS_FETCH,
  MODELS_FETCH_SUCCEEDED,
  STORE_TEMPORARY_MENU,
  TEMPORARY_CONTENT_TYPE_FIELDS_UPDATED,
  TEMPORARY_CONTENT_TYPE_POSTED,
} from './constants';

export function deleteContentType(itemToDelete, context) {
  const oldMenu = storeData.getMenu();
  const leftMenuContentTypes = get(context.plugins.toJS(), ['content-manager', 'leftMenuSections']);
  const leftMenuContentTypesIndex = !isEmpty(leftMenuContentTypes) ? findIndex(leftMenuContentTypes[0].links, ['destination', itemToDelete]) : -1;

  let updateLeftMenu = false;
  let sendRequest = true;

  if (oldMenu) {
    const index = findIndex(oldMenu, ['name', itemToDelete]);
    if (oldMenu[index].isTemporary) {
      sendRequest = false;
      storeData.clearAppStorage();
    }else {
      oldMenu.splice(index, 1);
      const newMenu = oldMenu;
      storeData.setMenu(newMenu);
    }
  }

  // Update Admin left menu content types
  if (leftMenuContentTypesIndex !== -1) {
    updateLeftMenu = true;
    leftMenuContentTypes[0].links.splice(leftMenuContentTypesIndex, 1);
  }

  return {
    type: DELETE_CONTENT_TYPE,
    itemToDelete,
    sendRequest,
    leftMenuContentTypes,
    updateLeftMenu,
    updatePlugin: context.updatePlugin,
  };
}

export function modelsFetch() {
  return {
    type: MODELS_FETCH,
  };
}

export function modelsFetchSucceeded(models) {
  const modelNumber = size(models.models) > 1 ? 'plural' : 'singular';

  const sections = storeData.getMenu() || map(models.models, (model) => ({icon: 'fa-caret-square-o-right', name: model.name, source: model.source }));

  if (!storeData.getMenu()){
    sections.push({ icon: 'fa-plus', name: 'button.contentType.add' });
  }

  const menu = {
    sections: [
      Map({
        name: `menu.section.contentTypeBuilder.name.${modelNumber}`,
        items: List(sections),
      }),
    ],
  };

  const data = storeData.getModel() ? { models: concat(models.models, storeData.getModel()) } : models;
  return {
    type: MODELS_FETCH_SUCCEEDED,
    data,
    menu,
  };
}

export function storeTemporaryMenu(newMenu, position, nbElementToRemove) {

  const newModel = newMenu[size(newMenu) - 2];
  const newLink = { icon: 'fa-caret-square-o-right', name: newModel.name, isTemporary: true };

  storeData.setMenu(newMenu);
  storeData.setModel(newModel);
  storeData.setIsModelTemporary();

  return {
    type: STORE_TEMPORARY_MENU,
    newModel,
    newLink,
    position,
    nbElementToRemove,
  };
}

export function temporaryContentTypeFieldsUpdated(fieldNumber) {
  return {
    type: TEMPORARY_CONTENT_TYPE_FIELDS_UPDATED,
    fieldNumber,
  };
}

export function temporaryContentTypePosted(fieldNumber) {
  return {
    type: TEMPORARY_CONTENT_TYPE_POSTED,
    fieldNumber,
  };
}
