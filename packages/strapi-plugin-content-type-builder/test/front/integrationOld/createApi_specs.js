// import 'whatwg-fetch';

let jwt;
let userId;
const animDelay = Cypress.config('animDelay');
const frontEndUrl = Cypress.config('baseUrl');
const frontLoadingDelay = Cypress.config('frontLoadingDelay');
const backendUrl = Cypress.config('backendUrl');
const pluginUrl = `${frontEndUrl}/admin/plugins/content-type-builder`;
const TAG_API = {
  name: 'tag',
  description: 'This is a super tag \nwith multi \nlines description.',
};

describe('Test CTB', () => {
  context('Check create and update API', () => {
    beforeEach(() => {
      cy.server();
      cy.route(`${backendUrl}/content-type-builder/autoReload`).as('initContentTypeBuilder');
      cy.login().then(data => {
        jwt = data.jwt;
        userId = data.user._id || data.user.id;
      });
      cy.visit('/admin');
      cy.wait(frontLoadingDelay);
      cy.wait('@initContentTypeBuilder');
    });

    it('Should visit the content type builder', () => {
      cy.get('a[href="/admin/plugins/content-type-builder"').click();
      cy.url().should('equal', pluginUrl);
    });

    it('Should prevent the user from creating a camelCase api', () => {
      cy.server();
      cy.route('GET', `${backendUrl}/content-type-builder/models`).as('models');

      cy.get('a[href="/admin/plugins/content-type-builder"')
        .click()
        .wait('@models')
        .get('#openAddCT')
        .click()
        .get('#name')
        .type('camelCase')
        .get('#description')
        .type('\n')
        .get('#name')
        .should('have.value', 'camelcase')
        .get('#name')
        .type('{selectall}')
        .type('not camel-case')
        .get('#description')
        .type('{backspace}')
        .get('#name')
        .should('have.value', 'notcamelcase');
    });

    it('Should create a TAG API', function() {
      cy.server();
      cy.route('GET', `${backendUrl}/content-type-builder/models`).as('models');
      cy.route('POST', `${backendUrl}/content-type-builder/models`).as('createModel');
      cy.route('DELETE', `${backendUrl}/content-type-builder/models/tag`).as('deleteTag');

      cy.get('a[href="/admin/plugins/content-type-builder"')
        .click()
        .wait('@models');

      // Open modal
      cy.get('#openAddCT')
        .click()
        .wait(animDelay);

      // Check the modal is opened this will tell is if we have a build issue
      cy.checkModalOpening();
      cy.get('.modal').invoke('show');

      // Fill the form
      Object.keys(TAG_API).map(key => {
        cy.log(key);
        cy.get(`#${key}`).type(TAG_API[key]);
      });

      // Submit the form and navigate to product page
      cy.submitForm()
        .url()
        .should('equal', `${pluginUrl}/models/tag`);

      // Open the attributes's modal
      cy.get('#openAddAttr')
        .click()
        .wait(animDelay);

      // Check that we don't have a build error from reacstrap
      cy.checkModalOpening().should('be.visible');

      // Ensure the modal is opened to get #attrCardstring
      cy.wait(1000)
        .get('button#attrCardstring')
        .click()
        .get('input[name="name"]')
        .type('name')
        .get('#continue')
        .click();

      cy.get('button#saveData')
        .should('have.id', 'saveData')
        .click()
        .wait('@createModel')
        .wait(frontLoadingDelay);

      cy.get('#attributesList li')
        .first()
        .should('contain', 'name');

      // Delete tag API
      cy.get('a[href="/admin/plugins/content-type-builder"]')
        .click()
        .wait(frontLoadingDelay)
        .wait(frontLoadingDelay)
        .get('#deletetag')
        .click()
        .checkModalOpening()
        .should('be.visible')
        .get('#ctaConfirm')
        .click()
        .wait('@deleteTag')
        .wait(frontLoadingDelay)
        .get('#ctbModelsList li')
        .should('have.length', 4)
        .waitRestart();
    });

    it('Should update PRODUCT API field and visit the create product page', () => {
      cy.server();
      cy.createProductAndTagApis(jwt);
      cy.route(`${backendUrl}/content-type-builder/models/product?`).as('getProductModel');
      cy.route('PUT', `${backendUrl}/content-type-builder/models/product`).as('updateProductModel');

      cy.visit(
        '/admin/plugins/content-type-builder/models/product#editproduct::attributestring::baseSettings::0'
      );
      cy.wait('@getProductModel');
      cy.wait(frontLoadingDelay);

      // Open the modal via url
      cy.checkModalOpening()
        .should('be.visible')
        .get('input[name="name"]')
        .type('{selectall}')
        .type('updatedName')
        .get('#continue')
        .click();

      cy.get('#attributesList li')
        .first()
        .contains('updatedName'); // Yield el in .nav containing 'About'

      cy.get('button#saveData')
        .click()
        .wait('@updateProductModel')
        .wait(frontLoadingDelay);

      // Check that we can still go to the create page
      cy.get('a[href="/admin/plugins/content-manager/product?source=content-manager"')
        .click()
        .get('button[label="content-manager.containers.List.addAnEntry"')
        .click();

      cy.window()
        .its('__store__')
        .its('store')
        .then(pluginStore => {
          const displayedFields = pluginStore
            .getState()
            .getIn([
              'content-manager_global',
              'schema',
              'models',
              'product',
              'editDisplay',
              'fields',
            ])
            .toJS();

          expect(displayedFields).to.include.members([
            'description',
            'price',
            'updatedName',
            'bool',
            'bool1',
            'email',
          ]);
        });

      cy.waitRestart();
    });

    it('Should update PRODUCT API name and visit the create product page', () => {
      cy.server();
      // cy.createProductAndTagApis(jwt);
      cy.route(`${backendUrl}/content-type-builder/models/product?`).as('getProductModel');
      cy.route('PUT', `${backendUrl}/content-type-builder/models/product`).as('updateProductModel');

      cy.visit(
        '/admin/plugins/content-type-builder/models/product#editproduct::contentType::baseSettings'
      );
      cy.wait('@getProductModel');
      cy.wait(frontLoadingDelay);

      // Open the modal via url
      cy.checkModalOpening()
        .should('be.visible')
        .get('input[name="name"]')
        .type('{selectall}')
        .type('produit')
        .submitForm()
        .wait('@updateProductModel')
        .wait(frontLoadingDelay);

      // Check that we can still go to the create page
      cy.get('a[href="/admin/plugins/content-manager/produit?source=content-manager"')
        .click()
        .wait(frontLoadingDelay)
        .get('button[label="content-manager.containers.List.addAnEntry"')
        .click()
        .get('h1')
        .should('have.id', 'addNewEntry');

      // cy.window()
      //   .its('__store__')
      //   .its('content-manager')
      //   .then(pluginStore => {
      //     const displayedFields = pluginStore
      //       .getState()
      //       .getIn(['global', 'schema', 'models', 'product', 'editDisplay', 'fields'])
      //       .toJS();

      //     expect(displayedFields).to.include.members(['description', 'price', 'updatedName', 'bool', 'bool1', 'email']);
      //   });
    });
  });

  after(() => {
    cy.deleteApi('tag', jwt)
      .deleteApi('produit', jwt)
      .deleteUser(userId, jwt);
  });
});
