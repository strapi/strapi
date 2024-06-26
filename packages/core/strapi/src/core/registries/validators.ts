import _, { PropertyName } from 'lodash';

type Validator = unknown;

const validatorsRegistry = () => {
  const validators: Record<string, Validator[]> = {};

  return {
    get(path: PropertyName): Validator[] {
      return _.get(validators, path, []);
    },

    add(path: PropertyName, validator: Validator) {
      this.get(path).push(validator);
      return this;
    },

    set(path: PropertyName, value = []) {
      _.set(validators, path, value);
      return this;
    },

    has(path: PropertyName) {
      return _.has(validators, path);
    },
  };
};

export default validatorsRegistry;
