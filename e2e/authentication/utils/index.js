/**
 * Fill in the sign up form with valid values
 * @param {EventEmitter} page - playwright page
 */
export const fillValidSignUpForm = async ({ page }) => {
  await page.getByLabel('First name').fill('John');
  await page.getByLabel('Last name').fill('Smith');
  await page.getByLabel('Email').fill('test@testing.com');
  await page
    .getByLabel('Password*', {
      exact: true,
    })
    .fill('myTestPassw0rd');
  await page
    .getByLabel('Confirm Password*', {
      exact: true,
    })
    .fill('myTestPassw0rd');
};
