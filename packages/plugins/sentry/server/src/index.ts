import bootstrap from './bootstrap';
import services from './services';
import config from './config';

export default (): Record<string, unknown> => ({
  bootstrap,
  config,
  services,
});
