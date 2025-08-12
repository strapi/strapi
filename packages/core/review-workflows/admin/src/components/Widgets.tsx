import { Widget, useTracking } from '@strapi/admin/strapi-admin';
import { DocumentStatus, RelativeTime } from '@strapi/content-manager/strapi-admin';
import { Box, IconButton, Table, Tbody, Td, Tr, Typography } from '@strapi/design-system';
import { Pencil } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { Link, useNavigate } from 'react-router-dom';
import { styled } from 'styled-components';

import { StageColumn } from '../routes/content-manager/model/components/TableColumns';
import { useGetRecentlyAssignedDocumentsQuery } from '../services/content-manager';

import type { RecentDocument } from '../../../shared/contracts/homepage';

const CellTypography = styled(Typography)`
  display: block;
  max-width: 14.4rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const RecentDocumentsTable = ({
  documents,
  type,
}: {
  documents: RecentDocument[];
  type: 'assigned';
}) => {
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const navigate = useNavigate();

  const getEditViewLink = (document: RecentDocument): string => {
    const isSingleType = document.kind === 'singleType';
    const kindPath = isSingleType ? 'single-types' : 'collection-types';
    const queryParams = document.locale ? `?plugins[i18n][locale]=${document.locale}` : '';

    return `/content-manager/${kindPath}/${document.contentTypeUid}${isSingleType ? '' : '/' + document.documentId}${queryParams}`;
  };

  const handleRowClick = (document: RecentDocument) => () => {
    trackUsage('willEditEntryFromHome', { entryType: type });
    const link = getEditViewLink(document);
    navigate(link);
  };

  return (
    <Table colCount={6} rowCount={documents?.length ?? 0}>
      <Tbody>
        {documents?.map((document) => (
          <Tr onClick={handleRowClick(document)} cursor="pointer" key={document.documentId}>
            <Td>
              <CellTypography title={document.title} variant="omega" textColor="neutral800">
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
                  : formatMessage({
                      id: document.contentTypeDisplayName,
                      defaultMessage: document.contentTypeDisplayName,
                    })}
              </CellTypography>
            </Td>
            <Td>
              <Box display="inline-block">
                {document.status ? (
                  <DocumentStatus status={document.status} />
                ) : (
                  <Typography textColor="neutral600" aria-hidden>
                    -
                  </Typography>
                )}
              </Box>
            </Td>
            <Td>
              <Typography textColor="neutral600">
                <RelativeTime timestamp={new Date(document.updatedAt)} />
              </Typography>
            </Td>
            <Td>
              <StageColumn strapi_stage={document.strapi_stage} />
            </Td>
            <Td onClick={(e) => e.stopPropagation()}>
              <Box display="inline-block">
                <IconButton
                  tag={Link}
                  to={getEditViewLink(document)}
                  onClick={() => trackUsage('willEditEntryFromHome', { entryType: type })}
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

/* -------------------------------------------------------------------------------------------------
 * AssignedWidget
 * -----------------------------------------------------------------------------------------------*/

const AssignedWidget = () => {
  const { formatMessage } = useIntl();
  const { data, isLoading, error } = useGetRecentlyAssignedDocumentsQuery();

  if (isLoading) {
    return <Widget.Loading />;
  }

  if (error || !data) {
    return <Widget.Error />;
  }

  if (data.length === 0) {
    return (
      <Widget.NoData>
        {formatMessage({
          id: 'review-workflows.widget.assigned.no-data',
          defaultMessage: 'No entries',
        })}
      </Widget.NoData>
    );
  }

  return <RecentDocumentsTable documents={data} type="assigned" />;
};

export { AssignedWidget };
