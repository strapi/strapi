import type { Core, UID } from '@strapi/types';

import { ProviderTransferError } from '../errors/providers';
import type { IEntity, ILink } from '../types';
import type { IRestoreOptions } from './providers/local-destination/strategies/restore';

const ADMIN_UID_PREFIX = 'admin::';

export const OFFICIAL_TRANSFER_IGNORED_TYPES = [
  'plugin::content-releases.release',
  'plugin::content-releases.release-action',
] as const;

type SchemaAttribute = {
  type?: string;
  target?: string;
  relation?: string;
  component?: string;
  components?: string[];
  repeatable?: boolean;
  morphColumn?: { typeField?: string };
  owner?: boolean;
  joinColumn?: { name?: string };
};

type Schema = { attributes?: Record<string, SchemaAttribute> };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isProtectedRemotePushType = (uid: string): boolean => uid.startsWith(ADMIN_UID_PREFIX);

export const isIgnoredOfficialTransferType = (uid: string): boolean =>
  isProtectedRemotePushType(uid) ||
  OFFICIAL_TRANSFER_IGNORED_TYPES.includes(uid as (typeof OFFICIAL_TRANSFER_IGNORED_TYPES)[number]);

export const getIgnoredOfficialTransferTypes = (): string[] => [...OFFICIAL_TRANSFER_IGNORED_TYPES];

export const getProtectedTransferUIDs = (strapi: Core.Strapi): string[] => {
  const contentTypes = Object.keys(strapi.contentTypes);
  const models = strapi.get('models').get() as Array<{ uid: string }>;

  return [
    ...new Set(
      [...contentTypes, ...models.map(({ uid }) => uid)].filter(isProtectedRemotePushType)
    ),
  ];
};

export const normalizeRemoteRestoreOptions = (
  strapi: Core.Strapi,
  restore: IRestoreOptions = {}
): IRestoreOptions => {
  const protectedUIDs = getProtectedTransferUIDs(strapi);
  const entities = { ...restore.entities };

  delete entities.filters;

  return {
    ...restore,
    entities: {
      ...entities,
      ...(entities.include
        ? { include: entities.include.filter((uid) => !isProtectedRemotePushType(uid)) }
        : {}),
      exclude: [...new Set([...(entities.exclude ?? []), ...protectedUIDs])],
    },
  };
};

const protectedTypeError = (uid: string, path: string) =>
  new ProviderTransferError(`Remote push cannot transfer protected type "${uid}" at ${path}`);

const invalidPayloadError = (path: string, reason: string) =>
  new ProviderTransferError(`Remote push received invalid relation payload at ${path}: ${reason}`);

const getSchema = (strapi: Core.Strapi, uid: string, path: string): Schema => {
  const schema = strapi.getModel(uid as UID.Schema) as Schema | undefined;

  if (!schema) {
    throw invalidPayloadError(path, `unknown schema "${uid}"`);
  }

  return schema;
};

const getDatabaseSchema = (strapi: Core.Strapi, uid: string, path: string): Schema => {
  const schema = strapi.db.metadata.get(uid as UID.Schema) as Schema | undefined;

  if (!schema) {
    throw invalidPayloadError(path, `unknown database schema "${uid}"`);
  }

  return schema;
};

const assertPolymorphicValueAllowed = (value: unknown, typeField: string, path: string) => {
  const values = Array.isArray(value) ? value : [value];

  for (const entry of values) {
    if (!isRecord(entry) || typeof entry[typeField] !== 'string') {
      throw invalidPayloadError(path, `missing polymorphic discriminator "${typeField}"`);
    }

    const target = entry[typeField];
    if (isProtectedRemotePushType(target)) {
      throw protectedTypeError(target, path);
    }
  }
};

const assertComponentValueAllowed = (
  strapi: Core.Strapi,
  componentUID: string,
  value: unknown,
  path: string,
  repeatable: boolean
) => {
  if (!repeatable && value === null) {
    return;
  }

  const values = repeatable ? value : [value];

  if ((repeatable && !Array.isArray(value)) || !Array.isArray(values)) {
    throw invalidPayloadError(path, 'expected component value');
  }

  for (const entry of values) {
    if (!isRecord(entry)) {
      throw invalidPayloadError(path, 'expected component object');
    }
    assertSchemaDataAllowed(strapi, componentUID, entry, path);
  }
};

const assertDynamicZoneValueAllowed = (
  strapi: Core.Strapi,
  componentUIDs: string[],
  value: unknown,
  path: string
) => {
  if (!Array.isArray(value)) {
    throw invalidPayloadError(path, 'expected dynamic zone array');
  }

  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.__component !== 'string') {
      throw invalidPayloadError(path, 'missing dynamic zone component discriminator');
    }

    const componentUID = entry.__component;
    if (!componentUIDs.includes(componentUID)) {
      throw invalidPayloadError(path, `unsupported dynamic zone component "${componentUID}"`);
    }

    assertSchemaDataAllowed(strapi, componentUID, entry, path);
  }
};

const assertSchemaDataAllowed = (
  strapi: Core.Strapi,
  uid: string,
  data: Record<string, unknown>,
  path: string
) => {
  const schema = getSchema(strapi, uid, path);
  const databaseSchema = getDatabaseSchema(strapi, uid, path);

  for (const [field, value] of Object.entries(data)) {
    const attribute = schema.attributes?.[field];
    if (!attribute) {
      const protectedOwnerRelation = Object.values(databaseSchema.attributes ?? {}).find(
        (candidate) =>
          candidate.type === 'relation' &&
          candidate.owner === true &&
          candidate.target &&
          isProtectedRemotePushType(candidate.target) &&
          candidate.joinColumn?.name === field
      );

      if (protectedOwnerRelation?.target) {
        throw protectedTypeError(protectedOwnerRelation.target, `${path}.${field}`);
      }
      continue;
    }

    const fieldPath = `${path}.${field}`;
    if (attribute.type === 'relation') {
      if (attribute.target && isProtectedRemotePushType(attribute.target)) {
        throw protectedTypeError(attribute.target, fieldPath);
      }
      if (attribute.relation?.startsWith('morph')) {
        assertPolymorphicValueAllowed(
          value,
          attribute.morphColumn?.typeField ?? '__type',
          fieldPath
        );
      }
    } else if (attribute.type === 'component' && attribute.component) {
      assertComponentValueAllowed(
        strapi,
        attribute.component,
        value,
        fieldPath,
        attribute.repeatable === true
      );
    } else if (attribute.type === 'dynamiczone') {
      assertDynamicZoneValueAllowed(strapi, attribute.components ?? [], value, fieldPath);
    }
  }
};

export const assertRemoteEntityAllowed = (strapi: Core.Strapi, entity: IEntity): void => {
  if (isProtectedRemotePushType(entity.type)) {
    throw protectedTypeError(entity.type, entity.type);
  }

  if (!isRecord(entity.data)) {
    throw invalidPayloadError(entity.type, 'expected entity data object');
  }

  assertSchemaDataAllowed(strapi, entity.type, entity.data, entity.type);
};

export const assertRemoteLinkAllowed = (link: ILink): void => {
  if (isProtectedRemotePushType(link.left.type)) {
    throw protectedTypeError(link.left.type, 'link.left');
  }
  if (isProtectedRemotePushType(link.right.type)) {
    throw protectedTypeError(link.right.type, 'link.right');
  }
};
