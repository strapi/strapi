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

function Comp(props) {
  return <App {...props} />;
}

const plugin = {
  blockerComponent: null,
  blockerComponentProps: {},
  description: pluginDescription,
  icon: pluginPkg.strapi.icon,
  id: pluginId,
  initializer: require('./initializer'),
  injectedComponents: require('./injectedComponents').default,
  layout: require('../../config/layout.js'),
  lifecycles: require('./lifecycles'),
  leftMenuLinks: [],
  leftMenuSections: [],
  mainComponent: Comp,
  name: pluginPkg.strapi.name,
  preventComponentRendering: false,
  translationMessages,
};

export default plugin;
