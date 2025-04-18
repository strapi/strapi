import { Page, expect } from '@playwright/test';

/**
 * Connect a relation in a Strapi relation field and verify it was connected
 * @param page - Playwright page object
 * @param fieldName - The name of the relation field (e.g., 'oneToManyRel')
 * @param relationLabel - The label/name of the relation to connect (e.g., 'Target 1')
 */
export async function connectRelation(
  page: Page,
  fieldName: string,
  relationLabel: string
): Promise<void> {
  // Get the combobox element
  const combobox = page.getByTestId(`relation-combobox-${fieldName}`);

  // Check if the combobox is already open by looking at its data-state attribute
  const state = await combobox.getAttribute('data-state');
  if (state !== 'open') {
    await combobox.click();
  }

  // Select the option with the given label
  await page.getByTestId(`relation-option-${fieldName}-${relationLabel}`).click();

  // Verify the relation was connected
  await verifyRelation(page, fieldName, relationLabel);
}

/**
 * Disconnect a relation in a Strapi relation field and verify it was disconnected
 * @param page - Playwright page object
 * @param fieldName - The name of the relation field (e.g., 'oneToManyRel')
 * @param relationLabel - The label/name of the relation to disconnect (e.g., 'Target 1')
 */
export async function disconnectRelation(
  page: Page,
  fieldName: string,
  relationLabel: string
): Promise<void> {
  // Click the disconnect button
  await page.getByTestId(`relation-disconnect-${fieldName}-${relationLabel}`).click();

  // Verify the relation was disconnected
  await verifyRelationNotConnected(page, fieldName, relationLabel);
}

/**
 * Verify that a relation is connected to a field
 * @param page - Playwright page object
 * @param fieldName - The name of the relation field (e.g., 'oneToManyRel')
 * @param relationLabel - The label/name of the relation to verify (e.g., 'Target 1')
 */
export async function verifyRelation(
  page: Page,
  fieldName: string,
  relationLabel: string
): Promise<void> {
  await expect(page.getByTestId(`relation-item-${fieldName}-${relationLabel}`)).toBeVisible();
}

/**
 * Verify that a relation is not connected to a field
 * @param page - Playwright page object
 * @param fieldName - The name of the relation field (e.g., 'oneToManyRel')
 * @param relationLabel - The label/name of the relation to verify (e.g., 'Target 1')
 */
export async function verifyRelationNotConnected(
  page: Page,
  fieldName: string,
  relationLabel: string
): Promise<void> {
  await expect(page.getByTestId(`relation-item-${fieldName}-${relationLabel}`)).not.toBeVisible();
}

/**
 * Position types for relation reordering
 */
export type RelationPosition = 'before' | 'after';

/**
 * Reorder a relation by dragging it before or after another relation
 * @param page - Playwright page object
 * @param fieldName - The name of the relation field (e.g., 'oneToManyRel')
 * @param relationToMove - The label/name of the relation to move
 * @param targetRelation - The label/name of the target relation to move relative to
 * @param position - Where to place the relation (before or after the target)
 */
export async function reorderRelation(
  page: Page,
  fieldName: string,
  relationToMove: string,
  targetRelation: string,
  position: RelationPosition
): Promise<void> {
  // Get the source element to drag
  const dragHandle = page.getByTestId(`relation-drag-handle-${fieldName}-${relationToMove}`);
  await dragHandle.scrollIntoViewIfNeeded();

  // Get the target element
  const targetItem = page.getByTestId(`relation-item-${fieldName}-${targetRelation}`);
  await targetItem.scrollIntoViewIfNeeded();

  // Get positions
  const sourceBox = await dragHandle.boundingBox();
  const targetBox = await targetItem.boundingBox();

  if (!sourceBox || !targetBox) {
    throw new Error('Could not determine element positions for drag and drop');
  }

  // Calculate drag target position based on whether we want before or after
  const margin = 10;
  const yOffset =
    position === 'before'
      ? targetBox.y - sourceBox.y + margin // Move to top of target
      : targetBox.y + targetBox.height - sourceBox.y; // Move to bottom of target

  // Perform the drag operation
  await dragHandle.hover();
  await page.mouse.down();
  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + yOffset);
  await page.mouse.up();

  // Wait a moment for the UI to update
  await page.waitForTimeout(20);

  // No explicit verification here as the order is typically verified after saving
}

/**
 * Verify that relations are present and in the specified order
 * @param page - Playwright page object
 * @param fieldName - The name of the relation field (e.g., 'oneToManyRel')
 * @param expectedLabels - Array of relation labels in expected order
 */
export async function verifyRelationsOrder(
  page: Page,
  fieldName: string,
  expectedLabels: string[]
): Promise<void> {
  // Get all relation items for this field
  // TODO: Pagination
  const items = await page.getByTestId(new RegExp(`^relation-item-${fieldName}-`)).all();

  // Extract the item text contents
  const itemTexts = await Promise.all(items.map((item) => item.textContent()));

  // Verify the number of relations matches
  expect(
    items.length,
    `Expected ${expectedLabels.length} relations, but found ${items.length}`
  ).toBe(expectedLabels.length);

  // Verify each relation label is present in the correct order
  for (let i = 0; i < expectedLabels.length; i++) {
    const expectedLabel = expectedLabels[i];
    const actualText = itemTexts[i] || '';

    expect(
      actualText,
      `Relation at position ${i} expected to be "${expectedLabel}" but was "${actualText}"`
    ).toContain(expectedLabel);
  }
}
