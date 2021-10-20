import checkPermissions from './checkPermissions';

const getPluginSectionLinks = async (userPermissions, pluginsSectionRawLinks) => {
  const pluginSectionPermissionsPromises = checkPermissions(
    userPermissions,
    pluginsSectionRawLinks
  );
  const pluginSectionLinksPermissions = await Promise.all(pluginSectionPermissionsPromises);

  const authorizedPluginSectionLinks = pluginsSectionRawLinks.filter(
    (_, index) => pluginSectionLinksPermissions[index]
  );

  return authorizedPluginSectionLinks;
};

export default getPluginSectionLinks;
