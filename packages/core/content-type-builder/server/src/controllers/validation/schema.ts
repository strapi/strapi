import { z } from 'zod';
import { strings, validateZod } from '@strapi/utils';
import type { Struct, UID } from '@strapi/types';
import { isArray, isNil, isNull, isNumber, isObject, isUndefined, snakeCase } from 'lodash/fp';

import { isReservedAttributeName, isReservedModelName } from '../../services/builder';
import { coreUids, typeKinds, VALID_UID_TARGETS } from '../../services/constants';

import {
  CATEGORY_NAME_REGEX,
  ICON_REGEX,
  COLLECTION_NAME_REGEX,
  KEBAB_BASE_REGEX,
  NAME_REGEX,
} from './common';

type SchemaMeta =
  | {
      modelType: 'contentType';
      kind?: Struct.ContentTypeKind;
    }
  | {
      modelType: 'component';
    };

const uniqueAttributeName: z.SuperRefinement<{ name: string }[]> = (attributes, ctx) => {
  const names = new Set(attributes.map((attribute) => snakeCase(attribute.name)));
  if (names.size !== attributes.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Attributes must have unique names',
    });
  }
};

const verifyUidTargetField: z.SuperRefinement<
  {
    action: 'create' | 'update' | 'delete';
    name: string;
    properties?: {
      type: unknown;
      targetField?: string | null;
    };
  }[]
> = (attributes, ctx) => {
  attributes.forEach((attribute) => {
    if (!attribute.properties) {
      return;
    }

    const { properties, action } = attribute;

    if (properties.type === 'uid' && properties.targetField) {
      const targetAttr = attributes.find((attr) => attr.name === properties.targetField);

      if (!targetAttr) {
        // NOTE: on update we are setting it to undefined later in the process instead to handle renames
        if (action === 'create') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Target does not exist',
          });
        }
      } else if (
        !VALID_UID_TARGETS.some((validUIdTarget) => validUIdTarget === targetAttr.properties?.type)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid target type',
        });
      }
    }
  });
};

const verifySingularAndPluralNames: z.SuperRefinement<Record<string, unknown>> = (obj, ctx) => {
  // singular and plural can only be provided on creation
  if (obj.action !== 'create') {
    return;
  }

  if (obj.singularName === obj.pluralName) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Singular and plural names must be different',
      path: ['singularName'],
    });
  }
};

export const maxLengthGreaterThanMinLength: z.SuperRefinement<Record<string, unknown>> = (
  value,
  ctx
) => {
  if (
    !isNil(value.maxLength) &&
    !isNil(value.minLength) &&
    isNumber(value.maxLength) &&
    isNumber(value.minLength)
  ) {
    if (value.maxLength < value.minLength) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'maxLength must be greater or equal to minLength',
        path: ['maxLength'],
      });
    }
  }
};

export const maxGreaterThanMin: z.SuperRefinement<Record<string, unknown>> = (value, ctx) => {
  if (!isNil(value.max) && !isNil(value.min) && isNumber(value.max) && isNumber(value.min)) {
    if (value.max < value.min) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'max must be greater or equal to min',
        path: ['max'],
      });
    }
  }
};

const checkUserTarget: z.SuperRefinement<{
  type: string;
  target?: string;
  relation?: string;
  targetAttribute?: string | null;
}> = (value, ctx) => {
  if (value.type !== 'relation') {
    return;
  }

  if (isUndefined(value.target) || isUndefined(value.relation)) {
    return;
  }

  const { target, relation, targetAttribute } = value;

  if (
    target === coreUids.STRAPI_USER &&
    (!STRAPI_USER_RELATIONS.includes(relation) || !isUndefined(targetAttribute))
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['relation'],
      message: `Relations to ${coreUids.STRAPI_USER} must be one of the following values: ${STRAPI_USER_RELATIONS.join(', ')} without targetAttribute`,
    });
  }
};

const uidRefinement: z.SuperRefinement<{
  type: string;
  default?: unknown;
  targetField?: string | null;
}> = (value, ctx) => {
  if (!isNil(value.targetField) && !isNil(value.default)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Cannot define a default UID if the targetField is set',
      path: ['default'],
    });
  }
};

const enumRefinement: z.SuperRefinement<{
  type: string;
  default?: unknown;
  enum?: string[];
}> = (value, ctx) => {
  if (value.type === 'enumeration' && !isNil(value.default) && !isNil(value.enum)) {
    if (value.default === '' || !value.enum.some((v) => v === value.default)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Default value must be one of the enum values',
        path: ['default'],
      });
    }
  }
};

