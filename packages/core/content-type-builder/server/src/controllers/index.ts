import type { Controllers } from '../types/controllers';

import builder from './builder';
import componentCategories from './component-categories';
import components from './components';
import contentTypes from './content-types';
import schema from './schema';

const exportObject = {
  builder,
  'component-categories': componentCategories,
  components,
  'content-types': contentTypes,
  schema,
  // `schema` is a factory: the registry calls it with `{ strapi }`. It is checked in `./schema`
  // against its registered contract.
} satisfies Omit<Controllers, 'schema'> & { schema: unknown };

export default exportObject;
