import {
  access,
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  writeFile as writeToDisk,
} from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { errors, importDefault } from '@strapi/utils';
import type { Core, Modules, UID } from '@strapi/types';

import { BUILDER_LIMITS } from '../../../shared/builder/types';
import type { BuilderConditionV2, BuilderValue, EntryGroup } from '../../../shared/builder/types';
import { upgradeVersion1 } from '../../../shared/builder/upgrade';
import type {
  ConditionListItem,
  ConditionParam,
  ConditionPreviewRequest,
  ConditionPreviewResponse,
  ConditionsStatus,
  ConditionWriteResponse,
} from '../../../shared/contracts/conditions';
import { BUILT_IN_CONDITIONS } from '../conditions';
import { PERMISSION_UID, PLUGIN_ID, PROFILE_UID, ROLE_UID, USER_UID } from '../constants';
import { assertAutoReload, isAutoReload } from '../utils/auto-reload';
import { checkBuilderConditionV2 } from '../utils/builder/check';
import { compileBuilderCondition, staleReferences } from '../utils/builder/compile';
import { builderFilesOf, builderRecordsOf } from '../utils/builder/registry';
import type { BuilderRecord } from '../utils/builder/registry';
import { paramExtras, readFieldsOf, rolesNamed, selfWritableOf } from '../utils/builder/usage';
import type { ParamExtras, WriteGrant } from '../utils/builder/usage';
import { layoutContentTypeUids, registerTimeContentTypeUids } from '../utils/layout-content-types';
import type abilityService from './ability';
import type providerService from './provider';
import { isPlain } from '../utils/is-plain';

type ContentApiConditionDefinition = Modules.ContentAPI.ContentApiConditionDefinition;
type ConditionSource = NonNullable<ContentApiConditionDefinition['source']>;

/** A role that uses a condition, as the list names it */
type UsingRole = ConditionListItem['usedByRoles'][number];

/** Where a project keeps its own conditions, under its (compiled) `src` */
export const PROJECT_CONDITIONS_DIR = join('end-users', 'conditions');

/**
 * Another write is waiting for the restart it asked for: 409 `CONDITIONS_UPDATING`, and nothing was
 * written. The status route says when the new process answers.
 */
export class ConditionsUpdatingError extends errors.ApplicationError<
  'ConditionsUpdatingError',
  string,
  { code: 'CONDITIONS_UPDATING' }
> {
  constructor() {
    super('Conditions are being updated: wait for the server to restart', {
      code: 'CONDITIONS_UPDATING',
    });
    this.name = 'ConditionsUpdatingError';
  }
}

/**
 * The `validateQuery` of the admin's Content Manager permissions manager on one content type: it
 * rejects with a `ValidationError` when the query's filters or fields name a field the admin may not
 * read there, and resolves otherwise.
 */
export type ValidateRead = (query: { filters?: object; fields?: string[] }) => Promise<unknown>;

/** What the admin may read, for a preview: the controller builds it from their abilities */
export interface PreviewScope {
  /** Their Content Manager read query on the subject, which limits both counts */
  subjectQuery: object;
  /** The same on the end-user type, which limits the sample user's lookup */
  userQuery: object;
  validateSubject: ValidateRead;
  validateUser: ValidateRead;
  /** The same on the profile type: asked only when the condition reads the profile */
  validateProfile: ValidateRead;
  /**
   * Their Content Manager read query on the profile type, which limits the sample user's profile.
   * Throws a 403 (`PolicyError`) for an admin who may not read profiles at all.
   */
  profileQuery: () => object;
}

const conditionProvider = (strapi: Core.Strapi) =>
  strapi.contentAPI.permissions.providers.condition;

/**
 * Where a definition came from is decided by whoever registers it, never by the definition: a
 * `source` it names is replaced. Anything that is not a definition is passed on as
 * it is, for core to refuse.
 */
const withSource = (definition: unknown, source: ConditionSource): unknown =>
  isPlain(definition) ? { ...definition, source } : definition;

/**
 * A project condition named without a namespace (`shared-notes`) is the project's own:
 * `api::shared-notes`. A name that has one is kept, and anything that is not a definition is passed
 * on as it is, for core to refuse.
 */
const inProjectNamespace = (definition: unknown): unknown => {
  if (!isPlain(definition)) {
    return definition;
  }

  const { name } = definition;

  return typeof name === 'string' && name !== '' && !name.includes('::')
    ? { ...definition, name: `api::${name}` }
    : definition;
};

/** The condition files of a folder, by name: `*.js` and `*.json`, nothing else and no folders */
const conditionFiles = async (directory: string): Promise<string[]> => {
  let entries;

  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    const { code } = error as NodeJS.ErrnoException;

    if (code === 'ENOENT' || code === 'ENOTDIR') {
      return [];
    }

    throw error;
  }

  return entries
    .filter((entry) => entry.isFile() && /\.(js|json)$/.test(entry.name))
    .map((entry) => entry.name)
    .sort()
    .map((name) => join(directory, name));
};

/** The role names a file's Who checks use: at start the roles aren't there to be asked, so none is refused */
const roleNamesIn = (file: Record<string, unknown>): string[] => {
  const checks = isPlain(file.who) && Array.isArray(file.who.checks) ? file.who.checks : [];

  return checks.flatMap((check) =>
    isPlain(check) && Array.isArray(check.roles)
      ? check.roles.filter((role): role is string => typeof role === 'string')
      : []
  );
};

