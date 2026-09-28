import type { IsoLocalesController } from '../types/controllers';
import { getService } from '../utils';

const controller: IsoLocalesController = {
  listIsoLocales(ctx) {
    const isoLocalesService = getService('iso-locales');

    ctx.body = isoLocalesService.getIsoLocales();
  },
};

export default controller;
