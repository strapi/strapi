import collectionTypes from './collection-types';
import components from './components';
import contentTypes from './content-types';
import init from './init';
import relations from './relations';
import singleTypes from './single-types';
import uid from './uid';
import history from '../history';
import preview from '../preview';
import homepage from '../homepage';

/** Controllers of the core Content Manager routes, without the history, preview and homepage features. */
export const coreControllers = {
  'collection-types': collectionTypes,
  components,
  'content-types': contentTypes,
  init,
  relations,
  'single-types': singleTypes,
  uid,
} as const;

export default {
  ...coreControllers,
  ...(history.controllers ? history.controllers : {}),
  ...(preview.controllers ? preview.controllers : {}),
  ...homepage.controllers,
};
