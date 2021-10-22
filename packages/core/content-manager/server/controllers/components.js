'use strict';

const { getService } = require('../utils');
const { createModelConfigurationSchema } = require('./validation');

module.exports = {
  findComponents(ctx) {
    const components = getService('components').findAllComponents();
    const { toDto } = getService('data-mapper');

    ctx.body = { data: components.map(toDto) };
  },

  async findComponentConfiguration(ctx) {
    const { uid } = ctx.params;

    const componentService = getService('components');

    const component = componentService.findComponent(uid);

    if (!component) {
      return ctx.notFound('component.notFound');
    }

    const configuration = await componentService.findConfiguration(component);
    const componentsConfigurations = await componentService.findComponentsConfigurations(component);

    ctx.body = {
      data: {
        component: configuration,
        components: componentsConfigurations,
      },
    };
  },

  async updateComponentConfiguration(ctx) {
    const { uid } = ctx.params;
    const { body } = ctx.request;

    const componentService = getService('components');

    const component = componentService.findComponent(uid);

    if (!component) {
      return ctx.notFound('component.notFound');
    }

    let input;
    try {
      input = await createModelConfigurationSchema(component).validate(body, {
        abortEarly: false,
        stripUnknown: true,
        strict: true,
      });
    } catch (error) {
      return ctx.badRequest(null, {
        name: 'validationError',
        errors: error.errors,
      });
    }

    const newConfiguration = await componentService.updateConfiguration(component, input);

    ctx.body = { data: newConfiguration };
  },
};
