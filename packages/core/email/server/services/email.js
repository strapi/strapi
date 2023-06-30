'use strict';

const _ = require('lodash');
const {
  template: { createStrictInterpolationRegExp },
  keysDeep,
} = require('@strapi/utils');

const getProviderSettings = () => {
  return strapi.config.get('plugin.email');
};

const send = async (options) => {
  return strapi.plugin('email').provider.send(options);
};

/**
 * fill subject, text and html using lodash template
 * @param {object} emailOptions - to, from and replyto...
 * @param {object} emailTemplate - object containing attributes to fill
 * @param {object} data - data used to fill the template
 * @returns {{ subject, text, subject }}
 */
const sendTemplatedEmail = (emailOptions = {}, emailTemplate = {}, data = {}) => {
  const attributes = ['subject', 'text', 'html'];
  const missingAttributes = _.difference(attributes, Object.keys(emailTemplate));
  if (missingAttributes.length > 0) {
    throw new Error(
      `Following attributes are missing from your email template : ${missingAttributes.join(', ')}`
    );
  }

  const allowedInterpolationVariables = keysDeep(data);
  const interpolate = createStrictInterpolationRegExp(allowedInterpolationVariables, 'g');

  const templatedAttributes = attributes.reduce(
    (compiled, attribute) =>
      emailTemplate[attribute]
        ? Object.assign(compiled, {
            [attribute]: _.template(emailTemplate[attribute], {
              interpolate,
              evaluate: false,
              escape: false,
            })(data),
          })
        : compiled,
    {}
  );

  return strapi.plugin('email').provider.send({ ...emailOptions, ...templatedAttributes });
};

module.exports = () => ({
  getProviderSettings,
  send,
  sendTemplatedEmail,
});
