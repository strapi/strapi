const { chromium } = require('@playwright/test');

module.exports = async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  // signup
  await page.goto('http://localhost:1337/admin');
  await page.getByLabel('First name*', { exact: true }).fill('John');
  await page.getByLabel('Last name').fill('Smith');
  await page.getByLabel('Email*', { exact: true }).fill('test@testing.com');
  await page.getByLabel('Password*', { exact: true }).fill('myTestPassw0rd');
  await page.getByLabel('Confirm Password*', { exact: true }).fill('myTestPassw0rd');
  await page.getByRole('button', { name: "Let's start" }).click();

  // logout
  await page.getByText('John Smith').click();
  await page.getByRole('link', { name: 'Logout' }).click();

  // login
  await page.getByLabel('Email*', { exact: true }).fill('test@testing.com');
  await page.getByLabel('Password*', { exact: true }).fill('myTestPassw0rd');
  await page.getByLabel('Remember me').click();
  await page.getByRole('button', { name: 'Login' }).click();

  await page.getByText('John Smith').click();

  await page.context().storageState({ path: 'storageState.json' });
  await browser.close();
};
