import { getFetchClient } from '@strapi/helper-plugin';

import { getRequestUrl } from '../../../utils';

import checkPermissions from './checkPermissions';
import generateModelsLinks from './generateModelsLinks';

const getContentTypeLinks = async ({ models, userPermissions, toggleNotification }) => {
  const { get } = getFetchClient();
  try {
    const {
      data: { data: contentTypeConfigurations },
    } = await get(getRequestUrl('content-types-settings'));

    const { collectionTypeSectionLinks, singleTypeSectionLinks } = generateModelsLinks(
      models,
      contentTypeConfigurations
    );

    // Collection Types verifications
    const collectionTypeLinksPermissions = await Promise.all(
      checkPermissions(userPermissions, collectionTypeSectionLinks)
    );
    const authorizedCollectionTypeLinks = collectionTypeSectionLinks.filter(
      (_, index) => collectionTypeLinksPermissions[index]
    );

    // Single Types verifications
    const singleTypeLinksPermissions = await Promise.all(
      checkPermissions(userPermissions, singleTypeSectionLinks)
    );
    const authorizedSingleTypeLinks = singleTypeSectionLinks.filter(
      (_, index) => singleTypeLinksPermissions[index]
    );

    return {
      authorizedCollectionTypeLinks,
      authorizedSingleTypeLinks,
    };
  } catch (err) {
    console.error(err);

    toggleNotification({
      type: 'warning',
      message: { id: 'notification.error' },
    });

    return { authorizedCollectionTypeLinks: [], authorizedSingleTypeLinks: [] };
  }
};

export default getContentTypeLinks;