/** How many checks a file's groups hold, counting only what is there to be counted */
const countChecks = (value: unknown): number => {
  if (!isPlain(value) || !Array.isArray(value.items)) {
    return 0;
  }

  return value.items.reduce<number>(
    (total, item) => total + (isPlain(item) && item.kind === 'group' ? countChecks(item) : 1),
    0
  );
};

/** What makes a file too big for the builder, whatever else it holds: it stops the start */
const limitProblem = (raw: string, file: Record<string, unknown>): string | undefined => {
  if (Buffer.byteLength(raw, 'utf8') > BUILDER_LIMITS.fileBytes) {
    return `a condition can be at most ${BUILDER_LIMITS.fileBytes} bytes`;
  }

  if (Array.isArray(file.inputs) && file.inputs.length > BUILDER_LIMITS.inputs) {
    return `a condition has at most ${BUILDER_LIMITS.inputs} inputs`;
  }

  const who = isPlain(file.who) && Array.isArray(file.who.checks) ? file.who.checks.length : 0;

  return who + countChecks(file.which) > BUILDER_LIMITS.checks
    ? `a condition has at most ${BUILDER_LIMITS.checks} checks`
    : undefined;
};

/**
 * What a `.json` file says, as version 2: a version 2 file as it is, a version 1 file (`{ name,
 * displayName, subjects, query }`) as its upgrade. What can't be carried over exactly is an error
 * that names the field: never swallowed, never widened.
 */
const asVersion2 = (parsed: unknown): Record<string, unknown> => {
  if (isPlain(parsed) && parsed.version === 2) {
    return parsed;
  }

  if (
    !isPlain(parsed) ||
    typeof parsed.name !== 'string' ||
    typeof parsed.displayName !== 'string' ||
    !Array.isArray(parsed.subjects) ||
    !parsed.subjects.every((uid) => typeof uid === 'string') ||
    !isPlain(parsed.query) ||
    !Array.isArray(parsed.query.$and) ||
    !parsed.query.$and.every(isPlain)
  ) {
    throw new Error(
      'not a builder condition: a version 2 file has "version": 2; a version 1 file has name, displayName, subjects and a query of { "$and": [...] }'
    );
  }

  return upgradeVersion1({
    slug: parsed.name,
    displayName: parsed.displayName,
    subjects: parsed.subjects as string[],
    query: parsed.query as { $and: Array<Record<string, unknown>> },
  }) as unknown as Record<string, unknown>;
};

/**
 * A builder file as the loader registers it. The file is held to the rules of a write, except that a
 * content type or field the project no longer has is not a reason to stop: the condition then
 * registers as false for everyone (`stale` says what is gone) until the file is fixed. Anything else
 * wrong with it is an error.
 */
/** What a refusal says when the project no longer has a content type or a field the file names */
const MISSING =
  /is not a field of|is not an attribute of|is not a content type a role can be granted on/;

const isGroupShape = (group: unknown): boolean =>
  isPlain(group) &&
  Array.isArray(group.items) &&
  group.items.every((item) =>
    isPlain(item) && item.kind === 'group'
      ? isGroupShape(item)
      : isPlain(item) && isPlain(item.target)
  );

/** Whether everything the list and the compiler read is there, so a file can be kept for what it names */
const hasShape = (file: Record<string, unknown>): boolean =>
  isPlain(file.appliesTo) &&
  Array.isArray(file.inputs) &&
  file.inputs.every((input) => isPlain(input) && typeof input.name === 'string') &&
  isPlain(file.who) &&
  Array.isArray(file.who.checks) &&
  file.who.checks.every(isPlain) &&
  isGroupShape(file.which) &&
  isPlain(file.onSave) &&
  Array.isArray(file.onSave.locked) &&
  Array.isArray(file.onSave.stamp) &&
  file.onSave.stamp.every((rule) => isPlain(rule) && isPlain(rule.value));

const readBuilderFile = (strapi: Core.Strapi, raw: string): BuilderRecord => {
  const file = asVersion2(JSON.parse(raw));
  const tooBig = limitProblem(raw, file);

  if (tooBig !== undefined) {
    throw new Error(tooBig);
  }

  try {
    return {
      condition: checkBuilderConditionV2(strapi, file, {
        roleNames: roleNamesIn(file),
        // Read in register(), before the action registries are filled
        offered: registerTimeContentTypeUids(strapi),
        atLoad: true,
      }),
      stale: [],
    };
  } catch (error) {
    // Only a refusal because the project lost a type or a field is forgiven; any other stops the start
    if (
      !(error instanceof errors.ValidationError && MISSING.test(error.message)) ||
      !hasShape(file)
    ) {
      throw error;
    }

    let stale: string[] = [];

    try {
      stale = staleReferences(
        strapi,
        file as unknown as BuilderConditionV2,
        registerTimeContentTypeUids(strapi)
      );
    } catch {
      // A file too broken to read for what it names is refused for what it is
    }

    if (stale.length === 0) {
      throw error;
    }

    return { condition: file as unknown as BuilderConditionV2, stale };
  }
};

/** What a condition registers as when something it names is gone: false for everyone */
const staleDefinition = (
  definition: ContentApiConditionDefinition
): ContentApiConditionDefinition => ({
  ...definition,
  query: () => false,
});

