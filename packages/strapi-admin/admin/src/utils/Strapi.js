import ComponentApi from './ComponentApi';
import FieldApi from './FieldApi';
import MiddlewareApi from './MiddlewareApi';

class Strapi {
  componentApi = ComponentApi();

  fieldApi = FieldApi();

  middlewares = MiddlewareApi();
}

export default () => {
  return new Strapi();
};
