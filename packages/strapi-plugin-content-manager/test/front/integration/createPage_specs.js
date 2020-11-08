let jwt;

const frontEndUrl = Cypress.config('baseUrl');
const frontLoadingDelay = Cypress.config('frontLoadingDelay');
const backendUrl = Cypress.config('backendUrl');

const getCreateRedirectUrl = (model, sort = '_id') => {
  return `${frontEndUrl}/admin/plugins/content-manager/${model}/create?redirectUrl=/plugins/content-manager/${model}?_limit=10&_page=1&_sort=${sort}&source=content-manager`;
};
const getRequest = (model, sort = '_id') => {
  return `${backendUrl}/content-manager/explorer/${model}?_limit=10&_start=0&_sort=${sort}:ASC&source=content-manager`;
};

describe('Testing Content Manager createPages', function() {
  before(() => {
    cy.login()
      .then(data => {
        jwt = data.jwt;

        return cy.createCTMApis(data.jwt).then(() => jwt);
      })
      .wait(1000);

    Cypress.Commands.add('ctmTagLink', () => {
      return cy.get(
        'a[href="/admin/plugins/content-manager/tag?source=content-manager"]'
      );
    });
    Cypress.Commands.add('ctmProductLink', () => {
      return cy.get(
        'a[href="/admin/plugins/content-manager/product?source=content-manager"]'
      );
    });
    Cypress.Commands.add('ctmCategoryLink', () => {
      return cy.get(
        'a[href="/admin/plugins/content-manager/category?source=content-manager"]'
      );
    });
    Cypress.Commands.add('ctmAddButton', () => {
      return cy.get('button#addEntry');
    });
    Cypress.Commands.add('inputError', name => {
      return cy.get(`#errorOf${name} > span`);
    });
    Cypress.Commands.add('getListTagsOrderedByName', () => {
      return cy
        .ctmTagLink()
        .click()
        .get('tr > th:nth-child(3) > span')
        .click();
    });
    Cypress.Commands.add('fillProductForm', product => {
      Object.keys(product).forEach(key => {
        if (key === 'description') {
          cy.get(`textarea[name="${key}"]`).type(product[key]);
        } else {
          cy.get(`input[name="${key}"]`).type(product[key]);
        }
      });
    });
    Cypress.Commands.add('getProduct', index => {
      return cy
        .ctmProductLink()
        .click()
        .wait(1000)
        .get(`tbody > tr:nth-child(${index})`)
        .click()
        .wait(1000)
        .window()
        .its('__store__')
        .its('store');
    });
  });

  after(() => {
    cy.deleteApi('tag', jwt)
      .deleteApi('category', jwt)
      .deleteApi('product', jwt);
  });

  context('Creating data with no relation', () => {
    beforeEach(() => {
      cy.server();
      cy.route(`${backendUrl}/content-manager/models`).as('initContentManager');
      cy.login()
        .then(data => {
          jwt = data.jwt;
        })
        .visit('/admin')
        .wait(frontLoadingDelay)
        .wait('@initContentManager');
    });

    after(() => {
      cy.deleteAllModelData('tag', jwt)
        .deleteAllModelData('category', jwt)
        .deleteAllModelData('product', jwt);
    });

    it('Should create a tag with no relation', () => {
      cy.server();
      cy.route(getRequest('tag')).as('getTags');
      cy.ctmTagLink()
        .click()
        .ctmAddButton()
        .click();
      const tagsToCreate = [
        'tag1',
        'tag2',
        'tag3',
        'superTag',
        'badTag',
        "I'm running out of idea tag",
      ];
      // Check redirect url
      cy.url().should('equal', getCreateRedirectUrl('tag'));

      // Try to save empty data
      cy.submitForm()
        .get('input#name')
        .invoke('attr', 'class')
        .should('include', 'form-control is-invalid');

      tagsToCreate.forEach((tagName, index) => {
        cy.get('input#name')
          .type(tagName)
          .submitForm()
          .wait('@getTags')
          .get('tbody')
          .children()
          .should('have.length', index + 1);

        if (index < tagsToCreate.length - 1) {
          cy.ctmAddButton().click();
        }
      });
    });

    it('Should create a category with no relation', () => {
      cy.server();
      cy.route(getRequest('category', 'name')).as('getCategories');
      cy.ctmCategoryLink()
        .click()
        .get('tr > th:nth-child(3) > span')
        .click()
        .ctmAddButton()
        .click();
      const catsToCreate = [
        'drinks',
        'food',
        'junk food',
        'french food',
        'good french food',
        'greasy',
        "you don't want to eat that",
      ];
      // Check redirect url
      cy.url().should('equal', getCreateRedirectUrl('category', 'name'));

      catsToCreate.forEach((catName, index) => {
        cy.get('input#name')
          .type(catName)
          .submitForm()
          .wait('@getCategories')
          .get('tbody')
          .children()
          .should('have.length', index + 1);

        if (index < catsToCreate.length - 1) {
          cy.ctmAddButton().click();
        }
      });
    });

    it('Should display an error for unique fields for categories', () => {
      cy.ctmCategoryLink()
        .click()
        .ctmAddButton()
        .click()
        .get('input#name')
        .type('drinks')
        .submitForm()
        .get('input#name')
        .invoke('attr', 'class')
        .should('includes', 'form-control is-invalid')
        .get('input#name')
        .inputError('name')
        .should('have.text', 'This name is already taken ');
    });

    it('Should delete all data using the UI', () => {
      cy.server();
      cy.route(getRequest('tag')).as('getTags');
      cy.route(getRequest('category', 'name')).as('getCategories');

      cy.ctmTagLink()
        .click()
        .wait('@getTags')
        .wait(1000)
        .get('thead > tr > th:first-child')
        .click()
        .get('span#deleteAllData')
        .click()
        .get('button#ctaConfirm')
        .click()
        .wait(2000)
        .window()
        .its('__store__')
        .its('store')
        .then(pluginStore => {
          const records = pluginStore
            .getState()
            .getIn(['content-manager_listPage', 'records', 'tag'])
            .toJS();

          expect(records).to.have.length(0);
        });
    });
  });

  context('Creating and updating data with relation', () => {
    before(() => {
      cy.server();
      cy.route(`${backendUrl}/content-manager/models`).as('initContentManager');
      cy.login()
        .then(data => {
          jwt = data.jwt;

          return data.jwt;
        })
        .then(jwt => {
          return cy.seedData('tag', jwt).then(() => jwt);
        })
        .then(jwt => {
          return cy.seedData('category', jwt);
        });
    });

    beforeEach(() => {
      cy.server();
      cy.route(`${backendUrl}/content-manager/models`).as('initContentManager');
      cy.login()
        .then(data => {
          jwt = data.jwt;

          return data.jwt;
        })
        .visit('/admin')
        .wait(frontLoadingDelay)
        .wait('@initContentManager');
    });

    it('Should create a product and link several tags and 1 category', () => {
      cy.server();
      cy.route(
        `${backendUrl}/content-manager/explorer/tag?_limit=10&_start=0&_sort=name:ASC&source=content-manager`
      ).as('getTags');
      cy.ctmProductLink()
        .click()
        .ctmAddButton()
        .click();

      // Test default value
      cy.get('button#__OFF__bool')
        .invoke('attr', 'class')
        .should('includes', 'gradientOff')
        .get('button#__ON__bool1')
        .invoke('attr', 'class')
        .should('includes', 'gradientOn');

      // Create a product
      const product = {
        name: 'product1',
        description: 'This is a super description',
        price: 1337,
        email: 'hi@strapi.io',
      };

      Object.keys(product).forEach(key => {
        if (key === 'description') {
          cy.get(`textarea[name="${key}"]`).type(product[key]);
        } else {
          cy.get(`input[name="${key}"]`).type(product[key]);
        }
      });

      cy.get('button#__ON__bool')
        .click()
        .get('button#__OFF__bool1')
        .click();

      cy.get('input#tags')
        .type('special t', { force: true })
        .type('{enter}', { force: true })
        .type('ta', { force: true })
        .type('{enter}', { force: true })
        .get('ul#sortableListOftags')
        .children('li')
        .should(children => {
          expect(children[0].innerText.trim()).to.equal('special tag');
          expect(children[1].innerText.trim()).to.equal('tag1');
        })
        .get('input#category')
        .type('french food', { force: true })
        .type('{enter}')
        .invoke('attr', 'value')
        .should('equal', 'french food')
        .submitForm();

      cy.getListTagsOrderedByName()
        .wait('@getTags')
        .wait(1000)
        .get('tbody > tr:first-child')
        .click()
        .get('ul#sortableListOfproducts')
        .children()
        .should(children => {
          expect(children).to.have.length(1);
          expect(children[0].innerText.trim()).to.equal('product1');
        });

      cy.getListTagsOrderedByName()
        .wait('@getTags')
        .wait(2000)
        .get('tbody > tr:nth-child(2)')
        .click()
        .get('ul#sortableListOfproducts')
        .children()
        .should(children => {
          expect(children).to.have.length(1);
          expect(children[0].innerText.trim()).to.equal('product1');
        });
    });

    it('Should delete a product in tag1', () => {
      cy.getListTagsOrderedByName()
        .wait(frontLoadingDelay)
        .get('tbody > tr:nth-child(2)')
        .click()
        .wait(1000)
        .get(
          'ul#sortableListOfproducts > li:nth-child(1) > div:nth-child(2) > img'
        )
        .click()
        .submitForm()
        .ctmProductLink()
        .click()
        .wait(1000)
        .get('tbody > tr:nth-child(1)')
        .click()
        .wait(frontLoadingDelay)
        .get('ul#sortableListOftags')
        .children()
        .should(children => {
          expect(children).to.have.length(1);
          expect(children[0].innerText.trim()).to.equal('special tag');
        });
    });

    it('Should add several products to category french food', () => {
      cy.server();
      cy.route(
        `${backendUrl}/content-manager/explorer/category?_limit=10&_start=0&_sort=_id:ASC&source=content-manager`
      ).as('getCategories');
      cy.route(
        `${backendUrl}/content-manager/explorer/product?_limit=10&_start=0&_sort=_id:ASC&source=content-manager`
      ).as('getProducts');
      const product = {
        name: 'MacBook',
        description: 'A laptop',
        price: 2000,
        email: 'john@strapi.io',
      };
      const product2 = {
        name: 'Dell',
        description: 'Not a mac',
        price: 4,
        email: 'bob@strapi.io',
      };

      cy.ctmProductLink()
        .click()
        .ctmAddButton()
        .click();

      cy.fillProductForm(product)
        .submitForm()
        .ctmAddButton()
        .click()
        .fillProductForm(product2)
        .submitForm();

      cy.ctmCategoryLink()
        .click()
        .wait('@getCategories')
        .wait(1000)
        .get('tbody > tr:nth-child(5)')
        .click()
        .get('ul#sortableListOfproducts')
        .as('relations')
        .children()
        .should(children => {
          expect(children).to.have.length(1);
          expect(children[0].innerText.trim()).to.equal('product1');
        })
        .get(
          'ul#sortableListOfproducts > li:nth-child(1) > div:nth-child(2) > img'
        )
        .click()
        .get('input#products')
        .type('mac', { force: true })
        .type('{enter}', { force: true })
        .type('dell', { force: true })
        .type('{enter}', { force: true })
        .get('@relations')
        .children()
        .should(children => {
          expect(children).to.have.length(2);
          expect(children[0].innerText.trim()).to.equal('MacBook');
          expect(children[1].innerText.trim()).to.equal('Dell');
        })
        .submitForm();

      cy.getProduct(1).then(pluginStore => {
        const category = pluginStore
          .getState()
          .getIn(['content-manager_editPage', 'record', 'category']);

        expect(category).to.equal(null);
      });

      cy.getProduct(2)
        .then(pluginStore => {
          const category = pluginStore
            .getState()
            .getIn(['content-manager_editPage', 'record', 'category', 'name']);

          expect(category).to.equal('french food');
        })
        .getProduct(3)
        .then(pluginStore => {
          const category = pluginStore
            .getState()
            .getIn(['content-manager_editPage', 'record', 'category', 'name']);

          expect(category).to.equal('french food');
        });
    });

    after(() => {
      cy.deleteAllModelData('tag', jwt)
        .deleteAllModelData('category', jwt)
        .deleteAllModelData('product', jwt);
    });
  });
});
