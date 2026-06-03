import { useTracking, Widget } from '@strapi/admin/strapi-admin';
import { Box, IconButton, Table, Tbody, Td, Tr, Typography } from '@strapi/design-system';
import { Eye } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { Link, useNavigate } from 'react-router-dom';
import { styled } from 'styled-components';

import { RelativeTime as BaseRelativeTime } from '../../../../../admin/src/components/RelativeTime';
import { useQueryParams } from '../../../../../admin/src/hooks/useQueryParams';
import { AuditLog } from '../../../../../shared/contracts/audit-logs';
import { AUDIT_LOGS_DEFAULT_PAGE_SIZE } from '../../constants';
import { getDefaultMessage } from '../../pages/SettingsPage/pages/AuditLogs/utils/getActionTypesDefaultMessages';
import { useGetAuditLogsQuery } from '../../services/auditLogs';

const RelativeTime = styled(BaseRelativeTime)`
  display: inline-block;

  &::first-letter {
    text-transform: uppercase;
  }
`;

const LastActivityTable = ({ items }: { items: AuditLog[] }) => {
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const navigate = useNavigate();

  const getAuditLogDetailsLink = (item: AuditLog): string => {
    return `/settings/audit-logs?pageSize=${AUDIT_LOGS_DEFAULT_PAGE_SIZE}&page=1&sort=date:DESC&id=${item.id}`;
  };

  const handleRowClick = (document: AuditLog) => () => {
    trackUsage('willOpenAuditLogDetailsFromHome');
    const link = getAuditLogDetailsLink(document);
    navigate(link);
  };

  return (
    <Table colCount={4} rowCount={items?.length ?? 0}>
      <Tbody>
        {items?.map((item) => {
          const action = formatMessage(
            {
              id: `Settings.permissions.auditLogs.${item.action}`,
              // @ts-expect-error – getDefaultMessage probably doesn't benefit from being so strongly typed unless we just add string at the end.
              defaultMessage: getDefaultMessage(item.action),
            },
            { model: (item.payload.model as string) ?? '' }
          );
          const userDisplayName = item.user?.displayName ?? '-';
          return (
            <Tr
              onClick={handleRowClick(item)}
              cursor="pointer"
              key={`lastActivity_auditLog_${item.id}`}
            >
              <Td>
                <Typography title={action} variant="omega" textColor="neutral800">
                  {action}
                </Typography>
              </Td>
              <Td>
                <Typography variant="omega" textColor="neutral800">
                  <RelativeTime timestamp={new Date(item.date)} />
                </Typography>
              </Td>
              <Td>
                <Typography title={userDisplayName} variant="omega" textColor="neutral800">
                  {userDisplayName}
                </Typography>
              </Td>
              <Td onClick={(e) => e.stopPropagation()}>
                <Box display="inline-block">
                  <IconButton
                    tag={Link}
                    to={getAuditLogDetailsLink(item)}
                    onClick={() => trackUsage('willOpenAuditLogDetailsFromHome')}
                    label={formatMessage({
                      id: 'global.details',
                      defaultMessage: 'Details',
                    })}
                    variant="ghost"
                  >
                    <Eye />
                  </IconButton>
                </Box>
              </Td>
            </Tr>
          );
        })}
      </Tbody>
    </Table>
  );
};

const AuditLogsWidget = () => {
  const { formatMessage } = useIntl();
  const [{ query }] = useQueryParams();
  const { data, isLoading, error } = useGetAuditLogsQuery(
    {
      ...query,
      page: 1,
      pageSize: 4,
      sort: 'date:DESC',
    },
    {
      refetchOnMountOrArgChange: true,
    }
  );

  if (isLoading) {
    return <Widget.Loading />;
  }

  if (error || !data?.results) {
    return <Widget.Error />;
  }

  if (data.results.length === 0) {
    return (
      <Widget.NoData>
        {formatMessage({
          id: 'widget.last-activity.no-activity',
          defaultMessage: 'No activity',
        })}
      </Widget.NoData>
    );
  }

  return <LastActivityTable items={data.results ?? []} />;
};

export { AuditLogsWidget };