const conditionSchema = z.object({
  visible: z.record(z.string(), z.array(z.any())),
});

const basePropertiesSchema = z.object({
  type: z.enum([
    'string',
    'text',
    'richtext',
    'blocks',
    'json',
    'enumeration',
    'password',
    'email',
    'integer',
    'biginteger',
    'float',
    'decimal',
    'time',
    'datetime',
    'date',
    'timestamp',
    'boolean',
    'component',
    'uid',
    'customField',
    'media',
    'relation',
    'dynamiczone',
  ]),
  configurable: z.boolean().nullish(),
  private: z.boolean().nullish(),
  pluginOptions: z.record(z.unknown()).optional(),
  conditions: z.preprocess((val) => {
    return val;
  }, conditionSchema.optional()),
});

const maxLengthSchema = z.number().int().positive().optional();
const minLengthSchema = z.number().int().positive().optional();

const requiredSchema = z.boolean().optional();
const uniqueSchema = z.boolean().optional();

const STRAPI_USER_RELATIONS = ['oneToOne', 'oneToMany'];

const baseRelationSchema = z.object({
  type: z.literal('relation'),
  relation: z.enum([
    'oneToOne',
    'oneToMany',
    'manyToOne',
    'manyToMany',
    'morphOne',
    'morphMany',
    'morphToOne',
    'morphToMany',
  ]),
  configurable: z.boolean().nullish(),
  private: z.boolean().nullish(),
  pluginOptions: z.record(z.unknown()).optional(),
  conditions: z.preprocess((val) => {
    return val;
  }, conditionSchema.optional()),
});

const oneToOneSchema = baseRelationSchema.extend({
  relation: z.literal('oneToOne'),
  target: z.string(),
  targetAttribute: z.string().nullish(),
});

const oneWaySchema = baseRelationSchema.extend({
  relation: z.literal('oneToOne'),
  target: z.string(),
});

const oneToManySchema = baseRelationSchema.extend({
  relation: z.literal('oneToMany'),
  target: z.string(),
  targetAttribute: z.string().nullish(),
});

const manyWaySchema = baseRelationSchema.extend({
  relation: z.literal('oneToMany'),
  target: z.string(),
});

const manyToOneSchema = baseRelationSchema.extend({
  relation: z.literal('manyToOne'),
  target: z.string(),
  targetAttribute: z.string().nullish(),
});

const manyToManySchema = baseRelationSchema.extend({
  relation: z.literal('manyToMany'),
  target: z.string(),
  targetAttribute: z.string().nullish(),
});

const morphOneSchema = baseRelationSchema.extend({
  relation: z.literal('morphOne'),
  target: z.string(),
  targetAttribute: z.string().nullish(),
});

const morphManySchema = baseRelationSchema.extend({
  relation: z.literal('morphMany'),
  target: z.string(),
  targetAttribute: z.string().nullish(),
});

const morphToOneSchema = baseRelationSchema.extend({
  relation: z.literal('morphToOne'),
});

const morphToManySchema = baseRelationSchema.extend({
  relation: z.literal('morphToMany'),
});

const createRelationSchema = (meta: SchemaMeta) => {
  switch (meta.modelType) {
    case 'contentType': {
      switch (meta.kind) {
        case 'singleType':
          return z.discriminatedUnion('relation', [
            oneToOneSchema,
            oneToManySchema,
            morphOneSchema,
            morphManySchema,
            morphToOneSchema,
            morphToManySchema,
          ]);

        case 'collectionType':
          return z.discriminatedUnion('relation', [
            oneToOneSchema,
            oneToManySchema,
            manyToOneSchema,
            manyToManySchema,
            morphOneSchema,
            morphManySchema,
            morphToOneSchema,
            morphToManySchema,
          ]);
        default:
          throw new Error('Invalid content type kind');
      }
    }

    case 'component': {
      return z.discriminatedUnion('relation', [oneWaySchema, manyWaySchema]);
    }
    default:
      throw new Error('Invalid model type');
  }
};

const richTextSchema = basePropertiesSchema.extend({
  type: z.literal('richtext'),
  required: requiredSchema,
  minLength: minLengthSchema,
  maxLength: maxLengthSchema,
  default: z.string().optional(),
});

const blocksSchema = basePropertiesSchema.extend({
  type: z.literal('blocks'),
  required: requiredSchema,
});

