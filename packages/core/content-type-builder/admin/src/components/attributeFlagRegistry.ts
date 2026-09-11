import type { ComponentType } from 'react';

import type { MessageDescriptor } from 'react-intl';

/**
 * What a field's row says about it, beyond its name and type.
 *
 * The four options a reader most often wants — required, unique, private,
 * translated — live in the field's settings modal, so knowing them has meant
 * opening every field in turn. They read on the row now.
 *
 * Three of them are the builder's own. `localized` is not: it belongs to i18n,
 * which owns `pluginOptions.i18n.localized` and the form field that sets it.
 * So the list is a registry, like the schema index's columns — the builder
 * shows what it owns, and each plugin contributes the option it owns.
 */

/** Whatever the builder holds for a field — each flag reads the keys it owns. */
export type AttributeLike = Record<string, unknown>;

export interface AttributeFlag {
  id: string;
  /** The tooltip: what the option means, in a sentence. */
  label: MessageDescriptor;
  /** The pill: short enough to read at a glance down a list of fields. */
  short: MessageDescriptor;
  /**
   * Shown in place of the words. For a flag whose name is long and whose
   * symbol is well known, a row of them reads faster as symbols — the tooltip
   * and the screen-reader label still say it in full.
   */
  Icon?: ComponentType<{ 'aria-hidden'?: boolean }>;
  /**
   * The colour family the flag is written in: its `600` for the text, its
   * `100` for the ground behind it.
   */
  tone: 'danger' | 'primary' | 'neutral' | 'secondary' | 'success' | 'warning' | 'alternative';
  /** Whether this attribute has the option on. */
  applies: (attribute: AttributeLike) => boolean;
}

const CORE_FLAGS: AttributeFlag[] = [
  {
    id: 'required',
    label: {
      id: 'content-type-builder.attribute.flag.required.hint',
      defaultMessage: 'This field must be filled in',
    },
    short: { id: 'content-type-builder.attribute.flag.required', defaultMessage: 'Required' },
    tone: 'danger',
    applies: (attribute) => attribute.required === true,
  },
  {
    id: 'unique',
    label: {
      id: 'content-type-builder.attribute.flag.unique.hint',
      defaultMessage: 'No two entries may share a value',
    },
    short: { id: 'content-type-builder.attribute.flag.unique', defaultMessage: 'Unique' },
    tone: 'primary',
    applies: (attribute) => attribute.unique === true,
  },
  {
    id: 'private',
    label: {
      id: 'content-type-builder.attribute.flag.private.hint',
      defaultMessage: 'Hidden from the public API',
    },
    short: { id: 'content-type-builder.attribute.flag.private', defaultMessage: 'Private' },
    tone: 'neutral',
    applies: (attribute) => attribute.private === true,
  },
];

let flags: AttributeFlag[] = [...CORE_FLAGS];

export const registerAttributeFlag = (flag: AttributeFlag): void => {
  const index = flags.findIndex((entry) => entry.id === flag.id);

  if (index === -1) {
    flags.push(flag);
  } else {
    flags[index] = flag;
  }
};

export const getAttributeFlags = (): readonly AttributeFlag[] => flags;

/** Test seam: the registry is module state and outlives a test file otherwise. */
export const resetAttributeFlags = (): void => {
  flags = [...CORE_FLAGS];
};
