import React from 'react';
import { Button } from '@strapi/design-system';

const config = {
  locales: ['it', 'es', 'en'],
};
const bootstrap = (app) => {
  app.getPlugin('content-manager').injectComponent('editView', 'right-links', {
    name: 'PreviewButton',
    Component: () => (
      <Button onClick={() => window.alert('Not here, The preview is.')}>Preview</Button>
    ),
  });
};

export default {
  config,
  bootstrap,
};
