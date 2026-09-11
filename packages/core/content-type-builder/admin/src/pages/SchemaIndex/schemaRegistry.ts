import type { ComponentType } from 'react';

import type { Component, ContentType } from '../../types';
import type { MessageDescriptor } from 'react-intl';

/**
 * Extension points for the schema index.
 *
 * A content type's configuration is spread across the plugins that care about
 * it — i18n owns `localized`, workspaces owns `visibleIn` and the sharing
 * flags — so the index cannot know its own columns. Each plugin contributes the
 * column that shows its option and, where it helps, the filter that narrows by
 * it.
 *
 * Registration happens during plugin `register`/`bootstrap`, before the first
 * render, so the list is stable and the rules of hooks hold — the same contract
 * as the builder's read-only and availability rules.
 */

export type Schema = ContentType | Component;

export interface SchemaColumnProps {
  schema: Schema;
}

export interface SchemaColumn {
  id: string;
  header: MessageDescriptor;
  Cell: ComponentType<SchemaColumnProps>;
  /**
   * Which kinds the column means anything for. Components have no entries, so
   * options about entries do not apply to them — hence the default.
   */
  appliesTo?: Array<'contentType' | 'component'>;
}

export interface SchemaFilterOption {
  value: string;
  label: string;
}

export interface SchemaFilter {
  id: string;
  label: MessageDescriptor;
  /**
   * A hook, because the options are often live data — the list of workspaces,
   * the list of locales. Called in registration order, once per render.
   */
  useOptions: () => SchemaFilterOption[];
  /** Whether a schema survives this filter at the chosen value. */
  matches: (schema: Schema, value: string) => boolean;
}

const columns: SchemaColumn[] = [];
const filters: SchemaFilter[] = [];

const upsert = <T extends { id: string }>(list: T[], entry: T): void => {
  const index = list.findIndex((item) => item.id === entry.id);
  if (index === -1) {
    list.push(entry);
  } else {
    list[index] = entry;
  }
};

export const registerSchemaColumn = (column: SchemaColumn): void => upsert(columns, column);
export const registerSchemaFilter = (filter: SchemaFilter): void => upsert(filters, filter);

export const getSchemaColumns = (kind: 'contentType' | 'component'): readonly SchemaColumn[] =>
  columns.filter((column) => (column.appliesTo ?? ['contentType']).includes(kind));

export const getSchemaFilters = (): readonly SchemaFilter[] => filters;

/** Test seam: the registries are module state and outlive a test file otherwise. */
export const clearSchemaRegistry = (): void => {
  columns.length = 0;
  filters.length = 0;
};
