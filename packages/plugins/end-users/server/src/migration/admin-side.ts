/* eslint-disable no-await-in-loop -- the steps run in order, one write at a time: each reads what the one before wrote */
import { isDeepStrictEqual } from 'node:util';
import type { Core } from '@strapi/types';

import type { MigrationReportItem } from '../../../shared/contracts/migration';
import { PLUGIN_ID, PROFILE_UID, USER_UID } from '../constants';
import { keepHold } from './post-sync-stores';
import type { PostSyncStep } from './post-sync';
import { addReportItems, readReport } from './record';
import { ITEM_SEVERITY } from './report';
import { contentTypesOf } from '../utils/typed-strapi';

const UP = 'plugin::users-permissions';
const UP_USER = `${UP}.user`;
const EU = `plugin::${PLUGIN_ID}`;
const HISTORY_TABLE = 'strapi_history_versions';
const PERMISSION_UID = 'admin::permission';
const ITEM_ID = 'admin-permission:all';
const CM_ACTIONS_WITH_FIELDS: ReadonlySet<string> = new Set([
  'plugin::content-manager.explorer.read',
  'plugin::content-manager.explorer.create',
  'plugin::content-manager.explorer.update',
]);

/**
 * The admin actions that carry over, by name. Updating an email template is not among them: the
 * email plugin's own `templates.update` also resets and tests templates, so it is granted by hand.
 */
const ACTIONS: Readonly<Record<string, string>> = {
  [`${UP}.roles.read`]: `${EU}.roles.read`,
  [`${UP}.roles.create`]: `${EU}.roles.create`,
  [`${UP}.roles.update`]: `${EU}.roles.update`,
  [`${UP}.roles.delete`]: `${EU}.roles.delete`,
  [`${UP}.providers.read`]: `${EU}.providers.read`,
  [`${UP}.providers.update`]: `${EU}.providers.update`,
  [`${UP}.advanced-settings.read`]: `${EU}.settings.read`,
  [`${UP}.advanced-settings.update`]: `${EU}.settings.update`,
  [`${UP}.email-templates.read`]: 'plugin::email.templates.read',
};

/** The admin action an end-users or email plugin action replaces, or `null` when there is none */
export const mapAdminAction = (action: string): string | null => ACTIONS[action] ?? null;

interface PermissionRow {
  id: number;
  action: string;
  subject: string | null;
  properties: { fields?: unknown } & Record<string, unknown>;
  conditions: unknown[];
  actionParameters: Record<string, unknown>;
  role?: { id: number } | null;
}

/** `seo.metaTitle` is the attribute `seo` */
const rootOf = (field: string) => field.split('.')[0];

const attributesOf = (strapi: Core.Strapi, uid: string): string[] =>
  Object.keys(
    contentTypesOf<Record<string, { attributes?: object }>>(strapi)[uid]?.attributes ?? {}
  );

/** The user's `role` is the end user's `roles` */
const RENAMED: Readonly<Record<string, string>> = { role: 'roles' };

/* -------------------------------------------------------------------------------------------------
 * The admin's own permissions on Users & Permissions
 * -----------------------------------------------------------------------------------------------*/

const carryActions = async (
  strapi: Core.Strapi,
  owner: string
): Promise<MigrationReportItem | null> => {
  const query = strapi.db.query(PERMISSION_UID);
  const rows = (
    (await query.findMany({
      where: { action: { $startsWith: `${UP}.` } },
      populate: ['role'],
    })) as PermissionRow[]
  ).filter((row) => row.role);

  if (rows.length === 0) {
    return null;
  }

  const unmapped = new Set<string>();

  for (const row of rows) {
    const target = mapAdminAction(row.action);
    const roleId = row.role!.id;

    if (target === null) {
      unmapped.add(row.action);
      continue;
    }

    await keepHold(strapi, owner);

    const existing = await query.findOne({
      where: { action: target, role: roleId, subject: row.subject },
    });

    if (existing) {
      await query.delete({ where: { id: row.id } });
    } else {
      await query.update({ where: { id: row.id }, data: { action: target } });
    }
  }

  // Rows mapped by an earlier start are gone by now: no total is stated, and the actions that had no
  // counterpart are the ones an earlier start listed together with this one's
  const earlier = (await readReport(strapi))?.items.find((entry) => entry.id === ITEM_ID);
  const left = [
    ...new Set([
      ...(earlier?.refs ?? []).map(String).filter((ref) => ref.startsWith(`${UP}.`)),
      ...unmapped,
    ]),
  ];
  const noCounterpart =
    left.length > 0
      ? ` ${left.length === 1 ? 'One action has' : `${left.length} actions have`} no counterpart and ${left.length === 1 ? 'is' : 'are'} removed when the application has started; grant what is needed in the admin.`
      : '';

  return {
    id: ITEM_ID,
    kind: 'admin-permission',
    severity: ITEM_SEVERITY['admin-permission'],
    message: `Admin permissions on users-permissions were mapped to the end-users or email plugin action that replaces each.${noCounterpart}`,
    count: left.length,
    refs: left,
    resolved: false,
  };
};

