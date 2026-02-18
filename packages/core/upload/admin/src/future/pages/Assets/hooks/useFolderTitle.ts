import { useIntl } from 'react-intl';

import { useGetAssetsQuery } from '../../../services/assets';
import { useGetFolderQuery } from '../../../services/folders';
import { getTranslationKey } from '../../../utils/translations';

export interface FolderTitle {
  title: string;
}

export const useFolderTitle = (currentFolderId: number | null): FolderTitle => {
  const { formatMessage } = useIntl();
  const { data: currentFolder, isLoading } = useGetFolderQuery(
    { id: currentFolderId! },
    { skip: currentFolderId === null }
  );
  const { data: rootAssetsData, isLoading: isRootAssetsLoading } = useGetAssetsQuery(
    { folder: null, pageSize: 1 },
    { skip: currentFolderId !== null }
  );

  const homeLabel = formatMessage({
    id: getTranslationKey('plugin.home'),
    defaultMessage: 'Home',
  });

  if (currentFolderId === null) {
    if (isRootAssetsLoading) {
      return { title: homeLabel };
    }

    const fileCount = rootAssetsData?.pagination?.total ?? 0;
    const itemCountLabel = formatMessage(
      {
        id: getTranslationKey('header.content.item-count'),
        defaultMessage: '{count, plural, =1 {# item} other {# items}}',
      },
      { count: fileCount }
    );

    return { title: `${homeLabel} (${itemCountLabel})` };
  }

  if (isLoading) {
    return { title: homeLabel };
  }

  const folderName = currentFolder?.name ?? homeLabel;
  const fileCount = currentFolder?.files?.count ?? 0;
  const itemCountLabel = formatMessage(
    {
      id: getTranslationKey('header.content.item-count'),
      defaultMessage: '{count, plural, =1 {# item} other {# items}}',
    },
    { count: fileCount }
  );

  return { title: `${folderName} (${itemCountLabel})` };
};
