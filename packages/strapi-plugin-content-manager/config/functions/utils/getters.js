const _ = require('lodash');

/**
 * Retrieve the path of each API
 * @param {Object}} data
 * @returns {Array} Array of API path ['plugins.upload.file', 'plugins.users-permissions.user', ...]
 */
const getApis = (data) => Object.keys(data).reduce((acc, curr) => {
  if (data[curr].fields) {
    return acc.concat([curr]);
  }

  if (curr === 'plugins') {
    Object.keys(data[curr]).forEach(plugin => {
      Object.keys(data[curr][plugin]).forEach(api => {
        acc = acc.concat([`${curr}.${plugin}.${api}`]);
      });
    });
  }

  return acc;
}, []);


/**
 * Retrieve all the fields from an api
 * @param {Object} data
 * @param {Array} apis
 * @returns {Array} Array composed of fields path for instance : [['plugins.users-permissions.user.fields.username', 'plugins.users-permissions.user.fields.email', 'plugins.users-permissions.user.fields.password'], [...]]
 */
const getApisKeys = (data, apis) => apis.map(apiPath => {
  const fields = Object.keys(_.get(data.models, apiPath.concat(['fields'])));

  return fields.map(field => `${apiPath.join('.')}.fields.${field}`);
});

/**
 * Same as above but only for the relations since it's custom
 */
const getApisUploadRelations = (data, sameArray) => sameArray.map(apiPath => {
  const relationPath = [...apiPath, 'relations'];
  const relationsObject = _.get(data.models, relationPath, {});
  const relations = Object.keys(relationsObject)
    .filter(relationName => {
      return _.get(data.models, [...relationPath, relationName, 'plugin' ]) === 'upload';
    });

  return relations.map(relation => `${apiPath.join('.')}.editDisplay.availableFields.${relation}`);
});

/**
 *
 * @param {String} attrPath
 * @returns {Array}
 */
const getEditDisplayAvailableFieldsPath = attrPath => [..._.take(attrPath, attrPath.length -2), 'editDisplay', 'availableFields', attrPath[attrPath.length - 1]];
const getEditDisplayFieldsPath = attrPath => [..._.take(attrPath, attrPath.length -2), 'editDisplay', 'fields'];



module.exports = {
  getApis,
  getApisKeys,
  getApisUploadRelations,
  getEditDisplayAvailableFieldsPath,
  getEditDisplayFieldsPath
};