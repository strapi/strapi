import * as React from 'react';

import { Widget, useTracking, useGetCountDocumentsQuery } from '@strapi/admin/strapi-admin';
import {
  Box,
  Flex,
  IconButton,
  Table,
  Tbody,
  Td,
  Tr,
  Typography,
  Portal,
} from '@strapi/design-system';
import { Pencil } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { Link, useNavigate } from 'react-router-dom';
import { styled, DefaultTheme } from 'styled-components';

import { DocumentStatus } from '../pages/EditView/components/DocumentStatus';
import { useGetRecentDocumentsQuery } from '../services/homepage';

import { RelativeTime } from './RelativeTime';

import type { RecentDocument } from '../../../shared/contracts/homepage';

const BASE_MAX_WIDTH = '14.4rem';

/**
 * Calculate dynamic max-width based on column span
 * Base width is 14.4rem for 6 columns, scale proportionally
 */
const calculateDynamicMaxWidth = (columnWidth: number = 4): string => {
  const baseColumnWidth = 4;
  const baseMaxWidth = 14.4; // rem
  const calculatedWidth = (baseMaxWidth * columnWidth) / baseColumnWidth;
  return `${Math.round(calculatedWidth * 10) / 10}rem`;
};

const CellTypography = styled(Typography)<{ $maxWidth?: string }>`
  display: block;
  max-width: ${({ $maxWidth }) => $maxWidth || BASE_MAX_WIDTH};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const RecentDocumentsTable = ({
  documents,
  type,
  dynamicMaxWidth = BASE_MAX_WIDTH,
}: {
  documents: RecentDocument[];
  type: 'edited' | 'published';
  dynamicMaxWidth?: string;
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
    trackUsage('willEditEntryFromHome', {
      entryType: type,
    });
    const link = getEditViewLink(document);
    navigate(link);
  };

  return (
    <Table colCount={5} rowCount={documents?.length ?? 0}>
      <Tbody>
        {documents?.map((document) => (
          <Tr onClick={handleRowClick(document)} cursor="pointer" key={document.documentId}>
            <Td>
              <CellTypography
                title={document.title}
                variant="omega"
                textColor="neutral800"
                $maxWidth={dynamicMaxWidth}
              >
                {document.title}
              </CellTypography>
            </Td>
            <Td>
              <CellTypography variant="omega" textColor="neutral600" $maxWidth={dynamicMaxWidth}>
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
                  onClick={() => trackUsage('willEditEntryFromHome', { type })}
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

const LastEditedWidget = ({ columnWidth = 6 }: { columnWidth?: number }) => {
  const { formatMessage } = useIntl();
  const { data, isLoading, error } = useGetRecentDocumentsQuery({ action: 'update' });

  const dynamicMaxWidth = calculateDynamicMaxWidth(columnWidth);

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

  return <RecentDocumentsTable documents={data} type="edited" dynamicMaxWidth={dynamicMaxWidth} />;
};

/* -------------------------------------------------------------------------------------------------
 * LastPublishedWidget
 * -----------------------------------------------------------------------------------------------*/

const LastPublishedWidget = ({ columnWidth = 6 }: { columnWidth?: number }) => {
  const { formatMessage } = useIntl();
  const { data, isLoading, error } = useGetRecentDocumentsQuery({ action: 'publish' });

  const dynamicMaxWidth = calculateDynamicMaxWidth(columnWidth);

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

  return (
    <RecentDocumentsTable documents={data} type="published" dynamicMaxWidth={dynamicMaxWidth} />
  );
};

/* -------------------------------------------------------------------------------------------------
 * ChartEntriesWidget
 * -----------------------------------------------------------------------------------------------*/
const RADIUS = 80;
const STROKE = 10;
const CIRCUMFERENCE = 2 * Math.PI * (RADIUS - STROKE / 2);

type ThemeColor = keyof DefaultTheme['colors'];

const ArcChart = styled.circle<{ $arcColor: ThemeColor }>`
  stroke: ${({ theme, $arcColor }) => theme.colors[$arcColor]};
`;

const TextChart = styled.tspan<{ $textColor: ThemeColor }>`
  text-transform: lowercase;
  fill: ${({ theme, $textColor }) => theme.colors[$textColor]};
`;

const KeyChartItem = styled(Flex)`
  width: 100%;

  ${({ theme }) => theme.breakpoints.small} {
    width: auto;
  }
