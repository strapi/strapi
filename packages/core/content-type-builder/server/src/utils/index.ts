import * as components from '../services/components';
import * as builder from '../services/builder';
import * as contentTypes from '../services/content-types';

type S = {
  ['content-types']: typeof contentTypes;
  components: typeof components;
  builder: typeof builder;
};

// retrieve a local service
export const getService = <T extends keyof S>(name: T): ReturnType<S[T]> => {
  return strapi.plugin('content-type-builder').service(name);
};
