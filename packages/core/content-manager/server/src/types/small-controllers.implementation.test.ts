// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { Context } from 'koa';
import type components from '../controllers/components';
import type contentTypes from '../controllers/content-types';
import type init from '../controllers/init';
import type uid from '../controllers/uid';
import type { Equal, Expect } from './assert.test';
import type { ContentTypesController } from './controllers';

type Components = typeof components;
type ContentTypes = typeof contentTypes;
type Init = typeof init;
type UIDs = typeof uid;

// With strict types, each tied action takes the router context, not `any`.
export type SmallControllersContextAssertions = [
  Expect<Equal<Parameters<Components['findComponents']>[0], Context>>,
  Expect<Equal<Parameters<Components['findComponentConfiguration']>[0], Context>>,
  Expect<Equal<Parameters<Components['updateComponentConfiguration']>[0], Context>>,
  // `findContentTypes` reads the query its validator accepts.
  Expect<
    Equal<
      Parameters<ContentTypes['findContentTypes']>[0],
      Parameters<ContentTypesController['findContentTypes']>[0]
    >
  >,
  Expect<Equal<Parameters<ContentTypes['findContentTypesSettings']>[0], Context>>,
  Expect<Equal<Parameters<ContentTypes['findContentTypeConfiguration']>[0], Context>>,
  Expect<Equal<Parameters<ContentTypes['updateContentTypeConfiguration']>[0], Context>>,
  Expect<Equal<Parameters<Init['getInitData']>[0], Context>>,
  Expect<Equal<Parameters<UIDs['generateUID']>[0], Context>>,
  Expect<Equal<Parameters<UIDs['checkUIDAvailability']>[0], Context>>,
];
