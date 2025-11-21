import register from '@content-manager/server/register';
import bootstrap from '@content-manager/server/bootstrap';
import destroy from '@content-manager/server/destroy';
import routes from '@content-manager/server/routes';
import policies from '@content-manager/server/policies';
import controllers from '@content-manager/server/controllers';
import services from '@content-manager/server/services';

export default () => {
  return {
    register,
    bootstrap,
    destroy,
    controllers,
    routes,
    policies,
    services,
  };
};
