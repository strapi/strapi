import { request } from '@strapi/helper-plugin';
import generateModelsLinks from './generateModelsLinks';
import checkPermissions from './checkPermissions';

const getContentTypeLinks = async (models, userPermissions, toggleNotification) => {
  try {
    const {
      data: contentTypeConfigurations,
    } = await request('/content-manager/content-types-settings', { method: 'GET' });

    const { collectionTypesSectionLinks, singleTypesSectionLinks } = generateModelsLinks(
      models,
      contentTypeConfigurations
    );

    // Content Types verifications
    const ctLinksPermissionsPromises = checkPermissions(
      userPermissions,
      collectionTypesSectionLinks
    );
    const ctLinksPermissions = await Promise.all(ctLinksPermissionsPromises);
    const authorizedCtLinks = collectionTypesSectionLinks.filter(
      (_, index) => ctLinksPermissions[index]
    );

    // Single Types verifications
    const stLinksPermissionsPromises = checkPermissions(userPermissions, singleTypesSectionLinks);
    const stLinksPermissions = await Promise.all(stLinksPermissionsPromises);
    const authorizedStLinks = singleTypesSectionLinks.filter(
      (_, index) => stLinksPermissions[index]
    );

    return { authorizedCtLinks, authorizedStLinks };
  } catch (err) {
    console.error(err);

    toggleNotification({
      type: 'warning',
      message: { id: 'notification.error' },
    });

    return { authorizedCtLinks: [], authorizedStLinks: [], contentTypes: [] };
  }
};

export default getContentTypeLinks;
