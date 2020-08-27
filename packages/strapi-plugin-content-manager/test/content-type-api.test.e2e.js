// Test a simple default API with no relations

const _ = require('lodash');

const { registerAndLogin } = require('../../../test/helpers/auth');
const createModelsUtils = require('../../../test/helpers/models');
const { createAuthRequest } = require('../../../test/helpers/request');

let rq;
let modelsUtils;
let data = {
  products: [],
  productsWithDP: [],
  productsWithCompo: [],
  productsWithCompoAndDP: [],
};

const product = {
  attributes: {
    name: {
      type: 'string',
    },
    description: {
      type: 'text',
    },
  },
  connection: 'default',
  name: 'product',
  description: '',
  collectionName: '',
};

const productWithDP = {
  attributes: {
    name: {
      type: 'string',
      required: true,
    },
    description: {
      type: 'text',
      minLength: 3,
      maxLength: 30,
    },
  },
  connection: 'default',
  draftAndPublish: true,
  name: 'product with DP',
  description: '',
  collectionName: '',
};

const compo = {
  name: 'compo',
  attributes: {
    name: {
      type: 'string',
      required: true,
    },
    description: {
      type: 'text',
      minLength: 3,
      maxLength: 10,
    },
  },
};

const productWithCompo = {
  attributes: {
    name: {
      type: 'string',
    },
    description: {
      type: 'text',
    },
    compo: {
      component: 'default.compo',
      type: 'component',
      required: true,
    },
  },
  connection: 'default',
  name: 'product with compo',
  description: '',
  collectionName: '',
};

const productWithCompoAndDP = {
  attributes: {
    name: {
      type: 'string',
    },
    description: {
      type: 'text',
    },
    compo: {
      type: 'component',
      component: 'default.compo',
      required: true,
    },
  },
  connection: 'default',
  draftAndPublish: true,
  name: 'product with compo and DP',
  description: '',
  collectionName: '',
};

