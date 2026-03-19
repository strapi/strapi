import admin from './admin';
import history from '../history';
import preview from '../preview';
import homepage from '../homepage';

export default {
  admin,
  ...(history.routes ? history.routes : {}),
  ...(preview.routes ? preview.routes : {}),
  ...homepage.routes,
};
