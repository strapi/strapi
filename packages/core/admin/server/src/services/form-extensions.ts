import { errors } from '@strapi/utils';
import * as z from 'zod/v4';

import type { Data } from '@strapi/types';
import type { AdminUser } from '../../../shared/contracts/shared';

/** The admin forms whose body can carry plugin values, under `plugins.<pluginId>` */
const FORMS = ['role', 'user', 'api-token'] as const;

type ExtensibleForm = (typeof FORMS)[number];

type FormData = Record<string, unknown>;

interface FormContext {
  /** The admin user who sends the form */
  user?: AdminUser;
  /** The entity the form updates. Missing when it creates one */
  entityId?: Data.ID;
}

/** Values have the type the schema returns, and are `undefined` when the body has none */
interface FormInputParam<TSchema extends z.ZodType = z.ZodType> {
  /** Zod schema or factory for the plugin's values, checked when the body has them */
  schema?: TSchema | ((zod: typeof z) => TSchema);
  /** Checks that need more than the shape. Runs before core checks, also when the body has no values */
  validate?: (values: z.output<TSchema> | undefined, context: FormContext) => void | Promise<void>;
  /** Returns the core values to check and save, for example with a field the plugin manages */
  beforeSave?: (
    args: FormContext & { values: z.output<TSchema> | undefined; data: FormData }
  ) => FormData | Promise<FormData>;
  /** Runs once core has saved the entity, in the same transaction */
  afterSave?: (
    args: FormContext & { values: z.output<TSchema> | undefined; entityId: Data.ID }
  ) => void | Promise<void>;
}

type ResolvedInputParam = Omit<FormInputParam, 'schema'> & { schema?: z.ZodType };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

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

      params[form].set(pluginId, {
        ...param,
        schema: typeof schema === 'function' ? schema(z) : schema,
      });
    }
  };

  const parseInput = async (form: ExtensibleForm, input: unknown, context: FormContext) => {
    if (input !== undefined && input !== null && !isRecord(input)) {
      throw new errors.ValidationError('plugins must be an object');
    }

    const values: Record<string, unknown> = isRecord(input) ? { ...input } : {};

    for (const key of Object.keys(values)) {
      if (!params[form].has(key)) {
        throw new errors.ValidationError(`Invalid key plugins.${key}`);
      }
    }

    for (const [pluginId, { schema, validate }] of params[form]) {
      if (schema && values[pluginId] !== undefined) {
        const result = schema.safeParse(values[pluginId]);

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

      await validate?.(values[pluginId], context);
    }

    return values;
  };

  /**
   * Runs the plugin steps of a core admin form before core checks it: checks the plugin values,
   * then lets plugins change the core values. Core checks the returned `data` as without plugins,
   * then saves it with `save`, which tells plugins the saved id in the same transaction.
   */
  const prepare = async <TData extends FormData>(
    form: ExtensibleForm,
    { input, data, ...context }: FormContext & { input: unknown; data: TData }
  ) => {
    const values = await parseInput(form, input, context);

    let nextData: FormData = data;

    for (const [pluginId, { beforeSave }] of params[form]) {
      if (beforeSave) {
        nextData = await beforeSave({ ...context, values: values[pluginId], data: nextData });
      }
    }

    const save = async <TEntity extends { id: Data.ID } | null>(
      saveEntity: () => Promise<TEntity>
    ) =>
      (await strapi.db.transaction(async () => {
        const entity = await saveEntity();

        if (entity) {
          for (const [pluginId, { afterSave }] of params[form]) {
            await afterSave?.({ ...context, values: values[pluginId], entityId: entity.id });
          }
        }

        return entity;
      })) as TEntity;

    // Core checks `data` right after, as it checks the body without plugins
    return { data: nextData as TData, save };
  };

  return { unstable_addInputParams: addInputParams, prepare };
};

export default formExtensionsService;
export type { ExtensibleForm, FormContext, FormInputParam };
