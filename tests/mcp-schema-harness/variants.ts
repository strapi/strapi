/**
 * The schema variants under test.
 *
 * `current` is generated from the **real** `buildDataSchema`, so it always reflects whatever
 * the branch does today — the whole point of keeping the harness in-tree. The other two are
 * frozen historical baselines, kept so a run can be compared against the numbers recorded in
 * earlier rounds rather than only against itself.
 *
 * History (see README):
 * - `flat`     — the schema before the component union landed: components are plain objects
 *                with no `id`, so an agent literally cannot express "patch this row". This is
 *                the shape that produced silent delete-and-recreate.
 * - `proposed` — the hand-rolled `anyOf` (patch-on-id vs create) written to answer review
 *                comment #1. Its shape has since been adopted by the real builder, so on an
 *                unmodified branch `current` and `proposed` should agree closely; they diverge
 *                only in hint wording and `id` coercion.
 */
import { z } from '@strapi/utils';

import { buildDataSchema } from '../../packages/core/content-manager/server/src/mcp/schemas/data-schema';
import { ATTRIBUTES, MODEL, installGlobalStrapi, mockStrapi } from './fixtures/content-type';

export type VariantKey = 'current' | 'flat' | 'proposed';

export type JsonSchema = Record<string, unknown>;

/** Variant A in the original write-up: pre-union shape, no `id` anywhere. Frozen baseline. */
const FLAT: JsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  description: 'Document field values to write.',
  type: 'object',
  properties: {
    title: {
      description:
        'Marked required in the content-type schema — the server enforces it when the entry is saved.',
      type: 'string',
    },
    seo: {
      type: 'object',
      properties: {
        metaTitle: {
          description:
            'Marked required in the content-type schema — the server enforces it when the entry is saved.',
          type: 'string',
          maxLength: 60,
        },
        metaDescription: {
          description:
            'Marked required in the content-type schema — the server enforces it when the entry is saved.',
          type: 'string',
        },
        keywords: { type: 'string' },
      },
      additionalProperties: false,
    },
    links: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          label: {
            description:
              'Marked required in the content-type schema — the server enforces it when the entry is saved.',
            type: 'string',
          },
          url: {
            description:
              'Marked required in the content-type schema — the server enforces it when the entry is saved.',
            type: 'string',
          },
        },
        additionalProperties: false,
      },
    },
  },
  additionalProperties: false,
};

const COMPONENT_UNION_HINT =
  'Include "id" to patch an existing component in place (other fields optional). ' +
  'Omit "id" to replace it — the replacement is validated as a create, so all required ' +
  'fields must be supplied.';

/** Variant B in the original write-up: the review proposal, before it was upstreamed. */
const PROPOSED: JsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  description: 'Document field values to write.',
  type: 'object',
  properties: {
    title: { description: 'Marked required in the content-type schema.', type: 'string' },
    seo: {
      description: `SEO component. ${COMPONENT_UNION_HINT}`,
      anyOf: [
        {
          type: 'object',
          properties: {
            id: {
              description: 'ID of the existing component row to update in place.',
              type: 'number',
            },
            metaTitle: { type: 'string', maxLength: 60 },
            metaDescription: { type: 'string' },
            keywords: { type: 'string' },
          },
          required: ['id'],
          additionalProperties: false,
        },
        {
          type: 'object',
          properties: {
            metaTitle: { type: 'string', maxLength: 60 },
            metaDescription: { type: 'string' },
            keywords: { type: 'string' },
          },
          required: ['metaTitle', 'metaDescription'],
          additionalProperties: false,
        },
      ],
    },
    links: {
      description: 'Repeatable link components.',
      type: 'array',
      items: {
        description: `Link component. ${COMPONENT_UNION_HINT}`,
        anyOf: [
          {
            type: 'object',
            properties: {
              id: {
                description: 'ID of the existing component row to update in place.',
                type: 'number',
              },
              label: { type: 'string' },
              url: { type: 'string' },
            },
            required: ['id'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: { label: { type: 'string' }, url: { type: 'string' } },
            required: ['label', 'url'],
            additionalProperties: false,
          },
        ],
      },
    },
  },
  additionalProperties: false,
};

/**
 * Emits the branch's current `update` schema by calling the real builder. Any change to
 * `data-schema.ts` shows up here on the next run with no edit to this file.
 */
export function buildCurrentVariant(): JsonSchema {
  installGlobalStrapi();
  const schema = buildDataSchema(mockStrapi, MODEL, ATTRIBUTES, null, { operation: 'update' });
  return z.toJSONSchema(schema, { io: 'input' }) as JsonSchema;
}

export function buildVariants(): Record<VariantKey, JsonSchema> {
  return { current: buildCurrentVariant(), flat: FLAT, proposed: PROPOSED };
}

export const FROZEN_VARIANTS: Record<'flat' | 'proposed', JsonSchema> = {
  flat: FLAT,
  proposed: PROPOSED,
};