/**
 * Registers the project's conditions: the default export of each `*.js` file (a compiled
 * TypeScript file included) and each `*.json` file in `src/end-users/conditions`, read from the
 * compiled output (`strapi.dirs.dist.src`, which is the app's own `src` in a JavaScript project), in
 * file name order. A `.js` file is code, and a name without `::` gets `api::`. A `.json` file is the
 * builder's: a version 2 file registers what `compileBuilderCondition` makes of it, a version 1 file
 * what it makes of its upgrade (`upgradeVersion1`); the file is kept for `builderFileOf`, and the
 * condition as version 2 for the list. A file that names something the project no longer has
 * registers as false and is logged once, naming the file and what is gone. An error names the file:
 * a project condition that can't be read or registered stops the start.
 */
export const loadProjectConditions = async (strapi: Core.Strapi): Promise<void> => {
  const files = await conditionFiles(join(strapi.dirs.dist.src, PROJECT_CONDITIONS_DIR));

  for (const file of files) {
    try {
      let registering: ContentApiConditionDefinition;
      let record: BuilderRecord | undefined;

      if (file.endsWith('.json')) {
        // eslint-disable-next-line no-await-in-loop
        record = readBuilderFile(strapi, await readFile(file, 'utf8'));

        const compiled = compileBuilderCondition(strapi, record.condition);

        registering = record.stale.length > 0 ? staleDefinition(compiled) : compiled;
      } else {
        registering = withSource(
          inProjectNamespace(importDefault(file)),
          'code'
        ) as ContentApiConditionDefinition;
      }

      // One at a time: core's registry refuses a name it holds, and the order is the files'
      // eslint-disable-next-line no-await-in-loop
      await conditionProvider(strapi).register(registering);

      if (record) {
        // Registered, so the name is a string
        builderFilesOf(strapi).set(registering.name, join(PROJECT_CONDITIONS_DIR, basename(file)));
        builderRecordsOf(strapi).set(registering.name, record);

        if (record.stale.length > 0) {
          strapi.log.warn(
            `${file}: ${registering.name} is false for everyone until this is fixed, because the project no longer has ${record.stale.join('; ')}`
          );
        }
      }
    } catch (error) {
      throw new Error(`${file}: ${error instanceof Error ? error.message : String(error)}`, {
        cause: error,
      });
    }
  }
};

/**
 * Registers the plugin's built-in conditions (`is-self`, `is-owner`), then the project's. For the
 * plugin's `register()`: core's registry refuses a registration once Strapi has loaded.
 */
export const registerConditions = async (strapi: Core.Strapi): Promise<void> => {
  for (const definition of BUILT_IN_CONDITIONS) {
    // eslint-disable-next-line no-await-in-loop
    await conditionProvider(strapi).register(definition);
  }

  await loadProjectConditions(strapi);
};

/** The name a permission row gives a condition: `'api::mine'`, or `{ name, params }` */
const conditionNameOf = (ref: unknown): string | undefined => {
  if (typeof ref === 'string') {
    return ref;
  }

  return isPlain(ref) && typeof ref.name === 'string' ? ref.name : undefined;
};

/** The params a definition declares, in its order, as the list shows them */
const paramsOf = (
  definition: ContentApiConditionDefinition,
  extras: Map<string, ParamExtras>
): ConditionParam[] =>
  Object.entries(definition.params ?? {}).map(([name, declaration]) => ({
    name,
    type: declaration.type,
    required: declaration.required === true,
    ...(declaration.default !== undefined && { default: declaration.default }),
    ...(typeof declaration.relationTarget === 'string' && {
      relationTarget: declaration.relationTarget,
    }),
    ...extras.get(name),
  }));

/** Whether a file is there. Anything but "no such file" is an error to pass on. */
const exists = async (file: string): Promise<boolean> => {
  try {
    await access(file);

    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }

    throw error;
  }
};

/**
 * The permissions manager refuses a field the admin may not read with a `ValidationError`; here that
 * is a 403 that names the field the admin sent and nothing the field holds. Whatever else it throws
 * is not about permission, and goes on as it is.
 *
 * A `PolicyError`, not a bare `ForbiddenError`: core's route wrapper (`compose-endpoint`) turns any
 * `ForbiddenError` that is not a `PolicyError` into a bare `ctx.forbidden()`, and the message that
 * names the field is lost.
 */
const refuseUnreadable = async (check: () => Promise<unknown>, message: string): Promise<void> => {
  try {
    await check();
  } catch (error) {
    if (error instanceof errors.ValidationError) {
      throw new errors.PolicyError(message);
    }

    throw error;
  }
};

const hasOwn = (object: object, key: string) => Object.prototype.hasOwnProperty.call(object, key);

/** What the Which groups, the Who checks and the values of a condition read, to check the admin may read it */
interface Reads {
  /** Field paths of the subject: each is a filter the preview counts with */
  paths: string[][];
  /** Attributes of the sample user, by their first part (`roles.documentId` is `roles`) */
  user: Set<string>;
  profile: Set<string>;
}

/**
 * Every part of a condition that reads data the admin must be allowed to read: the fields the Which
 * checks filter on (a field input is the field the admin chose, or its default), and the attributes
 * of the user and of the profile that a Who check or a value reads. `documentId` is not one the
 * admin could lack: they chose the sample user by it.
 */
