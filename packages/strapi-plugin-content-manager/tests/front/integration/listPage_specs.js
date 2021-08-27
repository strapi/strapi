let jwt;
const animDelay = Cypress.config('animDelay');
const frontLoadingDelay = Cypress.config('frontLoadingDelay');
const backendUrl = Cypress.config('backendUrl');

describe('Testing Content Manager ListPages', function() {
  before(() => {
    cy.login()
      .then(data => {
        jwt = data.jwt;

        return cy.createCTMApis(data.jwt).then(() => jwt);
      })
      .then(jwt => {
        cy.seedData('product', jwt);
      })
      .wait(1000);
  });

  after(() => {
    cy.deleteAllModelData('product', jwt);
    cy.deleteApi('tag', jwt)
      .deleteApi('category', jwt)
      .deleteApi('product', jwt);
  });

  context('Testing sorting options', () => {
    beforeEach(() => {
      cy.login()
        .then(data => {
          jwt = data.jwt;
        })
        .visit('/admin')
        .wait(frontLoadingDelay);
    });

    it('Should have the Id default sort', () => {
      cy.get('a[href="/admin/plugins/content-manager/product?source=content-manager"]')
        .click()
        .wait(frontLoadingDelay);

      cy.get('tr > th:nth-child(2) > span')
        .children('i')
        .should('be.visible')
        .invoke('attr', 'class')
        .should('includes', 'fa-sort-up');
    });

    it('Should change the default sort of product to name ASC then name DESC', () => {
      cy.server();
      cy.route(
        `${backendUrl}/content-manager/explorer/product?_limit=10&_start=0&_sort=_id:ASC&source=content-manager`
      ).as('getProduct');
      cy.route(
        `${backendUrl}/content-manager/explorer/product?_limit=10&_start=0&_sort=name:ASC&source=content-manager`
      ).as('getSortByNameASC');
      cy.route(
        `${backendUrl}/content-manager/explorer/product?_limit=10&_start=0&_sort=name:DESC&source=content-manager`
      ).as('getSortByNameDESC');

      cy.get('a[href="/admin/plugins/content-manager/product?source=content-manager"]')
        .click()
        .wait('@getProduct')
        .get('tr > th:nth-child(3) > span')
        .as('getName')
        .click();

      cy.wait('@getSortByNameASC')
        .get('@getName')
        .children('i')
        .should('be.visible')
        .invoke('attr', 'class')
        .should('includes', 'iconAsc')
        .get('tbody > tr:nth-child(1) > td:nth-child(3)')
        .as('firstResult')
        .should('have.text', 'name');

      cy.get('@getName')
        .click()
        .wait('@getSortByNameDESC')
        .get('@getName')
        .children('i')
        .should('be.visible')
        .invoke('attr', 'class')
        .should('includes', 'iconDesc')
        .get('@firstResult')
        .should('have.text', 'name1');
    });

    it('Should set the product default sort to name', () => {
      cy.get('a[href="/admin/plugins/content-manager/ctm-configurations"]')
        .click()
        .get('#product')
        .click()
        .get('select[name="product.defaultSort"]')
        .as('defaultSort')
        .select('name')
        .should('have.value', 'name')
        .get('select[name="product.sort"]')
        .as('sortOption')
        .select('DESC')
        .should('have.value', 'DESC')
        .submitForm()
        .get('#ctaConfirm')
        .click()
        .wait(frontLoadingDelay)
        .get('a[href="/admin/plugins/content-manager/product?source=content-manager"]')
        .click()
        .wait(frontLoadingDelay)
        .get('tr > th:nth-child(3) > span')
        .as('getName')
        .children('i')
        .invoke('attr', 'class')
        .should('includes', 'iconDesc')
        .get('tbody > tr:nth-child(1) > td:nth-child(3)')
        .should('have.text', 'name1');

      // Set it back to normal
      cy.get('a[href="/admin/plugins/content-manager/ctm-configurations"]')
        .click()
        .get('#product')
        .click()
        .get('@defaultSort')
        .select('_id')
        .should('have.value', '_id')
        .get('@sortOption')
        .select('ASC')
        .should('have.value', 'ASC')
        .submitForm()
        .get('#ctaConfirm')
        .click()
        .wait(frontLoadingDelay)
        .get('a[href="/admin/plugins/content-manager/product?source=content-manager"]')
        .click()
        .wait(frontLoadingDelay)
        .get('tr > th:nth-child(2) > span')
        .children('i')
        .invoke('attr', 'class')
        .should('includes', 'iconAsc');
    });
  });

  context('Testing filters', () => {
    beforeEach(() => {
      cy.login()
        .then(data => {
          jwt = data.jwt;
        })
        .visit('/admin')
        .wait(frontLoadingDelay);
    });

    it('Should apply filters for product data', () => {
      cy.get('a[href="/admin/plugins/content-manager/product?source=content-manager"]')
        .click()
        .wait(frontLoadingDelay);
      cy.get('button#addFilterCTA')
        .as('toggleFilter')
        .click()
        .wait(animDelay)
        .get('div#filterPickWrapper')
        .as('filterWrapper')
        .children('div')
        .should('have.length', 1);

      cy.get('input[name="0.value"]')
        .type('name')
        .get('button#newFilter')
        .click()
        .get('select[name="1.attr"]')
        .select('bool')
        .get(
          'button[label="content-manager.components.FiltersPickWrapper.PluginHeader.actions.apply"]'
        )
        .click()
        .wait(animDelay)
        .get('tbody > tr')
        .should('have.length', 1);
    });
  });
});
