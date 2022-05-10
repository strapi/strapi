import { useQuery } from 'react-query';

import pluginId from '../pluginId';
import { axiosInstance, getRequestUrl } from '../utils';
import { recursiveRenameKeys } from './utils/rename-keys';

const FIELD_MAPPING = {
  name: 'label',
  id: 'value',
};

export const useFolderStructure = ({ enabled = true } = {}) => {
  const dataRequestURL = getRequestUrl('folder-structure');

  const fetchFolderStructure = async () => {
    const {
      data: { data },
    } = await axiosInstance.get(dataRequestURL);

    return data.map(f => recursiveRenameKeys(f, key => FIELD_MAPPING?.[key] ?? key));
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
