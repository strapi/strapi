import { DocumentStatus } from '@strapi/content-manager/strapi-admin';
import { Box, IconButton, Table, Tbody, Td, Tr, Typography } from '@strapi/design-system';
import { Pencil } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { Link, useNavigate } from 'react-router-dom';
import { styled } from 'styled-components';

import { RelativeTime } from '../../../components/RelativeTime';
import { useTracking } from '../../../features/Tracking';
import { useGetRecentDocumentsQuery } from '../../../services/homepage';

import { Widget } from './Widget';

import type { RecentDocument } from '../../../../../shared/contracts/homepage';

const getEditViewLink = (document: RecentDocument): string => {
  // TODO: import the constants for this once the code is moved to the CM package
  const kindPath = document.kind === 'singleType' ? 'single-types' : 'collection-types';

  return `/content-manager/${kindPath}/${document.contentTypeUid}/${document.documentId}`;
};

const CellTypography = styled(Typography).attrs({ maxWidth: '14.4rem', display: 'inline-block' })`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

/* -------------------------------------------------------------------------------------------------
 * LastEditedWidget
 * -----------------------------------------------------------------------------------------------*/

const LastEditedContent = () => {
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const navigate = useNavigate();
  const { data, isLoading, error } = useGetRecentDocumentsQuery({ action: 'update' });

  if (isLoading) {
    return <Widget.Loading />;
  }

  if (error) {
    return <Widget.Error />;
  }

  if (data?.length === 0) {
    return (
      <Widget.NoData>
        {formatMessage({
          id: 'content-manager.widget.last-edited.no-data',
          defaultMessage: 'No edited entry',
        })}
      </Widget.NoData>
    );
  }

  const handleRowClick = (document: RecentDocument) => () => {
    trackUsage('willEditEntryFromHome');
    const link = getEditViewLink(document);
    navigate(link);
  };

  return (
    <Table colCount={5} rowCount={data?.length ?? 0}>
      <Tbody>
        {data?.map((document) => (
          <Tr onClick={handleRowClick(document)} key={document.documentId}>
            <Td>
              <CellTypography variant="omega" textColor="neutral800">
                {document.title}
              </CellTypography>
            </Td>
            <Td>
              <CellTypography variant="omega" textColor="neutral600">
                {document.kind === 'singleType'
                  ? formatMessage({
                      id: 'content-manager.widget.last-edited.single-type',
                      defaultMessage: 'Single-Type',
                    })
                  : // TODO check how to localize display name
                    document.contentTypeDisplayName}
              </CellTypography>
            </Td>
            <Td>
              <Box display="inline-block">
                <DocumentStatus status={document.status} />
              </Box>
            </Td>
            <Td>
              <Typography textColor="neutral600">
                <RelativeTime timestamp={new Date(document.updatedAt)} />
              </Typography>
            </Td>
            <Td onClick={(e) => e.stopPropagation()}>
              <Box display="inline-block">
                <IconButton
                  tag={Link}
                  to={getEditViewLink(document)}
                  onClick={() => trackUsage('willEditEntryFromHome')}
                  label={formatMessage({
                    id: 'content-manager.actions.edit.label',
                    defaultMessage: 'Edit',
                  })}
                  variant="ghost"
                >
                  <Pencil />
                </IconButton>
              </Box>
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
};

const LastEditedWidget = () => {
  return (
    <Widget.Root
      title={{
        id: 'content-manager.widget.last-edited.title',
        defaultMessage: 'Last edited entries',
      }}
      icon={Pencil}
    >
      <LastEditedContent />
    </Widget.Root>
  );
};

export { LastEditedWidget };
