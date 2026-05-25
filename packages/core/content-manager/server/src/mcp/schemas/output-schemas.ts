import { z } from '@strapi/utils';
import type { Struct } from '@strapi/types';

const buildOutputDataSchema = (
  attributes: Struct.SchemaAttributes,
  permittedFields: Set<string> | null
): z.ZodTypeAny => {
  const readableKeys = Object.keys(attributes).filter(
    (key) => permittedFields === null || permittedFields.has(key)
  );

  if (readableKeys.length === 0) {
    return z.record(z.string(), z.unknown());
  }

  const shape = Object.fromEntries(readableKeys.map((key) => [key, z.unknown().optional()]));

  return z.object(shape).loose();
};

export const buildDocumentOutputSchema = (
  attributes: Struct.SchemaAttributes,
  readFields: Set<string> | null
): z.ZodObject<z.ZodRawShape> =>
  z
    .object({
      data: buildOutputDataSchema(attributes, readFields).nullable(),
      meta: z
        .object({
          availableLocales: z.array(z.record(z.string(), z.unknown())).optional(),
          availableStatus: z.array(z.record(z.string(), z.unknown())).optional(),
        })
        .optional(),
    })
    .loose();

export const buildListOutputSchema = (
  attributes: Struct.SchemaAttributes,
  readFields: Set<string> | null
): z.ZodObject<z.ZodRawShape> =>
  z
    .object({
      results: z.array(buildOutputDataSchema(attributes, readFields)),
      pagination: z.object({
        page: z.number(),
        pageSize: z.number(),
        pageCount: z.number(),
        total: z.number(),
      }),
    })
    .loose();

export const buildDeleteOutputSchema = (
  attributes: Struct.SchemaAttributes,
  readFields: Set<string> | null
): z.ZodObject<z.ZodRawShape> =>
  z
    .object({
      data: buildOutputDataSchema(attributes, readFields).nullable(),
    })
    .loose();
