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

  // Get the source and target items (not just the handle)
  const sourceItem = page.getByTestId(`relation-item-${fieldName}-${relationToMove}`);
  const targetItem = page.getByTestId(`relation-item-${fieldName}-${targetRelation}`);
  await targetItem.scrollIntoViewIfNeeded();

  // Get positions
  const sourceBox = await sourceItem.boundingBox();
  const targetBox = await targetItem.boundingBox();
  const handleBox = await dragHandle.boundingBox();

  if (!sourceBox || !targetBox || !handleBox) {
    throw new Error('Could not determine element positions for drag and drop');
  }

  // Calculate start position (center of drag handle)
  const startX = handleBox.x + handleBox.width / 2;
  const startY = handleBox.y + handleBox.height / 2;

  // Calculate target position
  const targetY =
    position === 'before'
      ? targetBox.y + 5 // 5px into the target item from the top
      : targetBox.y + targetBox.height - 5; // 5px from the bottom of target item

  // Perform the drag operation with proper timing
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.waitForTimeout(100); // Short pause after mouse down

  // Move in small steps for more reliable dragging
  const steps = 10;
  const diffY = targetY - startY;

  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(startX, startY + (diffY * i) / steps);
    await page.waitForTimeout(20);
  }

  await page.waitForTimeout(10); // Short pause before releasing
  await page.mouse.up();

  // Wait for any animations or state updates to complete
  await page.waitForTimeout(300);
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
