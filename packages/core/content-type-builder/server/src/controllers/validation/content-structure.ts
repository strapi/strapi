import { z } from 'zod';

import { CONTENT_TYPE_UID_REGEX } from './common';

/**
 * This regex accommodates both the auto-generated IDs as well as manually-written ones.
 */
const GROUP_ID_REGEX = /^grp_[a-z0-9]{4,32}$/;

const groupIdSchema = z.string().regex(GROUP_ID_REGEX, 'Invalid group id');

const groupNameSchema = z
  .string()
  .min(1, 'Group name must not be empty')
  .refine((value) => value.trim().length > 0, 'Group name must not be empty')
  .refine(
    (value) => value === value.trim(),
    'Group name must not have leading or trailing whitespace'
  );

export const contentStructureChildSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('contentType'),
    uid: z.string().regex(CONTENT_TYPE_UID_REGEX, 'Invalid content type uid'),
  }),
  z.object({
    type: z.literal('group'),
    id: groupIdSchema,
  }),
]);

/** Zod schema for a group record */
export const contentStructureGroupSchema = z.object({
  children: z.array(contentStructureChildSchema),
  parent: groupIdSchema.nullable(),
  name: groupNameSchema,
  id: groupIdSchema,
});

const contentStructureSectionSchema = z.object({
  groups: z.array(contentStructureGroupSchema),
});

/**
 * This ensures file-wide group-id uniqueness across singleTypes and collectionTypes.
 */
const uniqueGroupIdsAcrossFile: z.SuperRefinement<{
  sections: {
    collectionTypes: { groups: { id: string }[] };
    singleTypes: { groups: { id: string }[] };
  };
}> = (file, ctx) => {
  const seen = new Set<string>();

  for (const section of [file.sections.collectionTypes, file.sections.singleTypes]) {
    for (const group of section.groups) {
      if (seen.has(group.id)) {
        ctx.addIssue({
          message: `Duplicate group id "${group.id}"`,
          code: z.ZodIssueCode.custom,
          path: ['sections'],
        });
      }

      seen.add(group.id);
    }
  }
};

/**
 * zod schema for the full ContentStructureFile payload (version + both sections +
 * file-wide unique-id superRefine). This is what ./schema.ts plugs into the envelope.
 */
export const contentStructureFileSchema = z
  .object({
    version: z.literal(1),
    sections: z.object({
      collectionTypes: contentStructureSectionSchema,
      singleTypes: contentStructureSectionSchema,
    }),
  })
  .superRefine(uniqueGroupIdsAcrossFile);

export type ContentStructureFileInput = z.infer<typeof contentStructureFileSchema>;