const jsonSchema = basePropertiesSchema.extend({
  type: z.literal('json'),
  required: requiredSchema,
  default: z
    .unknown()
    .optional()
    .refine((value) => {
      if (value === undefined) {
        return true;
      }

      if (isNumber(value) || isNull(value) || isObject(value) || isArray(value)) {
        return true;
      }

      try {
        JSON.parse(value as string);

        return true;
      } catch (err) {
        return false;
      }
    }),
});

const enumerationSchema = basePropertiesSchema.extend({
  type: z.literal('enumeration'),
  required: requiredSchema,
  default: z.string().optional(),
  enumName: z
    .string()
    .optional()
    .refine((value) => {
      return value === '' || NAME_REGEX.test(value as string);
    }, 'Invalid enum name'),
  enum: z
    .array(
      z.string().refine((value) => {
        return value === '' || !strings.startsWithANumber(value as string);
      })
    )
    .min(1)
    .refine((values) => {
      const filtered = [...new Set(values)];
      return filtered.length === values.length;
    }),
});

const textSchema = basePropertiesSchema.extend({
  type: z.literal('text'),
  default: z.string().nullish(),
  minLength: minLengthSchema,
  maxLength: maxLengthSchema,
  required: requiredSchema,
  unique: uniqueSchema,
  regex: z
    .string()
    .optional()
    .refine((value) => {
      return value === '' || !!new RegExp(value as string);
    }, 'Invalid regular expression pattern'),
});

const stringSchema = textSchema.extend({
  type: z.literal('string'),
});

const passwordSchema = basePropertiesSchema.extend({
  type: z.literal('password'),
  required: requiredSchema,
  minLength: minLengthSchema,
  maxLength: maxLengthSchema,
});

const emailSchema = basePropertiesSchema.extend({
  type: z.literal('email'),
  required: requiredSchema,
  minLength: minLengthSchema,
  maxLength: maxLengthSchema,
  default: z.string().email().optional(),
  unique: uniqueSchema,
});

const integerSchema = basePropertiesSchema.extend({
  type: z.literal('integer'),
  required: requiredSchema,
  default: z.number().int().optional(),
  unique: uniqueSchema,
  min: z.number().int().optional(),
  max: z.number().int().optional(),
});

const bigIntegerSchema = basePropertiesSchema.extend({
  type: z.literal('biginteger'),
  required: requiredSchema,
  unique: uniqueSchema,
  default: z.string().regex(/^\d*$/).nullish(),
  min: z.string().regex(/^\d*$/).nullish(),
  max: z.string().regex(/^\d*$/).nullish(),
});

const floatSchema = basePropertiesSchema.extend({
  type: z.literal('float'),
  required: requiredSchema,
  unique: uniqueSchema,
  default: z.number().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
});

const decimalSchema = basePropertiesSchema.extend({
  type: z.literal('decimal'),
  required: requiredSchema,
  unique: uniqueSchema,
  default: z.number().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
});

const timeSchema = basePropertiesSchema.extend({
  type: z.literal('time'),
  required: requiredSchema,
  unique: uniqueSchema,
  default: z.string().optional(),
});

const dateSchema = timeSchema.extend({
  type: z.literal('date'),
});

const dateTimeSchema = timeSchema.extend({
  type: z.literal('datetime'),
});

const timeStampSchema = basePropertiesSchema.extend({
  type: z.literal('timestamp'),
});

const booleanSchema = basePropertiesSchema.extend({
  type: z.literal('boolean'),
  required: requiredSchema,
  default: z.boolean().optional(),
});

const componentSchema = basePropertiesSchema.extend({
  type: z.literal('component'),
  component: z.string(),
  repeatable: z.boolean().optional(),
  required: requiredSchema,
  min: z.number().optional(),
  max: z.number().optional(),
});

const dynamicZoneSchema = basePropertiesSchema.extend({
  type: z.literal('dynamiczone'),
  components: z.array(z.string()).nonempty(),
  required: requiredSchema,
  min: z.number().optional(),
  max: z.number().optional(),
});

const mediaSchema = basePropertiesSchema.extend({
  type: z.literal('media'),
  multiple: z.boolean().optional(),
  required: requiredSchema,
  allowedTypes: z
    .array(z.enum(['images', 'videos', 'files', 'audios']))
    .nonempty()
    .optional(),
});

