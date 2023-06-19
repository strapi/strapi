import checkPermissions from './checkPermissions';

const getPluginSectionLinks = async (userPermissions, pluginsSectionRawLinks, appPermissions) => {
  const pluginSectionPermissionsPromises = checkPermissions(
    userPermissions,
    pluginsSectionRawLinks.map((link) => ({ 
      ...link,
      permissions: link?.permissions ? appPermissions.settings[link.permissions].main : []
    }))
  );
  const pluginSectionLinksPermissions = await Promise.all(pluginSectionPermissionsPromises);

  const authorizedPluginSectionLinks = pluginsSectionRawLinks.filter(
    (_, index) => pluginSectionLinksPermissions[index]
  );

  return authorizedPluginSectionLinks;
};

export default getPluginSectionLinks;
