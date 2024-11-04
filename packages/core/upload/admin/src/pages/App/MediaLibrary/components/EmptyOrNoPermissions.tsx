import { Button } from '@strapi/design-system';
import { Plus } from '@strapi/icons';
import { EmptyPermissions } from '@strapi/icons/symbols';
import { useIntl } from 'react-intl';

import { EmptyAssets } from '../../../../components/EmptyAssets/EmptyAssets';
import { getTrad } from '../../../../utils';

export interface EmptyOrNoPermissionsProps {
  canCreate: boolean;
  canRead: boolean;
  isFiltering: boolean;
  onActionClick: () => void;
}

const getContentIntlMessage = ({
  isFiltering,
  canCreate,
  canRead,
}: Omit<EmptyOrNoPermissionsProps, 'onActionClick'>) => {
  if (isFiltering) {
    return {
      id: 'list.assets-empty.title-withSearch',
      defaultMessage: 'There are no elements with the applied filters',
    };
  }

  if (canRead) {
    if (canCreate) {
      return {
        id: 'list.assets.empty-upload',
        defaultMessage: 'Upload your first assets...',
      };
    }

    return {
      id: 'list.assets.empty',
      defaultMessage: 'Media Library is empty',
    };
  }

  return {
    id: 'header.actions.no-permissions',
    defaultMessage: 'No permissions to view',
  };
};

export const EmptyOrNoPermissions = ({
  canCreate,
  isFiltering,
  canRead,
  onActionClick,
}: EmptyOrNoPermissionsProps) => {
  const { formatMessage } = useIntl();
  const content = getContentIntlMessage({ isFiltering, canCreate, canRead });

  return (
    <EmptyAssets
      icon={!canRead ? EmptyPermissions : undefined}
      action={
        canCreate &&
        !isFiltering && (
          <Button variant="secondary" startIcon={<Plus />} onClick={onActionClick}>
            {formatMessage({
              id: getTrad('header.actions.add-assets'),
              defaultMessage: 'Add new assets',
            })}
          </Button>
        )
      }
      content={formatMessage({
        ...content,
        id: getTrad(content.id),
      })}
    />
  );
};
