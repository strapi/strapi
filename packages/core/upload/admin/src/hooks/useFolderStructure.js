import { useQuery } from 'react-query';

import pluginId from '../pluginId';
import { axiosInstance, getRequestUrl } from '../utils';

const FIELD_MAPPING = {
  name: 'label',
  id: 'value',
};

const renameKeys = (obj, fn) =>
  Object.fromEntries(
    Object.entries(obj).map(([key, value]) => {
      const getValue = v => (typeof v === 'object' && v !== null ? renameKeys(v, fn) : v);

      return [fn(key), Array.isArray(value) ? value.map(val => getValue(val)) : getValue(value)];
    })
  );

export const useFolderStructure = ({ enabled = true } = {}) => {
  const dataRequestURL = getRequestUrl('folder-structure');

  const fetchFolderStructure = async () => {
    const {
      data: { data },
    } = await axiosInstance.get(dataRequestURL);

    return data.map(f => renameKeys(f, key => FIELD_MAPPING?.[key] ?? key));
  };

  const { data, error, isLoading } = useQuery(
    [pluginId, 'folders', 'structure'],
    fetchFolderStructure,
    {
      enabled,
      staleTime: 0,
      cacheTime: 0,
    }
  );

  return { data, error, isLoading };
};
