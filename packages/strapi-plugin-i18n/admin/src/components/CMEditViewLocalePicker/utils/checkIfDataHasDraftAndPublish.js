import has from 'lodash/has';

const checkIfDataHasDraftAndPublish = locales =>
  locales.every(locale => has(locale, 'published_at'));

export default checkIfDataHasDraftAndPublish;