const uidSchema = basePropertiesSchema.extend({
  type: z.literal('uid'),
  targetField: z.string().nullish(),
  required: requiredSchema,
  default: z.string().nullish(),
  minLength: minLengthSchema,
  maxLength: maxLengthSchema,
  options: z
    .object({
      separator: z.string().optional(),
      lowercase: z.boolean().optional(),
      decamelize: z.boolean().optional(),
      customReplacements: z.array(z.array(z.string()).length(2)).optional(),
      preserveLeadingUnderscore: z.boolean().optional(),
    })
    .optional(),
  regex: z
    .string()
    .optional()
    .refine((value) => {
      return value === '' || !!new RegExp(value as string);
    }, 'Invalid regular expression pattern'),
});

const customFieldSchema = basePropertiesSchema.extend({
  type: z.literal('customField'),
  customField: z.string(),
});

const attributePropertiesSchema = (meta: SchemaMeta) => {
  const relationSchema = createRelationSchema(meta);

  const base = z.union([
    mediaSchema,
    textSchema,
    stringSchema,
    richTextSchema,
    blocksSchema,
    jsonSchema,
    enumerationSchema,
    passwordSchema,
    emailSchema,
    integerSchema,
    bigIntegerSchema,
    floatSchema,
    decimalSchema,
    timeSchema,
    dateSchema,
    dateTimeSchema,
    timeStampSchema,
    booleanSchema,
    componentSchema,
    customFieldSchema.passthrough(),

    relationSchema,
  ]);

  if (meta.modelType === 'component') {
    return base
      .superRefine(enumRefinement)
      .superRefine(checkUserTarget)
      .superRefine(maxGreaterThanMin)
      .superRefine(maxLengthGreaterThanMinLength);
  }

  return z
    .union([...base.options, uidSchema, dynamicZoneSchema])
    .superRefine(enumRefinement)
    .superRefine(checkUserTarget)
    .superRefine(uidRefinement)
    .superRefine(maxGreaterThanMin)
    .superRefine(maxLengthGreaterThanMinLength);
};

const createAttributeSchema = (meta: SchemaMeta) =>
  z.object({
    action: z.literal('create'),
    name: z
      .string()
      .regex(NAME_REGEX)
      .refine((value) => !isReservedAttributeName(value), 'Attribute name is reserved'),
    properties: attributePropertiesSchema(meta),
  });

const updateAttributeSchema = (meta: SchemaMeta) =>
  z.object({
    action: z.literal('update'),
    name: z.string(),
    properties: attributePropertiesSchema(meta),
  });

const deleteAttributeSchema = z.object({
  action: z.literal('delete'),
  name: z.string(),
});

const contentTypeUIDSchema = z.custom<UID.ContentType>((value) => {
  return typeof value === 'string' && value.length > 0;
});

const componentUIDSchema = z.custom<UID.Component>((value) => {
  return typeof value === 'string' && value.length > 0;
});

const categorySchema = z.string().min(1).regex(CATEGORY_NAME_REGEX);

const baseComponentSchema = z.object({
  uid: componentUIDSchema,
  displayName: z.string().min(1),
  icon: z.string().regex(ICON_REGEX).optional(),
  description: z.string().optional(),
  category: categorySchema,
  pluginOptions: z.record(z.string(), z.unknown()).optional(),
});

const createComponentSchema = baseComponentSchema.extend({
  action: z.literal('create'),
  config: z.record(z.string(), z.unknown()).optional().default({}),
  attributes: z
    .array(
      createAttributeSchema({
        modelType: 'component',
      })
    )
    .superRefine(uniqueAttributeName),
});

const updateComponentSchema = baseComponentSchema.extend({
  action: z.literal('update'),
  category: categorySchema.optional(),
  attributes: z
    .array(
      z.discriminatedUnion('action', [
        createAttributeSchema({
          modelType: 'component',
        }),
        updateAttributeSchema({
          modelType: 'component',
        }),
        deleteAttributeSchema,
      ])
    )
    .superRefine(uniqueAttributeName),
});

const deleteComponentSchema = z.object({
  action: z.literal('delete'),
  uid: componentUIDSchema,
});

const baseContentTypeSchema = z.object({
  uid: contentTypeUIDSchema,
  displayName: z.string().min(1),
  description: z.string().optional(),
  draftAndPublish: z.boolean(),
  options: z.record(z.unknown()).optional().default({}),
  pluginOptions: z.record(z.unknown()).optional().default({}),
  kind: z.enum([typeKinds.SINGLE_TYPE, typeKinds.COLLECTION_TYPE]).optional(),
});

