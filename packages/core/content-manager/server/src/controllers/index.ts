import collectionTypes from '@content-manager/server/controllers/collection-types';
import components from '@content-manager/server/controllers/components';
import contentTypes from '@content-manager/server/controllers/content-types';
import init from '@content-manager/server/controllers/init';
import relations from '@content-manager/server/controllers/relations';
import singleTypes from '@content-manager/server/controllers/single-types';
import uid from '@content-manager/server/controllers/uid';
import history from '@content-manager/server/history';
import preview from '@content-manager/server/preview';
import homepage from '@content-manager/server/homepage';

export default {
  'collection-types': collectionTypes,
  components,
  'content-types': contentTypes,
  init,
  relations,
  'single-types': singleTypes,
  uid,
  ...(history.controllers ? history.controllers : {}),
  ...(preview.controllers ? preview.controllers : {}),
  ...homepage.controllers,
};
