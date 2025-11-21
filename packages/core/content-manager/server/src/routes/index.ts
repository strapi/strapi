import admin from '@content-manager/server/routes/admin';
import history from '@content-manager/server/history';
import preview from '@content-manager/server/preview';
import homepage from '@content-manager/server/homepage';

export default {
  admin,
  ...(history.routes ? history.routes : {}),
  ...(preview.routes ? preview.routes : {}),
  ...homepage.routes,
};
