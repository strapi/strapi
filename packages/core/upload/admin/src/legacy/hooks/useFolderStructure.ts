import { useFetchClient } from '@strapi/admin/strapi-admin';
import { useIntl } from 'react-intl';
import { useQuery } from 'react-query';

import { FolderNode, GetFolderStructure } from '../../../../shared/contracts/folders';
import { pluginId } from '../../pluginId';
import { getTrad } from '../utils';

import { DeepRecord, recursiveRenameKeys } from './utils/renameKeys';

const FIELD_MAPPING: Record<string, string> = {
  name: 'label',
  id: 'value',
};

/**
 * A folder node once FIELD_MAPPING renamed `id` to `value` and `name` to `label`.
 */
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
    // recursiveRenameKeys cannot type the renamed keys, so the result is asserted.
    const children = data.map(
      (f) =>
        recursiveRenameKeys(
          f,
          (key) => FIELD_MAPPING?.[key] ?? key
        ) as DeepRecord<FolderNodeWithChildren>
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

  const { data, error, isLoading } = useQuery(
    [pluginId, 'folder', 'structure'],
    fetchFolderStructure,
    {
      enabled,
      staleTime: 0,
      cacheTime: 0,
    }
  );

  return { data, error, isLoading };
};
