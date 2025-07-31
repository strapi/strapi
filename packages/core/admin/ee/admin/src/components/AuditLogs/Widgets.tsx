import { useTracking, Widget } from '@strapi/admin/strapi-admin';
import { Box, IconButton, Table, Tbody, Td, Tr, Typography } from '@strapi/design-system';
import { Eye } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { Link, useNavigate } from 'react-router-dom';

import { useQueryParams } from '../../../../../admin/src/hooks/useQueryParams';
import { AuditLog } from '../../../../../shared/contracts/audit-logs';
import { AUDIT_LOGS_DEFAULT_PAGE_SIZE } from '../../constants';
import { useFormatTimeStamp } from '../../pages/SettingsPage/pages/AuditLogs/hooks/useFormatTimeStamp';
import { getDefaultMessage } from '../../pages/SettingsPage/pages/AuditLogs/utils/getActionTypesDefaultMessages';
import { useGetAuditLogsQuery } from '../../services/auditLogs';

const LastActivityTable = ({ items }: { items: AuditLog[] }) => {
  const formatTimeStamp = useFormatTimeStamp();
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const navigate = useNavigate();

  const getAuditLogDetailsLink = (item: AuditLog): string => {
    return `/settings/audit-logs?pageSize=${AUDIT_LOGS_DEFAULT_PAGE_SIZE}&page=1&sort=date:DESC&id=${item.id}`;
  };

  const handleRowClick = (document: AuditLog) => () => {
    trackUsage('willOpenAuditLogDetails');
    const link = getAuditLogDetailsLink(document);
    navigate(link);
  };

  return (
    <Table colCount={4} rowCount={items?.length ?? 0}>
      <Tbody>
        {items?.map((item) => (
          <Tr
            onClick={handleRowClick(item)}
            cursor="pointer"
            key={`lastActivity_auditLog_${item.id}`}
          >
            <Td>
              <Typography title={document.title} variant="omega" textColor="neutral800">
                {formatMessage(
                  {
                    id: `Settings.permissions.auditLogs.${item.action}`,
                    // @ts-expect-error – getDefaultMessage probably doesn't benefit from being so strongly typed unless we just add string at the end.
                    defaultMessage: getDefaultMessage(item.action),
                  },
                  { model: (item.payload?.model as string) ?? '' }
                )}
              </Typography>
            </Td>
            <Td>
              <Typography title={document.title} variant="omega" textColor="neutral800">
                {formatTimeStamp(item.date)}
              </Typography>
            </Td>
            <Td>
              <Typography title={document.title} variant="omega" textColor="neutral800">
                {item?.user?.displayName ?? '-'}
              </Typography>
            </Td>
            <Td onClick={(e) => e.stopPropagation()}>
              <Box display="inline-block">
                <IconButton
                  tag={Link}
                  to={getAuditLogDetailsLink(item)}
                  onClick={() => trackUsage('willOpenAuditLogDetails')}
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
        ))}
      </Tbody>
    </Table>
  );
};

const AuditLogsWidget = () => {
  const { formatMessage } = useIntl();
  const [{ query }] = useQueryParams();
  const { data, isLoading, error } = useGetAuditLogsQuery({
    ...query,
    page: 1,
    pageSize: 4,
    sort: 'date:DESC',
  });

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
