let jwt;
const animDelay = Cypress.config('animDelay');
const backendUrl = Cypress.config('backendUrl');
const frontLoadingDelay = Cypress.config('frontLoadingDelay');
const links = {
  Category: '/admin/plugins/content-manager/category?source=content-manager',
  Product: '/admin/plugins/content-manager/product?source=content-manager',
  settings: '/admin/plugins/content-manager/ctm-configurations',
  Tag: '/admin/plugins/content-manager/tag?source=content-manager',
  User: '/admin/plugins/content-manager/user?source=users-permissions',
};

describe('Testing build and schema core_store', () => {
  before(() => {
    cy.login()
      .then(data => {
        jwt = data.jwt;
        return cy.createCTMApis(data.jwt);
      })
      .wait(1000);
  });

  after(() => {
    cy.deleteApi('tag', jwt)
      .deleteApi('category', jwt)
      .deleteApi('product', jwt);
  });

  context('Testing views', () => {
    beforeEach(() => {
      cy.login()
        .then(data => {
          jwt = data.jwt;
        })
        .visit('/admin')
        .wait(frontLoadingDelay);
    });

    it('Should visit all list pages without any errors', () => {
      cy.server();
      cy.route(`${backendUrl}/content-manager/models`).as('initCTM');
      cy.get(`a[href="${links.settings}"]`)
        .click()
        .wait('@initCTM');

      // Check all list views are rendered without any error
      for (let i = 0; i < 4; i++) {
        Object.keys(links).forEach(link => {
          const name = link === 'settings' ? 'Content Manager' : link;

          cy.get(`a[href="${links[link]}"]`)
            .click()
            .get('h1')
            .should('have', name);
        });
      }
    });

    it('Should visit all views once without any errors', () => {
      cy.server();
      cy.route(`${backendUrl}/content-manager/models`).as('initCTM');
      cy.get(`a[href="${links.settings}"]`)
        .click()
        .wait('@initCTM');

      // Testing errors related to reactstrap
      cy.get('#cancelChanges')
        .click()
        .wait(animDelay)
        .checkModalOpening()
        .should('be.visible')
        .type('{esc}');

      // Test setting view
      Object.keys(links).forEach(link => {
        if (link !== 'settings') {
          cy.get(`#${link.toLowerCase()}`)
            .click()
            .get('h1')
            .should('have', `Content Manager - ${link}`)
            .get(`a[href="${links.settings}"]`)
            .click();
        }
      });

      Object.keys(links).forEach(link => {
        if (link !== 'settings') {
          cy.get(`a[href="${links[link]}"]`)
            .click()
            .get('button#addEntry')
            .click()
            .get('h1')
            .should('have', 'New Entry');
        }
      });
    });
  });
});
