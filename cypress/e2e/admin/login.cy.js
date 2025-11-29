describe('Admin Login', () => {
  beforeEach(() => {
    // Visit the admin login page before each test
    cy.visit('/admin');
  });

  it('should display login form', () => {
    // Check if the login form is visible
    cy.get('input[name="email"]').should('be.visible');
    cy.get('input[name="password"]').should('be.visible');
    cy.contains('button', 'Login').should('be.visible');
  });

  it('should login with valid credentials', () => {
    // Fill in the login form
    cy.get('input[name="email"]').type(Cypress.env('adminEmail'));
    cy.get('input[name="password"]').type(Cypress.env('adminPassword'));

    // Submit the form
    cy.contains('button', 'Login').click();

    // Verify successful login by checking for dashboard elements
    cy.url().should('include', '/admin');
    cy.get('[data-testid="app-header"]').should('be.visible');
  });

  it('should show error with invalid credentials', () => {
    // Fill in the login form with invalid credentials
    cy.get('input[name="email"]').type('wrong@example.com');
    cy.get('input[name="password"]').type('wrongpassword');

    // Submit the form
    cy.contains('button', 'Login').click();

    // Verify error message is shown
    cy.contains('Invalid credentials').should('be.visible');
  });
});
