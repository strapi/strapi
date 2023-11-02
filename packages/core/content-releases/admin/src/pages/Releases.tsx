/*
 *
 * Releases
 *
 */
import React from 'react';

import { Button, Main, HeaderLayout } from '@strapi/design-system';
import { Plus } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { AddReleaseDialog } from '../components/AddReleaseDialog';

const ReleasesPage = () => {
  const [showAddReleaseDialog, setShowAddReleaseDialog] = React.useState(false);
  const { formatMessage } = useIntl();

  const total = 0; // TODO: replace it with the total number of releases

  const subtitle = formatMessage(
    {
      id: 'content-releases.pages.Releases.header-subtitle',
      defaultMessage: '{number, plural, =0 {No releases} one {# release} other {# releases}}',
    },
    { number: total }
  );

  const toggleAddReleaseDialog = () => {
    setShowAddReleaseDialog((prev: boolean) => !prev);
  };

  return (
    <>
      <Main>
        <HeaderLayout
          title={formatMessage({
            id: 'content-releases.pages.Releases.title',
            defaultMessage: 'Releases',
          })}
          subtitle={subtitle}
          primaryAction={
            <Button startIcon={<Plus />} onClick={toggleAddReleaseDialog}>
              {formatMessage({
                id: 'content-releases.header.actions.add-release',
                defaultMessage: 'New release',
              })}
            </Button>
          }
        />
      </Main>
      {showAddReleaseDialog && <AddReleaseDialog onClose={() => toggleAddReleaseDialog()} />}
    </>
  );
};

export { ReleasesPage };
