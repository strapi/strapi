import { Box, IconButton, Status, Table, Tbody, Td, Tr, Typography } from '@strapi/design-system';
import { CheckCircle, Pencil } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { Link, useNavigate } from 'react-router-dom';
import { styled } from 'styled-components';

import { RelativeTime } from '../../../components/RelativeTime';
import { useTracking } from '../../../features/Tracking';
import { useGetRecentDocumentsQuery } from '../../../services/homepage';
import { capitalise } from '../../../utils/strings';

import { Widget } from './Widget';

import type { RecentDocument } from '../../../../../shared/contracts/homepage';

const CellTypography = styled(Typography).attrs({ maxWidth: '14.4rem', display: 'block' })`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

interface DocumentStatusProps {
  status: RecentDocument['status'];
}

const DocumentStatus = ({ status = 'draft' }: DocumentStatusProps) => {
  const statusVariant =
    status === 'draft' ? 'secondary' : status === 'published' ? 'success' : 'alternative';

  const { formatMessage } = useIntl();

  return (
    <Status variant={statusVariant} size="XS">
      <Typography tag="span" variant="omega" fontWeight="bold">
        {formatMessage({
          id: `content-manager.containers.List.${status}`,
          defaultMessage: capitalise(status),
        })}
      </Typography>
    </Status>
  );
};

const RecentDocumentsTable = ({ documents }: { documents: RecentDocument[] }) => {
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const navigate = useNavigate();

  const getEditViewLink = (document: RecentDocument): string => {
    // TODO: import the constants for this once the code is moved to the CM package
    const isSingleType = document.kind === 'singleType';
    const kindPath = isSingleType ? 'single-types' : 'collection-types';
    const queryParams = document.locale ? `?plugins[i18n][locale]=${document.locale}` : '';

    return `/content-manager/${kindPath}/${document.contentTypeUid}${isSingleType ? '' : '/' + document.documentId}${queryParams}`;
  };

  const handleRowClick = (document: RecentDocument) => () => {
    trackUsage('willEditEntryFromHome');
    const link = getEditViewLink(document);
    navigate(link);
  };

  return (
    <Table colCount={5} rowCount={documents?.length ?? 0}>
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

/* -------------------------------------------------------------------------------------------------
 * LastEditedWidget
 * -----------------------------------------------------------------------------------------------*/

const LastEditedWidgetContent = () => {
  const { formatMessage } = useIntl();
  const { data, isLoading, error } = useGetRecentDocumentsQuery({ action: 'update' });

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
          id: 'content-manager.widget.last-edited.no-data',
          defaultMessage: 'No edited entries',
        })}
      </Widget.NoData>
    );
  }

  return <RecentDocumentsTable documents={data} />;
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
      <LastEditedWidgetContent />
    </Widget.Root>
  );
};

/* -------------------------------------------------------------------------------------------------
 * LastPublishedWidget
 * -----------------------------------------------------------------------------------------------*/

const LastPublishedWidgetContent = () => {
  const { formatMessage } = useIntl();
  const { data, isLoading, error } = useGetRecentDocumentsQuery({ action: 'publish' });

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
          id: 'content-manager.widget.last-published.no-data',
          defaultMessage: 'No published entries',
        })}
      </Widget.NoData>
    );
  }

  return <RecentDocumentsTable documents={data} />;
};

const LastPublishedWidget = () => {
  return (
    <Widget.Root
      title={{
        id: 'content-manager.widget.last-published.title',
        defaultMessage: 'Last published entries',
      }}
      icon={CheckCircle}
    >
      <LastPublishedWidgetContent />
    </Widget.Root>
  );
};

export { LastEditedWidget, LastPublishedWidget };
