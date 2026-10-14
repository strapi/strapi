import type { Core } from '@strapi/types';
import { getService } from '../utils';

// TODO @Nico Controllers stay plain objects and read the global `strapi`: user extensions patch
// `plugin.controllers.<name>.<action>` on the raw plugin object before core resolves factories, so a
// factory would break them (see __tests__/plugin-shape.test.ts).

const controller: Core.Controller = {
  listIsoLocales(ctx) {
    const isoLocalesService = getService('iso-locales', { strapi });

    ctx.body = isoLocalesService.getIsoLocales();
  },
};

export default controller;
