import bootstrap from './bootstrap';
import services from './services';
import config from './config';

type SentryPlugin = () => {
  bootstrap: unknown;
  config: unknown;
  services: unknown;
};

const plugin: SentryPlugin = () => ({
  bootstrap,
  config,
  services,
});

export default plugin;
