import { kebabCase } from 'lodash/fp';
import { waitForRestart } from './restart';
import pluralize from 'pluralize';
import { expect, type Page } from '@playwright/test';
import { clickAndWait, findByRowColumn } from './shared';

// TODO: share this with CTB in general
export interface AddAttribute {
  type: string;
  name: string;
  options?: any; // TODO: this doesn't have anything in it yet
  number?: { format: numberFormat };
  date?: { format: dateFormat };
  media?: { multiple: boolean };
  enumeration?: { values: string[] };
}

// Enumeration needs "values"

type numberFormat = 'integer' | 'big integer' | 'decimal';
type dateFormat = 'date' | 'time' | 'datetime';

export interface CreateComponentOptionsBase {
  name?: string;
  icon?: string;
  attributes?: AddAttribute[];
}

export interface CategoryCreateOption {
  categoryCreate: string;
  categorySelect?: never;
}

export interface CategorySelectOption {
  categorySelect: string;
  categoryCreate?: never;
}

type CreateComponentOptions = CreateComponentOptionsBase &
  (CategoryCreateOption | CategorySelectOption);

type RequiredCreateComponentOptions = Required<CreateComponentOptionsBase> &
  (CategoryCreateOption | CategorySelectOption);

export interface CreateContentTypeOptions {
  name: string;
  singularId?: string;
  pluralId?: string;
  attributes: AddAttribute[];
}

const typeMap = {
  text: { buttonName: 'Text', listLabel: 'Text' },
  boolean: { buttonName: 'Boolean', listLabel: 'Boolean' },
  blocks: { buttonName: 'Rich text (blocks)', listLabel: 'Rich text (blocks)' },
  json: { buttonName: 'JSON', listLabel: 'JSON' },
  number: { buttonName: 'Number', listLabel: 'Number' },
  email: { buttonName: 'Email', listLabel: 'Email' },
  date: { buttonName: 'Date', listLabel: 'Date' },
  time: { buttonName: 'Date', listLabel: 'Time' },
  datetime: { buttonName: 'Date', listLabel: 'Datetime' },
  password: { buttonName: 'Password', listLabel: 'Password' },
  media: { buttonName: 'Media', listLabel: 'Media' },
  enumeration: { buttonName: 'Enumeration', listLabel: 'Enumeration' },
  relation: { buttonName: 'Relation', listLabel: 'Relation' },
  markdown: { buttonName: 'Rich text (Markdown)', listLabel: 'Rich text (Markdown)' },
  component: { buttonName: 'Component', listLabel: 'Component' },
};

// Select a component icon
export const selectComponentIcon = async (page: Page, icon: string) => {
  // Test the search and avoiding needing to scroll to the icon
  const searchButton = page.getByRole('button', { name: 'Search icon button' });
  await clickAndWait(page, searchButton);
  const searchInput = page.getByPlaceholder('Search for an icon');
  await searchInput.fill(icon);

  // click the icon
  const iconResult = page.locator(`label:has(input[type="radio"][value="${icon}"])`);
  await clickAndWait(page, iconResult);

  // verify the correct icon was selected
  const isChecked = await iconResult.isChecked();
  expect(isChecked).toBe(true);
};

// open the component builder
const openComponentBuilder = async (page: Page) => {
  await clickAndWait(page, page.getByRole('link', { name: 'Content-Type Builder' }));
  await clickAndWait(page, page.getByRole('button', { name: 'Create new component' }));
};

export const fillComponent = async (page: Page, options: CreateComponentOptions) => {
  if (options.name) {
    await page.getByLabel('Display name').fill(options.name);
  }

  if (options.icon) {
    await selectComponentIcon(page, options.icon);
  }

  if (options.categoryCreate) {
    await page
      .getByLabel(/Select a category or enter a name to create a new one/i)
      .fill(options.categoryCreate);
  }

  if (options.categorySelect) {
    const displayName = kebabCase(options.categorySelect);
    await clickAndWait(
      page,
      page.getByLabel(/Select a category or enter a name to create a new one/i)
    );
    await page.getByLabel(displayName).scrollIntoViewIfNeeded();
    await clickAndWait(page, page.getByLabel(displayName));
  }
};

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const fillAttribute = async (page: Page, attribute: AddAttribute) => {
  // find the tabpanel with attributes by looking for text we know it contains
  const tabPanel = page.getByRole('tabpanel');

  // Target a button within tabPanel that contains a span with the exact text of attribute.type
  await clickAndWait(
    page,
    tabPanel.locator(`button:has(span)`, {
      hasText: new RegExp(`^${escapeRegExp(typeMap[attribute.type].buttonName)}`, 'i'),
    })
  );

  // Fill the input with the exact label "Name"
  await page.getByLabel('Name', { exact: true }).fill(attribute.name);

  // TODO: add a tool for handling Strapi pseudo-select lists so we don't have to handle it custom (and error-prone) each time like number and date

  if (attribute.number?.format) {
    const format = attribute.number.format;

    const list = page.getByText('Choose here', { exact: true }).first();
    // open the list
    await clickAndWait(page, list);
    // click the targeted element
    await clickAndWait(page, page.getByText(new RegExp('^' + format, 'i')).first());
  }

  if (attribute.date?.format) {
    const format = attribute.date.format;

    // open the list
    const list = page.getByText('Choose here', { exact: true }).first();
    await clickAndWait(page, list);
    // select the item
    await clickAndWait(page, page.getByText(new RegExp('^' + format, 'i')).first());
  }

  if (attribute.media?.multiple !== undefined) {
    // TODO: there has to be a better way; if not, improve the html so we can target better
    const multipleValue = attribute.media.multiple ? 'true' : 'false';
    await clickAndWait(page, page.locator(`label[for="${multipleValue}"]`));
  }

  if (attribute.enumeration?.values) {
    await page.locator('textarea[name="enum"]').fill(attribute.enumeration?.values.join('\n'));
  }

  // TODO: add support for advanced options
};

