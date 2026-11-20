import { errors } from '@strapi/utils';
import * as z from 'zod/v4';

import type { Data } from '@strapi/types';
import type { AdminUser } from '../../../shared/contracts/shared';

/** The admin forms whose body can carry plugin values, under `plugins.<pluginId>` */
type ExtensibleForm = 'role' | 'user' | 'api-token';

const FORMS: ExtensibleForm[] = ['role', 'user', 'api-token'];

type FormData = Record<string, unknown>;

interface FormContext {
  /** The admin user who sends the form */
  user?: AdminUser;
  /** The entity the form updates. Missing when it creates one */
  entityId?: Data.ID;
}

interface FormInputParam {
  /** Zod schema or factory for the plugin's values, checked when the body has them */
  schema?: z.ZodType | ((zod: typeof z) => z.ZodType);
  /** Checks that need more than the shape. Runs before core saves, also when the body has no values */
  validate?: (values: unknown, context: FormContext) => void | Promise<void>;
  /** Returns the core values to save, for example with a field the plugin manages */
  beforeSave?: (
    args: FormContext & { values: unknown; data: FormData }
  ) => FormData | Promise<FormData>;
  /** Runs once core has saved the entity */
  afterSave?: (args: FormContext & { values: unknown; entityId: Data.ID }) => void | Promise<void>;
}

type ResolvedInputParam = Omit<FormInputParam, 'schema'> & { schema?: z.ZodType };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const formExtensionsService = () => {
  const params: Record<ExtensibleForm, Map<string, ResolvedInputParam>> = {
    role: new Map(),
    user: new Map(),
    'api-token': new Map(),
  };

  /**
   * Lets plugins send their own values with a core admin form, under `plugins.<pluginId>`.
   * Keys are plugin ids. Core refuses values no plugin added, and never stores plugin values.
   */
  const addInputParams = (form: ExtensibleForm, options: Record<string, FormInputParam>) => {
    if (!FORMS.includes(form)) {
      throw new Error(
        `formExtensions.addInputParams: "${form}" is not a form plugins can extend. Use one of: ${FORMS.join(', ')}`
      );
    }

    for (const [pluginId, { schema, ...param }] of Object.entries(options)) {
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
   * Saves a core admin form with its plugin values: checks them, lets plugins change the core
   * values, calls `save`, then tells plugins the saved id. Returns what `save` returns.
   */
  const save = async <TEntity extends { id: Data.ID } | null>(
    form: ExtensibleForm,
    { input, data, ...context }: FormContext & { input: unknown; data: FormData },
    saveEntity: (data: FormData) => Promise<TEntity>
  ): Promise<TEntity> => {
    const values = await parseInput(form, input, context);

    let nextData = data;

    for (const [pluginId, { beforeSave }] of params[form]) {
      if (beforeSave) {
        nextData = await beforeSave({ ...context, values: values[pluginId], data: nextData });
      }
    }

    const entity = await saveEntity(nextData);

    if (entity) {
      for (const [pluginId, { afterSave }] of params[form]) {
        await afterSave?.({ ...context, values: values[pluginId], entityId: entity.id });
      }
    }

    return entity;
  };

  return { unstable_addInputParams: addInputParams, save };
};

export default formExtensionsService;
export type { ExtensibleForm, FormContext, FormInputParam };
