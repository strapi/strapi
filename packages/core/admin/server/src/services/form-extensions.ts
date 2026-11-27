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
  /** The id of the entity the form updates, as core matched it. Missing on create */
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
  /**
   * Runs once core has saved the entity. A failure answers 500: on create, core deletes the
   * entity; on update, it stays saved
   */
  afterSave?: (
    args: FormContext & { values: z.output<TSchema> | undefined; entityId: Data.ID }
  ) => void | Promise<void>;
}

type ResolvedInputParam = Omit<FormInputParam, 'schema'> & { schema?: z.ZodType };

/**
 * `undo` (create only) removes the entity core just created when an `afterSave` fails, so the
 * request can be sent again: a kept entity would make it fail as a duplicate name or email.
 */
type Save = <TEntity extends { id: Data.ID } | null>(
  saveEntity: () => Promise<TEntity>,
  undo?: (entity: NonNullable<TEntity>) => Promise<unknown>
) => Promise<TEntity>;

// The stack starts with the message
const describeError = (error: unknown) =>
  error instanceof Error ? (error.stack ?? error.message) : String(error);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

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
        `unstable_addInputParams: "${form}" is not a form plugins can extend. Use one of: ${FORMS.join(', ')}`
      );
    }

    for (const [pluginId, { schema, ...param }] of Object.entries(
      options as Record<string, FormInputParam>
    )) {
      if (params[form].has(pluginId)) {
        throw new Error(
          `unstable_addInputParams: param "${pluginId}" has already been added to the ${form} form`
        );
      }

      const resolvedSchema = typeof schema === 'function' ? schema(z) : schema;

      if (schema !== undefined && typeof resolvedSchema?.safeParseAsync !== 'function') {
        throw new Error(
          `unstable_addInputParams: the schema of "${pluginId}" must be a Zod schema, from \`z\` in @strapi/utils or the factory argument`
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

        if (result !== undefined) {
          throw new Error(
            `admin::form-extensions: the validate step of "${pluginId}" returned a value. Throw a ValidationError to refuse a save`
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
    { body, ...context }: FormContext & { body: TBody }
  ) => {
    type TData = Omit<TBody, 'plugins'>;

    // A body that is not an object goes to core's own validation as sent, which refuses it
    if (!isRecord(body)) {
      const saveAsIs: Save = (saveEntity) => saveEntity();

      return { data: body as unknown as TData, save: saveAsIs };
    }

    const { plugins: input, ...data } = body;
    const values = await parseInput(form, input, context);

    let nextData: FormData = data;

    for (const [pluginId, { beforeSave }] of params[form]) {
      if (beforeSave) {
        const current = nextData;
        const result = await runPluginStep(pluginId, () =>
          beforeSave({ ...context, values: values[pluginId], data: current })
        );

        if (!isRecord(result)) {
          throw new Error(
            `admin::form-extensions: the beforeSave step of "${pluginId}" must return the core values as an object`
          );
        }

        nextData = result;
      }
    }

    // Not one transaction with core's save: inside one, the entity manager could no longer retry
    // a deadlock, for example between two admins changing the roles of users who share one
    const save: Save = async (saveEntity, undo) => {
      const entity = await saveEntity();

      if (entity) {
        const failures: Array<{ pluginId: string; error: unknown }> = [];

        for (const [pluginId, { afterSave }] of params[form]) {
          try {
            await afterSave?.({ ...context, values: values[pluginId], entityId: entity.id });
          } catch (error) {
            failures.push({ pluginId, error });
          }
        }

        if (failures.length === 0) {
          return entity;
        }

        // The logger prints the message only, so each plugin's reason goes in it
        for (const { pluginId, error } of failures) {
          strapi.log.error(
            `admin::form-extensions: the afterSave step of "${pluginId}" failed after core saved entity ${entity.id}: ${describeError(error)}`
          );
        }

        let deleted = false;

        if (undo) {
          try {
            await undo(entity as NonNullable<typeof entity>);
            deleted = true;
          } catch (error) {
            strapi.log.error(
              `admin::form-extensions: could not delete entity ${entity.id} after its afterSave failed: ${describeError(error)}`
            );
          }
        }

        // Never a 4xx: every check passed before the save, and on update the entity stays saved
        throw new Error(
          `admin::form-extensions: the afterSave step of ${failures
            .map(({ pluginId }) => `"${pluginId}"`)
            .join(
              ', '
            )} failed after core saved entity ${entity.id}${deleted ? ', which core deleted' : ''}`,
          {
            cause:
              failures.length === 1
                ? failures[0].error
                : new AggregateError(failures.map(({ error }) => error)),
          }
        );
      }

      return entity;
    };

    return { data: nextData as TData, save };
  };

  return { unstable_addInputParams: addInputParams, internal_prepare: prepare };
};

// What plugins use: `internal_prepare` is for core's controllers only
type FormExtensionsService = Omit<ReturnType<typeof formExtensionsService>, 'internal_prepare'>;

export default formExtensionsService;
export type { ExtensibleForm, FormContext, FormExtensionsService, FormInputParam };
