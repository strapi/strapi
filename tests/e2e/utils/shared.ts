import { test, expect, type Page, type Locator } from '@playwright/test';

type NavItem = string | [string, string] | Locator;

/**
 * Execute a test suite only if the condition is true
 */
export const describeOnCondition = (shouldDescribe: boolean) =>
  shouldDescribe ? test.describe : test.describe.skip;

/**
 * Find an element in the dom after the previous element
 * Useful for narrowing down which link to click when there are multiple with the same name
 */
// TODO: instead of siblingText + linkText, accept an array of any number items
export const locateFirstAfter = async (page: Page, firstText: string, secondText: string) => {
  // It first searches for text containing "firstText" then uses xpath `following` to find "secondText" after it.
  // `translate` is used to make the search case-insensitive
  const item = page
    .locator(
      `xpath=//text()[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "${firstText.toLowerCase()}")]/following::a[starts-with(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "${secondText.toLowerCase()}")]`
    )
    .first();

  return item;
};

interface LocatorCriteria {
  type: string; // The HTML tag type (e.g., "div", "button", "a")
  text: string; // The text content to locate
}

export const locateSequence = async (page: Page, sequence: LocatorCriteria[]) => {
  if (sequence.length < 2) {
    throw new Error('Sequence must contain at least two elements.');
  }

  let xpathExpression = '';

  // Build the XPath for the sequence
  for (let i = 0; i < sequence.length; i++) {
    const { type, text } = sequence[i];

    const tagCondition = type ? `self::${type}` : 'self::*';
    const textCondition = `contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "${text.toLowerCase()}")`;

    if (i === 0) {
      // The first element in the sequence
      xpathExpression += `//${type || '*'}[${textCondition}]`;
    } else {
      // Subsequent elements in the sequence
      xpathExpression += `/following::*[${tagCondition} and ${textCondition}]`;
    }
  }

  // Create the locator
  const locator = page.locator(`xpath=${xpathExpression}`).first();
  return locator;
};

/**
 * Navigate to a page and confirm the header, awaiting each step
 */
export const navToHeader = async (page: Page, navItems: NavItem[], headerText: string) => {
  for (const navItem of navItems) {
    // This handles some common issues
    // 1. Uses name^= to only ensure starts with, because for example badge notifications cause "Settings" to really be "Settings 1"
    // 2. To avoid duplicates, we accept a locator
    // 3. To avoid duplicates and writing complex locators, we accept an array to pass to locateFirstAfter, which matches item0 then finds the next item1 in the dom
    let item;
    if (typeof navItem === 'string') {
      item = page.locator(`role=link[name^="${navItem}"]`).last();
    } else if (Array.isArray(navItem)) {
      item = await locateFirstAfter(page, navItem[0], navItem[1]);
    } else {
      // it's a Locator
      item = navItem;
    }

    await expect(item).toBeVisible();
    await item.click();
  }

  // Verify header is correct
  const header = page.getByRole('heading', { name: headerText, exact: true });
  await expect(header).toBeVisible();
  return header;
};

/**
 * Skip the tour if the modal is visible
 */
export const skipCtbTour = async (page: Page) => {
  try {
    const modal = await page.getByRole('button', { name: 'Skip the tour' });

    if (await modal.isVisible()) {
      await modal.click();
      await expect(modal).not.toBeVisible();
    }
  } catch (e) {
    // The modal did not appear, continue with the test
  }
};

/**
 * Clicks on a link and waits for the page to load completely.
 *
 * NOTE: this util is used to avoid inconsistent behaviour on webkit
 *
 */
export const clickAndWait = async (page: Page, locator: Locator) => {
  await locator.click();
  await page.waitForLoadState('networkidle');
};

/**
 * Look for an element containing text, and then click a sibling close button
 */

interface FindAndCloseOptions {
  role?: string;
  closeLabel?: string;
  required?: boolean;
}

export const findAndClose = async (page: Page, text: string, options: FindAndCloseOptions = {}) => {
  const { role = 'status', closeLabel = 'Close', required = true } = options;

  // Verify the popup text is visible.
  const elements = page.locator(`:has-text("${text}")[role="${role}"]`);

  if (required) {
    await expect(elements.first()).toBeVisible(); // expect at least one element
  }

  // Find all 'Close' buttons that are siblings of the elements containing the specified text.
  const closeBtns = page.locator(
    `:has-text("${text}")[role="${role}"] ~ button:has-text("${closeLabel}")`
  );

  // Click all 'Close' buttons.
  const count = await closeBtns.count();
  for (let i = 0; i < count; i++) {
    await closeBtns.nth(i).click();
  }
};