const baseCreateContentTypeSchema = baseContentTypeSchema.extend({
  action: z.literal('create'),
  collectionName: z.string().regex(COLLECTION_NAME_REGEX).optional(),
  singularName: z
    .string()
    .min(1)
    .regex(KEBAB_BASE_REGEX, 'Must be kebab case')
    .refine((value) => !isReservedModelName(value), 'Model name is reserved'),
  pluralName: z
    .string()
    .min(1)
    .regex(KEBAB_BASE_REGEX, 'Must be kebab case')
    .refine((value) => !isReservedModelName(value), 'Model name is reserved'),
  config: z.record(z.string(), z.unknown()).optional(),
});

const createSingleTypeSchema = baseCreateContentTypeSchema.extend({
  kind: z.literal(typeKinds.SINGLE_TYPE),
  attributes: z
    .array(
      createAttributeSchema({
        modelType: 'contentType',
        kind: 'singleType',
      })
    )
    .superRefine(uniqueAttributeName)
    .superRefine(verifyUidTargetField),
});

const createCollectionTypeSchema = baseCreateContentTypeSchema.extend({
  kind: z.literal(typeKinds.COLLECTION_TYPE),
  attributes: z
    .array(
      createAttributeSchema({
        modelType: 'contentType',
        kind: 'collectionType',
      })
    )
    .superRefine(uniqueAttributeName)
    .superRefine(verifyUidTargetField),
});

const baseUpdateContentTypeSchema = baseContentTypeSchema.extend({
  action: z.literal('update'),
});

const updateSingleTypeSchema = baseUpdateContentTypeSchema.extend({
  kind: z.literal(typeKinds.SINGLE_TYPE).optional(),
  attributes: z
    .array(
      z.discriminatedUnion('action', [
        createAttributeSchema({
          modelType: 'contentType',
          kind: 'singleType',
        }),
        updateAttributeSchema({
          modelType: 'contentType',
          kind: 'singleType',
        }),
        deleteAttributeSchema,
      ])
    )
    .superRefine(uniqueAttributeName)
    .superRefine(verifyUidTargetField),
});

const updateCollectionTypeSchema = baseUpdateContentTypeSchema.extend({
  kind: z.literal(typeKinds.COLLECTION_TYPE).optional(),
  attributes: z
    .array(
      z.union([
        createAttributeSchema({
          modelType: 'contentType',
          kind: 'collectionType',
        }),
        updateAttributeSchema({
          modelType: 'contentType',
          kind: 'collectionType',
        }),
        deleteAttributeSchema,
      ])
    )
    .superRefine(uniqueAttributeName)
    .superRefine(verifyUidTargetField),
});

const deleteContentTypeSchema = z.object({
  action: z.literal('delete'),
  uid: contentTypeUIDSchema,
});

const schemaSchema = z.object({
  components: z
    .array(z.union([createComponentSchema, updateComponentSchema, deleteComponentSchema]))
    .optional()
    .default([]),
  contentTypes: z
    .array(
      z
        .union([
          createSingleTypeSchema,
          createCollectionTypeSchema,
          updateSingleTypeSchema,
          updateCollectionTypeSchema,
          deleteContentTypeSchema,
        ])
        .superRefine(verifySingularAndPluralNames)
    )
    .optional()
    .default([]),
});

type CreateComponentType = z.infer<typeof createComponentSchema>;
type UpdateComponentType = z.infer<typeof updateComponentSchema>;
type DeleteComponentType = z.infer<typeof deleteComponentSchema>;
type CreateCollectionType = z.infer<typeof createCollectionTypeSchema>;
type CreateSingleType = z.infer<typeof createSingleTypeSchema>;
type UpdateSingleType = z.infer<typeof updateSingleTypeSchema>;
type UpdateCollectionType = z.infer<typeof updateCollectionTypeSchema>;
type DeleteContentType = z.infer<typeof deleteContentTypeSchema>;

export type Schema = {
  components: Array<CreateComponentType | UpdateComponentType | DeleteComponentType>;
  contentTypes: Array<
    | CreateSingleType
    | CreateCollectionType
    | UpdateSingleType
    | UpdateCollectionType
    | DeleteContentType
  >;
};

export const validateUpdateSchema = validateZod(
  z.object(
    {
      data: schemaSchema,
    },
    {
      invalid_type_error: 'Invalid schema, expected an object with a data property',
      required_error: 'Schema is required',
    }
  )
);
