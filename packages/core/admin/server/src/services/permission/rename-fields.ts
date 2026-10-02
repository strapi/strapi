import { invert, isEmpty, uniq, xor } from 'lodash/fp';
import type { Core, Struct } from '@strapi/types';

import { getNestedFieldsWithIntermediate } from '../content-type';

type AttributeRenameHandler = Parameters<
  Core.Strapi['db']['schema']['registerAttributeRenameHandler']
>[0];

type AttributeRenames = Parameters<AttributeRenameHandler>[1];

interface PermissionRow {
  id: number | string;
  subject: string | null;
  properties?: { fields?: unknown } | null;
}

const PERMISSION_UID = 'admin::permission';

/**
 * Carries attribute renames to the `properties.fields` of admin permissions
 * (roles and admin API tokens).
 *
 * Runs from the generated rename migration, inside its transaction, before the
 * admin bootstrap cleans permission fields against the new schema. Without it,
 * the cleanup drops every renamed field from every role but the super admin.
 *
 * `strapi.contentTypes` / `strapi.components` already hold the new schema at
 * that point, so every new field path is mapped back to the path it had before
 * the renames, segment by segment (a component field path goes through its
 * parent's component). This also composes a parent rename with a rename inside
 * its component in the same save.
 */
export const createPermissionFieldRenamer = ({
  strapi,
}: {
  strapi: Core.Strapi;
}): AttributeRenameHandler => {
  const getOldPath = (
    subject: string,
    path: string,
    originsOf: Record<string, Record<string, string>>
  ): string => {
    let ownerUid = subject;
    let owner: Struct.Schema | undefined =
      strapi.contentTypes[subject as keyof typeof strapi.contentTypes];

    return path
      .split('.')
      .map((segment) => {
        const origin = originsOf[ownerUid]?.[segment] ?? segment;
        const attribute = owner?.attributes?.[segment] as
          | { type?: string; component?: string }
          | undefined;

        if (attribute?.type === 'component' && attribute.component) {
          ownerUid = attribute.component;
          owner = strapi.components[attribute.component as keyof typeof strapi.components];
        } else {
          owner = undefined;
        }

        return origin;
      })
      .join('.');
  };

  /**
   * `old path -> new path` per subject, for the subjects with at least one
   * renamed path.
   */
  const getRenamedPaths = (renames: AttributeRenames): Map<string, Record<string, string>> => {
    // Per model: final name -> origin name.
    const originsOf: Record<string, Record<string, string>> = {};
    for (const [uid, mapping] of Object.entries(renames)) {
      originsOf[uid] = invert(mapping);
    }

    const renamedPaths = new Map<string, Record<string, string>>();

    for (const [subject, contentType] of Object.entries(strapi.contentTypes)) {
      const paths = getNestedFieldsWithIntermediate(contentType as Struct.ContentTypeSchema, {
        components: strapi.components,
      });

      const byOldPath: Record<string, string> = {};
      for (const path of paths) {
        const oldPath = getOldPath(subject, path, originsOf);
        if (oldPath !== path) {
          byOldPath[oldPath] = path;
        }
      }

      if (!isEmpty(byOldPath)) {
        renamedPaths.set(subject, byOldPath);
      }
    }

    return renamedPaths;
  };

  return async (trx, renames) => {
    if (isEmpty(renames)) {
      return;
    }

    // Fresh database: the table is created by schema sync after the migrations.
    const { tableName } = strapi.db.metadata.get(PERMISSION_UID);
    if (!(await strapi.db.getSchemaConnection(trx).hasTable(tableName))) {
      return;
    }

    const renamedPaths = getRenamedPaths(renames);
    if (renamedPaths.size === 0) {
      return;
    }

    // Joins the migration transaction.
    const permissions = (await strapi.db.query(PERMISSION_UID).findMany({
      select: ['id', 'subject', 'properties'],
      where: { subject: { $in: [...renamedPaths.keys()] } },
    })) as PermissionRow[];

    for (const permission of permissions) {
      const fields = permission.properties?.fields;
      const byOldPath = permission.subject ? renamedPaths.get(permission.subject) : undefined;

      if (!Array.isArray(fields) || !byOldPath) {
        continue;
      }

      // One pass over the old paths, so a swap is applied once.
      const newFields = uniq(fields.map((field: string) => byOldPath[field] ?? field));

      if (xor(fields, newFields).length === 0) {
        continue;
      }

      await strapi.db.query(PERMISSION_UID).update({
        where: { id: permission.id },
        data: { properties: { ...permission.properties, fields: newFields } },
      });
    }
  };
};
