import admin from './admin';
import history from '../history';
import preview from '../preview';
import homepage from '../homepage';
import customOrder from '../custom-order';

export default {
  admin,
  ...(history.routes ? history.routes : {}),
  ...(preview.routes ? preview.routes : {}),
  ...(customOrder.routes ? customOrder.routes : {}),
  ...homepage.routes,
};
