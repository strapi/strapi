'use strict';

const { yup, validateYupSchema } = require('@strapi/utils');

const renewToken = yup.object().shape({ token: yup.string().required() }).required().noUnknown();

module.exports = validateYupSchema(renewToken);
