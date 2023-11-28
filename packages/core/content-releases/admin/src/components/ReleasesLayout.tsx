import * as React from 'react';

import { Button, HeaderLayout, Main } from '@strapi/design-system';
import { CheckPermissions } from '@strapi/helper-plugin';
import { Plus } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { PERMISSIONS } from '../constants';

interface ReleasesLayoutProps {
  isLoading?: boolean;
  totalEntries?: number;
  onClickAddRelease: () => void;
  children: React.ReactNode;
}

export const ReleasesLayout = ({
  isLoading,
  totalEntries,
  onClickAddRelease,
  children,
}: ReleasesLayoutProps) => {
  const { formatMessage } = useIntl();
  return (
    <Main aria-busy={isLoading}>
      <HeaderLayout
        title={formatMessage({
          id: 'content-releases.pages.Releases.title',
          defaultMessage: 'Releases',
        })}
        subtitle={
          !isLoading &&
          formatMessage(
            {
              id: 'content-releases.pages.Releases.header-subtitle',
              defaultMessage:
                '{number, plural, =0 {No releases} one {# release} other {# releases}}',
            },
            { number: totalEntries }
          )
        }
        primaryAction={
          <CheckPermissions permissions={PERMISSIONS.create}>
            <Button startIcon={<Plus />} onClick={onClickAddRelease}>
              {formatMessage({
                id: 'content-releases.header.actions.add-release',
                defaultMessage: 'New release',
              })}
            </Button>
          </CheckPermissions>
        }
      />
      {children}
    </Main>
  );
};