const readsOf = (condition: BuilderConditionV2, inputs: Record<string, unknown>): Reads => {
  const reads: Reads = { paths: [], user: new Set(), profile: new Set() };

  const noteValue = (value: BuilderValue | undefined) => {
    if (value?.kind === 'user') {
      reads.user.add(value.attribute.split('.')[0]);
    } else if (value?.kind === 'profile') {
      reads.profile.add(value.attribute.split('.')[0]);
    }
  };

  for (const check of condition.who.checks) {
    if (check.kind === 'attribute') {
      (check.source === 'user' ? reads.user : reads.profile).add(check.attribute.split('.')[0]);
      noteValue(check.value);
    } else {
      reads.user.add(check.kind === 'roles' ? 'roles' : 'emailVerified');
    }
  }

  const visit = (group: EntryGroup) => {
    for (const item of group.items) {
      if (item.kind === 'group') {
        visit(item);
        continue;
      }

      noteValue(item.value);

      if ('path' in item.target) {
        reads.paths.push(item.target.path);
      } else {
        const { input } = item.target;
        // As core resolves a param: a null or missing value takes the default
        const given = hasOwn(inputs, input) ? inputs[input] : undefined;
        const chosen = given ?? condition.inputs.find(({ name }) => name === input)?.default;

        if (typeof chosen !== 'string' || chosen === '') {
          // The field can't be named, so it can't be checked: refused, never skipped
          throw new errors.ValidationError(
            `The input ${input} names the field a check filters on: give it the name of a field`,
            {
              errors: [
                { path: ['inputs', input], message: 'A field is needed', name: 'ValidationError' },
              ],
            }
          );
        }

        reads.paths.push([chosen]);
      }
    }
  };

  visit(condition.which);
  reads.user.delete('documentId');

  return reads;
};

const nested = (path: string[], leaf: unknown): unknown =>
  path.reduceRight<unknown>((inner, key) => ({ [key]: inner }), leaf);

/**
 * A count of entries that match a filter tells what the filter's fields hold, so a preview may only
 * filter on fields the admin can read in the Content Manager, and may only fill a value from, or
 * check, an attribute of the sample user or of their profile that they can read there, whatever the
 * rows they may see. Every part of the condition is checked, with the Content Manager's own
 * `validateQuery`, one field at a time so that the refusal names it.
 */
const refuseUnreadableReads = async (
  condition: BuilderConditionV2,
  subject: string,
  scope: PreviewScope,
  inputs: Record<string, unknown>
): Promise<void> => {
  const reads = readsOf(condition, inputs);
  const seen = new Set<string>();

  for (const path of reads.paths) {
    const field = path.join('.');

    if (!seen.has(field)) {
      seen.add(field);

      // eslint-disable-next-line no-await-in-loop
      await refuseUnreadable(
        () => scope.validateSubject({ filters: nested(path, { $notNull: true }) as object }),
        `A preview can't filter on ${field}: it needs Content Manager read access to that field of ${subject}`
      );
    }
  }

  for (const attribute of reads.user) {
    // eslint-disable-next-line no-await-in-loop
    await refuseUnreadable(
      () => scope.validateUser({ fields: [attribute] }),
      `A preview can't read the user's ${attribute}: it needs Content Manager read access to that attribute of end users`
    );
  }

  for (const attribute of reads.profile) {
    // eslint-disable-next-line no-await-in-loop
    await refuseUnreadable(
      () => scope.validateProfile({ fields: [attribute] }),
      `A preview can't read the profile's ${attribute}: it needs Content Manager read access to that attribute of profiles`
    );
  }
};

/** A 400 that names the input the refusal is about */
const refuseInput = (index: number, key: string, message: string): never => {
  throw new errors.ValidationError(message, {
    errors: [{ path: ['inputs', index, key], message, name: 'ValidationError' }],
  });
};

/**
 * While roles use a condition, its inputs may not be reshaped under them: a role's rows bound values
 * to inputs of a kind and an `accepts`, and each would silently start to deny (or, a value of another
 * meaning, read wrongly). Refused, each with its own message: an input whose kind or `accepts`
 * changes, one that becomes required with no default, a default taken away, a field input added (it has no default, so every row would lack
 * it) and a new input with no default. Removing an input is allowed.
 */
const refuseInputReshaping = (
  condition: BuilderConditionV2,
  before: ReadonlyMap<string, BuilderConditionV2['inputs'][number]>
): void => {
  condition.inputs.forEach((added, index) => {
    const was = before.get(added.name);

    if (!was) {
      if (added.kind === 'field') {
        refuseInput(
          index,
          'kind',
          `The field input ${added.name} can't be added while roles use this condition: their rows would have no field for it`
        );
      }

      if (added.default === undefined) {
        refuseInput(index, 'default', 'A new input needs a default while roles use this condition');
      }

      return;
    }

    if (was.kind !== added.kind) {
      refuseInput(
        index,
        'kind',
        `The input ${added.name} can't change from ${was.kind} to ${added.kind} while roles use this condition: the values they bound would be of the wrong kind`
      );
    }

    if (JSON.stringify(was.accepts ?? null) !== JSON.stringify(added.accepts ?? null)) {
      refuseInput(
        index,
        'accepts',
        `The input ${added.name} can't change what field it accepts while roles use this condition: the fields they chose may no longer be allowed`
      );
    }

    if (was.required !== true && added.required === true && added.default === undefined) {
      refuseInput(
        index,
        'required',
        `The input ${added.name} can't become required while roles use this condition: rows that left it empty would start to deny`
      );
    }

    if (was.default !== undefined && added.default === undefined) {
      refuseInput(
        index,
        'default',
        `The input ${added.name} can't lose its default while roles use this condition: rows that rely on it would have no value`
      );
    }
  });
};

/**
 * `strapi.plugin('end-users').service('condition')`: the Content API conditions, held by core's
 * condition registry (`strapi.contentAPI.permissions.providers.condition`).
 */
