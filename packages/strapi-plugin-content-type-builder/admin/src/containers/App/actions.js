/*
 *
 * App actions
 *
 */
import { size, forEach } from 'lodash';
import { MODELS_FETCH, MODELS_FETCH_SUCCEEDED } from './constants';

export function modelsFetch() {
  return {
    type: MODELS_FETCH,
  };
}

export function modelsFetchSucceeded(data) {
  const modelNumber = size(data.models) > 1 ? 'plural' : 'singular';
  const sections = [];

  forEach(data.models, (model) => {
    // TODO uncomment if we use icon from the API
    // sections.push({icon: model.icon, name: model.name});
    sections.push({icon: 'fa-caret-square-o-right', name: model.name});
  });

  sections.push({ icon: 'fa-plus', name: 'button.contentType.add' })
  const menu = {
    sections: [
      {
        name: `menu.section.contentTypeBuilder.name.${modelNumber}`,
        items: sections,
      },
    ],
  };

  return {
    type: MODELS_FETCH_SUCCEEDED,
    data,
    menu,
  };
}
