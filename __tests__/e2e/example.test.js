describe('Strapi Admin UI', () => {
  beforeAll(async () => {
    await page.goto('http://localhost:1337/admin');
  });

  it('should display "Welcome to Strapi" on login page', async () => {
    await expect(page).toMatch('Welcome to Strapi');
  });
});
