import { ADMIN_EMAIL_ADDRESS, ADMIN_PASSWORD } from '../../constants';

/**
 * Fill in the sign up form with valid values
 * @param {EventEmitter} page - playwright page
 */
export const fillValidSignUpForm = async ({ page }) => {
  await page.getByLabel('First name').fill('John');
  await page.getByLabel('Last name').fill('Smith');
  await page.getByLabel('Email').fill(ADMIN_EMAIL_ADDRESS);
  await page
    .getByLabel('Password*', {
      exact: true,
    })
    .fill(ADMIN_PASSWORD);
  await page
    .getByLabel('Confirm Password*', {
      exact: true,
    })
    .fill(ADMIN_PASSWORD);
};
