import * as React from 'react';

import { Button, HeaderLayout } from '@strapi/design-system';
import { CheckPermissions, CheckPagePermissions } from '@strapi/helper-plugin';
import { Plus } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { AddReleaseDialog } from '../components/AddReleaseDialog';
import { PERMISSIONS } from '../constants';

const ReleasesPage = () => {
  const [addReleaseDialogIsShown, setAddReleaseDialogIsShown] = React.useState(false);
  const { formatMessage } = useIntl();

  const total = 0; // TODO: replace it with the total number of releases

  const toggleAddReleaseDialog = () => {
    setAddReleaseDialogIsShown((prev) => !prev);
  };

  return (
    <>
      <HeaderLayout
        title={formatMessage({
          id: 'content-releases.pages.Releases.title',
          defaultMessage: 'Releases',
        })}
        subtitle={formatMessage(
          {
            id: 'content-releases.pages.Releases.header-subtitle',
            defaultMessage: '{number, plural, =0 {No releases} one {# release} other {# releases}}',
          },
          { number: total }
        )}
        primaryAction={
          <CheckPermissions permissions={PERMISSIONS.create}>
            <Button startIcon={<Plus />} onClick={toggleAddReleaseDialog}>
              {formatMessage({
                id: 'content-releases.header.actions.add-release',
                defaultMessage: 'New release',
              })}
            </Button>
          </CheckPermissions>
        }
      />
      {addReleaseDialogIsShown && <AddReleaseDialog handleClose={toggleAddReleaseDialog} />}
    </>
  );
};

const ProtectedReleasesPage = () => (
  <CheckPermissions permissions={PERMISSIONS.main}>
    <ReleasesPage />
  </CheckPermissions>
);

export { ReleasesPage, ProtectedReleasesPage };
