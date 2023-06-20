import cloneDeep from 'lodash/cloneDeep';

import checkPermissions from './checkPermissions';

const getGeneralLinks = async (userPermissions, generalSectionRawLinks, shouldUpdateStrapi, permissions) => {
  const generalSectionRawLinksWithPermissions = generalSectionRawLinks.map((link) => ({
    ...link,
    permissions: link.permissions ? permissions[link.permissions] : []
  }));
  const generalSectionPermissionsPromises = checkPermissions(userPermissions, generalSectionRawLinksWithPermissions);
  const generalSectionLinksPermissions = await Promise.all(generalSectionPermissionsPromises);

  const authorizedGeneralSectionLinks = generalSectionRawLinks.filter(
    (_, index) => generalSectionLinksPermissions[index]
  );

  const settingsLinkIndex = authorizedGeneralSectionLinks.findIndex(
    (obj) => obj.to === '/settings'
  );

  if (settingsLinkIndex === -1) {
    return [];
  }

  const authorizedGeneralLinksClone = cloneDeep(authorizedGeneralSectionLinks);

  authorizedGeneralLinksClone[settingsLinkIndex].notificationsCount = shouldUpdateStrapi ? 1 : 0;

  return authorizedGeneralLinksClone;
};

export default getGeneralLinks;
