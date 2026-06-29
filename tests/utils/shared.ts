import { test, expect, type Page, type Locator, type Response } from '@playwright/test';

type NavItem = string | [string, string] | Locator | { text: string; exact?: boolean };

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
    // 4. To avoid partial matches (e.g., "Cat" matching "Category"), accept an object with { text: string, exact?: boolean }
    let item;
    if (typeof navItem === 'string') {
      item = page.locator(`role=link[name^="${navItem}"]`).last();
    } else if (Array.isArray(navItem)) {
      item = await locateFirstAfter(page, navItem[0], navItem[1]);
    } else if (navItem && typeof navItem === 'object' && 'text' in navItem) {
      // Object format: { text: string, exact?: boolean }
      const { text, exact = false } = navItem;
      if (exact) {
        item = page.getByRole('link', { name: text, exact: true });
      } else {
        item = page.locator(`role=link[name^="${text}"]`).last();
      }
    } else {
      // it's a Locator
      item = navItem;
    }

    await expect(item).toBeVisible();
    const urlBefore = page.url();
    await item.click();
    // Client-side navigation does not fire load events; wait for route change when it happens.
    await page
      .waitForURL((url) => url.toString() !== urlBefore, { timeout: 30_000 })
      .catch(() => undefined);
  }

  // Verify header is correct (Vite 8 admin chunks can load slower on first SPA navigation)
  const header = page.getByRole('heading', { name: headerText, exact: true });
  await expect(header).toBeVisible({ timeout: 30_000 });
  return header;
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

// ---------------------------------------------------------------------------
// E2E timing / sync (toast vs API, SPA navigations, guided tour)
//
// Playwright already waits on locators; these helpers cover **ordering** (toast before API, etc.).
// See `tests/e2e/LOCAL_E2E.md` (“race synchronization”). Prefer `withContentManagerSave` /
// `withContentManagerPublish` when you click Save/Publish so the listener is always registered first.
// ---------------------------------------------------------------------------

/** What to wait for after a Content Manager write (see `waitForContentManagerMutation`). */
export type ContentManagerWritePhase = 'save' | 'publish';

/**
 * Wait until the matching Content Manager HTTP response succeeds.
 *
 * - **`save`**: draft document PUT to `/content-manager/…/collection-types|single-types/…`
 * - **`publish`**: POST to `…/actions/publish`
 *
 * On fast machines the success toast can appear before the API finishes; list/home queries may stay
 * stale until this resolves.
 */
export const waitForContentManagerMutation = (
  page: Page,
  phase: ContentManagerWritePhase
): Promise<Response> => {
  if (phase === 'save') {
    return page.waitForResponse(
      (response) =>
        response.request().method() === 'PUT' &&
        response.url().includes('/content-manager/') &&
        (response.url().includes('/collection-types/') ||
          response.url().includes('/single-types/')) &&
        response.ok()
    );
  }
  return page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      response.url().includes('/actions/publish') &&
      response.ok()
  );
};

/** Same as `waitForContentManagerMutation(page, 'save')`. */
export const waitForContentManagerDocumentPut = (page: Page) =>
  waitForContentManagerMutation(page, 'save');

/** Same as `waitForContentManagerMutation(page, 'publish')`. */
export const waitForContentManagerPublish = (page: Page) =>
  waitForContentManagerMutation(page, 'publish');

/**
 * Registers the save-PUT listener, runs `act` (e.g. click Save), then awaits the PUT. Use this so
 * you never forget to `await` the listener after the click.
 */
export const withContentManagerSave = async (
  page: Page,
  act: () => Promise<void>
): Promise<void> => {
  const done = waitForContentManagerMutation(page, 'save');
  await act();
  await done;
};

/**
 * Same as `withContentManagerSave` for the publish POST (pair with `findAndClose(…, 'Published document')`).
 */
export const withContentManagerPublish = async (
  page: Page,
  act: () => Promise<void>
): Promise<void> => {
  const done = waitForContentManagerMutation(page, 'publish');
  await act();
  await done;
};

/**
 * Clicks Publish (or a custom publish button) and confirms the draft-relations
 * dialog when it appears. Bidirectional M2M warnings use a "Publish" confirm;
 * xToOne-style warnings use "Publish without relations".
 */
