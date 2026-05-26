'use strict';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

const builder = createTestBuilder();
let strapi;
let rq;
let graphqlQuery;

const menuItemModel = {
  attributes: {
    name: {
      type: 'string',
    },
  },
  singularName: 'menuitem',
  pluralName: 'menuitems',
  displayName: 'Menu item',
};

const menuItemsComponent = {
  displayName: 'Menu Items',
  attributes: {
    menuItems: {
      type: 'relation',
      relation: 'oneToMany',
      target: 'api::menuitem.menuitem',
    },
  },
};

const menuModel = {
  kind: 'singleType',
  singularName: 'menu',
  pluralName: 'menus',
  displayName: 'Menu',
  attributes: {
    left: {
      type: 'component',
      component: 'default.menu-items',
      repeatable: false,
    },
  },
};

describe('GraphQL relation order (issue #26426)', () => {
  const menuItemUids = [];

  beforeAll(async () => {
    await builder
      .addContentTypes([menuItemModel])
      .addComponent(menuItemsComponent)
      .addContentTypes([menuModel])
      .build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    graphqlQuery = (body) =>
      rq({
        url: '/graphql',
        method: 'POST',
        body,
      });

    for (const name of ['First', 'Second', 'Third']) {
      const item = await strapi.documents('api::menuitem.menuitem').create({
        data: { name },
      });
      menuItemUids.push(item.documentId);
    }

    // Deliberate non-creation order: Third, First, Second (refs #26426 admin reordering)
    const updateRes = await graphqlQuery({
      query: /* GraphQL */ `
        mutation updateMenu($data: MenuInput!) {
          updateMenu(data: $data) {
            data {
              documentId
            }
          }
        }
      `,
      variables: {
        data: {
          left: {
            menuItems: [menuItemUids[2], menuItemUids[0], menuItemUids[1]],
          },
        },
      },
    });

    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body.errors).toBeUndefined();
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('returns component oneToMany relations in connect order', async () => {
    const res = await graphqlQuery({
      query: /* GraphQL */ `
        {
          menu {
            data {
              attributes {
                left {
                  menuItems {
                    documentId
                    name
                  }
                }
              }
            }
          }
        }
      `,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const menuItems = res.body.data.menu.data.attributes.left.menuItems;

    const names = menuItems.map((item) => item.name ?? item.attributes?.name);

    expect(names).toEqual(['Third', 'First', 'Second']);
  });

  test('returns oneToMany relations in connect order when sort is explicitly empty', async () => {
    const res = await graphqlQuery({
      query: /* GraphQL */ `
        {
          menu {
            data {
              attributes {
                left {
                  menuItems(sort: []) {
                    name
                  }
                }
              }
            }
          }
        }
      `,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const menuItems = res.body.data.menu.data.attributes.left.menuItems;
    const names = menuItems.map((item) => item.name ?? item.attributes?.name);

    expect(names).toEqual(['Third', 'First', 'Second']);
  });

  test('returns oneToMany relations in connect order via _connection', async () => {
    const res = await graphqlQuery({
      query: /* GraphQL */ `
        {
          menu {
            data {
              attributes {
                left {
                  menuItems_connection {
                    nodes {
                      name
                    }
                  }
                }
              }
            }
          }
        }
      `,
    });

    expect(res.statusCode).toBe(200);

    const nodes = res.body.data.menu.data.attributes.left.menuItems_connection.nodes;

    const names = nodes.map((item) => item.name ?? item.attributes?.name);

    expect(names).toEqual(['Third', 'First', 'Second']);
  });
});
