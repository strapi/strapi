'use strict';

const { isVisibleAttribute } = require('@strapi/utils').contentTypes;

const {
  toSubjectTemplate,
  getValidOptions,
  hasProperty,
  isNotInSubjects,
  resolveContentType,
  isOfKind,
} = require('./utils');

/**
 * @typedef ContentTypesSection
 * @property {Array<Action>} actions
 * @property {Array<Object>} subjects
 */

/**
 * @typedef {Array<Action>} ActionArraySection
 */

/**
 * Transforms & adds the given  setting action to the section
 * Note: The action is transformed to a setting specific format
 * @param {object} options
 * @param {Action} options.action
 * @param {ActionArraySection} section
 */
const settings = ({ action, section }) => {
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
 * @param {object} options
 * @param {Action} options.action
 * @param {ActionArraySection} section
 */
const plugins = ({ action, section }) => {
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
 * @param {object} options
 * @param {Action} options.action
 * @param {ContentTypesSection} section
 */
const contentTypesBase = ({ action, section }) => {
  const { displayName, actionId, subjects, options } = action;

  section.actions.push({
    label: displayName,
    actionId,
    subjects,
    ...getValidOptions(options),
  });
};

/**
 * Initialize the subjects array of a section based on the action's subjects
 */
const subjectsHandlerFor =
  (kind) =>
  ({ action, section: contentTypesSection }) => {
    const { subjects } = action;

    const newSubjects = subjects
      // Ignore already added subjects
      .filter(isNotInSubjects(contentTypesSection.subjects))
      // Transform UIDs into content-types
      .map(resolveContentType)
      // Only keep specific kind of content-types
      .filter(isOfKind(kind))
      // Transform the content-types into section's subjects
      .map(toSubjectTemplate);

    contentTypesSection.subjects.push(...newSubjects);
  };

const buildNode = (model, attributeName, attribute) => {
  if (!isVisibleAttribute(model, attributeName)) {
    return null;
  }

  const node = { label: attributeName, value: attributeName };

  if (attribute.required) {
    Object.assign(node, { required: true });
  }

  if (attribute.type === 'component') {
    const component = strapi.components[attribute.component];
    return { ...node, children: buildDeepAttributesCollection(component) };
  }

  return node;
};

const buildDeepAttributesCollection = (model) => {
  return Object.entries(model.attributes)
    .map(([attributeName, attribute]) => buildNode(model, attributeName, attribute))
    .filter((node) => node !== null);
};

/**
 * Create and populate the fields property for section's subjects based on the action's subjects list
 * @param {object} options
 * @param {Action} options.action
 * @param {ContentTypesSection} section
 */
const fieldsProperty = ({ action, section }) => {
  const { subjects } = action;

  section.subjects
    .filter((subject) => subjects.includes(subject.uid))
    .forEach((subject) => {
      const { uid } = subject;
      const contentType = resolveContentType(uid);

      if (hasProperty('fields', subject)) {
        return;
      }

      const fields = buildDeepAttributesCollection(contentType);
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
