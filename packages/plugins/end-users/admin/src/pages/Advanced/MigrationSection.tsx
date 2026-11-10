import * as React from 'react';

import { useAPIErrorHandler, useNotification, useRBAC } from '@strapi/admin/strapi-admin';
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Flex,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Typography,
} from '@strapi/design-system';
import { Download } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useLocation } from 'react-router-dom';

import { ReadOnlyList, ReadOnlyRow } from '../../components/ReadOnlyRow';
import { PERMISSIONS } from '../../constants';
import {
  useGetMigrationStatusQuery,
  useRunMigrationCheckMutation,
  useUpdateMigrationItemMutation,
} from '../../services/migration';
import { formatDuplicates } from '../../utils/configWords';
import { getTranslation } from '../../utils/getTranslation';

import { ProjectFiles } from './ProjectFiles';

import type { MigrationReportItem } from '../../../../shared/contracts/migration';
import type { MigrationStatus } from '../../services/migration';

const REPORT_FILE = 'end-users-migration-report.json';

/** The kinds that resolve themselves once the thing they ask for is done: no checkbox */
const RESOLVED_BY: Record<string, { id: string; defaultMessage: string }> = {
  'provider-needs-input': {
    id: 'migration.items.resolved-by.provider',
    defaultMessage: 'Resolves when the provider is ready: enter its secret on the Providers page.',
  },
  'template-untranslated': {
    id: 'migration.items.resolved-by.template',
    defaultMessage: 'Resolves when the template is saved on the email templates page.',
  },
  'duplicate-email': {
    id: 'migration.items.resolved-by.email',
    defaultMessage: 'Resolves when the rewritten addresses are edited.',
  },
};

type Format = (
  id: string,
  defaultMessage: string,
  values?: Record<string, string | number>
) => string;

/** One item of the report: what kind it is, what it says, how many it touches, and whether it is done */
const ItemRow = ({
  item,
  canResolve,
  format,
  onResolve,
}: {
  item: MigrationReportItem;
  canResolve: boolean;
  format: Format;
  onResolve: (item: MigrationReportItem, resolved: boolean) => void;
}) => {
  const resolvedBy = RESOLVED_BY[item.kind];
  const isAction = item.severity === 'action';

  const resolution = () => {
    // An info item says what will happen: there is nothing to do or to tick
    if (!isAction) {
      return null;
    }

    if (resolvedBy) {
      return (
        <Typography textColor="neutral600">
          {item.resolved ? null : format(resolvedBy.id, resolvedBy.defaultMessage)}
        </Typography>
      );
    }

    return (
      <Checkbox
        checked={item.resolved}
        disabled={!canResolve}
        onCheckedChange={(checked: boolean | 'indeterminate') => onResolve(item, checked === true)}
      >
        {format('migration.items.mark-resolved', 'Mark resolved')}
      </Checkbox>
    );
  };

  return (
    <Tr>
      <Td>
        {item.resolved ? (
          <Badge backgroundColor="success100" textColor="success700">
            {format('migration.items.resolved', 'Resolved')}
          </Badge>
        ) : (
          <Badge active={isAction}>
            {isAction
              ? format('migration.items.action', 'Action')
              : format('migration.items.info', 'Info')}
          </Badge>
        )}
      </Td>
      <Td>
        <Typography textColor="neutral800">{item.message}</Typography>
      </Td>
      <Td>
        {item.count !== undefined && (
          <Typography textColor="neutral600">
            {format('migration.items.count', '{count} affected', { count: item.count })}
          </Typography>
        )}
      </Td>
      <Td>{resolution()}</Td>
    </Tr>
  );
};

/** Hands the report to the browser as a file: it holds ids and counts, never a person's data */
const downloadReport = (report: unknown) => {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
  );
  const link = document.createElement('a');

  link.href = url;
  link.download = REPORT_FILE;
  link.click();
  URL.revokeObjectURL(url);
};

