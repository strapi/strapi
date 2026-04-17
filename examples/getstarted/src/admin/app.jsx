import { registerPreviewRoute } from './preview';

const config = {
  locales: ['it', 'es', 'en', 'en-GB', 'fr', 'zh-Hans'],
};

export default {
  config,
  register: (app) => {
    registerPreviewRoute(app);
  },
};
