import cloneDeep from 'lodash/cloneDeep';
import checkPermissions from './checkPermissions';

const getGeneralLinks = async (permissions, generalSectionRawLinks, shouldUpdateStrapi) => {
  const generalSectionPermissionsPromises = checkPermissions(permissions, generalSectionRawLinks);
  const generalSectionLinksPermissions = await Promise.all(generalSectionPermissionsPromises);

  const authorizedGeneralSectionLinks = generalSectionRawLinks.filter(
    (_, index) => generalSectionLinksPermissions[index]
  );

  const settingsLinkIndex = authorizedGeneralSectionLinks.findIndex(obj => obj.to === '/settings');

  if (settingsLinkIndex === -1) {
    return [];
  }

  const authorizedGeneralLinksClone = cloneDeep(authorizedGeneralSectionLinks);

  authorizedGeneralLinksClone[settingsLinkIndex].notificationsCount = shouldUpdateStrapi ? 1 : 0;

  return authorizedGeneralLinksClone;
};

export default getGeneralLinks;
