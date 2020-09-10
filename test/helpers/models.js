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

  async function modifyContentType(data) {
    const sanitizedData = { ...data };
    delete sanitizedData.editable;
    delete sanitizedData.restrictRelationsTo;

    await rq({
      url: `/content-type-builder/content-types/application::${sanitizedData.name}.${sanitizedData.name}`,
      method: 'PUT',
      body: {
        contentType: {
          connection: 'default',
          ...sanitizedData,
        },
      },
    });

    await waitRestart();
  }

  async function modifyContentTypes(models) {
    for (let model of models) {
      await modifyContentType(model);
    }
  }

  async function getContentTypeSchema(model) {
    const { body } = await rq({
      url: '/content-type-builder/content-types',
      method: 'GET',
    });

    const contentType = body.data.find(ct => ct.uid === `application::${model}.${model}`);

    return (contentType || {}).schema;
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
    modifyContentType,
    modifyContentTypes,
    getContentTypeSchema,
  };
};
