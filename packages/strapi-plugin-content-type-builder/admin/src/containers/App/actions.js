/*
 *
 * App actions
 *
 */

/* eslint-disable new-cap */

import { List, Map } from 'immutable';
import { concat, size, map } from 'lodash';

import { storeData } from '../../utils/storeData';

import {
  MODELS_FETCH,
  MODELS_FETCH_SUCCEEDED,
  STORE_TEMPORARY_MENU,
} from './constants';

export function modelsFetch() {
  return {
    type: MODELS_FETCH,
  };
}

export function modelsFetchSucceeded(models) {
  const modelNumber = size(models.models) > 1 ? 'plural' : 'singular';

  const sections = storeData.getMenu() || map(models.models, (model) => ({icon: 'fa-caret-square-o-right', name: model.name }));

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

export function storeTemporaryMenu(newMenu) {

  const newModel = newMenu[size(newMenu) - 2];
  const newLink = { icon: 'fa-caret-square-o-right', name: newModel.name };

  storeData.setMenu(newMenu);
  storeData.setModel(newModel);
  storeData.setIsModelTemporary();

  return {
    type: STORE_TEMPORARY_MENU,
    newModel,
    newLink,
  };
}
