const waitRestart = require('./waitRestart');

module.exports = ({ rq }) => {
  async function createComponent(data) {
    await rq({
      url: '/content-type-builder/components',
      method: 'POST',
      body: {
        component: {
          category: 'default',
          icon: 'default',
          connection: 'default',
          ...data,
        },
      },
    });

    await waitRestart();
  }

  async function deleteComponent(name) {
    await rq({
      url: `/content-type-builder/components/${name}`,
      method: 'DELETE',
    });

    await waitRestart();
  }

  function createContentTypeWithType(name, type, opts = {}) {
    return createContentType({
      connection: 'default',
      name,
      attributes: {
        field: {
          type,
          ...opts,
        },
      },
    });
  }

  async function createContentType(data) {
    await rq({
      url: '/content-type-builder/content-types',
      method: 'POST',
      body: {
        contentType: {
          connection: 'default',
          ...data,
        },
      },
    });

    await waitRestart();
  }

  async function createContentTypes(models) {
    for (let model of models) {
      await createContentType(model);
    }
  }

  async function deleteContentType(model) {
    await rq({
      url: `/content-type-builder/content-types/application::${model}.${model}`,
      method: 'DELETE',
    });

    await waitRestart();
  }

  async function deleteContentTypes(models) {
    for (let model of models) {
      await deleteContentType(model);
    }
  }

  return {
    createComponent,
    deleteComponent,

    createContentType,
    createContentTypes,
    createContentTypeWithType,
    deleteContentType,
    deleteContentTypes,
  };
};
