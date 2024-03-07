import * as React from 'react';

import { Button } from '@strapi/design-system';
import { useCMEditViewDataManager, CheckPermissions } from '@strapi/helper-plugin';
import { Common } from '@strapi/types';
import { useIntl } from 'react-intl';

import { PERMISSIONS } from '../constants';

import { AddActionToReleaseModal } from './CMReleasesContainer';

export const CMBulkRelease = () => {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const { formatMessage } = useIntl();
  //TODO: find a way to get entryIds and contentTypeUid
  const {
    initialData: { id: entryId },
    slug,
  } = useCMEditViewDataManager();

  const contentTypeUid = slug as Common.UID.ContentType;

  const toggleAddToReleaseDialog = () => {
    if (isModalOpen) {
      setIsModalOpen(false);
    } else {
      setIsModalOpen(true);
    }
  };

  return (
    <CheckPermissions permissions={PERMISSIONS.createAction}>
      <Button variant="tertiary" onClick={toggleAddToReleaseDialog}>
        {formatMessage({
          id: 'content-releases.content-manager-list-view.add-to-release',
          defaultMessage: 'Add to release',
        })}
      </Button>
      {isModalOpen && (
        <AddActionToReleaseModal
          handleClose={() => setIsModalOpen(false)}
          contentTypeUid={contentTypeUid}
          entryId={entryId}
        />
      )}
    </CheckPermissions>
  );
};
