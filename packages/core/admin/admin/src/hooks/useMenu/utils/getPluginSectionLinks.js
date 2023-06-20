import checkPermissions from './checkPermissions';

const getPluginSectionLinks = async (userPermissions, pluginsSectionRawLinks, permissions) => {
  const pluginsSectionRawLinksWithPermissions = pluginsSectionRawLinks.map((link) => ({
    ...link,
    permissions: link.permissions ? permissions[link.permissions] : []
  }));
  const pluginSectionPermissionsPromises = checkPermissions(
    userPermissions,
    pluginsSectionRawLinksWithPermissions
  );
  const pluginSectionLinksPermissions = await Promise.all(pluginSectionPermissionsPromises);

  const authorizedPluginSectionLinks = pluginsSectionRawLinks.filter(
    (_, index) => pluginSectionLinksPermissions[index]
  );

  return authorizedPluginSectionLinks;
};

export default getPluginSectionLinks;
