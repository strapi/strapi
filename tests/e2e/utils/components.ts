import { expect, type Page } from '@playwright/test';
import { clickAndWait, findByRowColumn } from './shared';
import { waitForRestart } from './restart';
import { kebabCase } from 'lodash/fp';

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

const typeInputMap = {
  text: 'Text',
  boolean: 'Boolean',
  blocks: 'Rich text (blocks)',
  json: 'JSON',
  number: 'Number',
  email: 'Email',
  date: 'Date',
  time: 'Date',
  datetime: 'Date',
  password: 'Password',
  media: 'Media',
  enumeration: 'Enumeration',
  relation: 'Relation',
  markdown: 'Rich text (Markdown)',
  component: 'Component',
};

const typeLabelMap = {
  text: 'Text',
  boolean: 'Boolean',
  blocks: 'Rich text (blocks)',
  json: 'JSON',
  number: 'Number',
  email: 'Email',
  date: 'Date',
  time: 'Time',
  datetime: 'Datetime',
  password: 'Password',
  media: 'Media',
  enumeration: 'Enumeration',
  relation: 'Relation',
  markdown: 'Rich text (Markdown)',
  component: 'Component',
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
      hasText: new RegExp(`^${escapeRegExp(typeInputMap[attribute.type])}`, 'i'),
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

export const createComponent = async (page: Page, options: RequiredCreateComponentOptions) => {
  await openComponentBuilder(page);
  await fillComponent(page, options);

  await clickAndWait(page, page.getByRole('button', { name: 'Continue' }));

  await addAttributes(page, options.attributes);

  // Save the component
  await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
  await waitForRestart(page);

  const header = page.getByRole('heading', { name: options.name, exact: true });

  // expect each attribute.name to be in a row that also contains attribute.type
  for (let i = 0; i < options.attributes.length; i++) {
    const attribute = options.attributes[i];

    const typeCell = await findByRowColumn(page, attribute.name, 'Type');
    if (!typeInputMap[attribute.type]) {
      throw new Error('unknown type ' + attribute.type);
    }
    await expect(typeCell).toContainText(typeLabelMap[attribute.type], { ignoreCase: true });
  }
};
