const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  const BASE = 'http://localhost:1337';
  const ADMIN = BASE + '/admin';

  console.log('Step 1: Login');
  await page.goto(ADMIN + '/auth/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[name="email"]', 'admin@strapi.io');
  await page.fill('input[name="password"]', 'Admin1234!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/admin', { timeout: 15000 });
  await page.waitForLoadState('networkidle');
  console.log('Logged in, URL:', page.url());
  await page.screenshot({ path: '/opt/cursor/artifacts/screenshots/01-dashboard-english.png' });
  console.log('Screenshot 01: Dashboard (English)');

  // Step 2: Go to the About single type in English to show the heading
  console.log('\nStep 2: Navigate to About single type (English)');
  await page.goto(BASE + '/admin/content-manager/single-types/api::about.about');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/opt/cursor/artifacts/screenshots/02-about-english.png' });
  console.log('Screenshot 02: About single type (English)');

  // Check the heading text
  const heading = await page
    .locator('h1')
    .first()
    .textContent()
    .catch(() => 'N/A');
  console.log('Page heading (English):', heading);

  // Check what text appears in the breadcrumb/nav area
  const breadcrumbText = await page
    .locator('nav')
    .first()
    .textContent()
    .catch(() => 'N/A');
  console.log('Breadcrumb (English):', breadcrumbText.substring(0, 200));

  // Step 3: Change language to German via profile settings
  console.log('\nStep 3: Change interface language to German');
  await page.goto(BASE + '/admin/me');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/opt/cursor/artifacts/screenshots/03-profile-page.png' });
  console.log('Screenshot 03: Profile page');

  // Find and change the interface language
  // The label is "Interface language" and there's a combobox
  const langComboboxes = await page.locator('[role="combobox"]').all();
  console.log('Number of comboboxes on profile page:', langComboboxes.length);

  for (let i = 0; i < langComboboxes.length; i++) {
    const text = await langComboboxes[i].textContent().catch(() => 'N/A');
    console.log(`Combobox ${i}: "${text}"`);
  }

  // Look for the interface language combobox (first one, should be language selector)
  // The label says "Interface language" and the select has a "Choose here" placeholder
  const interfaceLangSection = page.getByText('Interface language').locator('..');
  await interfaceLangSection
    .screenshot({ path: '/opt/cursor/artifacts/screenshots/03b-lang-section.png' })
    .catch(() => {});

  // Click on the combobox that shows "Choose here" (first combobox)
  const firstCombobox = page.locator('[role="combobox"]').first();
  await firstCombobox.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/opt/cursor/artifacts/screenshots/03c-lang-dropdown.png' });
  console.log('Screenshot 03c: Language dropdown open');

  // Look for German option
  const germanOption = page.getByRole('option', { name: /deutsch|german/i }).first();
  const germanVisible = await germanOption.isVisible().catch(() => false);
  console.log('German option visible:', germanVisible);

  if (germanVisible) {
    await germanOption.click();
    console.log('Clicked German option');
  } else {
    // Try looking at all options
    const options = await page
      .locator('[role="option"]')
      .allTextContents()
      .catch(() => []);
    console.log('Available options:', options);

    // Try finding by text
    const allItems = await page
      .locator('li, [role="option"]')
      .allTextContents()
      .catch(() => []);
    const germanItem = allItems.find(
      (t) => t.includes('Deutsch') || t.includes('German') || t.includes('de')
    );
    console.log('German item text found:', germanItem);

    if (germanItem) {
      await page.getByText(germanItem).click();
    }
  }

  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/opt/cursor/artifacts/screenshots/03d-after-lang-select.png' });
  console.log('Screenshot 03d: After language selection');

  // Save the profile
  const saveBtn = page.getByRole('button', { name: /save/i }).first();
  const saveBtnVisible = await saveBtn.isVisible().catch(() => false);
  console.log('Save button visible:', saveBtnVisible);

  if (saveBtnVisible) {
    await saveBtn.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    console.log('Profile saved');
    await page.screenshot({ path: '/opt/cursor/artifacts/screenshots/04-profile-saved.png' });
    console.log('Screenshot 04: Profile saved (German UI)');
  }

  // Step 4: Navigate to the About single type
  console.log('\nStep 4: Navigate to About single type (German)');
  await page.goto(BASE + '/admin/content-manager/single-types/api::about.about');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/opt/cursor/artifacts/screenshots/05-about-german-full.png' });
  console.log('Screenshot 05: About single type (German)');

  // Check the heading text
  const headingDe = await page
    .locator('h1')
    .first()
    .textContent()
    .catch(() => 'N/A');
  console.log('Page heading (German):', headingDe);

  // Check sidebar - look for the left menu
  const sidebarText = await page
    .locator('nav, aside')
    .first()
    .textContent()
    .catch(() => 'N/A');
  console.log('Sidebar text:', sidebarText.substring(0, 500));

  // Take a zoomed screenshot of the heading area
  const h1 = page.locator('h1').first();
  const h1Visible = await h1.isVisible().catch(() => false);
  console.log('H1 visible:', h1Visible);
  if (h1Visible) {
    await h1.screenshot({ path: '/opt/cursor/artifacts/screenshots/05b-heading-zoomed.png' });
    console.log('Screenshot 05b: Heading zoomed');
  }

  // Take a screenshot of the left sidebar to show "Über uns" there
  const leftNav = page.locator('aside, nav[aria-label]').first();
  const leftNavVisible = await leftNav.isVisible().catch(() => false);
  if (leftNavVisible) {
    await leftNav.screenshot({ path: '/opt/cursor/artifacts/screenshots/05c-sidebar.png' });
    console.log('Screenshot 05c: Sidebar');
  }

  // Step 5: Get full page HTML to analyze
  const pageText = await page.evaluate(() => document.body.innerText);
  const hasUberUns = pageText.includes('Über uns');
  const hasAbout = pageText.includes('About');
  console.log('\nPage text contains "Über uns":', hasUberUns);
  console.log('Page text contains "About":', hasAbout);

  // Final wide screenshot showing both sidebar and heading together
  await page.screenshot({
    path: '/opt/cursor/artifacts/screenshots/06-final-comparison.png',
    fullPage: false,
  });
  console.log('Screenshot 06: Final comparison screenshot');

  console.log('\nDone! Screenshots saved to /opt/cursor/artifacts/screenshots/');
  await browser.close();
})();
