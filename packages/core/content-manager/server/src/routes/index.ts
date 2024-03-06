import admin from './admin';
import history from '../history';

export default {
  admin,
  ...(history.routes ? history.routes : {}),
};
