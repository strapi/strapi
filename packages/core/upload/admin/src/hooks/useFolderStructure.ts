import { useFetchClient } from '@strapi/admin/strapi-admin';
import { useIntl } from 'react-intl';
import { useQuery } from 'react-query';

import pluginId from '../pluginId';
import { getTrad } from '../utils';

import { recursiveRenameKeys, DeepRecord } from './utils/rename-keys';

import { FolderStructure, FolderStructureNamespace } from '../../../shared/contracts/folders';

const FIELD_MAPPING: { [key: string]: string } = {
  name: 'label',
  id: 'value',
};

interface UseFolderStructureProps {
  enabled?: boolean;
}

interface FetchReturn {
  value: null;
  label: string;
  children: DeepRecord<FolderStructure>[];
}

type FetchReturnArray = FetchReturn[];

export const useFolderStructure = ({ enabled = true }: UseFolderStructureProps = {}) => {
  const { formatMessage } = useIntl();
  const { get } = useFetchClient();

  const fetchFolderStructure = async (): Promise<FetchReturnArray> => {
    const {
      data: { data },
    }: FolderStructureNamespace.Response = await get('/upload/folder-structure');

    const children = data.map((f) => recursiveRenameKeys(f, (key) => FIELD_MAPPING?.[key] ?? key));

    return [
      {
        value: null,
        label: formatMessage({
          id: getTrad('form.input.label.folder-location-default-label'),
          defaultMessage: 'Media Library',
        }),
        children,
      },
    ];
  };

  const { data, error, isLoading } = useQuery<
    FetchReturnArray,
    FolderStructureNamespace.Response['error']
  >([pluginId, 'folder', 'structure'], fetchFolderStructure, {
    enabled,
    staleTime: 0,
    cacheTime: 0,
  });

  return { data, error, isLoading };
};
