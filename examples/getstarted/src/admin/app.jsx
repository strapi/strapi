import { registerPreviewRoute } from './preview';

const config = {
  locales: ['it', 'es', 'en', 'en-GB', 'fr'],
};

export default {
  config,
  register: (app) => {
    registerPreviewRoute(app);
  },
};
