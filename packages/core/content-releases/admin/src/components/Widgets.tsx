import { useTracking, Widget } from '@strapi/admin/strapi-admin';
import { Badge, Box, IconButton, Table, Tbody, Td, Tr, Typography } from '@strapi/design-system';
import { Pencil } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { Link, useNavigate } from 'react-router-dom';
import { styled } from 'styled-components';

import { Release } from '../../../shared/contracts/releases';
import { getBadgeProps } from '../pages/ReleasesPage';
import { useGetUpcomingReleasesQuery } from '../services/homepage';

import { RelativeTime } from './RelativeTime';

const CellTypography = styled(Typography)`
  display: block;
  max-width: 14.4rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ReleasesTable = ({ items }: { items: Release[] }) => {
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const navigate = useNavigate();

  const getEditViewLink = (item: Release): string => {
    return `/plugins/content-releases/${item.id}`;
  };

  const handleRowClick = (item: Release) => () => {
    trackUsage('willEditReleaseFromHome');
    const link = getEditViewLink(item);
    navigate(link);
  };

  return (
    <Table colCount={4} rowCount={items?.length ?? 0}>
      <Tbody>
        {items?.map((item) => (
          <Tr onClick={handleRowClick(item)} cursor="pointer" key={item.documentId}>
            <Td>
              <CellTypography title={item.name} variant="omega" textColor="neutral800">
                {item.name}
              </CellTypography>
            </Td>
            <Td>
              <Box display="inline-block">
                {item.status ? (
                  <Badge {...getBadgeProps(item.status)}>{item.status}</Badge>
                ) : (
                  <Typography textColor="neutral600" aria-hidden>
                    -
                  </Typography>
                )}
              </Box>
            </Td>
            <Td>
              <Typography variant="omega" textTransform="capitalize" textColor="neutral600">
                {item.scheduledAt ? (
                  <RelativeTime timestamp={new Date(item.scheduledAt)} />
                ) : (
                  formatMessage({
                    id: 'content-releases.pages.Releases.not-scheduled',
                    defaultMessage: 'Not scheduled',
                  })
                )}
              </Typography>
            </Td>
            <Td onClick={(e) => e.stopPropagation()}>
              <Box display="inline-block">
                <IconButton
                  tag={Link}
                  to={getEditViewLink(item)}
                  onClick={() => trackUsage('willEditReleaseFromHome')}
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
 * Upcoming Releases
 * -----------------------------------------------------------------------------------------------*/

const UpcomingReleasesWidget = () => {
  const { formatMessage } = useIntl();
  const { data, isLoading, error } = useGetUpcomingReleasesQuery();

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
          id: 'content-releases.widget.upcoming-releases.no-data',
          defaultMessage: 'No releases',
        })}
      </Widget.NoData>
    );
  }

  return <ReleasesTable items={data} />;
};

export { UpcomingReleasesWidget };
