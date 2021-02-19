import createDefaultCTFormFromLayout from './utils/createDefaultCTFormFromLayout';
import createDefaultPluginsFormFromLayout from './utils/createDefaultPluginsFormFromLayout';
import formatLayoutForSettingsAndPlugins from './utils/formatLayoutForSettingsAndPlugins';

const init = (layout, permissions) => {
  const {
    conditions,
    sections: { collectionTypes, singleTypes, plugins, settings },
  } = layout;
  const layouts = {
    collectionTypes,
    singleTypes,
    plugins: formatLayoutForSettingsAndPlugins(plugins, 'plugin'),
    settings: formatLayoutForSettingsAndPlugins(settings, 'category'),
  };
  const defaultForm = {
    collectionTypes: createDefaultCTFormFromLayout(
      collectionTypes,
      collectionTypes.actions || [],
      conditions,
      permissions
    ),
    singleTypes: createDefaultCTFormFromLayout(singleTypes, singleTypes.actions || [], conditions),
    plugins: createDefaultPluginsFormFromLayout(layouts.plugins, conditions),
    settings: createDefaultPluginsFormFromLayout(layouts.settings, conditions),
  };

  return {
    initialData: defaultForm,
    modifiedData: defaultForm,
    layouts,
  };
};

export default init;
