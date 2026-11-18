import { get } from 'lodash';
import { z, errors } from '@strapi/utils';

/**
 * A permission action registration, one member per section. `validateRegisterProviderAction`
 * checks registrations with it, and a registration type can be derived from it.
 *
 * It accepts what the previous yup schema accepted: `options` and alias items accept unknown keys,
 * `options.applyToProperties` is not nullable, an alias may leave `actionId` out, a key that a
 * section forbids may still be present with an `undefined` value, and arrays may hold `undefined`
 * items.
 */

// `admin` or a loaded plugin, read from `strapi.plugins` when the schema runs.
const pluginName = z
  .string()
  .refine((value) => ['admin', ...Object.keys(strapi.plugins)].includes(value), {
    error: 'is not an existing plugin',
  });

const absent = (message: string) => z.undefined({ error: message }).optional();

const subjectsAbsent = absent('should only be defined for the "contentTypes" section');
const categoryAbsent = absent('should only be defined for the "settings" section');
const subCategoryAbsent = absent('should only be defined for "plugins" and "settings" sections');

const base = {
  uid: z.string().regex(/^[a-z]([a-z|.|-]+)[a-z]$/, {
    error: 'The uid can only contain lowercase letters, dots and hyphens.',
  }),
  displayName: z.string().min(1),
  options: z.object({ applyToProperties: z.array(z.string().optional()).optional() }).optional(),
  aliases: z
    .array(
      z
        .object({
          actionId: z.string().optional(),
          subjects: z.array(z.string().optional()).nullable().optional(),
        })
        .optional()
    )
    .nullable()
    .optional(),
};

export const actionRegistrationSchema = z.discriminatedUnion('section', [
  z.strictObject({
    ...base,
    section: z.literal('contentTypes'),
    pluginName: pluginName.optional(),
    subjects: z.array(z.string().optional()),
    category: categoryAbsent,
    subCategory: subCategoryAbsent,
  }),
  z.strictObject({
    ...base,
    section: z.literal('plugins'),
    pluginName,
    subCategory: z.string().optional(),
    subjects: subjectsAbsent,
    category: categoryAbsent,
  }),
  z.strictObject({
    ...base,
    section: z.literal('settings'),
    pluginName: pluginName.optional(),
    category: z.string().min(1),
    subCategory: z.string().optional(),
    subjects: subjectsAbsent,
  }),
  z.strictObject({
    ...base,
    section: z.literal('internal'),
    pluginName: pluginName.optional(),
    subjects: subjectsAbsent,
    category: categoryAbsent,
    subCategory: subCategoryAbsent,
  }),
]);

const registerProviderActionSchema = z.array(actionRegistrationSchema.optional());

// `[0].options.applyToProperties`, as yup names a path.
const formatPath = (path: PropertyKey[]) =>
  path.reduce<string>((acc, key) => {
    if (typeof key === 'number') {
      return `${acc}[${key}]`;
    }

    return acc === '' ? String(key) : `${acc}.${String(key)}`;
  }, '');

/**
 * Throws a `ValidationError` whose message names every failing path: `<path> <message>` for one
 * issue, `<count> errors occurred:` followed by one `<path> <message>` line per issue for several.
 * `details.errors` lists every issue, with the input value at its path.
 */
export const validateRegisterProviderAction = (actions: unknown): void => {
  const result = registerProviderActionSchema.safeParse(actions);

  if (result.success === true) {
    return;
  }

  const issues = result.error.issues.map((issue) => {
    const path = formatPath(issue.path);

    return {
      path: issue.path.map(String),
      message: path === '' ? issue.message : `${path} ${issue.message}`,
      name: 'ValidationError',
      value: issue.path.length === 0 ? actions : get(actions, issue.path),
    };
  });

  const message =
    issues.length === 1
      ? issues[0].message
      : [`${issues.length} errors occurred:`, ...issues.map((issue) => `- ${issue.message}`)].join(
          '\n'
        );

  throw new errors.ValidationError(message, { errors: issues });
};

export default {
  validateRegisterProviderAction,
};
