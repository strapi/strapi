import collectionTypes from './collection-types';
import components from './components';
import contentTypes from './content-types';
import init from './init';
import relations from './relations';
import singleTypes from './single-types';
import uid from './uid';
import autosave from '../autosave';
import history from '../history';
import preview from '../preview';
import homepage from '../homepage';

export default {
  'collection-types': collectionTypes,
  components,
  'content-types': contentTypes,
  init,
  relations,
  'single-types': singleTypes,
  uid,
  ...(autosave.controllers ? autosave.controllers : {}),
  ...(history.controllers ? history.controllers : {}),
  ...(preview.controllers ? preview.controllers : {}),
  ...homepage.controllers,
};
