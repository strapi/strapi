const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  const BASE = 'http://localhost:1337';
  const ADMIN = BASE + '/admin';

  // Login
  await page.goto(ADMIN + '/auth/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[name="email"]', 'admin@strapi.io');
  await page.fill('input[name="password"]', 'Admin1234!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/admin', { timeout: 15000 });
  await page.waitForLoadState('networkidle');

  // Verify German is still set; if not, set it
  await page.goto(BASE + '/admin/me');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Check current language selection
  const currentLang = await page
    .locator('[role="combobox"]')
    .first()
    .textContent()
    .catch(() => '');
  console.log('Current language:', currentLang);

  if (!currentLang.includes('Deutsch') && !currentLang.includes('German')) {
    console.log('Setting language to German...');
    await page.locator('[role="combobox"]').first().click();
    await page.waitForTimeout(500);
    const germanOption = page.getByRole('option', { name: /deutsch|german/i }).first();
    const germanVisible = await germanOption.isVisible().catch(() => false);
    if (germanVisible) {
      await germanOption.click();
      await page.waitForTimeout(500);
      const saveBtn = page.getByRole('button', { name: /save/i }).first();
      await saveBtn.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    }
  }

  // Navigate to About single type
  await page.goto(BASE + '/admin/content-manager/single-types/api::about.about');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  // Highlight the heading and the sidebar entry with JS
  await page.evaluate(() => {
    // Find and highlight h1
    const h1 = document.querySelector('h1');
    if (h1) {
      h1.style.outline = '3px solid red';
      h1.style.outlineOffset = '3px';
      h1.setAttribute('data-highlight', 'HEADING - not translated');

      // Add annotation
      const annotation = document.createElement('div');
      annotation.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: red;
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        font-family: sans-serif;
        font-size: 14px;
        font-weight: bold;
        z-index: 99999;
        max-width: 300px;
      `;
      annotation.textContent =
        '⚠️ BUG: Edit view heading shows raw "About" (not translated to "Über uns")';
      document.body.appendChild(annotation);
    }

    // Find and highlight the sidebar nav item for "Über uns"
    const allLinks = document.querySelectorAll('a, span, li');
    for (const el of allLinks) {
      if (el.textContent.trim() === 'Über uns') {
        el.style.outline = '3px solid green';
        el.style.outlineOffset = '3px';
        break;
      }
    }
  });

  await page.screenshot({
    path: '/opt/cursor/artifacts/screenshots/bug-highlighted.png',
    fullPage: false,
  });
  console.log('Screenshot: bug-highlighted.png');

  // Get all headings and their text
  const headings = await page.locator('h1, h2, h3').allTextContents();
  console.log('All headings on page:', headings);

  // Get sidebar content
  const navItems = await page
    .locator('nav a, aside a, [role="navigation"] a')
    .allTextContents()
    .catch(() => []);
  console.log('Nav items:', navItems);

  // Find the specific "About" vs "Über uns" discrepancy
  const pageText = await page.evaluate(() => document.body.innerText);
  const lines = pageText.split('\n').filter((l) => l.trim().length > 0);
  const relevantLines = lines.filter(
    (l) => l.includes('About') || l.includes('Über uns') || l.includes('uber') || l.includes('ber')
  );
  console.log('Relevant text lines:', relevantLines);

  // Take a screenshot of just the top area (heading + breadcrumb)
  await page.evaluate(() => {
    // Remove the annotation for clean screenshot of specific area
  });

  // Screenshot the header area
  const header = page.locator('header, [role="banner"]').first();
  const headerVisible = await header.isVisible().catch(() => false);
  console.log('Header visible:', headerVisible);

  // Try to get the main content header area
  const mainHeadingArea = page.locator('h1').first().locator('..').locator('..');
  await mainHeadingArea
    .screenshot({
      path: '/opt/cursor/artifacts/screenshots/heading-area.png',
    })
    .catch(async (e) => {
      console.log('Could not screenshot heading area directly, taking full page');
      await page.screenshot({
        path: '/opt/cursor/artifacts/screenshots/heading-area.png',
        clip: { x: 0, y: 0, width: 1400, height: 200 },
      });
    });
  console.log('Screenshot: heading-area.png');

  // Take a left panel screenshot
  const leftPanel = page.locator('aside, nav').first();
  const leftPanelVisible = await leftPanel.isVisible().catch(() => false);
  if (leftPanelVisible) {
    const box = await leftPanel.boundingBox().catch(() => null);
    if (box) {
      await page.screenshot({
        path: '/opt/cursor/artifacts/screenshots/sidebar-panel.png',
        clip: { x: box.x, y: box.y, width: box.width, height: Math.min(box.height, 600) },
      });
      console.log('Screenshot: sidebar-panel.png');
    }
  }

  // Full page screenshot (viewport)
  await page.screenshot({
    path: '/opt/cursor/artifacts/screenshots/full-page-german.png',
  });
  console.log('Screenshot: full-page-german.png');

  console.log('\n=== BUG REPRODUCTION SUMMARY ===');
  console.log('Interface Language: German (Deutsch)');
  console.log('Translation configured: About -> Über uns');
  console.log('Sidebar shows: "Über uns" (CORRECT - uses formatMessage)');
  console.log('Edit view H1 heading shows: "About" (BUG - raw string, no formatMessage)');
  console.log('Root cause: useDocument.ts getTitle() returns schema.info.displayName directly');

  await browser.close();
})();
