import { errors } from '@strapi/utils';
import * as z from 'zod/v4';

import type { Data } from '@strapi/types';
import type { AdminUser } from '../../../shared/contracts/shared';

/** The admin forms whose body can carry plugin values, under `plugins.<pluginId>` */
const FORMS = ['role', 'user', 'content-api-token'] as const;

type ExtensibleForm = (typeof FORMS)[number];

type FormData = Record<string, unknown>;

interface FormContext {
  /** The admin user who sends the form */
  user?: AdminUser;
  /** The entity the form updates, as the database matches it (`'01'` is `1`). Missing on create */
  entityId?: Data.ID;
}

/** Values have the type the schema returns, and are `undefined` when the body has none */
interface FormInputParam<TSchema extends z.ZodType = z.ZodType> {
  /** Zod schema or factory for the plugin's values, checked when the body has them */
  schema?: TSchema | ((zod: typeof z) => TSchema);
  /** Checks that need more than the shape. Runs before core checks, also when the body has no values */
  validate?: (
    args: FormContext & { values: z.output<TSchema> | undefined }
  ) => void | Promise<void>;
  /** Returns the core values to check and save, for example with a field the plugin manages */
  beforeSave?: (
    args: FormContext & { values: z.output<TSchema> | undefined; data: FormData }
  ) => FormData | Promise<FormData>;
  /** Runs once core has saved the entity. A failure answers 500: the entity stays saved */
  afterSave?: (
    args: FormContext & { values: z.output<TSchema> | undefined; entityId: Data.ID }
  ) => void | Promise<void>;
}

type ResolvedInputParam = Omit<FormInputParam, 'schema'> & { schema?: z.ZodType };

/**
 * Why a plugin keeps an entity from being changed, or nothing to let core change it. The reason
 * is shown to the admin user, so write it for them.
 */
type ReadOnlyReason = (
  args: Omit<FormContext, 'entityId'> & { entityId: Data.ID }
) => string | null | undefined | Promise<string | null | undefined>;

/** The forms whose entities a plugin can make read-only */
const READ_ONLY_FORMS: ExtensibleForm[] = ['role'];

type Save = <TEntity extends { id: Data.ID } | null>(
  saveEntity: () => Promise<TEntity>
) => Promise<TEntity>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * The id the database matches for a route id. Databases read a leading number from the string
 * (`'07'`, `' 7'`, `'7e0'`, and on MySQL `'7abc'`, all find row 7), so plugins get that number.
 * Ids that start with no safe integer are passed as sent: they match no row.
 */
const toEntityId = (id?: Data.ID) => {
  const number = typeof id === 'string' ? Number.parseFloat(id) : NaN;

  return Number.isSafeInteger(number) ? number : id;
};

/** A 400 with a field error at `path`, like core's validation errors */
const fieldError = (message: string, path: string[], details: object = {}) =>
  new errors.ValidationError(message, {
    ...details,
    errors: [{ path, message, name: 'ValidationError' }],
  });

/**
 * Runs a plugin step. A `ValidationError` without field errors is reported at
 * `plugins.<pluginId>`, so the admin shows it on the plugin's field instead of dropping it.
 */
const runPluginStep = async <T>(pluginId: string, step: () => T | Promise<T>) => {
  try {
    return await step();
  } catch (error) {
    if (error instanceof errors.ValidationError && !error.details?.errors?.length) {
      throw fieldError(error.message, ['plugins', pluginId], error.details);
    }

    throw error;
  }
};

