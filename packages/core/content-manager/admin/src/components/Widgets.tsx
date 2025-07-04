import { Widget, useTracking } from '@strapi/admin/strapi-admin';
import { Box, Flex, IconButton, Table, Tbody, Td, Tr, Typography } from '@strapi/design-system';
import { Pencil } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { Link, useNavigate } from 'react-router-dom';
import { styled, DefaultTheme } from 'styled-components';

import { DocumentStatus } from '../pages/EditView/components/DocumentStatus';
import { useGetRecentDocumentsQuery, useGetCountDocumentsQuery } from '../services/homepage';

import { RelativeTime } from './RelativeTime';

import type { RecentDocument } from '../../../shared/contracts/homepage';

const CellTypography = styled(Typography).attrs({ maxWidth: '14.4rem', display: 'block' })`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const RecentDocumentsTable = ({ documents }: { documents: RecentDocument[] }) => {
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

const LastEditedWidget = () => {
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

/* -------------------------------------------------------------------------------------------------
 * LastPublishedWidget
 * -----------------------------------------------------------------------------------------------*/

const LastPublishedWidget = () => {
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

/* -------------------------------------------------------------------------------------------------
 * ChartEntriesWidget
 * -----------------------------------------------------------------------------------------------*/
const RADIUS = 64;
const STROKE = 16;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type ThemeColor = keyof DefaultTheme['colors'];

const ArcChart = styled.circle<{ arcColor: ThemeColor }>`
  stroke: ${({ theme, arcColor }) => theme.colors[arcColor]};
`;

const TextChart = styled.text<{ textColor: ThemeColor }>`
  fill: ${({ theme, textColor }) => theme.colors[textColor]};
`;

const DonutChartSVG = ({
  data,
}: {
  data: { label: string; count: number; color: ThemeColor }[];
}) => {
  const total = data.reduce((acc, curr) => acc + curr.count, 0);

  let cumulativePercent = 0;

  return (
    <Flex direction="column" gap={4}>
      <svg width="160" height="160" viewBox="0 0 160 160">
        <g transform="rotate(-90 80 80)">
          {data.map((value) => {
            const percent = (value.count / total) * 100;
            const arcLength = (percent / 100) * CIRCUMFERENCE;
            const dashArray = `${arcLength} ${CIRCUMFERENCE - arcLength}`;
            const dashOffset = CIRCUMFERENCE * (1 - cumulativePercent / 100);
            const el = (
              <ArcChart
                key={value.label}
                cx="80"
                cy="80"
                r={RADIUS}
                fill="none"
                arcColor={value.color}
                strokeWidth={STROKE}
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
                style={{ transition: 'stroke-dashoffset 0.3s' }}
              />
            );
            cumulativePercent += percent;
            return el;
          })}
        </g>
        <TextChart
          x="80"
          y="80"
          textAnchor="middle"
          dy="0.3em"
          fontSize="2.4rem"
          textColor="neutral800"
          fontWeight="bold"
        >
          {total}
        </TextChart>
        <TextChart x="80" y="100" textAnchor="middle" fontSize="1rem" textColor="neutral600">
          entries
        </TextChart>
      </svg>
      <Flex gap={4} justifyContent="center">
        {data.map(
          (value) =>
            value.count > 0 && (
              <Flex gap={1} key={value.label}>
                <Box background={value.color} padding={2} borderRadius={1} />
                <Typography variant="pi">{value.label}</Typography>
              </Flex>
            )
        )}
      </Flex>
    </Flex>
  );
};

const ChartEntriesWidget = () => {
  const { formatMessage } = useIntl();
  const { data: countDocuments, isLoading, error } = useGetCountDocumentsQuery();

  if (isLoading) {
    return <Widget.Loading />;
  }

  if (error) {
    return <Widget.Error />;
  }

  const { draft, published, modified } = countDocuments ?? {
    draft: 0,
    published: 0,
    modified: 0,
  };

  const total = draft + published + modified;

  if (!total) {
    return (
      <Widget.NoData>
        {formatMessage({
          id: 'content-manager.widget.last-published.no-data',
          defaultMessage: 'No published entries',
        })}
      </Widget.NoData>
    );
  }

  return (
    <Flex minHeight="100%" justifyContent="center">
      <DonutChartSVG
        data={[
          {
            label: 'Draft',
            count: draft,
            color: 'secondary500',
          },
          {
            label: 'Modified',
            count: modified,
            color: 'alternative500',
          },
          {
            label: 'Published',
            count: published,
            color: 'success500',
          },
        ]}
      />
    </Flex>
  );
};

export { ChartEntriesWidget, LastEditedWidget, LastPublishedWidget };
