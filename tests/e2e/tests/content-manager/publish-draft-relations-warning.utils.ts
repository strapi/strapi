import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import {
  clickAndWait,
  findAndClose,
  navToHeader,
  withContentManagerPublish,
} from '../../../utils/shared';

export type RelationLabField = 'manyToOne' | 'oneToOne' | 'oneToMany' | 'manyToManyBi';

export type RelationDialogVariant = 'm2m' | 'xToOne';

/** xToOne-style fields in relation-lab (unidirectional — stripped on publish). */
export const XTOONE_LAB_FIELDS: RelationLabField[] = ['manyToOne', 'oneToOne', 'oneToMany'];

/** Bidirectional M2M in relation-lab — the relation type this PR fixes. */
export const BIDIRECTIONAL_M2M_LAB_FIELD: RelationLabField = 'manyToManyBi';

/**
 * Select a relation in an open CM combobox.
 *
 * Each option is a label span plus a DocumentStatus badge (`role="status"`,
 * `aria-label="draft"|"published"`). Do not use `getByRole('option', { name })` — the
 * accessible name does not match a simple `${label}Draft` string even when textContent does.
 */
export const selectRelationComboboxOption = async (
  page: Page,
  label: string,
  status: 'draft' | 'published'
) => {
  const option = page
    .getByRole('option')
    .filter({ has: page.getByText(label, { exact: true }) })
    .filter({ has: page.getByRole('status', { name: status }) });

  await expect(option).toHaveCount(1);
  await clickAndWait(page, option);
};

export const createRelationTarget = async (
  page: Page,
  name: string,
  { publish }: { publish: boolean }
) => {
  await navToHeader(page, ['Content Manager', 'Relation target'], 'Relation target');
  await clickAndWait(page, page.getByRole('link', { name: 'Create new entry' }).last());
  await page.getByRole('textbox', { name: 'name' }).fill(name);
  await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
  await findAndClose(page, 'Saved Document');

  if (publish) {
    await withContentManagerPublish(page, () =>
      page.getByRole('button', { name: 'Publish', exact: true }).click()
    );
    await findAndClose(page, 'Published Document');
  }
};

export const openNewRelationLab = async (page: Page) => {
  await navToHeader(page, ['Content Manager', 'Relation lab'], 'Relation lab');
  await clickAndWait(page, page.getByRole('link', { name: 'Create new entry' }).last());
};

export const connectRelationTarget = async (
  page: Page,
  field: RelationLabField | 'manyToMany',
  targetName: string,
  status: 'draft' | 'published'
) => {
  await page.getByRole('combobox', { name: field, exact: true }).click();
  await selectRelationComboboxOption(page, targetName, status);
};

export const saveRelationLabDraft = async (page: Page, title: string) => {
  await page.getByRole('textbox', { name: 'title' }).fill(title);
  await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
  await findAndClose(page, 'Saved Document');
};
