import { useIntl } from 'react-intl';

import { useGetFolderQuery } from '../../../services/folders';
import { getTranslationKey } from '../../../utils/translations';

export const useFolderTitle = (currentFolderId: number | null): string => {
  const { formatMessage } = useIntl();
  const { data: currentFolder, isLoading } = useGetFolderQuery(
    { id: currentFolderId! },
    { skip: currentFolderId === null }
  );

  const mediaLibraryLabel = formatMessage({
    id: getTranslationKey('plugin.name'),
    defaultMessage: 'Media Library',
  });

  if (currentFolderId === null) {
    return mediaLibraryLabel;
  }

  if (isLoading) {
    return mediaLibraryLabel;
  }

  return currentFolder?.name ?? mediaLibraryLabel;
};