const MigrationBody = ({ status }: { status: MigrationStatus }) => {
  const { formatMessage, formatDate, formatNumber } = useIntl();
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const {
    allowedActions: { canUpdate },
  } = useRBAC(PERMISSIONS.settings);
  const [updateItem] = useUpdateMigrationItemMutation();
  const [runCheck, { isLoading: isChecking }] = useRunMigrationCheckMutation();
  const { mode, config, record, report, legacyJwtHits } = status;
  const isCheck = mode === 'check';

  const format: Format = (id, defaultMessage, values) =>
    formatMessage({ id: getTranslation(id), defaultMessage }, values);
  const date = (value: string | null) =>
    value === null
      ? format('migration.none', 'None')
      : formatDate(value, { year: 'numeric', month: 'short', day: 'numeric' });
  const yes = format('settings.config.yes', 'Yes');
  const no = format('settings.config.no', 'No');
  const none = format('settings.config.none', 'None');
  const row = (id: string, defaultMessage: string, value: React.ReactNode) => (
    <ReadOnlyRow label={format(id, defaultMessage)}>{value}</ReadOnlyRow>
  );

  const handleResolve = async (item: MigrationReportItem, resolved: boolean) => {
    const result = await updateItem({ id: item.id, resolved });

    if ('error' in result) {
      toggleNotification({ type: 'danger', message: formatAPIError(result.error) });
    }
  };

  const handleCheck = async () => {
    const result = await runCheck();

    if ('error' in result) {
      toggleNotification({ type: 'danger', message: formatAPIError(result.error) });
    }
  };

  const fromLabels = new Map<boolean | 'check' | null, string>([
    [null, none],
    ['check', format('migration.settings.check', 'Check only')],
    [true, yes],
    [false, no],
  ]);
  const fromLabel = fromLabels.get(config.fromUsersPermissions);

  const recordStatus: Record<string, string> = {
    'in-progress': format('migration.status.in-progress', 'In progress'),
    completed: format('migration.status.completed', 'Completed'),
    'rolled-back': format('migration.status.rolled-back', 'Rolled back'),
  };

  return (
    <>
      {isCheck && (
        <Flex direction="column" alignItems="stretch" gap={4}>
          <Typography textColor="neutral600">
            {format(
              'migration.check.hint',
              'Nothing is changed yet. The check reads the Users & Permissions data and lists what the migration will do.'
            )}
          </Typography>
          {report ? (
            <ReadOnlyList>
              {row('migration.check.last', 'Last check', date(report.generatedAt))}
              {row('migration.check.users', 'Users', formatNumber(report.counts.users))}
              {row('migration.check.roles', 'Roles', formatNumber(report.counts.roles))}
              {row(
                'migration.check.permissions',
                'Permissions',
                formatNumber(report.counts.permissions)
              )}
              {report.estimate &&
                row(
                  'migration.check.estimate',
                  'Estimated time',
                  format(
                    'migration.check.minutes',
                    '{count, plural, one {# minute} other {# minutes}}',
                    {
                      count: report.estimate.minutes,
                    }
                  )
                )}
            </ReadOnlyList>
          ) : (
            <Typography textColor="neutral600">
              {format('migration.check.never', 'The check has not run yet.')}
            </Typography>
          )}
          <Flex>
            <Button
              type="button"
              variant="secondary"
              loading={isChecking}
              disabled={!canUpdate}
              onClick={handleCheck}
            >
              {report
                ? format('migration.check.again', 'Check again')
                : format('migration.check.run', 'Run the check')}
            </Button>
          </Flex>
        </Flex>
      )}

      {!isCheck && record && (
        <ReadOnlyList>
          {row('migration.record.status', 'Status', recordStatus[record.status] ?? record.status)}
          {row('migration.record.attempt', 'Attempt', record.attempt)}
          {row('migration.record.started', 'Started', date(record.startedAt))}
          {row('migration.record.completed', 'Completed', date(record.completedAt))}
          {record.rolledBackAt &&
            row('migration.record.rolled-back', 'Rolled back', date(record.rolledBackAt))}
        </ReadOnlyList>
      )}

      {!isCheck && legacyJwtHits && (
        <Flex direction="column" alignItems="stretch" gap={3}>
          <Typography variant="delta" tag="h3">
            {format('migration.hits.title', 'Legacy token use')}
          </Typography>
          <ReadOnlyList>
            {row('migration.hits.legacy', 'Legacy tokens', formatNumber(legacyJwtHits.legacy))}
            {row('migration.hits.access', 'Access tokens', formatNumber(legacyJwtHits.access))}
            {row('migration.hits.last', 'Last legacy token', date(legacyJwtHits.lastHitAt))}
          </ReadOnlyList>
        </Flex>
      )}

      {report && report.items.length > 0 && (
        <Flex direction="column" alignItems="stretch" gap={3}>
          <Typography variant="delta" tag="h3">
            {format('migration.items.title', 'Items')}
          </Typography>
          <Table colCount={4} rowCount={report.items.length + 1}>
            <Thead>
              <Tr>
                {[
                  ['migration.items.column.kind', 'Kind'],
                  ['migration.items.column.item', 'Item'],
                  ['migration.items.column.affected', 'Affected'],
                  ['migration.items.column.resolved', 'Resolved'],
                ].map(([id, defaultMessage]) => (
                  <Th key={id}>
                    <Typography variant="sigma" textColor="neutral600">
                      {format(id, defaultMessage)}
                    </Typography>
                  </Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>
              {report.items.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  canResolve={canUpdate && !isCheck}
                  format={format}
                  onResolve={handleResolve}
                />
              ))}
            </Tbody>
          </Table>
        </Flex>
      )}

      <Flex direction="column" alignItems="stretch" gap={3}>
        <Typography variant="delta" tag="h3">
          {format('migration.settings.title', 'Migration settings')}
        </Typography>
        <Typography textColor="neutral600">
          {format(
            'migration.settings.hint',
            'These are set in the migration key of config/plugins.ts and cannot be edited here.'
          )}
        </Typography>
        <ReadOnlyList>
          {row('migration.settings.from', 'From Users & Permissions', fromLabel)}
          {row(
            'migration.settings.duplicates',
            'Duplicate emails',
            formatDuplicates(config.duplicates, formatMessage)
          )}
          {row(
            'migration.settings.registration-fields',
            'Registration fields',
            config.registrationFields && config.registrationFields.length > 0
              ? config.registrationFields.join(', ')
              : none
          )}
          {row('migration.settings.rollback', 'Roll back', config.rollback ? yes : no)}
        </ReadOnlyList>
      </Flex>

      {report && (
        <Flex>
          <Button
            type="button"
            variant="tertiary"
            startIcon={<Download />}
            onClick={() => downloadReport(report)}
          >
            {format('migration.report.download', 'Download report')}
          </Button>
        </Flex>
      )}

      {isCheck && <ProjectFiles />}
    </>
  );
};

/**
 * The Migration section of the Advanced page. In check mode it is the page: the last check, the
 * project files to change, and the settings. After a migration it shows its status, the legacy
 * tokens still in use and the items to resolve. A project that never migrated does not see it.
 */
const MigrationSection = () => {
  const { formatMessage } = useIntl();
  const { hash } = useLocation();
  const ref = React.useRef<HTMLDivElement>(null);
  const { data } = useGetMigrationStatusQuery();
  const isShown = !!data && (data.mode === 'check' || data.record !== null);

  React.useEffect(() => {
    if (isShown && hash === '#migration') {
      ref.current?.scrollIntoView?.();
    }
  }, [isShown, hash]);

  if (!data || !isShown) {
    return null;
  }

  return (
    <Box
      ref={ref}
      id="migration"
      // The page header is sticky: the heading must not land under it
      style={{ scrollMarginTop: '12rem' }}
      background="neutral0"
      padding={6}
      shadow="filterShadow"
      hasRadius
    >
      <Flex direction="column" alignItems="stretch" gap={4}>
        <Typography variant="delta" tag="h2">
          {formatMessage({
            id: getTranslation('migration.title'),
            defaultMessage: 'Migration',
          })}
        </Typography>
        <MigrationBody status={data} />
      </Flex>
    </Box>
  );
};

export { MigrationSection };
