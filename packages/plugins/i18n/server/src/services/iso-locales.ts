import { isoLocales } from '../constants';

const getIsoLocales = () => isoLocales;

const isoLocalesService = () => ({
  getIsoLocales,
});

type ISOLocalesService = typeof isoLocalesService;

export default isoLocalesService;
export type { ISOLocalesService };
