import { cloneDeep, get, set } from 'lodash';
import pluginId from '../../../pluginId';

const filterLanguages = (appLanguages, availableLanguages) => {
  const ret = cloneDeep(availableLanguages);
  const filteredLanguages = get(
    ret,
    ['sections', '0', 'items', '0', 'items'],
    []
  )
    .filter(lang => {
      const i = appLanguages.findIndex(obj => {
        return obj.name === lang.value.toLowerCase();
      });

      return i === -1;
    })
    .map(obj => ({ ...obj, name: `${pluginId}.${obj.name}` }));

  set(ret, ['sections', '0', 'items', '0', 'items'], filteredLanguages);

  return ret;
};

export default filterLanguages;
