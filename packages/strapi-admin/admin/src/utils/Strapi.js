import ComponentApi from './ComponentApi';
import FieldApi from './FieldApi';
import MiddleWares from './MiddleWares';

class Strapi {
  componentApi = ComponentApi();

  middlewares = MiddleWares();

  fieldApi = FieldApi();
}

export default () => {
  return new Strapi();
};
