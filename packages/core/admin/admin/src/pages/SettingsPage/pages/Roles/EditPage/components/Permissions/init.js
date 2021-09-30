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
    singleTypes: createDefaultCTFormFromLayout(
      singleTypes,
      singleTypes.actions || [],
      conditions,
      permissions
    ),
    plugins: createDefaultPluginsFormFromLayout(layouts.plugins, conditions, permissions),
    settings: createDefaultPluginsFormFromLayout(layouts.settings, conditions, permissions),
  };

  return {
    initialData: defaultForm,
    modifiedData: defaultForm,
    layouts,
  };
};

export default init;
