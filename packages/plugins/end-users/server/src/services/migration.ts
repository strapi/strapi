import type { Core } from '@strapi/types';
import { errors } from '@strapi/utils';

import type {
  MigrationReport,
  MigrationReportItem,
  MigrationStatusResponse,
  PublicMigrationRecord,
} from '../../../shared/contracts/migration';
import { PLUGIN_ID, USER_UID } from '../constants';
import { readMigrationConfig } from '../migration/config';
import { readRecord, readReport, writeReport } from '../migration/record';
import type compatService from './compat';
import type providerService from './provider';

const REWRITTEN_SUFFIX = '@users.invalid';

/** The kinds that resolve themselves once the thing they ask for is done: none can be acknowledged */
const SELF_RESOLVING = new Set<string>([
  'provider-needs-input',
  'template-untranslated',
  'duplicate-email',
]);

const keyOf = (item: MigrationReportItem) => item.id.slice(item.kind.length + 1);

const publicRecord = (
  record: NonNullable<Awaited<ReturnType<typeof readRecord>>>
): PublicMigrationRecord => ({
  status: record.status,
  attempt: record.attempt,
  startedAt: record.startedAt,
  cutoverAt: record.cutoverAt,
  completedAt: record.completedAt,
  rolledBackAt: record.rolledBackAt,
  cleanedUpAt: record.cleanedUpAt,
});

/** Reads and updates the migration report the Migration section of the admin draws */
const migrationService = ({ strapi }: { strapi: Core.Strapi }) => {
  const providerIsReady = async (id: string): Promise<boolean> => {
    const providers = (await (
      strapi.plugin(PLUGIN_ID).service('provider') as ReturnType<typeof providerService>
    ).list()) as Array<{ id: string; status: string }>;

    return providers.some((provider) => provider.id === id && provider.status === 'ready');
  };

  const templateIsSaved = async (key: string): Promise<boolean> => {
    const templates = (await strapi.plugin('email').service('templates').list(key)) as Array<{
      key: string;
      customised: boolean;
    }>;

    return templates.some((template) => template.key === key && template.customised);
  };

  /** True once no user holds the placeholder address: one count, whatever the item's refs hold */
  const addressesAreEdited = async (): Promise<boolean> =>
    (await strapi.db
      .query(USER_UID)
      .count({ where: { email: { $endsWith: REWRITTEN_SUFFIX } } })) === 0;

  const isDone = (item: MigrationReportItem): Promise<boolean> => {
    switch (item.kind) {
      case 'provider-needs-input':
        return providerIsReady(keyOf(item));
      case 'template-untranslated':
        return templateIsSaved(keyOf(item));
      default:
        return addressesAreEdited();
    }
  };

  /** Marks the self-resolving items that are done, and stores the report when one changed */
  const resolveItems = async (report: MigrationReport): Promise<MigrationReport> => {
    const now = new Date().toISOString();
    let changed = false;
    const items: MigrationReportItem[] = [];

    for (const item of report.items) {
      if (!item.resolved && SELF_RESOLVING.has(item.kind) && (await isDone(item))) {
        changed = true;
        items.push({ ...item, resolved: true, resolvedAt: now });
      } else {
        items.push(item);
      }
    }

    if (!changed) {
      return report;
    }

    const next = { ...report, items };

    await writeReport(strapi, next);

    return next;
  };

  const unresolvedOf = (report: MigrationReport | null): number =>
    report?.source === 'migration'
      ? report.items.filter((item) => item.severity === 'action' && !item.resolved).length
      : 0;

  return {
    async status(): Promise<MigrationStatusResponse['data']> {
      const config = readMigrationConfig(strapi);
      const check = config.fromUsersPermissions === 'check';
      const record = await readRecord(strapi);
      let report = await readReport(strapi);

      // In check mode nothing is written but the report the check made
      if (!check && report?.source === 'migration') {
        report = await resolveItems(report);
      }

      return {
        mode: check ? 'check' : 'active',
        config,
        record: record ? publicRecord(record) : null,
        report,
        unresolved: unresolvedOf(report),
        legacyJwtHits: check
          ? null
          : await (
              strapi.plugin(PLUGIN_ID).service('compat') as ReturnType<typeof compatService>
            ).legacyJwtHits(),
      };
    },

    async updateItem(id: string, resolved: boolean): Promise<MigrationReportItem> {
      const report = await readReport(strapi);
      const found = report?.items.find((item) => item.id === id);

      if (!report || !found) {
        throw new errors.NotFoundError('That item is not in the migration report.');
      }

      if (SELF_RESOLVING.has(found.kind)) {
        throw new errors.ValidationError(
          'This item resolves itself once what it asks for is done.'
        );
      }

      const { resolvedAt: _previous, ...rest } = found;
      const updated: MigrationReportItem = resolved
        ? { ...rest, resolved: true, resolvedAt: new Date().toISOString() }
        : { ...rest, resolved: false };

      await writeReport(strapi, {
        ...report,
        items: report.items.map((item) => (item.id === id ? updated : item)),
      });

      return updated;
    },
  };
};

export default migrationService;
