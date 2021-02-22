import formatContentTypesPermissionToAPI from './formatContentTypesPermissionToAPI';
import formatSettingsPermissionsToAPI from './formatSettingsPermissionsToAPI';

const formatPermissionsToAPI = modifiedData => {
  const pluginsPermissions = formatSettingsPermissionsToAPI(modifiedData.plugins);
  const settingsPermissions = formatSettingsPermissionsToAPI(modifiedData.settings);
  const collectionTypesPermissions = formatContentTypesPermissionToAPI(
    modifiedData.collectionTypes
  );

  const singleTypesPermissions = formatContentTypesPermissionToAPI(modifiedData.singleTypes);

  return [
    ...pluginsPermissions,
    ...settingsPermissions,
    ...collectionTypesPermissions,
    ...singleTypesPermissions,
  ];
};

export default formatPermissionsToAPI;
