import { useFetchClient } from '@strapi/admin/strapi-admin';
import { useQuery } from '@tanstack/react-query';
import { useIntl } from 'react-intl';

import { FolderNode, GetFolderStructure } from '../../../shared/contracts/folders';
import { pluginId } from '../pluginId';
import { getTrad } from '../utils';

import { recursiveRenameKeys } from './utils/renameKeys';

const FIELD_MAPPING: Record<string, string> = {
  name: 'label',
  id: 'value',
};

interface FolderNodeWithChildren extends Omit<FolderNode, 'children'> {
  children: FolderNodeWithChildren[];
  label?: string;
  value: string | number | null;
}

export const useFolderStructure = ({ enabled = true } = {}) => {
  const { formatMessage } = useIntl();
  const { get } = useFetchClient();

  const fetchFolderStructure = async () => {
    const {
      data: { data },
    } = await get<GetFolderStructure.Response['data']>('/upload/folder-structure');
    const children = data.map((f: FolderNodeWithChildren) =>
      recursiveRenameKeys(f, (key) => FIELD_MAPPING?.[key] ?? key)
    );

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

  // v4: disabled queries report isLoading=true; isInitialLoading matches v3 isLoading.
  const {
    data,
    error,
    isInitialLoading: isLoading,
  } = useQuery([pluginId, 'folder', 'structure'], fetchFolderStructure, {
    enabled,
    staleTime: 0,
    cacheTime: 0,
  });

  return { data, error, isLoading };
};
