import { MUTATE_COLLECTION_TYPES_LINKS, MUTATE_SINGLE_TYPES_LINKS } from '../../../../exposedHooks';

import getContentTypeLinks from './getContentTypeLinks';

const gatherContentTypeLinks = async ({
  models,
  userPermissions,
  toggleNotification,
  runHookWaterfall,
}) => {
  const unmutatedContentTypeLinks = await getContentTypeLinks({
    models,
    userPermissions,
    toggleNotification,
  });

  const { ctLinks: authorizedCollectionTypeLinks } = runHookWaterfall(
    MUTATE_COLLECTION_TYPES_LINKS,
    {
      ctLinks: unmutatedContentTypeLinks.authorizedCollectionTypeLinks,
      models,
    }
  );
  const { stLinks: authorizedSingleTypeLinks } = runHookWaterfall(MUTATE_SINGLE_TYPES_LINKS, {
    stLinks: unmutatedContentTypeLinks.authorizedSingleTypeLinks,
    models,
  });

  return { authorizedCollectionTypeLinks, authorizedSingleTypeLinks };
};

export default gatherContentTypeLinks;
