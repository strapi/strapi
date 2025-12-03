import { config } from './config';
import { bootstrap } from './bootstrap';
import { services } from './services';

// Export types for users
export type { StrapiGraphQLResolverContext } from './services/types';

export default {
  config,
  bootstrap,
  services,
};