`;

interface ChartData {
  label: string;
  count: number;
  color: ThemeColor;
}

const DonutChartSVG = ({ data }: { data: ChartData[] }) => {
  const { locale } = useIntl();
  const { formatMessage } = useIntl();
  const total = data.reduce((acc, curr) => acc + curr.count, 0);
  const [tooltip, setTooltip] = React.useState<{
    visible: boolean;
    x: number;
    y: number;
    value: ChartData | null;
    isTouch?: boolean;
  }>({ visible: false, x: 0, y: 0, value: null });

  let cumulativePercent = 0;

  const handleMouseOver = (e: React.MouseEvent<SVGCircleElement>, value: ChartData) => {
    setTooltip({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      value,
    });
  };
  const handleMouseOut = () => {
    setTooltip((t) => ({ ...t, visible: false }));
  };

  const handleFocus = (e: React.FocusEvent<SVGCircleElement>, value: ChartData) => {
    setTooltip({
      visible: true,
      x:
        e.currentTarget.getBoundingClientRect().width / 2 +
        e.currentTarget.getBoundingClientRect().left,
      y:
        e.currentTarget.getBoundingClientRect().height +
        e.currentTarget.getBoundingClientRect().top,
      value,
    });
  };

  return (
    <Flex direction="column" gap={6} margin="auto">
      <svg
        width={RADIUS * 2}
        height={RADIUS * 2}
        viewBox={`0 0 ${RADIUS * 2} ${RADIUS * 2}`}
        style={{ position: 'relative', zIndex: 1 }}
      >
        <g transform={`rotate(-90 ${RADIUS} ${RADIUS})`}>
          {data.map((value) => {
            const percent = (value.count / total) * 100;
            const arcLength = (percent / 100) * CIRCUMFERENCE;
            const dashArray = `${arcLength} ${CIRCUMFERENCE - arcLength}`;
            const dashOffset = CIRCUMFERENCE * (1 - cumulativePercent / 100);
            const el = (
              <ArcChart
                key={value.label}
                cx={RADIUS}
                cy={RADIUS}
                r={RADIUS - STROKE / 2}
                fill="none"
                strokeWidth={STROKE}
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
                style={{ transition: 'stroke-dashoffset 0.3s', cursor: 'pointer' }}
                tabIndex={0}
                aria-describedby={tooltip.visible ? 'chart-tooltip' : undefined}
                onFocus={(e) => handleFocus(e, value)}
                onBlur={handleMouseOut}
                onMouseMove={(e) => handleMouseOver(e, value)}
                onMouseLeave={handleMouseOut}
                $arcColor={value.color}
              />
            );
            cumulativePercent += percent;
            return el;
          })}
        </g>
        <text x={RADIUS} y={RADIUS} textAnchor="middle" fontSize="2.4rem" fontWeight="bold">
          <TextChart x={RADIUS} dy="0" $textColor="neutral800">
            {new Intl.NumberFormat(locale, {
              notation: 'compact',
              maximumFractionDigits: 1,
            }).format(total)}
          </TextChart>
          <TextChart
            x={RADIUS}
            dy="1.4em"
            fontSize="1.4rem"
            fontWeight="normal"
            $textColor="neutral600"
          >
            {formatMessage(
              {
                id: 'content-manager.widget.chart-entries.count.label',
                defaultMessage: '{count, plural, =0 {entries} one {entry} other {entries}}',
              },
              { count: total }
            )}
          </TextChart>
        </text>
      </svg>
      {tooltip.visible && tooltip.value && (
        <Portal
          style={{
            position: 'fixed',
            left: 16,
            top: 16,
            zIndex: 2,
            transform: `translate(${tooltip.x}px, ${tooltip.y}px)`,
          }}
          data-testid="entries-chart-tooltip"
        >
          <Box
            background="neutral900"
            padding={2}
            borderRadius={1}
            textAlign="center"
            role="tooltip"
            aria-live="polite"
          >
            <Typography textColor="neutral0">
              {formatMessage(
                {
                  id: 'content-manager.widget.chart-entries.tooltip',
                  defaultMessage: '{count} items',
                },
                {
                  count: tooltip.value.count,
                  label: tooltip.value.label,
                }
              )}
            </Typography>
          </Box>
        </Portal>
      )}
      <Flex gap={4} wrap="wrap">
        {data.map(
          (value) =>
            value.count > 0 && (
              <KeyChartItem gap={1} key={value.label}>
                <Box background={value.color} padding={2} borderRadius={1} />
                <Typography variant="pi">{value.label}</Typography>
              </KeyChartItem>
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
    <Flex minHeight="100%">
      <DonutChartSVG
        data={[
          {
            label: formatMessage({
              id: 'content-manager.containers.List.draft',
              defaultMessage: 'Draft',
            }),
            count: draft,
            color: 'secondary500',
          },
          {
            label: formatMessage({
              id: 'content-manager.containers.List.modified',
              defaultMessage: 'Modified',
            }),
            count: modified,
            color: 'alternative500',
          },
          {
            label: formatMessage({
              id: 'content-manager.containers.List.published',
              defaultMessage: 'Published',
            }),
            count: published,
            color: 'success500',
          },
        ]}
      />
    </Flex>
  );
};

export { ChartEntriesWidget, LastEditedWidget, LastPublishedWidget };
