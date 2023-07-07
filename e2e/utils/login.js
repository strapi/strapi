import { ADMIN_EMAIL_ADDRESS, ADMIN_PASSWORD } from '../constants';

/**
 * Log in to an e2e test app
 * @param {EventEmitter} page - playwright page
 * @param {Boolean} rememberMe - whether to click the 'remember me' checkbox in
 * the form
 */
export const login = async ({ page, rememberMe = false }) => {
  await page.getByLabel('Email').fill(ADMIN_EMAIL_ADDRESS);
  await page
    .getByLabel('Password*', {
      exact: true,
    })
    .fill(ADMIN_PASSWORD);

  if (rememberMe) {
    await page.getByLabel('rememberMe').click();
  }

  await page.getByRole('button', { name: 'Login' }).click();
};