export const publishAndConfirmDraftRelations = async (
  page: Page,
  publishButton: Locator = page.getByRole('button', { name: 'Publish' })
) => {
  const dialog = page.getByRole('alertdialog', { name: 'Confirmation' });
  const publishDone = waitForContentManagerMutation(page, 'publish');

  await publishButton.click();

  const dialogAppeared = await Promise.race([
    dialog.waitFor({ state: 'visible', timeout: 5000 }).then(() => true as const),
    publishDone.then(() => false as const),
  ]);

  if (!dialogAppeared) {
    return;
  }

  const publishWithoutRelations = dialog.getByRole('button', {
    name: 'Publish without relations',
  });

  if (await publishWithoutRelations.isVisible()) {
    await withContentManagerPublish(page, () => publishWithoutRelations.click());
    return;
  }

  await withContentManagerPublish(page, () =>
    dialog.getByRole('button', { name: 'Publish', exact: true }).click()
  );
};

/** Map a segment under `/admin` (or legacy `/admin/…`) to a pathname. */
function resolveAdminUrl(adminPath: string): string {
  let s = adminPath.trim();
  if (s === '' || s === '/') {
    return '/admin';
  }
  s = s.replace(/^\/+/, '');
  if (s === 'admin' || s.startsWith('admin/')) {
    s = s.replace(/^admin\/?/, '');
  }
  return s === '' ? '/admin' : `/admin/${s}`;
}

/**
 * Navigate within the admin SPA when auth/session may have changed (cookies, localStorage, tokens).
 *
 * **`adminPath`** — path after `/admin`: omit or `''` for `/admin`; `'settings'` → `/admin/settings`.
 * You do not repeat the `/admin` prefix (legacy strings starting with `/admin` are still accepted).
 *
 * **`options`** — forwarded to `page.goto` (default `waitUntil: 'domcontentloaded'` unless overridden).
 * We default to `domcontentloaded` instead of Playwright’s `load`: a client-side redirect to login can
 * overlap a full navigation; waiting for `load` then races (Firefox: `NS_BINDING_ABORTED`).
 */
export const gotoAdminPath = async (
  page: Page,
  adminPath: string = '',
  options?: Parameters<Page['goto']>[1]
): Promise<void> => {
  const href = resolveAdminUrl(adminPath);
  await page.goto(href, {
    ...options,
    waitUntil: options?.waitUntil ?? 'domcontentloaded',
  });
};

/**
 * Waits until the homepage guided tour card is rendered (depends on guided-tour-meta and dev mode).
 * Call before interacting with tour links to avoid racing login / RTK hydration.
 */
export const waitForGuidedTourOverviewReady = async (page: Page): Promise<void> => {
  await expect(page.getByRole('heading', { name: 'Discover your application!' })).toBeVisible();
};

/**
 * Clicks "Next" in a guided-tour step (`role="dialog"`).
 * Tour popovers are often fixed to the viewport edge; Playwright may report the button as visible but
 * still refuse to click with "outside of the viewport" after scroll (differs from headless CI vs local
 * window chrome, DPI, or panel height). `force` skips the viewport intersection check while still hitting
 * the real element.
 */
export const clickGuidedTourDialogNext = async (page: Page, dialogAccessibleName: string) => {
  await page
    .getByRole('dialog', { name: dialogAccessibleName })
    .getByRole('button', { name: 'Next' })
    .click({ force: true });
};

const STRAPI_GUIDED_TOUR_KEY = 'STRAPI_GUIDED_TOUR';

/**
 * Wait until the guided tour state in localStorage marks a tour completed.
 * Use before `page.goto('/admin')` (or any full reload): the UI can show "Done" from React
 * while `usePersistentState` is still flushing; reloading rehydrates from storage and can
 * briefly (or persistently) show stale progress if this wait is skipped.
 */
export const waitForGuidedTourCompletedInStorage = async (
  page: Page,
  tourName: 'strapiCloud' | 'contentTypeBuilder' | 'contentManager' | 'apiTokens'
): Promise<void> => {
  await page.waitForFunction(
    ({ key, name }) => {
      const raw = localStorage.getItem(key);
      if (!raw) return false;
      try {
        const parsed = JSON.parse(raw) as { tours?: Record<string, { isCompleted?: boolean }> };
        return parsed.tours?.[name]?.isCompleted === true;
      } catch {
        return false;
      }
    },
    { key: STRAPI_GUIDED_TOUR_KEY, name: tourName },
    { timeout: 15_000 }
  );
};