export const addAttributes = async (page: Page, attributes: AddAttribute[]) => {
  for (let i = 0; i < attributes.length; i++) {
    const attribute = attributes[i];
    await fillAttribute(page, attribute);

    if (i < attributes.length - 1) {
      // Not the last attribute, click 'Add Another Field'
      await clickAndWait(page, page.getByRole('button', { name: 'Add Another Field' }));
    } else {
      // Last attribute, click 'Finish'
      await clickAndWait(page, page.getByRole('button', { name: 'Finish' }));
    }
  }
};

// attempt to submit a component but don't check for errors so that they can be checked by the caller
export const submitComponent = async (page: Page, options: CreateComponentOptions) => {
  await openComponentBuilder(page);

  await fillComponent(page, options);

  await clickAndWait(page, page.getByRole('button', { name: 'Continue' }));

  if (options.attributes) {
    await addAttributes(page, options.attributes);
  }

  // Save the component
  await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
};

const saveAndVerifyContent = async (
  page: Page,
  options: { name: string; attributes: AddAttribute[] }
) => {
  await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
  await waitForRestart(page);

  // This must be case insensitive to cover up a minor display bug in the Strapi Admin where headers are always capitalized
  const header = page.getByRole('heading', {
    name: new RegExp(`^${options.name}$`, 'i'),
  });
  await expect(header).toBeVisible();

  for (let i = 0; i < options.attributes.length; i++) {
    const attribute = options.attributes[i];
    const typeCell = await findByRowColumn(page, attribute.name, 'Type');

    if (!typeMap[attribute.type].buttonName) {
      throw new Error('unknown type ' + attribute.type);
    }
    await expect(typeCell).toContainText(typeMap[attribute.type].listLabel, { ignoreCase: true });
  }
};

// Refactored method for creating a component
export const createComponent = async (page: Page, options: RequiredCreateComponentOptions) => {
  await openComponentBuilder(page);
  await fillComponent(page, options);

  await clickAndWait(page, page.getByRole('button', { name: 'Continue' }));
  await addAttributes(page, options.attributes);

  await saveAndVerifyContent(page, options);
};

// Helper function for creating content types
const createContentType = async (
  page: Page,
  options: CreateContentTypeOptions,
  type: 'single' | 'collection'
) => {
  const { name, singularId, pluralId } = options;

  const buttonName = type === 'single' ? 'Create new single type' : 'Create new collection type';
  const headingName = type === 'single' ? 'Create a single type' : 'Create a collection type';

  await page.getByRole('button', { name: buttonName }).click();
  await expect(page.getByRole('heading', { name: headingName })).toBeVisible();

  const displayName = page.getByLabel('Display name');
  await displayName.fill(name);

  const singularIdField = page.getByLabel('API ID (Singular)');
  await expect(singularIdField).toHaveValue(singularId || kebabCase(name));
  if (singularId) {
    singularIdField.fill(singularId);
  }

  const pluralIdField = page.getByLabel('API ID (Plural)');
  await expect(pluralIdField).toHaveValue(pluralId || pluralize(kebabCase(name)));
  if (pluralId) {
    pluralIdField.fill(pluralId);
  }

  await page.getByRole('button', { name: 'Continue' }).click();
  await addAttributes(page, options.attributes);

  await saveAndVerifyContent(page, options);
};

// Refactored method for creating a single type
export const createSingleType = async (page: Page, options: CreateContentTypeOptions) => {
  await createContentType(page, options, 'single');
};

// Refactored method for creating a collection type
export const createCollectionType = async (page: Page, options: CreateContentTypeOptions) => {
  await createContentType(page, options, 'collection');
};
