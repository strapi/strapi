import { Page, expect } from '@playwright/test';

export const TITLE_LOGIN = 'Strapi Admin';

export class Admin {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async visit() {
    await this.page.goto('/admin');
    await this.page.waitForLoadState('load');
  }

  async navToAPISection() {
    await this.page.goto('/admin/settings/api-tokens');
    await this.page.waitForLoadState('load');
  }

  async fillName(text: string) {
    const nameInput = this.page.getByLabel('Name*');
    await expect(nameInput).toBeVisible();
    await nameInput.click();
    await nameInput.fill(text);
  }

  async selectTokenDuration(duration: string) {
    await this.page.getByLabel('Token duration').click();
    const option = this.page.getByRole('option', { name: duration });
    await expect(option).toBeVisible();
    await option.click();
  }

  async selectTokenType(type: string) {
    await this.page.getByLabel('Token type').click();
    const option = this.page.getByRole('option', { name: type });
    await expect(option).toBeVisible();
    await option.click();
  }

  async saveToken() {
    const saveButton = this.page.getByRole('button', { name: 'Save' });
    await expect(saveButton).toBeVisible();
    await saveButton.click();
  }

  async validateTokenCreation() {
    await expect(this.page.getByText('Make sure to copy this token')).toBeVisible();
    await expect(this.page.getByText('Expiration date:')).toBeVisible();
  }

  async validateTokenInList(tokenName: string) {
    const row = this.page.getByRole('gridcell', { name: tokenName, exact: true });
    await expect(row).toBeVisible();
  }

  //login
  async login(email: string, password: string, rememberMe: boolean = false) {
    await this.page.getByLabel('Email*', { exact: true }).fill(email);
    await this.page.getByLabel('Password*', { exact: true }).fill(password);

    if (rememberMe) {
      const rememberCheckbox = this.page.getByLabel('Remember me');
      await rememberCheckbox.check();
    }

    await this.page.getByRole('button', { name: 'Login' }).click();
  }

  async fillEmail(email: string) {
    await this.page.getByLabel('Email*', { exact: true }).fill(email);
  }

  async fillPassword(password: string) {
    await this.page.getByLabel('Password*', { exact: true }).fill(password);
  }

  async clickLoginButton() {
    await this.page.getByRole('button', { name: 'Login' }).click();
  }

  async clickForgotPassword() {
    await this.page.getByRole('link', { name: 'Forgot your password?' }).click();
  }

  async clickBackToLogin() {
    await this.page.getByRole('link', { name: 'Ready to sign in?' }).click();
  }

  async validateTooManyRequestsError() {
    await expect(this.page.getByText('Too many requests, please try again later.')).toBeVisible();
  }

  async validateLoginErrorMessage(errorMessage: string) {
    await expect(this.page.getByText(errorMessage)).toBeVisible();
  }

  async validateValueRequiredError() {
    await expect(this.page.getByText('Value is required')).toBeVisible();
  }

  async expectLoginTitle() {
    await expect(this.page).toHaveTitle('Login');
  }

  async expectHomeTitle() {
    await expect(this.page).toHaveTitle('Home');
  }

  async expectValidationErrorFocus(inputLabel: string) {
    const input = this.page.getByLabel(inputLabel, { exact: true });
    await expect(input).toBeFocused();
  }

  async checkPasswordRecoveryVisibility() {
    await expect(this.page.getByText('Password Recovery')).toBeVisible();
  }

  // logout

  async clickUser(username: string) {
    await this.page.getByText(username).click();
  }

  async clickLogout() {
    await this.page.getByText('Logout').click();
  }

  async assertLoginHeader() {
    await expect(this.page.getByText('Log in to your Strapi account')).toBeVisible();
  }

  // signup
  async fillValidSignUpForm(firstName: string, lastName: string, email: string, password: string) {
    await this.page.getByLabel('First name').fill(firstName);
    await this.page.getByLabel('Last name').fill(lastName);
    await this.page.getByLabel('Email').fill(email);
    await this.page.getByLabel('Password*', { exact: true }).fill(password);
    await this.page.getByLabel('Confirm Password*', { exact: true }).fill(password);
  }

  async submitForm() {
    await this.page.getByRole('button', { name: "Let's start" }).click();
  }

  async fillEmailForSignUp(email: string) {
    await this.page.getByRole('textbox', { name: 'Email' }).fill(email);
  }

  async fillPasswordForSignUp(password: string) {
    await this.page.getByRole('textbox', { name: 'Password', exact: true }).fill(password);
  }

  async checkKeepMeUpdated() {
    await this.page.getByLabel(/Keep me updated/).check();
  }

  async expectValidationMessage(text: string) {
    await expect(this.page.getByText(text)).toBeVisible();
  }

  async expectFocusedOnEmail() {
    await expect(this.page.getByRole('textbox', { name: 'Email' })).toBeFocused();
  }

  async expectFocusedOnPassword() {
    await expect(this.page.getByRole('textbox', { name: 'Password', exact: true })).toBeFocused();
  }

  async waitForUsecasePage() {
    await this.page.waitForURL('**/usecase**');
    await expect(this.page.getByText('Tell us a bit more about yourself')).toBeVisible();
  }

  async expectTitleHome() {
    await expect(this.page).toHaveTitle('Home');
  }

  // TODO: transfer-tokens-spec.ts file
}