/** @deprecated Renamed to `waitForGuidedTourCompletedInStorage`. */
export const waitForGuidedTourTourCompletedInStorage = waitForGuidedTourCompletedInStorage;

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
    await expect(elements.first()).toBeVisible();
  }

  // Find all 'Close' buttons that are siblings of the elements containing the specified text.
  const closeBtns = page.locator(
    `:has-text("${text}")[role="${role}"] ~ button:has-text("${closeLabel}")`
  );

  // Click all 'Close' buttons.
  const count = await closeBtns.count();
  for (let i = 0; i < count; i++) {
    if (await closeBtns.nth(i).isVisible()) {
      await closeBtns
        .nth(i)
        .click()
        .catch(() => {});
    }
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
 * Wait for layout to settle by running a few animation frames (for use after drag start).
 */
const waitForLayoutFrames = async (page: Page, frames = 3) => {
  for (let i = 0; i < frames; i++) {
    await page.evaluate(
      () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))
    );
  }
};

type DragElementAboveOptions = {
  source: Locator;
  target: Locator;
  steps?: number;
  delay?: number;
};

type InnerDropSurfaceDragParams = DragElementAboveOptions & {
  /** Prefix for thrown errors (e.g. `WebKit`, `Firefox`). */
  browserLabel: string;
  /** Run after `mouseup` — e.g. Firefox teardown so later clicks are not swallowed. */
  afterMouseUp?: () => Promise<void>;
};

/**
 * WebKit + Firefox: drop targets use the inner row card (`:scope > *` index 1), same rect as react-dnd’s `objectRef`.
 * Chromium keeps its own `<li>`-based path.
 */
const dragElementAboveInnerDropSurface = async (
  page: Page,
  { source, target, steps = 5, delay = 20, browserLabel, afterMouseUp }: InnerDropSurfaceDragParams
) => {
  const hitTarget = target.locator(':scope > *').nth(1);

  const v = page.viewportSize();
  if (v) {
    const minHeight = 960;
    if (v.height < minHeight) {
      await page.setViewportSize({ width: v.width, height: minHeight });
    }
  }

  await ensureElementsInViewport(page, source, target);

  const draggable = source.locator('[draggable="true"]');

  const sourceBox = await draggable.boundingBox();
  let targetBox = await hitTarget.boundingBox();

  if (!sourceBox || !targetBox) {
    throw new Error('Bounding boxes for source or target could not be determined.');
  }

  const startX = sourceBox.x + sourceBox.width / 2;
  const startY = sourceBox.y + sourceBox.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();

  await page.waitForTimeout(100);
  await waitForLayoutFrames(page, 6);
  await hitTarget.scrollIntoViewIfNeeded();
  await waitForLayoutFrames(page, 4);
  const freshTargetBox = await hitTarget.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
  if (!freshTargetBox || freshTargetBox.width === 0) {
    await page.mouse.up();
    throw new Error(
      `${browserLabel}: drop surface bounding box could not be resolved after drag start (layout may still be settling).`
    );
  }
  targetBox = freshTargetBox;

  let endX = targetBox.x + targetBox.width / 2;
  let endY = targetBox.y + targetBox.height * 0.35;

  const stepDelay = Math.max(delay, 20);
  for (let i = 1; i <= steps; i++) {
    const drop = await hitTarget.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height * 0.35 };
    });
    const t = i / steps;
    const x = startX + (drop.x - startX) * t;
    const y = startY + (drop.y - startY) * t;
    await page.mouse.move(x, y);
    await page.waitForTimeout(stepDelay);
  }
  const finalBox = await hitTarget.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
  if (finalBox && finalBox.width > 0) {
    endX = finalBox.x + finalBox.width / 2;
    endY = finalBox.y + finalBox.height * 0.35;
    await page.mouse.move(endX, endY);
  }

  await page.waitForTimeout(140);
  await page.mouse.up();
  await afterMouseUp?.();
};

/**
 * Chromium-only path for {@link dragElementAbove}. Do not change when fixing other browsers.
 */
const dragElementAboveChromium = async (page: Page, options: DragElementAboveOptions) => {
  const { source, target, steps = 5, delay = 20 } = options;

  await ensureElementsInViewport(page, source, target);

  const draggable = source.locator('[draggable="true"]');

  const sourceBox = await draggable.boundingBox();
  let targetBox = await target.boundingBox();

  if (sourceBox && targetBox) {
    const startX = sourceBox.x + sourceBox.width / 2;
    const startY = sourceBox.y + sourceBox.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();

    await page.waitForTimeout(100);
    await waitForLayoutFrames(page, 6);
    const freshTargetBox = await target.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    });
    if (!freshTargetBox || freshTargetBox.width === 0) {
      await page.mouse.up();
      throw new Error(
        'Chromium: target bounding box could not be resolved after drag start (layout may still be settling).'
      );
    }
    targetBox = freshTargetBox;

    let endX = targetBox.x + targetBox.width / 2;
    let endY = targetBox.y + targetBox.height * 0.35;

    const stepDelay = Math.max(delay, 15);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const x = startX + (endX - startX) * t;
      const y = startY + (endY - startY) * t;
      await page.mouse.move(x, y);
      await page.waitForTimeout(stepDelay);
    }
    const finalBox = await target.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    });
    if (finalBox && finalBox.width > 0) {
      endX = finalBox.x + finalBox.width / 2;
      endY = finalBox.y + finalBox.height * 0.35;
      await page.mouse.move(endX, endY);
    }

    await page.waitForTimeout(100);
    await page.mouse.up();
  } else {
    throw new Error('Bounding boxes for source or target could not be determined.');
  }
};

