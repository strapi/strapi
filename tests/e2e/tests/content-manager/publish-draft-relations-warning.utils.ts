import type { Page } from '@playwright/test';

import {
  clickAndWait,
  findAndClose,
  navToHeader,
  withContentManagerPublish,
} from '../../../utils/shared';

export type RelationLabField =
  | 'manyToOne'
  | 'oneToOne'
  | 'oneToMany'
  | 'manyToMany'
  | 'manyToManyBi';

export type RelationDialogVariant = 'm2m' | 'xToOne';

export const RELATION_LAB_FIELDS: Array<{
  field: RelationLabField;
  dialogVariant: RelationDialogVariant;
}> = [
  { field: 'manyToOne', dialogVariant: 'xToOne' },
  { field: 'oneToOne', dialogVariant: 'xToOne' },
  { field: 'oneToMany', dialogVariant: 'xToOne' },
  { field: 'manyToMany', dialogVariant: 'xToOne' },
  { field: 'manyToManyBi', dialogVariant: 'm2m' },
];

export const relationTargetOptionLabel = (name: string, published: boolean) =>
  `${name}${published ? 'Published' : 'Draft'}`;

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
  field: RelationLabField,
  targetName: string,
  published: boolean
) => {
  await page.getByRole('combobox', { name: field, exact: true }).click();
  await clickAndWait(page, page.getByLabel(relationTargetOptionLabel(targetName, published)));
};

export const saveRelationLabDraft = async (page: Page, title: string) => {
  await page.getByRole('textbox', { name: 'title' }).fill(title);
  await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
  await findAndClose(page, 'Saved Document');
};
