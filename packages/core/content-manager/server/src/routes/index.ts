import admin from './admin';
import history from '../history';
import preview from '../preview';

export default {
  admin,
  ...(history.routes ? history.routes : {}),
  ...(preview.routes ? preview.routes : {}),
};