/** WebKit: same inner-card drag as Firefox; no post-`mouseup` hook. */
const dragElementAboveWebKit = async (page: Page, options: DragElementAboveOptions) =>
  dragElementAboveInnerDropSurface(page, { ...options, browserLabel: 'WebKit' });

/** Firefox: inner-card drag + teardown so later UI clicks are not swallowed after HTML5 DnD. */
const dragElementAboveFirefox = async (page: Page, options: DragElementAboveOptions) =>
  dragElementAboveInnerDropSurface(page, {
    ...options,
    browserLabel: 'Firefox',
    afterMouseUp: async () => {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(100);
      const vp = page.viewportSize();
      if (vp) {
        await page.mouse.move(Math.floor(vp.width / 2), Math.floor(vp.height / 2));
      }
    },
  });

/**
 * Smoothly drags a draggable element within a source <li> to just above a target <li>.
 *
 * Dispatches to {@link dragElementAboveChromium} or {@link dragElementAboveInnerDropSurface}
 * (WebKit / Firefox — shared logic; Firefox passes an `afterMouseUp` hook).
 *
 * @param {object} page - The Playwright page instance.
 * @param {object} options - Options for the drag operation.
 * @param {object} options.source - Locator for the source <li> (containing the draggable element).
 * @param {object} options.target - Locator for the target <li> (drop destination).
 * @param {number} [options.steps=5] - Number of steps for smooth movement.
 * @param {number} [options.delay=20] - Delay in milliseconds between steps.
 */
export const dragElementAbove = async (page: Page, options: DragElementAboveOptions) => {
  const browserType = page.context().browser()?.browserType().name() ?? '';
  if (browserType === 'webkit') {
    return dragElementAboveWebKit(page, options);
  }
  if (browserType === 'firefox') {
    return dragElementAboveFirefox(page, options);
  }
  if (browserType === 'chromium') {
    return dragElementAboveChromium(page, options);
  }
  throw new Error(`Unsupported browser: ${browserType}`);
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

type DynamicZoneInsertPosition = 'above' | 'below';

/**
 * Insert a component in a dynamic zone relative to an existing component.
 *
 * Radix nested menus need a real click on the sub-trigger to open the picker; only the leaf
 * component item uses `dispatchEvent('click')` (see DynamicComponent unit tests).
 */
export const insertDynamicZoneComponent = async (
  page: Page,
  options: {
    relativeToComponent: RegExp | string;
    position: DynamicZoneInsertPosition;
    componentToAdd: RegExp | string;
    expectedComponentCount?: number;
  }
) => {
  const { relativeToComponent, position, componentToAdd, expectedComponentCount } = options;

  const componentItem = page.getByRole('listitem').filter({
    has: page.getByRole('button', { name: relativeToComponent }),
  });

  await expect(componentItem).toHaveCount(1);

  const moreActionsBtn = componentItem.getByRole('button', { name: /more actions/i });
  await moreActionsBtn.scrollIntoViewIfNeeded();
  await moreActionsBtn.click();

  const insertLabel = position === 'above' ? /add component above/i : /add component below/i;
  const insertMenuItem = page.getByRole('menuitem', { name: insertLabel });
  await expect(insertMenuItem).toBeVisible();
  await insertMenuItem.click();

  const componentMenuItem = page.getByRole('menuitem', { name: componentToAdd }).last();
  await expect(componentMenuItem).toBeVisible();
  await componentMenuItem.dispatchEvent('click');

  const components = page.getByRole('listitem').filter({ has: page.getByRole('heading') });

  if (expectedComponentCount !== undefined) {
    await expect(components).toHaveCount(expectedComponentCount);
  } else {
    await expect(insertMenuItem).toBeHidden();
  }
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
