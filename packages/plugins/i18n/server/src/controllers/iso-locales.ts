import type { Common } from '@strapi/types';
import { getService } from '../utils';

const controller: Common.Controller = {
  listIsoLocales(ctx) {
    const isoLocalesService = getService('iso-locales');

    ctx.body = isoLocalesService.getIsoLocales();
  },
};

export default controller;
