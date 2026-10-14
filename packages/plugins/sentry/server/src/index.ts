import bootstrap from './bootstrap';
import services from './services';
import config from './config';

export type * from './types';

export default () => ({
  bootstrap,
  config,
  services,
});