/* -------------------------------------------------------------------------------------------------
 * The Content Manager's rows on the user
 * -----------------------------------------------------------------------------------------------*/

/** Rewrites the rows on the old user subject; returns the rows rewritten and the profile rows made */
const carryContentManagerRows = async (
  strapi: Core.Strapi,
  owner: string
): Promise<{ rewritten: number; profileRows: number; items: MigrationReportItem[] }> => {
  const query = strapi.db.query(PERMISSION_UID);
  const rows = (
    (await query.findMany({
      where: { action: { $startsWith: 'plugin::content-manager.' }, subject: UP_USER },
      populate: ['role'],
    })) as PermissionRow[]
  ).filter((row) => row.role);
  const userAttributes = new Set(attributesOf(strapi, USER_UID));
  const profileAttributes = new Set(
    attributesOf(strapi, PROFILE_UID).filter((name) => name !== 'user')
  );
  let profileRows = 0;
  const items: MigrationReportItem[] = [];

  for (const row of rows) {
    const roleId = row.role!.id;
    const properties = row.properties ?? {};
    const listed = Array.isArray(properties.fields)
      ? (properties.fields as unknown[]).filter(
          (field): field is string => typeof field === 'string'
        )
      : null;
    const renamed = listed?.map((field) => RENAMED[field] ?? field) ?? null;
    const moved =
      renamed?.filter(
        (field) => !userAttributes.has(rootOf(field)) && profileAttributes.has(rootOf(field))
      ) ?? [];

    await keepHold(strapi, owner);

    // The profile's row goes in first: a start that stops after it finds the user's row still to do
    if (moved.length > 0 && CM_ACTIONS_WITH_FIELDS.has(row.action)) {
      const existing = (await query.findOne({
        where: { action: row.action, subject: PROFILE_UID, role: roleId },
      })) as PermissionRow | null;

      if (existing) {
        const { fields: haveFields, ...haveRest } = existing.properties ?? {};
        const { fields: _sourceFields, ...sourceRest } = properties;
        const same =
          isDeepStrictEqual(existing.conditions ?? [], row.conditions ?? []) &&
          isDeepStrictEqual(haveRest, sourceRest);

        if (same) {
          const have = Array.isArray(haveFields) ? (haveFields as string[]) : [];
          const union = [...new Set([...have, ...moved])];

          if (union.length > have.length) {
            await query.update({
              where: { id: existing.id },
              data: { properties: { ...existing.properties, fields: union } },
            });
          }
        } else {
          // Its conditions or properties differ: merging could grant the fields more widely than the user row did
          items.push({
            id: `admin-permission:profile:${roleId}:${row.action}`,
            kind: 'admin-permission',
            severity: 'action',
            message: `Admin role ${roleId} has its own ${row.action} permission on the profile, with other conditions than the one it had on the user, so the fields that moved to the profile were not added to it. Grant those fields on the profile for that role in the admin.`,
            count: moved.length,
            refs: moved,
            resolved: false,
          });
        }
      } else {
        await query.create({
          data: {
            action: row.action,
            subject: PROFILE_UID,
            properties: { ...properties, fields: moved },
            conditions: row.conditions ?? [],
            actionParameters: row.actionParameters ?? {},
            role: roleId,
          },
        });
        profileRows += 1;
      }
    }

    await query.update({
      where: { id: row.id },
      data: {
        subject: USER_UID,
        properties:
          renamed === null
            ? properties
            : {
                ...properties,
                fields: renamed.filter((field) => userAttributes.has(rootOf(field))),
              },
      },
    });
  }

  return { rewritten: rows.length, profileRows, items };
};

/* -------------------------------------------------------------------------------------------------
 * Content History
 * -----------------------------------------------------------------------------------------------*/

const carryHistory = async (strapi: Core.Strapi, owner: string): Promise<number> => {
  if (!(await strapi.db.getSchemaConnection().hasTable(HISTORY_TABLE))) {
    return 0;
  }

  await keepHold(strapi, owner);

  return strapi.db
    .getConnection(HISTORY_TABLE)
    .where({ content_type: UP_USER })
    .update({ content_type: USER_UID });
};

/* -------------------------------------------------------------------------------------------------
 * The step
 * -----------------------------------------------------------------------------------------------*/

/**
 * The admin side: admin roles keep what they could do (their actions on Users & Permissions become
 * the end-users and email plugin ones), the Content Manager rows on the user are rewritten to the
 * new type with the fields that moved to the profile given their own row, and Content History is
 * pointed at the new type. What has no counterpart is listed and left to core's cleanup, which
 * runs once the application has started.
 */
export const adminStep: PostSyncStep = {
  name: 'admin',
  async run(strapi, _record, owner) {
    const actions = await carryActions(strapi, owner);
    const { rewritten, profileRows, items } = await carryContentManagerRows(strapi, owner);
    const history = await carryHistory(strapi, owner);

    await addReportItems(strapi, [...(actions ? [actions] : []), ...items]);

    strapi.log.info(
      `${PLUGIN_ID}: carried ${rewritten} Content Manager permissions (${profileRows} profile permissions added) and ${history} history versions`
    );
  },
};
