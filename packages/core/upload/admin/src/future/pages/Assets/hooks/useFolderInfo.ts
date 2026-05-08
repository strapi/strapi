import { useIntl } from 'react-intl';

import { useGetAssetsQuery } from '../../../services/assets';
import { useGetFolderQuery } from '../../../services/folders';
import { getTranslationKey } from '../../../utils/translations';

export interface FolderInfo {
  title: string;
  itemCount: number;
}

export const useFolderInfo = (currentFolderId: number | null): FolderInfo => {
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
      return { title: homeLabel, itemCount: 0 };
    }

    return { title: homeLabel, itemCount: rootAssetsData?.pagination?.total ?? 0 };
  }

  if (isLoading) {
    return { title: homeLabel, itemCount: 0 };
  }

  return {
    title: currentFolder?.name ?? homeLabel,
    itemCount: currentFolder?.files?.count ?? 0,
  };
};
