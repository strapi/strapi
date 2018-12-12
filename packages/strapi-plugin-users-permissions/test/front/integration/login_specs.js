const frontLoadingDelay = Cypress.config('frontLoadingDelay');
const userData = {
  identifier: 'admin',
  password: 'pcw123',
};

describe('Test login', () => {
  let userId;
  let jwt;

  // Create a user if there's none
  before(() => {
    cy.createUser();
  });

  // Delete the user to test other features
  after(() => {
    if (userId) {
      cy.deleteUser(userId, jwt);
    }
  });

  it('Should login the user', () => {
    cy.visit('/admin/users-permissions/auth/login').wait(frontLoadingDelay);

    Object.keys(userData).map(key => {
      return cy.get(`#${key}`).type(userData[key]);
    });

    cy.submitForm()
      .window()
      .should(win => {
        const userInfo = JSON.parse(win.localStorage.getItem('userInfo'));

        jwt = JSON.parse(win.localStorage.getItem('jwtToken'));
        userId = userInfo._id || userInfo.id;
        expect(win.localStorage.getItem('jwtToken')).to.be.ok;
      });

    cy.url().should('equal', `${Cypress.config('baseUrl')}/admin/`);
  });
});
