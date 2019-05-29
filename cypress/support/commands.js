// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add("login", (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add("drag", { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add("dismiss", { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This is will overwrite an existing command --
// Cypress.Commands.overwrite("visit", (originalFn, url, options) => { ... })
const stringify = JSON.stringify;
const backendUrl = Cypress.config('backendUrl');

const WAIT_ON_CMD = `wait-on ${backendUrl}`;

Cypress.Commands.add('waitRestart', () => {
  return cy.exec(WAIT_ON_CMD);
});

Cypress.Commands.add('createUser', () => {
  const user = {
    username: 'admin',
    email: 'admin@strapi.io',
    password: 'pcw123',
  };

  return cy
    .request({ url: `${backendUrl}/users-permissions/init`, method: 'GET' })
    .then(response => {
      const {
        body: { hasAdmin },
      } = response;

      if (!hasAdmin) {
        // Create one
        cy.request({
          url: `${backendUrl}/admin/auth/local/register`,
          method: 'POST',
          body: user,
        });
      }
    });
});

Cypress.Commands.add('checkModalOpening', () => {
  return cy.get('.modal').invoke('show');
});

Cypress.Commands.add('deleteUser', (id, jwt) => {
  cy.request({
    url: `${backendUrl}/content-manager/explorer/administrator/${id}?source=admin`,
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
  });
});

Cypress.Commands.add('createProductAndTagApis', (jwt = null) => {
  return cy
    .exec(WAIT_ON_CMD)
    .fixture('api/tag.json')
    .then(body => {
      return cy
        .request({
          url: `${backendUrl}/content-type-builder/models`,
          method: 'POST',
          headers: {
            Authorization: `Bearer ${jwt}`,
          },
          body,
        })
        .exec(WAIT_ON_CMD)
        .fixture('api/product.json')
        .then(body => {
          return cy
            .request({
              url: `${backendUrl}/content-type-builder/models`,
              method: 'POST',
              headers: {
                Authorization: `Bearer ${jwt}`,
              },
              body,
            })
            .exec(WAIT_ON_CMD);
        });
    });
});

Cypress.Commands.add('createCTMApis', (jwt = null) => {
  return cy
    .createProductAndTagApis(jwt)
    .exec(WAIT_ON_CMD)
    .fixture('api/category.json')
    .then(body => {
      return cy
        .request({
          url: `${backendUrl}/content-type-builder/models`,
          method: 'POST',
          headers: {
            Authorization: `Bearer ${jwt}`,
          },
          body,
        })
        .exec(WAIT_ON_CMD);
    });
});

Cypress.Commands.add('deleteAllModelData', (model, jwt, source = null) => {
  // GET all data;
  cy.request({
    url: `${backendUrl}/content-manager/explorer/${model}`,
    method: 'GET',
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
  }).then(data => {
    const entriesToDelete = data.body.reduce((acc, curr) => {
      return acc.concat(curr.id);
    }, []);

    const qs = Object.assign(entriesToDelete, source ? { source } : {});

    return cy.request({
      url: `${backendUrl}/content-manager/explorer/deleteAll/${model}`,
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
      qs,
    });
  });
});

Cypress.Commands.add('deleteApi', (model, jwt) => {
  return cy
    .exec(WAIT_ON_CMD)
    .request({
      url: `${backendUrl}/content-type-builder/models/${model}`,
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    })
    .exec(WAIT_ON_CMD);
});

Cypress.Commands.add('login', () => {
  cy.createUser();
  return cy
    .request({
      url: `${backendUrl}/admin/auth/local`,
      method: 'POST',
      body: {
        identifier: 'admin',
        password: 'pcw123',
      },
    })
    .then(response => {
      window.localStorage.setItem('jwtToken', stringify(response.body.jwt));
      window.localStorage.setItem('userInfo', stringify(response.body.user));

      return response.body;
    });
});

Cypress.Commands.add('seedData', (model, jwt) => {
  return cy.fixture(`seeds/${model}.json`).then(seed => {
    seed.forEach(body => {
      cy.request({
        method: 'POST',
        url: `${backendUrl}/content-manager/explorer/${model}?source='content-manager`,
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
        body,
      });
    });
  });
});

Cypress.Commands.add('submitForm', () => {
  return cy.get('form').submit();
});
