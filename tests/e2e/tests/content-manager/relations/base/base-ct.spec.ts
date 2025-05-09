import { test } from '@playwright/test';
import { login } from '../../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../../utils/dts-import';
import {
  connectRelation,
  reorderRelation,
  verifyRelationsOrder,
  verifyRelation,
  disconnectRelation,
  verifyRelationNotConnected,
} from '../../../../utils/relation-utils';
import { createContent, FieldValue, saveContent } from '../../../../utils/content-creation';

const createRelationSourceFields = (rawFields: {
  name?: string;
  oneToOneRel?: string;
  oneToManyRel?: string[];
  manyToOneRel?: string;
  manyToManyRel?: string[];
  oneWayRel?: string;
  selfRel?: string[];
}) => {
  const { name, oneToOneRel, oneToManyRel, manyToOneRel, manyToManyRel, oneWayRel, selfRel } =
    rawFields;

  // Return FieldValue[]
  const fields: FieldValue[] = [];

  if (name) {
    fields.push({ name: 'name', type: 'text', value: name } satisfies FieldValue);
  }

  if (oneToOneRel) {
    fields.push({
      name: 'oneToOneRel',
      type: 'relation',
      value: [{ label: oneToOneRel }],
    } satisfies FieldValue);
  }

  if (oneToManyRel) {
    fields.push({
      name: 'oneToManyRel',
      type: 'relation',
      value: oneToManyRel.map((label) => ({ label })),
    } satisfies FieldValue);
  }

  if (manyToOneRel) {
    fields.push({
      name: 'manyToOneRel',
      type: 'relation',
      value: [{ label: manyToOneRel }],
    } satisfies FieldValue);
  }

  if (manyToManyRel) {
    fields.push({
      name: 'manyToManyRel',
      type: 'relation',
      value: manyToManyRel.map((label) => ({ label })),
    } satisfies FieldValue);
  }

  if (oneWayRel) {
    fields.push({
      name: 'oneWayRel',
      type: 'relation',
      value: [{ label: oneWayRel }],
    } satisfies FieldValue);
  }

  if (selfRel) {
    fields.push({
      name: 'selfRel',
      type: 'relation',
      value: selfRel.map((label) => ({ label })),
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

//COLLECTION TYPES
test.describe('Relations - EditView', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page });
  });

  test('Create a RelationSource entry with a one-to-many relation', async ({ page }) => {
    const fields = createRelationSourceFields({ oneToManyRel: ['Target 1'] });
    await createContent(page, 'Relation Source', fields, { save: true, verify: true });
  });

  test('Update an existing relation', async ({ page }) => {
    // Prefill entry with two relations
    const fields = createRelationSourceFields({ oneToManyRel: ['Target 1', 'Target 2'] });
    await createContent(page, 'Relation Source', fields, { save: true, verify: true });

    // Add a new relation
    await connectRelation(page, 'oneToManyRel', 'Target 3');

    // Save content
    await saveContent(page);

    // Check all the relations are there
    for (const target of ['Target 1', 'Target 2', 'Target 3']) {
      await verifyRelation(page, 'oneToManyRel', target);
    }

    // Validate the three relations are there
    await verifyRelationsOrder(page, 'oneToManyRel', ['Target 1', 'Target 2', 'Target 3']);
  });

  test('Delete a relation', async ({ page }) => {
    // Prefill entry with two relations
    const fields = createRelationSourceFields({ oneToManyRel: ['Target 1', 'Target 2'] });
    await createContent(page, 'Relation Source', fields, { save: true, verify: true });

    // Remove one relation
    await disconnectRelation(page, 'oneToManyRel', 'Target 1');

    // Save content
    await saveContent(page);

    // Check the relation is gone
    await verifyRelationNotConnected(page, 'oneToManyRel', 'Target 1');

    // Validate only one relation is left
    await verifyRelationsOrder(page, 'oneToManyRel', ['Target 2']);
  });

  test('Create multiple relations and reorder them using drag and drop', async ({ page }) => {
    // Create content with multiple relations in specific order
    const fields = createRelationSourceFields({
      oneToManyRel: ['Target 1', 'Target 2', 'Target 3'],
    });

    await createContent(page, 'Relation Source', fields, { save: true, verify: true });

    // Move Target 3 after Target 1
    await reorderRelation(page, 'oneToManyRel', 'Target 3', 'Target 1', 'after');

    // Verify new order before save
    await verifyRelationsOrder(page, 'oneToManyRel', ['Target 1', 'Target 3', 'Target 2']);

    // Save changes
    await saveContent(page);

    // Verify order is maintained after saving
    await verifyRelationsOrder(page, 'oneToManyRel', ['Target 1', 'Target 3', 'Target 2']);
  });

  test('Update a relation and reorder it in the same operation', async ({ page }) => {
    const fields = createRelationSourceFields({ oneToManyRel: ['Target 1', 'Target 2'] });
    await createContent(page, 'Relation Source', fields, { save: true, verify: true });
    // Add a new relation
    await connectRelation(page, 'oneToManyRel', 'Target 3');

    // Validate the three relations are there
    await verifyRelationsOrder(page, 'oneToManyRel', ['Target 1', 'Target 2', 'Target 3']);

    // Move Target 3 after Target 1
    await reorderRelation(page, 'oneToManyRel', 'Target 3', 'Target 1', 'after');
    // Verify new order before save
    await verifyRelationsOrder(page, 'oneToManyRel', ['Target 1', 'Target 3', 'Target 2']);

    // Save changes
    await saveContent(page);

    // Check all the relations are there
    for (const target of ['Target 1', 'Target 2', 'Target 3']) {
      await verifyRelation(page, 'oneToManyRel', target);
    }

    // Verify order is maintained after saving
    await verifyRelationsOrder(page, 'oneToManyRel', ['Target 1', 'Target 3', 'Target 2']);
  });

  test('Delete a relation and reorder the remaining relations', async ({ page }) => {
    // Prefill entry with two relations
    const fields = createRelationSourceFields({ oneToManyRel: ['Target 1', 'Target 2'] });
    await createContent(page, 'Relation Source', fields, { save: true, verify: true });

    // Remove one relation
    await disconnectRelation(page, 'oneToManyRel', 'Target 1');

    // Save content
    await saveContent(page);

    // Check the relation is gone
    await verifyRelationNotConnected(page, 'oneToManyRel', 'Target 1');

    // Validate only one relation is left
    await verifyRelationsOrder(page, 'oneToManyRel', ['Target 2']);
  });
});
