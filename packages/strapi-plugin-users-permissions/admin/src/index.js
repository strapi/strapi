import React from 'react';
import { reduce } from 'lodash';
import pluginPkg from '../../package.json';
import pluginId from './pluginId';

import App from './containers/App';

const pluginDescription = pluginPkg.strapi.description || pluginPkg.description;

const formatMessages = messages =>
  reduce(
    messages,
    (result, value, key) => {
      result[`${pluginId}.${key}`] = value;

      return result;
    },
    {},
  );
const requireTranslations = language => {
  try {
    return require(`./translations/${language}.json`); // eslint-disable-line global-require
  } catch (error) {
    console.error(
      `Unable to load "${language}" translation for the plugin ${pluginId}. Please make sure "${language}.json" file exists in "pluginPath/admin/src/translations" folder.`,
    );
    return;
  }
};

const translationMessages = reduce(
  strapi.languages,
  (result, language) => {
    result[language] = formatMessages(requireTranslations(language));
    return result;
  },
  {},
);
const layout = (() => {
  try {
    return require('../../config/layout.js'); // eslint-disable-line import/no-unresolved
  } catch (err) {
    return null;
  }
})();

const injectedComponents = (() => {
  try {
    return require('./injectedComponents').default; // eslint-disable-line import/no-unresolved
  } catch (err) {
    return [];
  }
})();

const initializer = (() => {
  try {
    return require('./initializer');
  } catch (err) {
    return null;
  }
})();

const lifecycles = (() => {
  try {
    return require('./lifecycles');
  } catch (err) {
    return null;
  }
})();

function Comp(props) {
  return <App {...props} />;
}

const plugin = {
  blockerComponent: null,
  blockerComponentProps: {},
  description: pluginDescription,
  icon: pluginPkg.strapi.icon,
  id: pluginId,
  initializer,
  injectedComponents,
  layout,
  lifecycles,
  leftMenuLinks: [],
  leftMenuSections: [],
  mainComponent: Comp,
  name: pluginPkg.strapi.name,
  preventComponentRendering: false,
  translationMessages,
};

export default plugin;
