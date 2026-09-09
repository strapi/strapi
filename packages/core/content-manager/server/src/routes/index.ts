import admin from './admin';
import autosave from '../autosave';
import history from '../history';
import preview from '../preview';
import homepage from '../homepage';

export default {
  admin,
  ...(autosave.routes ? autosave.routes : {}),
  ...(history.routes ? history.routes : {}),
  ...(preview.routes ? preview.routes : {}),
  ...homepage.routes,
};
