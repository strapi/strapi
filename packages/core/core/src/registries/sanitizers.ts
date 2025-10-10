import _, { PropertyName } from 'lodash';

type Sanitizer = (value: unknown) => unknown;

const sanitizersRegistry = () => {
  const sanitizers: Record<string, Sanitizer[]> = {};

  return {
    get(path: PropertyName): Sanitizer[] {
      return _.get(sanitizers, path, []);
    },

    add(path: PropertyName, sanitizer: Sanitizer) {
      this.get(path).push(sanitizer);
      return this;
    },

    set(path: PropertyName, value = []) {
      _.set(sanitizers, path, value);
      return this;
    },

    has(path: PropertyName) {
      return _.has(sanitizers, path);
    },
  };
};

export default sanitizersRegistry;