const formExtensionsService = () => {
  const params = Object.fromEntries(FORMS.map((form) => [form, new Map()])) as Record<
    ExtensibleForm,
    Map<string, ResolvedInputParam>
  >;

  /**
   * Lets plugins send their own values with a core admin form, under `plugins.<pluginId>`.
   * Keys are plugin ids. Core refuses values no plugin added, and never stores plugin values.
   */
  const addInputParams = <TSchemas extends Record<string, z.ZodType>>(
    form: ExtensibleForm,
    options: { [PluginId in keyof TSchemas]: FormInputParam<TSchemas[PluginId]> }
  ) => {
    if (!FORMS.includes(form)) {
      throw new Error(
        `formExtensions.addInputParams: "${form}" is not a form plugins can extend. Use one of: ${FORMS.join(', ')}`
      );
    }

    for (const [pluginId, { schema, ...param }] of Object.entries(
      options as Record<string, FormInputParam>
    )) {
      if (params[form].has(pluginId)) {
        throw new Error(
          `formExtensions.addInputParams: param "${pluginId}" has already been added to the ${form} form`
        );
      }

      const resolvedSchema = typeof schema === 'function' ? schema(z) : schema;

      if (resolvedSchema && typeof resolvedSchema.safeParseAsync !== 'function') {
        throw new Error(
          `formExtensions.addInputParams: the schema of "${pluginId}" must be a Zod schema, from \`z\` in @strapi/utils or the factory argument`
        );
      }

      params[form].set(pluginId, { ...param, schema: resolvedSchema });
    }
  };

  const parseInput = async (form: ExtensibleForm, input: unknown, context: FormContext) => {
    if (input !== undefined && input !== null && !isRecord(input)) {
      throw fieldError('plugins must be an object', ['plugins']);
    }

    const values: Record<string, unknown> = isRecord(input) ? { ...input } : {};

    for (const key of Object.keys(values)) {
      if (!params[form].has(key)) {
        throw fieldError(`Invalid key plugins.${key}`, ['plugins', key]);
      }
    }

    for (const [pluginId, { schema, validate }] of params[form]) {
      if (schema && values[pluginId] !== undefined) {
        const result = await schema.safeParseAsync(values[pluginId]);

        if (!result.success) {
          throw new errors.ValidationError(result.error.issues[0]?.message ?? 'Validation error', {
            errors: result.error.issues.map((issue) => ({
              path: ['plugins', pluginId, ...issue.path.map(String)],
              message: issue.message,
              name: 'ValidationError',
            })),
          });
        }

        values[pluginId] = result.data;
      }

      if (validate) {
        const result = await runPluginStep(pluginId, () =>
          validate({ ...context, values: values[pluginId] })
        );

        // A plugin bug: returning false refuses nothing, so fail loudly instead of saving
        if (result !== undefined) {
          throw new Error(
            `formExtensions: the validate step of "${pluginId}" returned a value. Throw a ValidationError to refuse a save`
          );
        }
      }
    }

    return values;
  };

  /**
   * For core's controllers, not plugins. Runs the plugin steps of a core admin form before core
   * checks it: takes `plugins` out of the body, checks the plugin values, then lets plugins change
   * the core values. Core checks the returned `data` as without plugins, then saves it with `save`,
   * which tells plugins the saved id.
   */
  const prepare = async <TBody>(
    form: ExtensibleForm,
    { body, ...requestContext }: FormContext & { body: TBody }
  ) => {
    type TData = Omit<TBody, 'plugins'>;

    // A body that is not an object goes to core's own validation as sent, which refuses it
    if (!isRecord(body)) {
      const saveAsIs: Save = (saveEntity) => saveEntity();

      return { data: body as unknown as TData, save: saveAsIs };
    }

    const { plugins: input, ...data } = body;
    const context = { ...requestContext, entityId: toEntityId(requestContext.entityId) };
    const values = await parseInput(form, input, context);

    let nextData: FormData = data;

    for (const [pluginId, { beforeSave }] of params[form]) {
      if (beforeSave) {
        const current = nextData;
        const result = await runPluginStep(pluginId, () =>
          beforeSave({ ...context, values: values[pluginId], data: current })
        );

        // A plugin bug, not a bad request: answer 500 with a clear message
        if (!isRecord(result)) {
          throw new Error(
            `formExtensions: the beforeSave step of "${pluginId}" must return the core values as an object`
          );
        }

        nextData = result;
      }
    }

    // Not one transaction with core's save: inside one, the entity manager could no longer retry
    // a deadlock, for example between two admins changing the roles of users who share one
    const save: Save = async (saveEntity) => {
      const entity = await saveEntity();

      if (entity) {
        const failures: Array<{ pluginId: string; error: unknown }> = [];

        // Every plugin gets its afterSave, even when another one failed
        for (const [pluginId, { afterSave }] of params[form]) {
          try {
            await afterSave?.({ ...context, values: values[pluginId], entityId: entity.id });
          } catch (error) {
            failures.push({ pluginId, error });
          }
        }

        if (failures.length > 0) {
          // Never a 4xx: the entity is saved, and a client retrying a 400 would save it twice
          throw new Error(
            `formExtensions: the afterSave step of ${failures
              .map(({ pluginId }) => `"${pluginId}"`)
              .join(', ')} failed after core saved entity ${entity.id}`,
            {
              cause:
                failures.length === 1
                  ? failures[0].error
                  : new AggregateError(failures.map(({ error }) => error)),
            }
          );
        }
      }

      return entity;
    };

    // Core checks `data` right after, as it checks the body without plugins
    return { data: nextData as TData, save };
  };

  const readOnlyReasons = Object.fromEntries(FORMS.map((form) => [form, new Map()])) as Record<
    ExtensibleForm,
    Map<string, ReadOnlyReason>
  >;

  /**
   * Lets plugins make some entities of a core admin form read-only, with a reason. Keys are plugin
   * ids. Core shows the reason and refuses changes to those entities.
   */
  const addReadOnlyReasons = (form: ExtensibleForm, options: Record<string, ReadOnlyReason>) => {
    if (!READ_ONLY_FORMS.includes(form)) {
      throw new Error(
        `formExtensions.addReadOnlyReasons: "${form}" entities cannot be read-only. Use one of: ${READ_ONLY_FORMS.join(', ')}`
      );
    }

    for (const [pluginId, getReason] of Object.entries(options)) {
      if (typeof getReason !== 'function') {
        throw new Error(
          `formExtensions.addReadOnlyReasons: the reason of "${pluginId}" must be a function`
        );
      }

      if (readOnlyReasons[form].has(pluginId)) {
        throw new Error(
          `formExtensions.addReadOnlyReasons: a reason of "${pluginId}" has already been added to the ${form} form`
        );
      }

      readOnlyReasons[form].set(pluginId, getReason);
    }
  };

  /** The first reason a plugin gives, in the order they were added, or null */
  const getReadOnlyReason = async (
    form: ExtensibleForm,
    entity: { id: Data.ID },
    { user }: Pick<FormContext, 'user'>
  ) => {
    for (const [pluginId, getReason] of readOnlyReasons[form]) {
      const reason = await getReason({ user, entityId: entity.id });

      if (reason !== null && reason !== undefined && typeof reason !== 'string') {
        throw new Error(
          `formExtensions: the read-only reason of "${pluginId}" must be a string, null or undefined`
        );
      }

      if (reason) {
        return reason;
      }
    }

    return null;
  };

  /**
   * For core's controllers, not plugins. Adds `readOnly` and `readOnlyReason` to the entities a
   * plugin makes read-only, and leaves the others as they are.
   */
  const markReadOnly = async <TEntity extends { id: Data.ID }>(
    form: ExtensibleForm,
    entities: TEntity[],
    context: Pick<FormContext, 'user'>
  ) =>
    Promise.all(
      entities.map(async (entity) => {
        const readOnlyReason = await getReadOnlyReason(form, entity, context);

        return readOnlyReason ? { ...entity, readOnly: true, readOnlyReason } : entity;
      })
    );

  /**
   * For core's controllers, not plugins. Refuses a change to entities a plugin makes read-only,
   * like core refuses to change the Super Admin role.
   */
  const assertNotReadOnly = async (
    form: ExtensibleForm,
    entities: Array<{ id: Data.ID }>,
    context: Pick<FormContext, 'user'>
  ) => {
    for (const entity of entities) {
      const readOnlyReason = await getReadOnlyReason(form, entity, context);

      if (readOnlyReason) {
        throw new errors.ApplicationError(readOnlyReason, { readOnly: true });
      }
    }
  };

  return {
    unstable_addInputParams: addInputParams,
    unstable_addReadOnlyReasons: addReadOnlyReasons,
    internal_prepare: prepare,
    internal_markReadOnly: markReadOnly,
    internal_assertNotReadOnly: assertNotReadOnly,
  };
};

type FormExtensionsService = ReturnType<typeof formExtensionsService>;

export default formExtensionsService;
export type { ExtensibleForm, FormContext, FormExtensionsService, FormInputParam, ReadOnlyReason };
