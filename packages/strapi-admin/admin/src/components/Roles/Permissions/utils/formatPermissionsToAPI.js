import formatSettingsPermissionsToAPI from './formatSettingsPermissionsToAPI';

const formatPermissionsToAPI = modifiedData => {
  const pluginsPermissions = formatSettingsPermissionsToAPI(modifiedData.plugins);
  const settingsPermissions = formatSettingsPermissionsToAPI(modifiedData.settings);
  // TODO
  const collectionTypesPermissions = [];
  const singleTypesPermissions = [];

  return [
    ...pluginsPermissions,
    ...settingsPermissions,
    ...collectionTypesPermissions,
    ...singleTypesPermissions,
  ];
};

export default formatPermissionsToAPI;
