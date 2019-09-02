const frontLoadingDelay = Cypress.config('frontLoadingDelay');
const registerData = {
  username: 'admin',
  email: 'admin@strapi.io',
  password: 'pcw123',
  confirmPassword: 'pcw123',
};
let jwt;
let userId;
const frontEndUrl = Cypress.config('baseUrl');

describe('Test register page', () => {
  after(() => {
    if (userId) {
      cy.deleteUser(userId, jwt);
    }
  });

  it('Visits /admin and should be redirected to register page', () => {
    cy.visit('/admin').wait(frontLoadingDelay);

    // Check if the user is being redirected to /register
    cy.url().should('include', '/users-permissions/auth/register');
  });

  it('Should redirect to /register when trying to hit /login', () => {
    cy.visit('/admin/plugins/users-permissions/auth/login').wait(frontLoadingDelay);

    cy.url().should('include', '/users-permissions/auth/register');
  });

  it('Should register the admin user', () => {
    Object.keys(registerData).map(key => {
      return cy.get(`#${key}`).type(registerData[key]);
    });

    // Submit form
    cy.submitForm()
      .window()
      .should(win => {
        const userInfo = JSON.parse(win.sessionStorage.getItem('userInfo'));

        jwt = JSON.parse(win.sessionStorage.getItem('jwtToken'));
        userId = userInfo._id || userInfo.id;
        expect(win.sessionStorage.getItem('jwtToken')).to.be.ok;
      });
    cy.url().should('equal', `${frontEndUrl}/admin/`);
  });
});
