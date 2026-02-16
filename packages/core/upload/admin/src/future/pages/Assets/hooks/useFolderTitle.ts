import { useIntl } from 'react-intl';

import { useGetFolderQuery } from '../../../services/folders';
import { getTranslationKey } from '../../../utils/translations';

export const useFolderTitle = (currentFolderId: number | null): string => {
  const { formatMessage } = useIntl();
  const { data: currentFolder } = useGetFolderQuery(
    { id: currentFolderId! },
    { skip: currentFolderId === null }
  );

  if (currentFolderId === null) {
    return formatMessage({
      id: getTranslationKey('plugin.name'),
      defaultMessage: 'Media Library',
    });
  }

  return currentFolder?.name ?? '...';
};
