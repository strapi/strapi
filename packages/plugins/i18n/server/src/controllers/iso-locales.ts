import type { Core } from '@strapi/types';
import { getService } from '../utils';
import { getStrapi } from '../utils/strapi-ref';

// Controllers stay plain objects: user extensions patch `plugin.controllers.<name>.<action>` in
// place (see __tests__/plugin-shape.test.ts), so actions read `strapi` at call time.

const controller: Core.Controller = {
  listIsoLocales(ctx) {
    const strapi = getStrapi();
    const isoLocalesService = getService('iso-locales', { strapi });

    ctx.body = isoLocalesService.getIsoLocales();
  },
};

export default controller;
