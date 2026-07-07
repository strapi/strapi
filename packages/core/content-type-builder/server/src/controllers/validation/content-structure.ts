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
    uid: z.string().regex(CONTENT_TYPE_UID_REGEX, 'Invalid content type uid'),
    type: z.literal('contentType'),
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

const contentStructureFileObjectSchema = z.object({
  version: z.literal(1),
  sections: z.object({
    collectionTypes: contentStructureSectionSchema,
    singleTypes: contentStructureSectionSchema,
  }),
});

type ContentStructureFileObject = z.infer<typeof contentStructureFileObjectSchema>;
type ContentStructureGroupInput = z.infer<typeof contentStructureGroupSchema>;

const MAX_GROUP_DEPTH = 3;

/**
 * File-wide group-id uniqueness across singleTypes and collectionTypes
 */
const uniqueGroupIdsAcrossFile: z.SuperRefinement<ContentStructureFileObject> = (file, ctx) => {
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
 * File-internal graph resolution/validation.
 * This performs all context-UNAWARE validation of the structure. Context-aware validation is performed at the CTB service layer.
 */
const validateSectionGraph = (
  groups: ContentStructureGroupInput[],
  sectionKey: 'collectionTypes' | 'singleTypes',
  ctx: z.RefinementCtx
) => {
  const path: (string | number)[] = ['sections', sectionKey, 'groups'];
  const byId = new Map(groups.map((group) => [group.id, group]));

  const report = (message: string) => {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });
  };

  // Sibling group names must be unique within the same parent (case-insensitive).
  const siblingNames = new Map<string | null, Set<string>>();

  for (const group of groups) {
    const name = group.name.trim().toLowerCase();
    const seen = siblingNames.get(group.parent) ?? new Set<string>();

    if (seen.has(name)) {
      const where = group.parent ? `group "${group.parent}"` : 'the section root';
      report(
        `Sibling groups under ${where} in section "${sectionKey}" share the name "${group.name.trim()}"`
      );
    }

    seen.add(name);
    siblingNames.set(group.parent, seen);
  }

  // Parent references a group in the SAME section.
  // No cycles
  // Depth <= 3
  for (const group of groups) {
    if (group.parent !== null && !byId.has(group.parent)) {
      report(
        `Group "${group.id}" references parent "${group.parent}" which is not a group in section "${sectionKey}"`
      );
      continue;
    }

    const chain = new Set<string>([group.id]);

    let current: ContentStructureGroupInput | undefined = group;
    let depth = 1;
    let broken = false;

    while (current && current.parent !== null) {
      if (chain.has(current.parent)) {
        report(`Group "${group.id}" is part of a parent cycle`);
        broken = true;
        break;
      }

      const parent = byId.get(current.parent);

      if (!parent) {
        broken = true;
        break;
      }

      chain.add(current.parent);
      current = parent;
      depth += 1;
    }

    if (!broken && depth > MAX_GROUP_DEPTH) {
      report(
        `Group "${group.id}" exceeds the maximum nesting depth of ${MAX_GROUP_DEPTH} in section "${sectionKey}"`
      );
    }
  }

  // Group children reference an existing group in the same section whose parent points back at the containing group.
  // Also, each content type appears in at most ONE group.
  const groupChildCount = new Map<string, number>();
  const seenUids = new Set<string>();

  for (const group of groups) {
    for (const child of group.children) {
      if (child.type === 'group') {
        const target = byId.get(child.id);

        if (!target) {
          report(
            `Group "${group.id}" has a group child "${child.id}" that does not exist in section "${sectionKey}"`
          );
          continue;
        }

        if (target.parent !== group.id) {
          report(
            `Group child "${child.id}" of "${group.id}" does not list "${group.id}" as its parent`
          );
        }

        groupChildCount.set(child.id, (groupChildCount.get(child.id) ?? 0) + 1);
        continue;
      }

      if (seenUids.has(child.uid)) {
        report(
          `Content type "${child.uid}" appears in more than one group in section "${sectionKey}"`
        );
      } else {
        seenUids.add(child.uid);
      }
    }
  }

  // Every non-root group should appear exactly once as a group child.
  for (const group of groups) {
    const count = groupChildCount.get(group.id) ?? 0;

    if (group.parent === null) {
      if (count > 0) {
        report(
          `Root group "${group.id}" is listed as a group child of another group in section "${sectionKey}"`
        );
      }
      continue;
    }

    if (count === 0) {
      report(`Group "${group.id}" is not listed in the children of its parent "${group.parent}"`);
    } else if (count > 1) {
      report(
        `Group "${group.id}" is listed ${count} times as a group child in section "${sectionKey}"`
      );
    }
  }
};

const validateGraphRules: z.SuperRefinement<ContentStructureFileObject> = (file, ctx) => {
  validateSectionGraph(file.sections.collectionTypes.groups, 'collectionTypes', ctx);
  validateSectionGraph(file.sections.singleTypes.groups, 'singleTypes', ctx);
};

export const contentStructureFileSchema = contentStructureFileObjectSchema
  .superRefine(uniqueGroupIdsAcrossFile)
  .superRefine(validateGraphRules);

export type ContentStructureFileInput = z.infer<typeof contentStructureFileSchema>;