const conditionService = ({ strapi }: { strapi: Core.Strapi }) => {
  const ability = () =>
    strapi.plugin(PLUGIN_ID).service('ability') as ReturnType<typeof abilityService>;

  /**
   * The roles that hold a row that names each condition, by name of role. The rows' `conditions`
   * and role are read once and gathered here, not once per condition: a role counts once however
   * many rows name it.
   */
  const rolesUsing = async (): Promise<Map<string, Map<string, UsingRole>>> => {
    const rows = (await strapi.db.query(PERMISSION_UID).findMany({
      select: ['conditions'],
      populate: { role: { select: ['documentId', 'name'] } },
    })) as Array<{
      conditions?: unknown;
      role?: { documentId?: string; name?: string } | null;
    }>;
    const roles = new Map<string, Map<string, UsingRole>>();

    for (const { conditions, role } of rows) {
      if (role?.documentId && Array.isArray(conditions)) {
        for (const ref of conditions) {
          const name = conditionNameOf(ref);

          if (name !== undefined) {
            const holders = roles.get(name) ?? new Map<string, UsingRole>();

            holders.set(role.documentId, { documentId: role.documentId, name: role.name ?? '' });
            roles.set(name, holders);
          }
        }
      }
    }

    return roles;
  };

  /** What a condition applies to, as the layout lists it: a list says so itself, anything else is asked of each type */
  const subjectsOf = (definition: ContentApiConditionDefinition, layout: string[]): string[] =>
    Array.isArray(definition.subjects)
      ? [...definition.subjects]
      : layout.filter((uid) => strapi.contentAPI.permissions.conditions.appliesTo(definition, uid));

  /** The roles of one condition in the order the list shows them: by name, then by id */
  const sortedRoles = (holders: Map<string, UsingRole> | undefined): UsingRole[] =>
    [...(holders?.values() ?? [])].sort(
      (a, b) => a.name.localeCompare(b.name) || a.documentId.localeCompare(b.documentId)
    );

  /**
   * One condition as the admin's list shows it. A builder condition carries itself as version 2
   * (`builder`), what it names that is gone (`stale`) and the roles its Who checks name
   * (`rolesNamed`); a code definition carries its query when that is a static object, and a function
   * of the user is computed when it runs and is never serialized.
   */
  const toListItem = (
    definition: ContentApiConditionDefinition,
    {
      layout,
      roles,
      autoReload,
      record,
      grants,
    }: {
      layout: string[];
      roles: UsingRole[];
      autoReload: boolean;
      record?: BuilderRecord;
      grants: readonly WriteGrant[];
    }
  ): ConditionListItem => {
    const source = definition.source ?? 'plugin';
    const builder = source === 'builder' ? record : undefined;
    const selfWritable = builder ? selfWritableOf(builder.condition, grants) : [];
    const reads = builder ? readFieldsOf(builder.condition) : [];

    return {
      name: definition.name,
      displayName: definition.displayName,
      subjects: subjectsOf(definition, layout),
      source,
      params: paramsOf(definition, paramExtras(definition, builder?.condition)),
      stamp: typeof definition.stamp === 'function',
      // The compiled function is always there; it locks something only when the file names a field
      lockedFields: builder
        ? builder.condition.onSave.locked.length > 0
        : typeof definition.lockedFields === 'function',
      usedBy: roles.length,
      usedByRoles: roles,
      editable: source === 'builder' && autoReload,
      ...(isPlain(definition.query) ? { query: definition.query } : {}),
      ...(builder
        ? {
            builder: builder.condition,
            ...(builder.stale.length > 0 && { stale: builder.stale }),
            rolesNamed: rolesNamed(builder.condition),
            ...(selfWritable.length > 0 && { selfWritable }),
            ...(reads.length > 0 && { reads }),
          }
        : {}),
    };
  };

  /** The names of the roles that exist, which a Who check may name */
  const roleNames = async (): Promise<string[]> =>
    (
      (await strapi.db.query(ROLE_UID).findMany({ select: ['name'] })) as Array<{ name?: string }>
    ).flatMap(({ name }) => (typeof name === 'string' ? [name] : []));

  /**
   * The roles whose rows bound a value to each of these params of a condition, by name of role:
   * what a removed input leaves behind
   */
  const rolesBinding = async (
    condition: string,
    params: string[]
  ): Promise<Array<{ name: string; roles: string[] }>> => {
    const rows = (await strapi.db.query(PERMISSION_UID).findMany({
      select: ['conditions'],
      populate: { role: { select: ['name'] } },
    })) as Array<{ conditions?: unknown; role?: { name?: string } | null }>;
    const holders = new Map<string, Set<string>>();

    for (const { conditions, role } of rows) {
      for (const ref of Array.isArray(conditions) ? conditions : []) {
        if (isPlain(ref) && ref.name === condition && isPlain(ref.params) && role?.name) {
          for (const param of params.filter((name) => hasOwn(ref.params as object, name))) {
            holders.set(param, (holders.get(param) ?? new Set()).add(role.name));
          }
        }
      }
    }

    return params.flatMap((name) => {
      const roles = [...(holders.get(name) ?? [])].sort((a, b) => a.localeCompare(b));

      return roles.length > 0 ? [{ name, roles }] : [];
    });
  };

  /**
   * What a signed-in user may be allowed to write of the end user and the profile through the
   * Content API: a `create` or `update` row on either type held by a role other than Public. A row
   * with an empty field list grants nothing. Conditions on the row are not weighed: they narrow
   * which entries, not which fields.
   */
  const writeGrants = async (): Promise<WriteGrant[]> => {
    const actions = [USER_UID, PROFILE_UID].flatMap((uid) => [`${uid}.create`, `${uid}.update`]);
    const rows = (await strapi.db.query(PERMISSION_UID).findMany({
      where: { action: { $in: actions } },
      select: ['action', 'subject', 'properties'],
      populate: { role: { select: ['name', 'type'] } },
    })) as Array<{
      action?: string;
      subject?: string | null;
      properties?: unknown;
      role?: { name?: string; type?: string } | null;
    }>;

    // What an enabled provider maps onto the profile at sign-in is written by whoever signs in
    const provider = strapi.plugin(PLUGIN_ID).service('provider') as ReturnType<
      typeof providerService
    >;
    const signedInWith = (await provider.mappedAttributes()).map(
      ({ name, attributes }): WriteGrant => ({
        subject: PROFILE_UID,
        role: `users signing in with ${name}`,
        fields: attributes,
      })
    );

    return signedInWith.concat(
      rows.flatMap(({ action, subject, properties, role }) => {
        const fields = isPlain(properties) ? properties.fields : undefined;

        if (
          !role?.name ||
          role.type === 'public' ||
          typeof action !== 'string' ||
          !actions.includes(action) ||
          (subject !== USER_UID && subject !== PROFILE_UID) ||
          (Array.isArray(fields) && fields.length === 0)
        ) {
          return [];
        }

        return [
          {
            subject,
            role: role.name,
            fields: Array.isArray(fields)
              ? fields.filter((field): field is string => typeof field === 'string')
              : null,
          },
        ];
      })
    );
  };

  /**
   * Takes the params of removed inputs out of every row that names the condition, so that an input
   * added again under the same name can't bring back a value that was bound for something else
   */
  const stripParams = async (condition: string, removed: string[]): Promise<void> => {
    if (removed.length === 0) {
      return;
    }

    await strapi.db.transaction(async () => {
      const rows = (await strapi.db.query(PERMISSION_UID).findMany({
        select: ['id', 'conditions'],
        populate: { role: { select: ['id'] } },
      })) as Array<{ id: number; conditions?: unknown; role?: { id?: number } | null }>;
      const changedRoles = new Set<number>();

      for (const { id, conditions, role } of rows) {
        if (!Array.isArray(conditions)) {
          continue;
        }

        let changed = false;
        const stripped = conditions.map((ref) => {
          if (!isPlain(ref) || ref.name !== condition || !isPlain(ref.params)) {
            return ref;
          }

          const kept = Object.fromEntries(
            Object.entries(ref.params).filter(([name]) => !removed.includes(name))
          );

          if (Object.keys(kept).length === Object.keys(ref.params).length) {
            return ref;
          }

          changed = true;

          return { ...ref, params: kept };
        });

        if (changed) {
          // eslint-disable-next-line no-await-in-loop
          await strapi.db
            .query(PERMISSION_UID)
            .update({ where: { id }, data: { conditions: stripped } });

          if (typeof role?.id === 'number') {
            changedRoles.add(role.id);
          }
        }
      }

      // As a role save does: an editor opened before this gets the 409 and can't save the old value back
      for (const id of changedRoles) {
        // eslint-disable-next-line no-await-in-loop
        const current = (await strapi.db
          .query(ROLE_UID)
          .findOne({ where: { id }, select: ['revision'] })) as { revision?: number | null } | null;

        // eslint-disable-next-line no-await-in-loop
        await strapi.db
          .query(ROLE_UID)
          .update({ where: { id }, data: { revision: (current?.revision ?? 0) + 1 } });
      }
    });
  };

  /**
   * The definition a condition registers as, which core has checked: a refusal is the same message
   * a start with that file would stop on
   */
  const compiled = (condition: BuilderConditionV2): ContentApiConditionDefinition => {
    const definition = compileBuilderCondition(strapi, condition);

    try {
      strapi.contentAPI.permissions.conditions.validate(definition);
    } catch (error) {
      throw new errors.ValidationError(error instanceof Error ? error.message : String(error));
    }

    return definition;
  };

  /**
   * In memory, as the Content-Type Builder's `isUpdating` is: a write is waiting for the
   * restart it asked for. The process that asks never resets it, because it is replaced; the next
   * one starts at false, which is what the status route answers until then.
   */
  let updating = false;

  /** Nothing may be written while another write waits for its restart */
  const refuseWhileUpdating = (): void => {
    if (updating) {
      throw new ConditionsUpdatingError();
    }
  };

  /**
   * A write is about to touch the disk: no other may start, and the file watcher is off, so that the
   * one restart this write asks for is the only one. The check and the flag are set together, with no
   * `await` between, so two writes that start together cannot both pass.
   */
  const begin = (): void => {
    refuseWhileUpdating();
    updating = true;
    strapi.reload.isWatching = false;
  };

  /**
   * The write failed after `begin`, so no restart is coming: hand file changes back to the watcher.
   * `isWatching = true` would queue a skipped reload and swallow the next real restart, which is why
   * `resumeWatching` exists (the Content-Type Builder's `controllers/schema.ts:7-64` does the same).
   * Not called for a refusal before `begin`, which touched neither flag.
   */
  const abandon = (): void => {
    strapi.reload.resumeWatching();
    updating = false;
  };

  /** The write is on disk: restart once the answer is on its way. The flags stay until the new process starts. */
  const restart = (): void => {
    setImmediate(() => {
      strapi.reload();
    });
  };

  /**
   * The file a write changes or removes, which only the loader decides (`builderFileOf`), never a
   * name a client gives: refused for anything that is not a builder condition. The
   * loader records a name inside the conditions folder, so what is joined to `src` is inside it.
   */
  const fileOfBuilder = (slug: string): string => {
    const name = `api::${slug}`;
    const file = builderFilesOf(strapi).get(name);

    if (file === undefined) {
      throw new errors.ValidationError(
        conditionProvider(strapi)
          .values()
          .some((definition) => definition.name === name)
          ? `${name} is read-only: only a condition the builder wrote can be changed or deleted here`
          : `There is no builder condition ${name}`
      );
    }

    return join(strapi.dirs.app.src, file);
  };

  const rolesUsingName = async (name: string): Promise<UsingRole[]> =>
    sortedRoles((await rolesUsing()).get(name));

  return {
    /**
     * Registers a condition for Content API permissions, as a plugin's: its `source` is `plugin`,
     * whatever the definition says. Core's registry stores a validated, frozen copy,
     * and rejects a malformed definition, a name it already holds, and any registration once Strapi
     * has loaded: a plugin calls this from an async `register()` and awaits it.
     */
    register(definition: ContentApiConditionDefinition): Promise<void> {
      return conditionProvider(strapi).register(
        withSource(definition, 'plugin') as ContentApiConditionDefinition
      );
    },

    /** Every registered condition: the built-in ones, the project's and other plugins' */
    list(): ContentApiConditionDefinition[] {
      return conditionProvider(strapi).values();
    },

    /** See `loadProjectConditions`. The plugin's `register()` already does it once. */
    loadProjectConditions(): Promise<void> {
      return loadProjectConditions(strapi);
    },

    /**
     * The file a builder condition was loaded from, relative to `src`, or undefined for a name that
     * is not one (a built-in, code, a plugin's, or no condition at all). The only way a write or a
     * delete finds a file: never from a name a client gives.
     */
    builderFileOf(name: string): string | undefined {
      return builderFilesOf(strapi).get(name);
    },

    /**
     * The conditions for the admin's list: where each came from, the content
     * types it applies to, the params it declares, whether it sets fields on create (`stamp`) or
     * locks some on update (`lockedFields`), the roles that use it, and whether the builder may
     * change it, which it may for a builder condition when Strapi runs with `autoReload`
     * (`strapi develop`). A builder condition carries itself as version 2 (a version 1 file as its
     * upgrade), and a code definition whose query is a static object carries it, which the read-only
     * page shows; a query that is a function of the user is computed when it runs and is not sent.
     */
    async listForAdmin(): Promise<ConditionListItem[]> {
      const layout = layoutContentTypeUids(strapi);
      const [used, grants] = await Promise.all([rolesUsing(), writeGrants()]);
      const autoReload = isAutoReload(strapi);

      return conditionProvider(strapi)
        .values()
        .map((definition) =>
          toListItem(definition, {
            layout,
            roles: sortedRoles(used.get(definition.name)),
            autoReload,
            record: builderRecordsOf(strapi).get(definition.name),
            grants,
          })
        );
    },

    /**
     * How many entries of `subject` a condition keeps for a sample user, out of how many there are,
     * with the values the admin gave its inputs. The condition is checked first, as a
     * save would (`checkBuilderConditionV2`), and nothing is counted before it holds. Counts the
     * Content Manager's own way: draft versions in the default locale, which the Document Service
     * does unless told otherwise, so a document counts once.
     *
     * Both counts, and the sample user's lookup, are limited to what the admin can read
     * (`subjectQuery` and `userQuery`, their Content Manager read queries on each type), so a
     * preview is never a way to count what they can't see. Nor does it count with a field the admin
     * may not read, or check or fill a value from an attribute of the user or of their profile that
     * they may not read: any part of the condition is a 403, before anything is looked up or counted
     * (`refuseUnreadableReads`). Writes nothing.
     */
    async preview(
      input: ConditionPreviewRequest,
      scope: PreviewScope
    ): Promise<ConditionPreviewResponse> {
      const condition = checkBuilderConditionV2(strapi, input.condition, {
        roleNames: await roleNames(),
      });
      const { subject, userDocumentId } = input;
      const inputs = isPlain(input.inputs) ? input.inputs : {};
      const definition = compiled(condition);

      if (!strapi.contentAPI.permissions.conditions.appliesTo(definition, subject)) {
        throw new errors.ValidationError(`The condition doesn't apply to ${subject}`);
      }

      await refuseUnreadableReads(condition, subject, scope, inputs);

      const readsProfile = definition.usesProfile === true;
      // Asked before the lookup: an admin who may not read profiles reads nothing through a condition
      const profileQuery = readsProfile ? scope.profileQuery() : undefined;
      const user = await ability().conditionUserFor(userDocumentId, scope.userQuery, {
        profile: readsProfile,
        ...(profileQuery && { profileQuery }),
      });

      // Not found within what the admin may read is the same as not there: nothing is counted from
      // it. Which of the two it is, is said, so the admin knows what to fix (still a refusal)
      if (readsProfile && !user.profile) {
        const exists =
          (await strapi.db
            .query(PROFILE_UID)
            .count({ where: { user: { documentId: userDocumentId } } })) > 0;

        throw new errors.PolicyError(
          exists
            ? "A preview can't read this user's profile: it needs Content Manager read access to it"
            : 'This user has no profile, so a condition that reads the profile is false for them: pick a user who has one'
        );
      }

      const filter = strapi.contentAPI.permissions.conditions.evaluate(definition, inputs, {
        user,
        uid: subject,
      });
      const documents = strapi.documents(subject as UID.ContentType);
      const count = (filters: object) => documents.count({ filters } as never);

      // A condition that denies the sample user keeps nothing: there is no filter to count with
      const [total, matching] = await Promise.all([
        count(scope.subjectQuery),
        filter === false ? 0 : count({ $and: [scope.subjectQuery, filter] }),
      ]);

      return { matching, total };
    },

    /**
     * Whether a write waits for the restart it asked for, which a builder write that follows is
     * refused for (409). The admin polls it until the restarted server answers `false`.
     */
    status(): ConditionsStatus {
      return { isUpdating: updating };
    },

    /**
     * Writes a builder condition to `src/end-users/conditions/<slug>.json` and restarts the server,
     * which then loads it (Decisions 1 and 18). Development only: refused without `autoReload`, here
     * as well as by the route's policy. The whole file is checked (`checkBuilderConditionV2`) before
     * the disk is touched, and an update must name the slug of the URL. A create refuses a slug a
     * condition has and a file that exists; an update changes the file the loader found for that
     * slug and nothing else, and refuses what is not a builder condition.
     *
     * An update must not reshape inputs under the roles that use the condition (see
     * `refuseInputReshaping`). An input it removes is allowed: the answer's `warnings` name the
     * roles whose rows bound a value to it, and the value is taken out of those rows in the same
     * write. `warnings.selfWritable` names the fields the condition reads that a signed-in user can
     * write. The file is written
     * to a temporary file beside it and renamed over it, so the loader never reads half a file.
     *
     * Resolves what the list will show once the server is back, made before the restart is
     * scheduled: nothing is read after it. A failed write hands the file watcher back, so no
     * restart is lost, and leaves no temporary file.
     */
    async writeFile(
      input: unknown,
      { slug, create }: { slug: string; create: boolean }
    ): Promise<ConditionWriteResponse> {
      assertAutoReload(strapi);
      refuseWhileUpdating();

      const condition = checkBuilderConditionV2(strapi, input, { roleNames: await roleNames() });

      if (condition.slug !== slug) {
        const message = `The slug of a condition can't be changed: this is ${slug}, the body says ${condition.slug}`;

        throw new errors.ValidationError(message, {
          errors: [{ path: ['slug'], message, name: 'ValidationError' }],
        });
      }

      const name = `api::${slug}`;
      const definition = compiled(condition);
      let target: string;

      if (create) {
        if (
          conditionProvider(strapi)
            .values()
            .some(({ name: registered }) => registered === name)
        ) {
          throw new errors.ValidationError(`A condition named ${name} already exists`);
        }

        target = join(strapi.dirs.app.src, PROJECT_CONDITIONS_DIR, `${slug}.json`);

        if (await exists(target)) {
          throw new errors.ValidationError(
            `${basename(target)} already exists in the conditions folder`
          );
        }
      } else {
        target = fileOfBuilder(slug);
      }

      // Made before anything is written, so that nothing is read after the restart is scheduled
      const roles = await rolesUsingName(name);
      const before = new Map(
        (builderRecordsOf(strapi).get(name)?.condition.inputs ?? []).map((i) => [i.name, i])
      );
      const removed = [...before.keys()].filter(
        (inputName) => !condition.inputs.some((added) => added.name === inputName)
      );

      if (!create && roles.length > 0) {
        refuseInputReshaping(condition, before);
      }

      const removedInputs = create ? [] : await rolesBinding(name, removed);
      const grants = await writeGrants();
      const item = toListItem(definition, {
        layout: layoutContentTypeUids(strapi),
        roles,
        autoReload: true,
        record: { condition, stale: [] },
        grants,
      });
      const temporary = `${target}.tmp`;

      begin();

      try {
        await mkdir(dirname(target), { recursive: true });
        await writeToDisk(temporary, JSON.stringify(condition, null, 2), 'utf8');
        await rename(temporary, target);
      } catch (error) {
        await rm(temporary, { force: true }).catch(() => undefined);
        abandon();

        throw error;
      }

      // A removed input's stored values go with it, once the file is written (a failed write changes no role)
      if (!create) {
        try {
          await stripParams(name, removed);
        } catch (error) {
          abandon();

          throw error;
        }
      }

      restart();

      const selfWritable = item.selfWritable ?? [];

      return {
        data: item,
        ...((removedInputs.length > 0 || selfWritable.length > 0) && {
          warnings: {
            ...(removedInputs.length > 0 && { removedInputs }),
            ...(selfWritable.length > 0 && { selfWritable }),
          },
        }),
      };
    },

    /**
     * Deletes a builder condition's file and restarts the server (Decisions 1 and 18). Development
     * only, and only the file the loader found for that slug. Refused while a role uses the
     * condition: its rows would lose the condition that limits them.
     */
    async removeFile(slug: string): Promise<void> {
      assertAutoReload(strapi);
      refuseWhileUpdating();

      const name = `api::${slug}`;
      const target = fileOfBuilder(slug);
      const used = (await rolesUsingName(name)).length;

      if (used > 0) {
        throw new errors.ValidationError(
          `${name} is used by ${used} ${used === 1 ? 'role' : 'roles'}: remove it from ${used === 1 ? 'that role' : 'those roles'} first`
        );
      }

      begin();

      try {
        await rm(target, { force: true });
      } catch (error) {
        abandon();

        throw error;
      }

      restart();
    },
  };
};

export default conditionService;
