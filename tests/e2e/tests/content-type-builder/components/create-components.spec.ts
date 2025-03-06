import { test } from '@playwright/test';
import { resetFiles } from '../../../utils/file-reset';
import { sharedSetup } from '../../../utils/setup';
import { createComponent, type AddAttribute } from '../../../utils/content-types';

test.describe('Create a new component', () => {
  // very long timeout for these tests because they restart the server multiple times
  test.describe.configure({ timeout: 300000 });

  test.beforeEach(async ({ page }) => {
    await sharedSetup('create-component', page, {
      resetFiles: true,
      importData: 'with-admin.tar',
      login: true,
      skipTour: true,
      afterSetup: async () => {},
    });
  });

  test.afterAll(async () => {
    await resetFiles();
  });

  test('Can create a component with a new category', async ({ page }) => {
    const options = {
      name: 'TestNewComponent',
      categoryCreate: 'BlogPosts',
      icon: 'paint',
      attributes: [
        {
          type: 'text',
          name: 'sometextfield',
        },
      ],
    };

    await createComponent(page, options);
  });

  const advancedRequired = { required: true };
  const advancedRegex = { required: true, regexp: '^(?!.*fail).*' };

  test('Can create a component with every attribute type permutation (except relations)', async ({
    page,
  }) => {
    const attributes = [
      const attributes: AddAttribute[] = [
        { type: 'text', name: 'testtext', advanced: advancedRegex },
        { type: 'boolean', name: 'testboolean', advanced: advancedRequired },
        { type: 'blocks', name: 'testblocks', advanced: advancedRequired },
        { type: 'json', name: 'testjson', advanced: advancedRequired },
        {
          type: 'number',
          name: 'testinteger',
          number: { format: 'integer' },
          advanced: advancedRequired,
        },
        {
          type: 'number',
          name: 'testbiginteger',
          number: { format: 'big integer' },
          advanced: advancedRequired,
        },
        {
          type: 'number',
          name: 'testdecimal',
          number: { format: 'decimal' },
          advanced: advancedRequired,
        },
        { type: 'email', name: 'testemail', advanced: advancedRequired },
        {
          type: 'date',
          name: 'testdateonlydate',
          date: { format: 'date' },
          advanced: advancedRequired,
        },
        { type: 'date', name: 'testdatetime', date: { format: 'time' }, advanced: advancedRequired },
        {
          type: 'date',
          name: 'testdatedatetime',
          date: { format: 'datetime' },
          advanced: advancedRequired,
        },
        { type: 'password', name: 'testpassword', advanced: advancedRequired },
        {
          type: 'media',
          name: 'testmediasingle',
          media: { multiple: false },
          advanced: advancedRequired,
        },
        {
          type: 'media',
          name: 'testmediamultiple',
          media: { multiple: true },
          advanced: advancedRequired,
        },
        {
          type: 'relation',
          name: 'testonewayrelation',
          relation: {
            type: 'oneWay',
            target: { select: 'Article', name: 'testonewayrelationtarget' },
          },
          advanced: advancedRequired,
        },
        {
          type: 'relation',
          name: 'testonetoonerelation',
          relation: {
            type: 'oneToOne',
            target: { select: 'Article', name: 'testonetoonerelationtarget' },
          },
          advanced: advancedRequired,
        },
        {
          type: 'relation',
          name: 'testonetomanyrelation',
          relation: {
            type: 'oneToMany',
            target: { select: 'Article', name: 'testonetomanyrelationtarget' },
          },
          advanced: advancedRequired,
        },
        {
          type: 'relation',
          name: 'testmanytoonerelation',
          relation: {
            type: 'manyToOne',
            target: { select: 'Article', name: 'testmanytoonerelationtarget' },
          },
          advanced: advancedRequired,
        },
        {
          type: 'relation',
          name: 'testmanytomanyrelation',
          relation: {
            type: 'manyToMany',
            target: { select: 'Article', name: 'testmanytomanyrelationtarget' },
          },
          advanced: advancedRequired,
        },
        {
          type: 'relation',
          name: 'testmanywayrelation',
          relation: {
            type: 'manyWay',
            target: { select: 'Article', name: 'testmanywayrelationtarget' },
          },
          advanced: advancedRequired,
        },
        {
          type: 'enumeration',
          name: 'testenumeration',
          enumeration: { values: ['first', 'second', 'third'] },
          advanced: advancedRequired,
        },
        { type: 'markdown', name: 'testmarkdown', advanced: advancedRequired },
      // new single component with new category
      {
        type: 'component',
        name: 'testnewcomponentnewcategory',
        component: {
          options: {
            repeatable: false,
            name: 'testnewcomponent2',
            icon: 'alien',
            categoryCreate: 'testcategory',
            attributes: [{ type: 'text', name: 'testnewcompotext' }],
          },
        },
      },
      // new repeatable component with existing category
      {
        type: 'component',
        name: 'testnewcomponentexistingcategory',
        component: {
          options: {
            repeatable: true,
            name: 'testnewcomponent3',
            icon: 'moon',
            categorySelect: 'testcategory',
            attributes: [{ type: 'text', name: 'testexistingcompotext' }],
          },
        },
      },
      // existing component with existing category
      {
        type: 'component',
        name: 'testexistingcomponentexistingcategory',
        component: {
          useExisting: 'testnewcomponentnewcategory',
          options: {
            repeatable: false,
            name: 'testexistingcomponentexistingcategory',
            icon: 'globe',
            categorySelect: 'testcategory',
          },
        },
      },
      // TODO: test relations
      // { type: 'relation', name: 'testrelation' },
    ] satisfies AddAttribute[];

    const options = {
      name: 'ArticlesComponent',
      categorySelect: 'product', // use a category we know exists in the test data
      icon: 'paint',
      attributes,
    };

    await createComponent(page, options);
  });
});
