---
title: Testing Relations
tags:
  - testing
  - e2e
  - playwright
  - relations
  - content-manager
---

## Overview

This document explains Strapi's approach to testing relation fields in e2e tests.

## Test Organization

Four test suites cover different feature combinations:

1. **Base Relations** (`relations/base.spec.ts`) - Core functionality
2. **Draft & Publish Relations** (`relations/draft-publish.spec.ts`)
3. **Internationalization Relations** (`relations/i18n.spec.ts`)
4. **Full Feature Relations** (`relations/full.spec.ts`) - Combined features

## Content Types Used

Two content types are used:

- **RelationSource** - With D&P, i18n, all relation types
- **RelationTarget** - Basic content type for relation targets

## Key Test Scenarios

- **Connection** - Adding single/multiple relations
- **Disconnection** - Removing relations
- **Reordering** - Testing drag and drop functionality
- **CRUD** - Persistence, in-place creation/editing
- **Feature-specific** - D&P and i18n interactions with relations

## Using data-testid for Testing Relations

The following data-testid are used, so you can use `page.getByTestId` to select each elements.

### Element Selection Patterns

```
relation-field-${fieldName}           // Field container
relation-combobox-${fieldName}        // Search input
relation-option-${fieldName}-${label} // Dropdown options
relation-list-${fieldName}            // Connected relations list
relation-item-${fieldName}-${label}   // Individual relation item
relation-drag-handle-${fieldName}-${label} // Reordering handle
relation-disconnect-${fieldName}-${label}  // Remove button
```

### Example Playwright Usage

```typescript
// Select combobox and option
await page.getByTestId('relation-combobox-categories').click();
await page.getByTestId('relation-option-categories-Technology').click();

// Verify and disconnect
await expect(page.getByTestId('relation-item-categories-Technology')).toBeVisible();
await page.getByTestId('relation-disconnect-categories-Technology').click();

// Reorder with drag and drop
const dragHandle = page.getByTestId('relation-drag-handle-categories-Sports');
await dragHandle.hover();
await page.mouse.down();
await page.mouse.move(0, 100);
await page.mouse.up();
```

## Relation Testing Utilities

Some utilities are provided in `tests/e2e/utils/relation-utils.ts`:

### Available Functions

- `connectRelation(page, fieldName, relationLabel)` - Connect a relation to a field
- `disconnectRelation(page, fieldName, relationLabel)` - Disconnect a relation
- `verifyRelation(page, fieldName, relationLabel)` - Verify a relation is connected
- `verifyRelationNotConnected(page, fieldName, relationLabel)` - Verify a relation is not connected
- `reorderRelation(page, fieldName, relationToMove, targetRelation, position)` - Reorder relations using drag and drop
- `verifyRelationsOrder(page, fieldName, expectedLabels)` - Verify relations are in the expected order

### Usage Example

```typescript
import {
  connectRelation,
  verifyRelation,
  reorderRelation,
  verifyRelationsOrder,
} from '../../../utils/relation-utils';

// Connect a relation
await connectRelation(page, 'oneToManyRel', 'Target 1');

// Verify multiple relations in order
await verifyRelationsOrder(page, 'oneToManyRel', ['Target 1', 'Target 2', 'Target 3']);

// Reorder: move Target 3 after Target 1
await reorderRelation(page, 'oneToManyRel', 'Target 3', 'Target 1', 'after');
```

### Validation Notes

Always verify relations after:

1. **After UI interaction** - Confirm the UI shows expected changes
2. **After saving** - Relations must be verified after saving as well, as the backend response may differ from what's displayed in the UI before saving.

Example:

```typescript
// Make relation changes
await connectRelation(page, 'oneToManyRel', 'New Target');

// Save content
await saveContent(page);

// Verify relations after save
await verifyRelationsOrder(page, 'oneToManyRel', ['Target 1', 'New Target']);
```