/**
 * Finds a specific cell in a table by matching both the row text and the column header text.
 *
 * This function performs the following steps:
 * 1. Finds a row in the table that contains the specified `rowText` (case-insensitive).
 * 2. Finds the column header in the table that contains the specified `columnText` (case-insensitive).
 * 3. Identifies the cell in the located row that corresponds to the column where the header matches the `columnText`.
 * 4. Returns the found cell for further interactions or assertions.
 *
 * @param {Page} page - The Playwright `Page` object representing the browser page.
 * @param {string} rowText - The text to match in the row (case-insensitive).
 * @param {string} columnText - The text to match in the column header (case-insensitive).
 *
 * @returns {Locator} - A Playwright Locator object representing the intersecting cell.
 *
 * @throws Will throw an error if the row or column header is not found, or if the cell is not visible.
 *
 * @warning This function assumes a standard table structure where each row has an equal number of cells,
 *          and no cells are merged (`colspan` or `rowspan`). If the table contains merged cells,
 *          this method may return incorrect results or fail to locate the correct cell.
 *          Matches the header exactly (cell contains only exact text)
 *          Matches the row loosely (finds a row containing that text somewhere)
 */
export const findByRowColumn = async (page: Page, rowText: string, columnText: string) => {
  // Locate the row that contains the rowText
  // This just looks for the text in a row, so ensure that it is specific enough
  const row = page.locator('tr').filter({ hasText: new RegExp(`${rowText}`) });
  await expect(row).toBeVisible();

  // Locate the column header that matches the columnText
  // This assumes that header is exact (cell only contains that text and nothing else)
  const header = page.locator('thead th').filter({ hasText: new RegExp(`^${columnText}$`, 'i') });
  await expect(header).toBeVisible();

  // Find the index of the matching column header
  const columnIndex = await header.evaluate((el) => Array.from(el.parentNode.children).indexOf(el));

  // Find the cell in the located row that corresponds to the matching column index
  const cell = row.locator(`td:nth-child(${columnIndex + 1})`);
  await expect(cell).toBeVisible();

  // Return the found cell
  return cell;
};

/**
 * WebKit-specific implementation of ensureElementsInViewport.
 * Ensures that two elements are fully visible in the viewport by calculating their bounding boxes
 * and adjusting the viewport if necessary.
 *
 * @param {object} page - The Playwright page instance.
 * @param {object} source - Locator for the source element.
 * @param {object} target - Locator for the target element.
 */
export const ensureElementsInViewportWebkit = async (page, source, target) => {
  const currentViewport = await page.viewportSize();
  console.log('Current viewport size:', currentViewport);

  let combinedBox = { top: Infinity, bottom: -Infinity, left: Infinity, right: -Infinity };

  // Helper function to fetch the absolute bounding box
  const calculateBoundingBox = async (element) => {
    return await element.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollLeft = window.scrollX || document.documentElement.scrollLeft;

      return {
        top: rect.top + scrollTop,
        bottom: rect.bottom + scrollTop,
        left: rect.left + scrollLeft,
        right: rect.right + scrollLeft,
        width: rect.width,
        height: rect.height,
      };
    });
  };

  // Calculate the combined bounding box for both elements
  const elements = [source, target];
  for (const [index, element] of elements.entries()) {
    console.log(`Processing element ${index + 1}/${elements.length}`);
    const box = await calculateBoundingBox(element);

    if (!box) {
      console.error(`Bounding box for element ${index + 1} could not be determined.`);
      continue;
    }

    console.log(`Absolute bounding box for element ${index + 1}:`, box);

    combinedBox = {
      top: Math.min(combinedBox.top, box.top),
      bottom: Math.max(combinedBox.bottom, box.bottom),
      left: Math.min(combinedBox.left, box.left),
      right: Math.max(combinedBox.right, box.right),
    };
    console.log(`Updated combined bounding box after element ${index + 1}:`, combinedBox);
  }

  // Calculate the required scroll position
  const scrollToY = Math.max(
    0,
    combinedBox.top - (currentViewport.height - (combinedBox.bottom - combinedBox.top)) / 2
  );
  const scrollToX = Math.max(0, combinedBox.left);
  console.log('Scrolling to position:', { top: scrollToY, left: scrollToX });

  // Scroll the viewport
  await page.evaluate(
    ({ top, left }) => {
      console.log('Before scroll:', { scrollX: window.scrollX, scrollY: window.scrollY });
      window.scrollTo(left, top);
      console.log('After scroll:', { scrollX: window.scrollX, scrollY: window.scrollY });
    },
    { top: scrollToY, left: scrollToX }
  );

  // Validate visibility of each element
  for (const [index, element] of elements.entries()) {
    console.log(`Validating visibility of element ${index + 1}`);
    const rect = await element.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const isVisible =
        rect.top >= 0 &&
        rect.bottom <= window.innerHeight &&
        rect.left >= 0 &&
        rect.right <= window.innerWidth;

      console.log('Element rect:', rect, 'Is visible:', isVisible);
      return isVisible;
    });

    if (!rect) {
      console.warn(`Element ${index + 1} is NOT fully visible.`);
    } else {
      console.log(`Element ${index + 1} is fully visible.`);
    }
  }

  console.log('ensureElementsInViewportWebkit completed.');
};

/**
 * Ensures that the given elements are fully visible within the viewport.
 * Resizes the viewport and scrolls if required.
 *
 * @param {object} page - The Playwright page instance.
 * @param {object} source - Locator for the source element.
 * @param {object} target - Locator for the target element.
 */
