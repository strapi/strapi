import * as React from 'react';

import {
  Button,
  ContentLayout,
  EmptyStateLayout,
  Flex,
  HeaderLayout,
  IconButton,
  Link,
  Main,
  Popover,
  Typography,
} from '@strapi/design-system';
import { CheckPermissions } from '@strapi/helper-plugin';
import { ArrowLeft, EmptyDocuments, More, Pencil, Trash } from '@strapi/icons';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

import { PERMISSIONS } from '../constants';

const PopoverButton = styled(Flex)`
  align-self: stretch;
`;

const PencilIcon = styled(Pencil)`
  width: 16px;
  height: 16px;
  path {
    fill: ${({ theme }) => theme.colors.neutral600};
  }
`;

const TrashIcon = styled(Trash)`
  width: 16px;
  height: 16px;
  path {
    fill: ${({ theme }) => theme.colors.danger600};
  }
`;

const ReleaseInfoWrapper = styled(Flex)`
  align-self: stretch;
  border-radius: 0 0 4px 4px;
  border-top: 1px solid ${({ theme }) => theme.colors.neutral150};
`;

const ReleaseDetailsPage = () => {
  const [isPopoverVisible, setIsPopoverVisible] = React.useState(false);
  const moreButtonRef = React.useRef<HTMLButtonElement>(null!);
  const { formatMessage } = useIntl();
  // TODO: get the title from the API
  const title = 'Release title';

  const totalEntries = 0; // TODO: replace it with the total number of entries
  const days = 0; // TODO: replace it with the number of days since the release was created
  const createdBy = 'John Doe'; // TODO: replace it with the name of the user who created the release

  const handleTogglePopover = () => {
    setIsPopoverVisible((prev) => !prev);
  };

  return (
    <Main>
      <HeaderLayout
        title={title}
        subtitle={formatMessage(
          {
            id: 'content-releases.pages.Details.header-subtitle',
            defaultMessage: '{number, plural, =0 {No entries} one {# entry} other {# entries}}',
          },
          { number: totalEntries }
        )}
        navigationAction={
          <Link startIcon={<ArrowLeft />} to="/plugins/content-releases">
            {formatMessage({
              id: 'global.back',
              defaultMessage: 'Back',
            })}
          </Link>
        }
        primaryAction={
          <Flex gap={2}>
            <IconButton
              label={formatMessage({
                id: 'content-releases.header.actions.open-release-actions',
                defaultMessage: 'Release actions',
              })}
              onClick={handleTogglePopover}
              ref={moreButtonRef}
            >
              <More />
            </IconButton>
            {isPopoverVisible && (
              <Popover
                source={moreButtonRef}
                placement="bottom-end"
                onDismiss={handleTogglePopover}
                spacing={4}
                minWidth="242px"
              >
                <Flex alignItems="center" justifyContent="center" direction="column" padding={1}>
                  <PopoverButton
                    paddingTop={2}
                    paddingBottom={2}
                    paddingLeft={4}
                    paddingRight={4}
                    alignItems="center"
                    gap={2}
                    as="button"
                    borderRadius="4px"
                  >
                    <PencilIcon />
                    <Typography ellipsis>
                      {formatMessage({
                        id: 'content-releases.header.actions.edit',
                        defaultMessage: 'Edit',
                      })}
                    </Typography>
                  </PopoverButton>
                  <PopoverButton
                    paddingTop={2}
                    paddingBottom={2}
                    paddingLeft={4}
                    paddingRight={4}
                    alignItems="center"
                    gap={2}
                    as="button"
                    borderRadius="4px"
                  >
                    <TrashIcon />
                    <Typography ellipsis textColor="danger600">
                      {formatMessage({
                        id: 'content-releases.header.actions.delete',
                        defaultMessage: 'Delete',
                      })}
                    </Typography>
                  </PopoverButton>
                </Flex>
                <ReleaseInfoWrapper
                  direction="column"
                  justifyContent="center"
                  alignItems="flex-start"
                  gap={1}
                  padding={5}
                >
                  <Typography variant="pi" fontWeight="bold">
                    {formatMessage({
                      id: 'content-releases.header.actions.created',
                      defaultMessage: 'Created',
                    })}
                  </Typography>
                  <Typography variant="pi" color="neutral300">
                    {formatMessage(
                      {
                        id: 'content-releases.header.actions.created.description',
                        defaultMessage:
                          '{number, plural, =0 {# days} one {# day} other {# days}} ago by {createdBy}',
                      },
                      { number: days, createdBy }
                    )}
                  </Typography>
                </ReleaseInfoWrapper>
              </Popover>
            )}
            <Button size="S" variant="tertiary">
              {formatMessage({
                id: 'content-releases.header.actions.refresh',
                defaultMessage: 'Refresh',
              })}
            </Button>
            <Button size="S" disabled={true} variant="default">
              {formatMessage({
                id: 'content-releases.header.actions.release',
                defaultMessage: 'Release',
              })}
            </Button>
          </Flex>
        }
      />
      <ContentLayout>
        <EmptyStateLayout
          content={formatMessage({
            id: 'content-releases.pages.Details.empty-state.content',
            defaultMessage: 'This release is empty.',
          })}
          icon={<EmptyDocuments width="10rem" />}
        />
      </ContentLayout>
    </Main>
  );
};

const ProtectedReleaseDetailsPage = () => (
  <CheckPermissions permissions={PERMISSIONS.main}>
    <ReleaseDetailsPage />
  </CheckPermissions>
);

export { ReleaseDetailsPage, ProtectedReleaseDetailsPage };
