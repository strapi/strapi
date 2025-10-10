import React from 'react';

import { Button } from '@strapi/design-system';

import { registerPreviewRoute } from './preview';

const config = {
  locales: ['it', 'es', 'en', 'en-GB'],
};

export default {
  config,
  register: (app) => {
    registerPreviewRoute(app);
  },
};
