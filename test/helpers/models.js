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

  function createModelWithType(name, type, opts = {}) {
    return createModel({
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

  async function createModel(data) {
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

  async function createModels(models) {
    for (let model of models) {
      await createModel(model);
    }
  }

  async function deleteModel(model) {
    await rq({
      url: `/content-type-builder/content-types/application::${model}.${model}`,
      method: 'DELETE',
    });

    await waitRestart();
  }

  async function deleteModels(models) {
    for (let model of models) {
      await deleteModel(model);
    }
  }

  return {
    createComponent,
    deleteComponent,

    createModels,
    createModel,
    createModelWithType,
    deleteModel,
    deleteModels,
  };
};
