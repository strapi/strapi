const waitRestart = require('./waitRestart');

module.exports = ({ rq }) => {
  async function createModel(data) {
    await rq({
      url: '/content-type-builder/models',
      method: 'POST',
      body: data,
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
      url: `/content-type-builder/models/${model}`,
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
    createModels,
    deleteModels,
  };
};
