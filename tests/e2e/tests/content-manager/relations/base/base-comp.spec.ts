import { test } from '@playwright/test';
import { login } from '../../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../../utils/dts-import';
import {
  connectRelation,
  reorderRelation,
  verifyRelationsOrder,
  disconnectRelation,
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
  dynamicZoneComponentName?: string;
  dynamicZoneComponentOneWayRel?: string;
  dynamicZoneComponentTwoWayRel?: string[];
}) => {
  const {
    name,
    oneToOneRel,
    oneToManyRel,
    manyToOneRel,
    manyToManyRel,
    oneWayRel,
    selfRel,
    dynamicZoneComponentName,
    dynamicZoneComponentOneWayRel,
    dynamicZoneComponentTwoWayRel,
  } = rawFields;

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

  // Handle dynamic zone with relations
  if (dynamicZoneComponentName) {
    // Create component fields array
    const componentFields: FieldValue[] = [];

    // Add component name field
    componentFields.push({
      name: 'componentName',
      type: 'text',
      value: dynamicZoneComponentName,
    });

    // Add one-way relation field (if provided)
    if (dynamicZoneComponentOneWayRel) {
      componentFields.push({
        name: 'dynamicZone.0.componentOneWayRel',
        type: 'relation',
        value: [{ label: dynamicZoneComponentOneWayRel }],
      });
    }

    // Add two-way relation field (if provided)
    if (dynamicZoneComponentTwoWayRel && dynamicZoneComponentTwoWayRel.length > 0) {
      componentFields.push({
        name: 'dynamicZone.0.componentTwoWayRel',
        type: 'relation',
        value: dynamicZoneComponentTwoWayRel.map((label) => ({ label })),
      });
    }

    // Add the dynamic zone field with the component
    fields.push({
      name: 'dynamicZone',
      type: 'dz',
      value: [
        {
          category: 'component',
          name: 'Relation Component',
          fields: componentFields,
        },
      ],
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

// COMPONENTS
test.describe('Relations - EditView', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page });
  });

  test('Create a RelationSource entry with a dynamic zone containing a component with oneWay and twoWay relations', async ({
    page,
  }) => {
    const fields = createRelationSourceFields({
      name: 'Test Dynamic Zone Relations',
      oneToManyRel: ['Target 1'],
      dynamicZoneComponentName: 'dynamicZoneComponent',
      dynamicZoneComponentOneWayRel: 'Target 1',
      dynamicZoneComponentTwoWayRel: ['Target 2', 'Target 3'],
    });
    // TODO: Add verification for dynamic zone component relations
    await createContent(page, 'Relation Source', fields, { save: true, verify: false });
  });
});