export const ensureElementsInViewport = async (page, source, target) => {
  // Detect the browser type
  const browserType = page.context().browser()?.browserType().name();

  // Short-circuit to WebKit-specific implementation
  if (browserType === 'webkit') {
    return ensureElementsInViewportWebkit(page, source, target);
  }

  const currentViewport = await page.viewportSize();

  // Helper to check if an element is fully visible in the viewport
  const isElementFullyVisible = async (element) => {
    const box = await element.boundingBox();
    if (!box) return false;

    const viewport = await page.viewportSize();
    return box.y >= 0 && box.y + box.height <= viewport.height;
  };

  // Check if source and target are fully visible
  const sourceVisible = await isElementFullyVisible(source);
  const targetVisible = await isElementFullyVisible(target);

  if (!sourceVisible || !targetVisible) {
    const sourceBox = await source.boundingBox();
    const targetBox = await target.boundingBox();

    if (sourceBox && targetBox) {
      // Determine the bounding box that contains both elements
      const topElementY = Math.min(sourceBox.y, targetBox.y);
      const bottomElementY = Math.max(
        sourceBox.y + sourceBox.height,
        targetBox.y + targetBox.height
      );

      const requiredHeight = bottomElementY - topElementY;

      // Resize viewport if necessary
      if (requiredHeight > currentViewport.height) {
        await page.setViewportSize({
          width: currentViewport.width,
          height: requiredHeight,
        });
      }

      // Scroll to the top element
      await page.evaluate((y) => {
        window.scrollTo(0, y);
      }, topElementY);
    } else {
      throw new Error('Bounding boxes for source or target could not be determined.');
    }
  }
};

/**
 * Smoothly drags a draggable element within a source <li> to just above a target <li>.
 * Automatically detects WebKit and uses a WebKit-specific implementation if needed.
 *
 * @param {object} page - The Playwright page instance.
 * @param {object} options - Options for the drag operation.
 * @param {object} options.source - Locator for the source <li> (containing the draggable element).
 * @param {object} options.target - Locator for the target <li> (drop destination).
 * @param {number} [options.steps=5] - Number of steps for smooth movement.
 * @param {number} [options.delay=10] - Delay in milliseconds between steps.
 */
export const dragElementAbove = async (page, options) => {
  // Extract options
  const { source, target, steps = 5, delay = 20 } = options;

  // Ensure both elements are fully visible in the viewport
  await ensureElementsInViewport(page, source, target);

  // Locate the draggable button within the source <li>
  const draggable = source.locator('[draggable="true"]');

  // Get bounding boxes of the draggable button and target <li>
  const sourceBox = await draggable.boundingBox();
  const targetBox = await target.boundingBox();

  if (sourceBox && targetBox) {
    // Calculate start and end positions
    const startX = sourceBox.x + sourceBox.width / 2;
    const startY = sourceBox.y + sourceBox.height / 2;
    const endX = targetBox.x + targetBox.width / 2;
    const endY = targetBox.y - 1; // 1 pixel above the target

    // Move to the starting position and press the mouse
    await page.mouse.move(startX, startY);
    await page.mouse.down();

    // Incrementally move the mouse for smooth dragging
    for (let i = 1; i <= steps; i++) {
      const intermediateX = startX + (endX - startX) * (i / steps);
      const intermediateY = startY + (endY - startY) * (i / steps);
      await page.mouse.move(intermediateX, intermediateY);
      await page.waitForTimeout(delay);
    }

    // Release the mouse to drop the element
    await page.mouse.up();
  } else {
    throw new Error('Bounding boxes for source or target could not be determined.');
  }
};

/**
 * Returns true if the first element appears before the second element in the DOM.
 *
 * @param {object} firstLocator - Playwright locator for the first element.
 * @param {object} secondLocator - Playwright locator for the second element.
 * @returns {Promise<boolean>} - Returns true if the first element is before the second element.
 */
export const isElementBefore = async (firstLocator, secondLocator) => {
  const firstHandle = await firstLocator.elementHandle();
  const secondHandle = await secondLocator.elementHandle();

  if (!firstHandle || !secondHandle) {
    throw new Error('One or both elements could not be found.');
  }

  // Compare positions in the DOM and return a boolean
  return await firstHandle.evaluate((first, second) => {
    return !!(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);
  }, secondHandle);
};

/**
 * Ensures that the specified checkbox is in the desired checked state.
 * If the checkbox's current state does not match the desired state, it clicks the checkbox to toggle it.
 *
 * @param {Locator} locator - Playwright locator for the checkbox element.
 * @param {boolean} checked - Desired checked state of the checkbox (true for checked, false for unchecked).
 * @returns {Promise<void>} - Resolves when the checkbox state is correctly set.
 */
export const ensureCheckbox = async (locator: Locator, checked: boolean) => {
  const isChecked = await locator.isChecked();
  if (isChecked !== checked) {
    await locator.click();
  }
};
