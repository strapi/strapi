import { test } from '@playwright/test';
import { login } from '../../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../../utils/dts-import';
import {
  connectRelation,
  reorderRelation,
  verifyRelationsOrder,
  disconnectRelation,
} from '../../../../utils/relation-utils';
import {
  createContentSingleTypes,
  FieldValue,
  saveContent,
} from '../../../../utils/content-creation';

const createHomepageFields = (rawFields: {
  name?: string;
  adminUserRel?: string;
  authorsRel?: string[];
}) => {
  const { name, adminUserRel, authorsRel } = rawFields;

  // Return FieldValue[]
  const fields: FieldValue[] = [];

  if (name) {
    fields.push({ name: 'name', type: 'text', value: name } satisfies FieldValue);
  }

  if (adminUserRel) {
    fields.push({
      name: 'admin_user',
      type: 'relation',
      value: [{ label: adminUserRel }],
    } satisfies FieldValue);
  }

  if (authorsRel) {
    fields.push({
      name: 'authors',
      type: 'relation',
      value: authorsRel.map((label) => ({ label })),
    } satisfies FieldValue);
  }

  return fields;
};

/**
 * Base Relations Tests for Collection Types / Single Types / Components
 *
 * This file tests core relation functionality without Draft & Publish or i18n features.
 * It focuses on the following operations:
 * - Adding relations (single and multiple)
 * - Removing relations
 * - Reordering relations (for *-to-many relations)
 * - CRUD operations for relations
 */

//SINGLE TYPES
test.describe('Relations Single Types - EditView', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('single-type-data.tar');
    await page.goto('/admin');
    await login({ page });
  });

  test('Create a Homepage entry with a one-to-one relation', async ({ page }) => {
    const fields = createHomepageFields({ adminUserRel: 'editor' });
    await createContentSingleTypes(page, 'Homepage', 'Welcome to Rufus homepage', fields, {
      save: true,
      verify: true,
    });
  });

  test('Create a Homepage entry with a one-to-many relation', async ({ page }) => {
    const fields = createHomepageFields({ authorsRel: ['Coach Beard', 'Ted Lasso'] });
    await createContentSingleTypes(page, 'Homepage', 'Welcome to Rufus homepage', fields, {
      save: true,
      verify: true,
    });
  });

  test('Update an existing oneToOne relation', async ({ page }) => {
    // Prefill entry with one relation
    const fields = createHomepageFields({ adminUserRel: 'editor' });
    await createContentSingleTypes(page, 'Homepage', 'Welcome to Rufus homepage', fields, {
      save: true,
      verify: true,
    });

    // Add a new relation to the existing oneToOne relation
    await connectRelation(page, 'admin_user', 'test');

    // Save content in the single type
    await saveContent(page);

    // Validate the new relation is there
    await verifyRelationsOrder(page, 'admin_user', ['test']);
  });

  test('Update an existing oneToMany relation', async ({ page }) => {
    // Prefill entry with one relation
    const fields = createHomepageFields({ authorsRel: ['Coach Beard', 'Ted Lasso'] });
    await createContentSingleTypes(page, 'Homepage', 'Welcome to Rufus homepage', fields, {
      save: true,
      verify: true,
    });

    // Add a new relation to the existing oneToMany relation
    await connectRelation(page, 'authors', 'Led Tasso');

    // Save content in the single type
    await saveContent(page);

    // Validate the new relation is there
    await verifyRelationsOrder(page, 'authors', ['Coach Beard', 'Ted Lasso', 'Led Tasso']);
  });

  test('Delete a one to one relation', async ({ page }) => {
    // Prefill entry with one relation
    const fields = createHomepageFields({ adminUserRel: 'editor' });
    await createContentSingleTypes(page, 'Homepage', 'Welcome to Rufus homepage', fields, {
      save: true,
      verify: true,
    });

    // Remove a one-to-one relation entry
    await disconnectRelation(page, 'admin_user', 'editor');

    // Save content
    await saveContent(page);

    // Validate there's no relation left
    await verifyRelationsOrder(page, 'admin_user', []);
  });

  test('Delete a one to many relation', async ({ page }) => {
    // Prefill entry with one relation
    const fields = createHomepageFields({ authorsRel: ['Coach Beard', 'Ted Lasso'] });
    await createContentSingleTypes(page, 'Homepage', 'Welcome to Rufus homepage', fields, {
      save: true,
      verify: true,
    });

    // Remove a one-to-many relation entry
    await disconnectRelation(page, 'authors', 'Coach Beard');

    // Save content
    await saveContent(page);

    // Validate there's no relation left
    await verifyRelationsOrder(page, 'authors', ['Ted Lasso']);
  });

  test('Create multiple relations and reorder them using drag and drop', async ({ page }) => {
    // Create content with multiple relations in specific order
    const fields = createHomepageFields({ authorsRel: ['Coach Beard', 'Ted Lasso', 'Led Tasso'] });
    await createContentSingleTypes(page, 'Homepage', 'Welcome to Rufus homepage', fields, {
      save: true,
      verify: true,
    });

    // Move Led Tasso to first position
    await reorderRelation(page, 'authors', 'Led Tasso', 'Coach Beard', 'after');

    // Verify new order before save
    await verifyRelationsOrder(page, 'authors', ['Coach Beard', 'Led Tasso', 'Ted Lasso']);

    // Save changes
    await saveContent(page);

    // Verify order is maintained after saving
    await verifyRelationsOrder(page, 'authors', ['Coach Beard', 'Led Tasso', 'Ted Lasso']);
  });

  test('Update a relation and reorder it in the same operation', async ({ page }) => {
    // Prefill entry with one relation
    const fields = createHomepageFields({ authorsRel: ['Coach Beard', 'Ted Lasso'] });
    await createContentSingleTypes(page, 'Homepage', 'Welcome to Rufus homepage', fields, {
      save: true,
      verify: true,
    });

    // Add a new relation to the existing oneToMany relation (authors)
    await connectRelation(page, 'authors', 'Led Tasso');

    // Verify new order is correct
    await verifyRelationsOrder(page, 'authors', ['Coach Beard', 'Ted Lasso', 'Led Tasso']);

    // Move Led Tasso to first position
    await reorderRelation(page, 'authors', 'Led Tasso', 'Coach Beard', 'after');

    // Verify new order before save
    await verifyRelationsOrder(page, 'authors', ['Coach Beard', 'Led Tasso', 'Ted Lasso']);

    // Save changes
    await saveContent(page);

    // Verify order is maintained after saving
    await verifyRelationsOrder(page, 'authors', ['Coach Beard', 'Led Tasso', 'Ted Lasso']);
  });

  test('Delete a relation and reorder the remaining relations', async ({ page }) => {
    // Prefill entry with one relation
    const fields = createHomepageFields({ authorsRel: ['Coach Beard', 'Ted Lasso'] });
    await createContentSingleTypes(page, 'Homepage', 'Welcome to Rufus homepage', fields, {
      save: true,
      verify: true,
    });

    // Add a new relation to the existing oneToMany relation (authors)
    await connectRelation(page, 'authors', 'Led Tasso');

    // Verify new order is correct
    await verifyRelationsOrder(page, 'authors', ['Coach Beard', 'Ted Lasso', 'Led Tasso']);

    // Remove one relation
    await disconnectRelation(page, 'authors', 'Ted Lasso');

    // Save content
    await saveContent(page);

    // Validate new order after saving
    await verifyRelationsOrder(page, 'authors', ['Coach Beard', 'Led Tasso']);
  });
});