describe('Content-Type API', () => {
  beforeAll(async () => {
    const token = await registerAndLogin();
    rq = createAuthRequest(token);

    modelsUtils = createModelsUtils({ rq });
    await modelsUtils.createComponent(compo);
  }, 60000);

  afterAll(async () => {
    await modelsUtils.deleteComponent('compo');
  }, 60000);

  describe('Basic', () => {
    beforeAll(async () => {
      modelsUtils = createModelsUtils({ rq });
      await modelsUtils.createContentTypes([product]);
    }, 60000);

    afterAll(() => modelsUtils.deleteContentTypes(['product']), 60000);

    test('Create Products', async () => {
      const product = {
        name: 'Product 1',
        description: 'Product description',
      };
      const res = await rq({
        method: 'POST',
        url: '/content-manager/explorer/application::product.product',
        body: product,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject(product);
      expect(res.body.published_at).toBeUndefined();
      data.products.push(res.body);
    });

    test('Read Products', async () => {
      const res = await rq({
        method: 'GET',
        url: '/content-manager/explorer/application::product.product',
      });

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Product 1',
            description: 'Product description',
          }),
        ])
      );
      res.body.forEach(p => expect(p.published_at).toBeUndefined());
    });

    test('Update Products', async () => {
      const product = {
        name: 'Product 1 updated',
        description: 'Updated Product description',
      };
      const res = await rq({
        method: 'PUT',
        url: `/content-manager/explorer/application::product.product/${data.products[0].id}`,
        body: product,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject(product);
      expect(res.body.id).toEqual(data.products[0].id);
      expect(res.body.published_at).toBeUndefined();
      data.products[0] = res.body;
    });

    test('Delete Products', async () => {
      const res = await rq({
        method: 'DELETE',
        url: `/content-manager/explorer/application::product.product/${data.products[0].id}`,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject(data.products[0]);
      expect(res.body.id).toEqual(data.products[0].id);
      expect(res.body.published_at).toBeUndefined();
      data.products.shift();
    });
  });

  describe('Basic + compo', () => {
    beforeAll(async () => {
      await modelsUtils.createContentTypes([productWithCompo]);
    }, 60000);

    afterAll(async () => {
      await modelsUtils.deleteContentTypes(['product-with-compo']);
    }, 60000);

    test('Create Products with compo', async () => {
      const product = {
        name: 'Product 1',
        description: 'Product description',
        compo: {
          name: 'compo name',
          description: 'short',
        },
      };
      const res = await rq({
        method: 'POST',
        url: '/content-manager/explorer/application::product-with-compo.product-with-compo',
        body: product,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject(product);
      expect(res.body.published_at).toBeUndefined();
      data.productsWithCompo.push(res.body);
    });

    test('Read Products with compo', async () => {
      const res = await rq({
        method: 'GET',
        url: '/content-manager/explorer/application::product-with-compo.product-with-compo',
      });

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0]).toMatchObject(data.productsWithCompo[0]);
      res.body.forEach(p => expect(p.published_at).toBeUndefined());
    });

    test('Update Products with compo', async () => {
      const product = {
        name: 'Product 1 updated',
        description: 'Updated Product description',
        compo: {
          name: 'compo name updated',
          description: 'update',
        },
      };
      const res = await rq({
        method: 'PUT',
        url: `/content-manager/explorer/application::product-with-compo.product-with-compo/${data.productsWithCompo[0].id}`,
        body: product,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject(product);
      expect(res.body.id).toEqual(data.productsWithCompo[0].id);
      expect(res.body.published_at).toBeUndefined();
      data.productsWithCompo[0] = res.body;
    });

    test('Delete Products with compo', async () => {
      const res = await rq({
        method: 'DELETE',
        url: `/content-manager/explorer/application::product-with-compo.product-with-compo/${data.productsWithCompo[0].id}`,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject(data.productsWithCompo[0]);
      expect(res.body.id).toEqual(data.productsWithCompo[0].id);
      expect(res.body.published_at).toBeUndefined();
      data.productsWithCompo.shift();
    });

    describe('validation', () => {
      test('Cannot create Products with compo - compo required', async () => {
        const product = {
          name: 'Product 1',
          description: 'Product description',
        };
        const res = await rq({
          method: 'POST',
          url: '/content-manager/explorer/application::product-with-compo.product-with-compo',
          body: product,
        });

        expect(res.statusCode).toBe(400);
        expect(_.get(res, 'body.data.0.errors.compo.0')).toBe('compo must be defined.');
      });

      // validation inside components doesn't exist for the moment
      test.skip('Cannot create Products with compo - minLength', async () => {
        const product = {
          name: 'Product 1',
          description: 'Product description',
          compo: {
            name: 'compo name',
            description: '',
          },
        };
        const res = await rq({
          method: 'POST',
          url: '/content-manager/explorer/application::product-with-compo.product-with-compo',
          body: product,
        });

        expect(res.statusCode).toBe(400);
        expect(_.get(res, 'body.data.0.errors.compo.description.0')).toBe(
          'description must be at least 3 characters'
        );
      });

      // validation inside components doesn't exist for the moment
      test.skip('Cannot create Products with compo - maxLength', async () => {
        const product = {
          name: 'Product 1',
          description: 'Product description',
          compo: {
            name: 'compo name',
            description: 'A very long description that exceed the min length.',
          },
        };
        const res = await rq({
          method: 'POST',
          url: '/content-manager/explorer/application::product-with-compo.product-with-compo',
          body: product,
        });

        expect(res.statusCode).toBe(400);
        expect(_.get(res, 'body.data.0.errors.compo.description.0')).toBe(
          'description must be at most 10 characters'
        );
      });

      // validation inside components doesn't exist for the moment
      test.skip('Cannot create Products with compo - required', async () => {
        const product = {
          name: 'Product 1',
          description: 'Product description',
          compo: {
            description: 'short',
          },
        };
        const res = await rq({
          method: 'POST',
          url: '/content-manager/explorer/application::product-with-compo.product-with-compo',
          body: product,
        });

        expect(res.statusCode).toBe(400);
        expect(_.get(res, 'body.data.0.errors.compo.name.0')).toBe('name must be defined.');
      });
    });
  });

  describe('Basic + draftAndPublish', () => {
    beforeAll(async () => {
      modelsUtils = createModelsUtils({ rq });
      await modelsUtils.createContentTypes([productWithDP]);
    }, 60000);

    afterAll(async () => {
      // clean database
      const queryString = data.productsWithDP.map((p, i) => `${i}=${p.id}`).join('&');
      await rq({
        method: 'DELETE',
        url: `/content-manager/explorer/deleteAll/application::product-with-dp.product-with-dp?${queryString}`,
      });

      await modelsUtils.deleteContentTypes(['product-with-dp']);
    }, 60000);

    test('Create a product', async () => {
      const product = {
        name: 'Product 1',
        description: 'Product description',
      };
      const res = await rq({
        method: 'POST',
        url: '/content-manager/explorer/application::product-with-dp.product-with-dp',
        body: product,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject(product);
      expect(res.body.published_at).toBeNull();
      data.productsWithDP.push(res.body);
    });

    test('Create a product + cannot overwrite published_at', async () => {
      const product = {
        name: 'Product 2',
        description: 'Product description',
        published_at: '2020-08-20T10:27:55.866Z',
      };
      const res = await rq({
        method: 'POST',
        url: '/content-manager/explorer/application::product-with-dp.product-with-dp',
        body: product,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject(_.omit(product, 'published_at'));
      expect(res.body.published_at).toBeNull();
      data.productsWithDP.push(res.body);
    });

    test('Read all products', async () => {
      const res = await rq({
        method: 'GET',
        url: '/content-manager/explorer/application::product-with-dp.product-with-dp',
      });

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Product 1',
            description: 'Product description',
          }),
        ])
      );
      res.body.forEach(p => {
        expect(p.published_at).toBeNull();
      });
    });

    test('Update a draft', async () => {
      const product = {
        name: 'Product 1 updated',
        description: 'Updated Product description',
      };
      const res = await rq({
        method: 'PUT',
        url: `/content-manager/explorer/application::product-with-dp.product-with-dp/${data.productsWithDP[0].id}`,
        body: product,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject(_.omit(product, 'published_at'));
      expect(res.body.id).toEqual(data.productsWithDP[0].id);
      expect(res.body.published_at).toBeNull();
      data.productsWithDP[0] = res.body;
    });

    test('Update Products + cannot overwrite published_at', async () => {
      const product = {
        name: 'Product 1 updated',
        description: 'Updated Product description',
        published_at: '2020-08-27T09:50:50.465Z',
      };
      const res = await rq({
        method: 'PUT',
        url: `/content-manager/explorer/application::product-with-dp.product-with-dp/${data.productsWithDP[0].id}`,
        body: product,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject(_.omit(product, ['published_at']));
      expect(res.body.published_at).toBeNull();
      expect(res.body.id).toEqual(data.productsWithDP[0].id);
      data.productsWithDP[0] = res.body;
    });

    test('Publish an product, expect published_at to be defined', async () => {
      const entry = data.productsWithDP[0];

      let { body } = await rq({
        url: `/content-manager/explorer/application::product-with-dp.product-with-dp/publish/${entry.id}`,
        method: 'POST',
      });

      data.productsWithDP[0] = body;

      expect(body.published_at).toEqual(expect.any(String));
      expect(isNaN(new Date(body.published_at).valueOf())).toBe(false);
    });

    test('Publish article1, expect article1 to be already published', async () => {
      const entry = data.productsWithDP[0];

      let { body } = await rq({
        url: `/content-manager/explorer/application::product-with-dp.product-with-dp/publish/${entry.id}`,
        method: 'POST',
      });

      expect(body.statusCode).toBe(400);
      expect(body.message).toBe('Already published');
    });

    test('Unpublish article1, expect article1 to be set to null', async () => {
      const entry = data.productsWithDP[0];

      let { body } = await rq({
        url: `/content-manager/explorer/application::product-with-dp.product-with-dp/unpublish/${entry.id}`,
        method: 'POST',
      });

      data.productsWithDP[0] = body;

      expect(body.published_at).toBeNull();
    });

    test('Unpublish article1, expect article1 to already be a draft', async () => {
      const entry = data.productsWithDP[0];

      let { body } = await rq({
        url: `/content-manager/explorer/application::product-with-dp.product-with-dp/unpublish/${entry.id}`,
        method: 'POST',
      });

      expect(body.statusCode).toBe(400);
      expect(body.message).toBe('Already a draft');
    });

    test('Delete a draft', async () => {
      const res = await rq({
        method: 'DELETE',
        url: `/content-manager/explorer/application::product-with-dp.product-with-dp/${data.productsWithDP[0].id}`,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject(data.productsWithDP[0]);
      expect(res.body.id).toEqual(data.productsWithDP[0].id);
      expect(res.body.published_at).toBeNull();
      data.productsWithDP.shift();
    });

    describe('validators', () => {
      test('Can create a product - minLength', async () => {
        const product = {
          name: 'Product 1',
          description: '',
        };
        const res = await rq({
          method: 'POST',
          url: '/content-manager/explorer/application::product-with-dp.product-with-dp',
          body: product,
        });

        expect(res.statusCode).toBe(200);
        expect(res.body).toMatchObject(product);
        data.productsWithDP.push(res.body);
      });

      test('Can create a product - required', async () => {
        const product = {
          description: 'Product description',
        };
        const res = await rq({
          method: 'POST',
          url: '/content-manager/explorer/application::product-with-dp.product-with-dp',
          body: product,
        });

        expect(res.statusCode).toBe(200);
        expect(res.body).toMatchObject({
          ...product,
        });
        expect(_.isNil(res.body.name)).toBe(true);
        data.productsWithDP.push(res.body);
      });

      test('Cannot create a product - maxLength', async () => {
        const product = {
          name: 'Product 1',
          description: "I'm a product description that is very long. At least thirty characters.",
        };
        const res = await rq({
          method: 'POST',
          url: '/content-manager/explorer/application::product-with-dp.product-with-dp',
          body: product,
        });

        expect(res.statusCode).toBe(400);
        expect(_.get(res, 'body.data.0.errors.description.0')).toBe(
          'description must be at most 30 characters'
        );
      });
    });
  });

  describe('Basic + compo + draftAndPublish', () => {
    beforeAll(async () => {
      await modelsUtils.createContentTypes([productWithCompoAndDP]);
    }, 60000);

    afterAll(async () => {
      // clean database
      const queryString = data.productsWithCompoAndDP.map((p, i) => `${i}=${p.id}`).join('&');
      await rq({
        method: 'DELETE',
        url: `/content-manager/explorer/deleteAll/application::product-with-compo-and-dp.product-with-compo-and-dp?${queryString}`,
      });

      await modelsUtils.deleteContentTypes(['product-with-compo-and-dp']);
    }, 60000);

    test('Create Products with compo', async () => {
      const product = {
        name: 'Product 1',
        description: 'Product description',
        compo: {
          name: 'compo name',
          description: 'short',
        },
      };
      const res = await rq({
        method: 'POST',
        url:
          '/content-manager/explorer/application::product-with-compo-and-dp.product-with-compo-and-dp',
        body: product,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject(product);
      expect(res.body.published_at).toBeNull();
      data.productsWithCompoAndDP.push(res.body);
    });

    test('Read Products with compo', async () => {
      const res = await rq({
        method: 'GET',
        url:
          '/content-manager/explorer/application::product-with-compo-and-dp.product-with-compo-and-dp',
      });

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0]).toMatchObject(data.productsWithCompoAndDP[0]);
      res.body.forEach(p => {
        expect(p.published_at).toBeNull();
      });
    });

    test('Update Products with compo', async () => {
      const product = {
        name: 'Product 1 updated',
        description: 'Updated Product description',
        compo: {
          name: 'compo name updated',
          description: 'update',
        },
      };
      const res = await rq({
        method: 'PUT',
        url: `/content-manager/explorer/application::product-with-compo-and-dp.product-with-compo-and-dp/${data.productsWithCompoAndDP[0].id}`,
        body: product,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject(product);
      expect(res.body.id).toEqual(data.productsWithCompoAndDP[0].id);
      expect(res.body.published_at).toBeNull();
      data.productsWithCompoAndDP[0] = res.body;
    });

    test('Delete Products with compo', async () => {
      const res = await rq({
        method: 'DELETE',
        url: `/content-manager/explorer/application::product-with-compo-and-dp.product-with-compo-and-dp/${data.productsWithCompoAndDP[0].id}`,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject(data.productsWithCompoAndDP[0]);
      expect(res.body.id).toEqual(data.productsWithCompoAndDP[0].id);
      expect(res.body.published_at).toBeNull();
      data.productsWithCompoAndDP.shift();
    });

    describe('validation', () => {
      test('Can create Products with compo - compo required', async () => {
        const product = {
          name: 'Product 1',
          description: 'Product description',
          compo: null,
        };
        const res = await rq({
          method: 'POST',
          url:
            '/content-manager/explorer/application::product-with-compo-and-dp.product-with-compo-and-dp',
          body: product,
        });

        expect(res.statusCode).toBe(200);
        expect(res.body).toMatchObject(product);
        data.productsWithCompoAndDP.push(res.body);
      });

      test('Can create Products with compo - minLength', async () => {
        const product = {
          name: 'Product 1',
          description: 'Product description',
          compo: {
            name: 'compo name',
            description: '',
          },
        };
        const res = await rq({
          method: 'POST',
          url:
            '/content-manager/explorer/application::product-with-compo-and-dp.product-with-compo-and-dp',
          body: product,
        });

        expect(res.statusCode).toBe(200);
        expect(res.body).toMatchObject(product);
        data.productsWithCompoAndDP.push(res.body);
      });

      // validation doesn't exist for the moment
      test.skip('Cannot create Products with compo - maxLength', async () => {
        const product = {
          name: 'Product 1',
          description: 'Product description',
          compo: {
            name: 'compo name',
            description: 'A very long description that exceed the min length.',
          },
        };
        const res = await rq({
          method: 'POST',
          url:
            '/content-manager/explorer/application::product-with-compo-and-dp.product-with-compo-and-dp',
          body: product,
        });

        expect(res.statusCode).toBe(400);
        expect(_.get(res, 'body.data.0.errors.description.0')).toBe(
          'description must be at most 10 characters'
        );
      });

      test('Can create Products with compo - required', async () => {
        const product = {
          name: 'Product 1',
          description: 'Product description',
          compo: {
            description: 'short',
          },
        };
        const res = await rq({
          method: 'POST',
          url:
            '/content-manager/explorer/application::product-with-compo-and-dp.product-with-compo-and-dp',
          body: product,
        });

        expect(res.statusCode).toBe(200);
        expect(res.body).toMatchObject(product);
        data.productsWithCompoAndDP.push(res.body);
      });
    });
  });
});
