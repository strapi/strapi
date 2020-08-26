import ComponentApi from './ComponentApi';
import FieldApi from './FieldApi';

class Strapi {
  componentApi = ComponentApi();

  fieldApi = FieldApi();
}

export default () => {
  return new Strapi();
};
