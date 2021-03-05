'use strict';

const { curry, matchesProperty, pick } = require('lodash/fp');

const utils = {
  isOfKind: kind => matchesProperty('kind', kind),
  resolveContentType: uid => strapi.contentTypes[uid],
  isNotInSubjects: subjects => uid => !subjects.find(subject => subject.uid === uid),
  hasProperty: curry((property, subject) => {
    return !!subject.properties.find(prop => prop.value === property);
  }),
  getValidOptions: pick(['applyToProperties']),
};

/**
 * Transforms & adds the given  setting action to the section
 * Note: The action is transformed to a setting specific format
 */
const settings = (action, section) => {
  const { category, subCategory, displayName, actionId } = action;

  section.push({
    displayName,
    category,
    subCategory,
    action: actionId,
  });
};

/**
 * Transforms & adds the given plugin action to the section
 * Note: The action is transformed to a plugin specific format
 */
const plugins = (action, section) => {
  const { pluginName, subCategory, displayName, actionId } = action;

  section.push({
    displayName,
    plugin: pluginName,
    subCategory,
    action: actionId,
  });
};

/**
 * Transforms & adds the given action to the section's actions field
 * Note: The action is transformed to a content-type specific format
 */
const contentTypesBase = (action, section) => {
  const { displayName, actionId, subjects, options } = action;

  section.actions.push({
    label: displayName,
    actionId,
    subjects,
    ...utils.getValidOptions(options),
  });
};

/**
 * Initialize the subjects array of a section based on the action's subjects
 */
const subjectsHandlerFor = kind => (action, section) => {
  const { subjects } = action;

  const toSubjectTemplate = ct => ({ uid: ct.uid, label: ct.info.name, properties: [] });

  const newSubjects = subjects
    // Ignore already added subjects
    .filter(utils.isNotInSubjects(section.subjects))
    // Transform UIDs into content-types
    .map(utils.resolveContentType)
    // Only keep specific kind of content-types
    .filter(utils.isOfKind(kind))
    // Transform the content-types into section's subjects
    .map(toSubjectTemplate);

  section.subjects.push(...newSubjects);
};

const buildDeepAttributesCollection = attributes => {
  const buildNode = ([attributeName, options]) => {
    if (options.configurable === false) {
      return null;
    }

    const node = { label: attributeName, value: attributeName };

    if (options.required) {
      Object.assign(node, { required: true });
    }

    if (options.type === 'component') {
      const component = strapi.components[options.component];
      return { ...node, children: buildDeepAttributesCollection(component.attributes) };
    }

    return node;
  };

  return Object.entries(attributes)
    .map(buildNode)
    .filter(node => node !== null);
};

/**
 * Create and populate the fields property for section's subjects based on the action's subjects list
 */
const fieldsProperty = (action, section) => {
  const { subjects } = action;

  section.subjects
    .filter(subject => subjects.includes(subject.uid))
    .forEach(subject => {
      const { uid } = subject;
      const contentType = utils.resolveContentType(uid);

      if (utils.hasProperty('fields', subject)) {
        return;
      }

      const fields = buildDeepAttributesCollection(contentType.attributes);
      const fieldsProp = { label: 'Fields', value: 'fields', children: fields };

      subject.properties.push(fieldsProp);
    });
};

module.exports = {
  plugins,
  settings,
  subjectsHandlerFor,
  contentTypesBase,
  fieldsProperty,
};
