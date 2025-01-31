import type { Page } from '@playwright/test';
import { ADMIN_EMAIL_ADDRESS, ADMIN_PASSWORD, TITLE_HOME } from '../constants';

/**
 * Fill in the sign-up form with valid values
 * @param page - playwright page
 */
export const fillValidSignUpForm = async ({ page }: { page: Page }) => {
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
