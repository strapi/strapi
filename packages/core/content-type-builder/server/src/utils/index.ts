import type * as components from '../services/components';
import type * as builder from '../services/builder';
import type * as contentTypes from '../services/content-types';

type S = {
  ['content-types']: typeof contentTypes;
  components: typeof components;
  builder: typeof builder;
};

export declare function getService<T extends keyof S>(
  name: T
): S[T] extends (...args: any[]) => any ? ReturnType<S[T]> : S[T];
