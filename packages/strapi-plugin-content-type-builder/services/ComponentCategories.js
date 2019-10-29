'use strict';

const { join } = require('path');
const fse = require('fs-extra');

module.exports = {
  async editCategory(name, infos) {
    const componentsDir = join(strapi.dir, 'components');

    // don't do anything the name doesn't change
    if (name === infos.name) return;

    if (await fse.pathExists(join(componentsDir, infos.name))) {
      throw strapi.errors.badRequest('Name already taken');
    }

    const componentService =
      strapi.plugins['content-type-builder'].services.components;

    const promises = Object.keys(strapi.components)
      .filter(uid => {
        const [category] = uid.split('.');
        return category === name;
      })
      .map(uid => {
        const [, name] = uid.split('.');
        return componentService.updateComponentInModels(
          uid,
          `${infos.name}.${name}`
        );
      });

    await Promise.all(promises);

    await fse.move(join(componentsDir, name), join(componentsDir, infos.name));
  },
};
