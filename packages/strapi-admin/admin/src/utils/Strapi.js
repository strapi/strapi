import FieldApi from './FieldApi';

class Strapi {
  fieldApi = FieldApi();
}

export default () => {
  return new Strapi();
};
