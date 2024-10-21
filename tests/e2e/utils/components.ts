import { expect, type Page } from '@playwright/test';
import { clickAndWait, findByRowColumn } from './shared';
import { waitForRestart } from './restart';
import { kebabCase } from 'lodash/fp';

const typeMap = {
  text: 'Small or long text',
};

// TODO: share this with CTB in general
interface AddAttribute {
  type: string;
  name: string;
  options?: any;
}

interface CreateComponentOptionsBase {
  name?: string;
  icon?: string;
  attributes?: AddAttribute[];
}

interface CategoryCreateOption {
  categoryCreate: string;
  categorySelect?: never;
}

interface CategorySelectOption {
  categorySelect: string;
  categoryCreate?: never;
}

type CreateComponentOptions = CreateComponentOptionsBase &
  (CategoryCreateOption | CategorySelectOption);

type RequiredCreateComponentOptions = Required<CreateComponentOptionsBase> &
  (CategoryCreateOption | CategorySelectOption);

// Select a component icon
export const selectComponentIcon = async (page: Page, icon: string) => {
  const iconLoc = page.locator(`label:has(input[type="radio"][value="${icon}"])`);
  await iconLoc.scrollIntoViewIfNeeded();
  await iconLoc.click({ force: true });

  // Optionally, verify if the input is checked
  const isChecked = await iconLoc.isChecked();
  expect(isChecked).toBe(true);
};

// open the component builder
const openComponentBuilder = async (page: Page) => {
  await page.getByRole('link', { name: 'Content-Type Builder' }).click();
  await page.getByRole('button', { name: 'Create new component' }).click();
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

export const fillAttribute = async (page: Page, attribute: AddAttribute) => {
  await clickAndWait(page, page.getByText(typeMap[attribute.type]));
  await page.getByLabel('Name', { exact: true }).fill(attribute.name);
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
    await expect(typeCell).toContainText(attribute.type, { ignoreCase: true });
  }
};
